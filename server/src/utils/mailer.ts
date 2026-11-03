import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Outgoing mail, kept deliberately small.
 *
 * The project has no mail dependency (nodemailer is not installed and adding
 * one was out of scope), so this speaks the subset of SMTP that a password
 * reset needs, over Node's own `net`/`tls`. Three transports, chosen by
 * configuration:
 *
 *   smtp     SMTP_HOST + SMTP_PORT + MAIL_FROM. STARTTLS is required on
 *            anything but implicit-TLS port 465: a reset link and the AUTH
 *            exchange must never travel in clear text.
 *   http     MAIL_WEBHOOK_URL. A provider-agnostic bridge: POST
 *            {from,to,subject,text} as JSON and let that endpoint talk to
 *            whichever mail provider the deployment already pays for.
 *   console  Development only, and only when nothing else is configured: the
 *            message goes to the server log so the flow is testable locally.
 *
 * In production with nothing configured `sendMail` throws instead of writing the
 * message to the log, so nobody mistakes a link in the log for a delivered
 * email. Callers must still answer identically to the client (see
 * password-reset.service.ts) and log the failure themselves.
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export type MailTransportName = 'smtp' | 'http' | 'console' | 'none';

export class MailNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailNotConfiguredError';
  }
}

const SMTP_TIMEOUT_MS = 15000;
const HTTP_TIMEOUT_MS = 15000;

interface SmtpConfig {
  host: string;
  port: number;
  from: string;
  user?: string;
  pass?: string;
}

/** The SMTP settings, or null when SMTP is not fully configured. */
function smtpConfig(): SmtpConfig | null {
  const { SMTP_HOST: host, SMTP_PORT: port, MAIL_FROM: from } = env;
  if (!host || !port || !from) return null;
  return { host, port: Number(port), from, user: env.SMTP_USER, pass: env.SMTP_PASS };
}

/** Which transport a send would use right now. Exported for tests and logging. */
export function activeMailTransport(): MailTransportName {
  if (smtpConfig()) return 'smtp';
  if (env.MAIL_WEBHOOK_URL) return 'http';
  return env.NODE_ENV === 'production' ? 'none' : 'console';
}

// ---------------------------------------------------------------------------
// SMTP
// ---------------------------------------------------------------------------

interface SmtpReply {
  code: number;
  text: string;
}

type SettledReply = { ok: true; reply: SmtpReply } | { ok: false; error: Error };

/**
 * Line-buffered SMTP reply reader. A reply is one or more lines; every line
 * before the last starts with `NNN-` and the final one with `NNN `, so only the
 * space-separated form ends a reply.
 */
class SmtpReader {
  private buffer = '';
  private ready: SmtpReply[] = [];
  private waiters: Array<(result: SettledReply) => void> = [];
  private failure: Error | null = null;

  private readonly onData = (chunk: string): void => {
    this.buffer += chunk;
    this.drain();
  };

  private readonly onFail = (error: Error): void => {
    this.failure ??= error;
    this.drain();
  };

  private readonly onClose = (): void => {
    this.onFail(new Error('SMTP connection closed before the server replied'));
  };

  constructor(private socket: net.Socket | tls.TLSSocket) {
    socket.setEncoding('utf8');
    socket.on('data', this.onData);
    socket.on('error', this.onFail);
    socket.on('close', this.onClose);
  }

  /** Take one complete reply off the buffer, or null when it is incomplete. */
  private parseReply(): SmtpReply | null {
    const lines: string[] = [];
    let consumed = 0;
    for (;;) {
      const end = this.buffer.indexOf('\n', consumed);
      if (end === -1) return null;
      const line = this.buffer.slice(consumed, end).replace(/\r$/, '');
      consumed = end + 1;
      lines.push(line);
      // The final line of a reply is "NNN" or "NNN text"; "NNN-text" continues.
      if (/^\d{3}(?: |$)/.test(line)) {
        this.buffer = this.buffer.slice(consumed);
        return { code: Number(line.slice(0, 3)), text: lines.join('\n') };
      }
    }
  }

  private drain(): void {
    for (let reply = this.parseReply(); reply; reply = this.parseReply()) {
      this.ready.push(reply);
    }
    while (this.waiters.length > 0 && this.ready.length > 0) {
      const waiter = this.waiters.shift();
      const reply = this.ready.shift();
      if (waiter && reply) waiter({ ok: true, reply });
    }
    if (this.failure) {
      const error = this.failure;
      while (this.waiters.length > 0) this.waiters.shift()?.({ ok: false, error });
    }
  }

  next(): Promise<SmtpReply> {
    const reply = this.ready.shift();
    if (reply) return Promise.resolve(reply);
    if (this.failure) return Promise.reject(this.failure);
    return new Promise<SmtpReply>((resolve, reject) => {
      this.waiters.push((result) => (result.ok ? resolve(result.reply) : reject(result.error)));
    });
  }

  detach(): void {
    this.socket.removeListener('data', this.onData);
    this.socket.removeListener('close', this.onClose);
    // The 'error' listener stays attached on purpose: during the STARTTLS
    // upgrade the raw socket outlives this reader, and an error event with no
    // listener would take the process down.
  }
}

function onceReady(socket: net.Socket | tls.TLSSocket): Promise<void> {
  // Two branches rather than one dynamic event name: the TLS socket is ready on
  // 'secureConnect' (after the handshake), a plain socket on 'connect'.
  return new Promise((resolve, reject) => {
    if (socket instanceof tls.TLSSocket) {
      socket.once('secureConnect', () => resolve());
    } else {
      socket.once('connect', () => resolve());
    }
    socket.once('error', (error) => reject(error));
  });
}

async function command(
  socket: net.Socket | tls.TLSSocket,
  reader: SmtpReader,
  line: string,
  expected: number[],
  label = line.split(' ')[0]
): Promise<SmtpReply> {
  socket.write(`${line}\r\n`);
  const reply = await reader.next();
  if (!expected.includes(reply.code)) {
    // The reply text only: the command may carry credentials.
    throw new Error(`SMTP ${label} was refused (${reply.code}): ${reply.text}`);
  }
  return reply;
}

/** The bare mailbox from `Name <mailbox>`, for the SMTP envelope. */
function envelopeAddress(address: string): string {
  const bracketed = address.match(/<([^>]+)>/);
  return (bracketed ? bracketed[1] : address).trim();
}

/** Strip CR/LF so a header value can never start a new header. */
function headerValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/** RFC 2047 encoded-word for a subject that is not plain ASCII. */
function encodeSubject(subject: string): string {
  const clean = headerValue(subject);
  if (/^[\x20-\x7E]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, 'utf8').toString('base64')}?=`;
}

/**
 * The message body is base64 on purpose: it needs no dot-stuffing (no line can
 * become the "." that ends DATA), no 76-column folding of UTF-8 text, and no
 * 8-bit-clean transport between here and the mailbox.
 */
function buildSmtpMessage(from: string, message: MailMessage): string {
  const encoded = Buffer.from(message.text, 'utf8').toString('base64');
  const body = (encoded.match(/.{1,76}/g) ?? []).join('\r\n');
  return [
    `From: ${headerValue(from)}`,
    `To: ${headerValue(message.to)}`,
    `Subject: ${encodeSubject(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@zurilofts>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
  ].join('\r\n');
}

async function sendViaSmtp(message: MailMessage): Promise<void> {
  const config = smtpConfig();
  if (!config) throw new MailNotConfiguredError('SMTP is not configured');

  const implicitTls = config.port === 465;
  let socket: net.Socket | tls.TLSSocket = implicitTls
    ? tls.connect({ host: config.host, port: config.port, servername: config.host })
    : net.connect({ host: config.host, port: config.port });
  socket.setTimeout(SMTP_TIMEOUT_MS, () => socket.destroy(new Error('SMTP timed out')));

  try {
    await onceReady(socket);
    let reader = new SmtpReader(socket);
    const greeting = await reader.next();
    if (greeting.code !== 220) throw new Error(`SMTP greeting was refused (${greeting.code}): ${greeting.text}`);

    const hostname = 'zurilofts.local';
    const ehlo = await command(socket, reader, `EHLO ${hostname}`, [250]);

    if (!implicitTls) {
      if (!/STARTTLS/i.test(ehlo.text)) {
        // Sending the AUTH exchange or a reset link over plain TCP would expose
        // both to anyone on the path.
        throw new Error('SMTP server does not offer STARTTLS; refusing to send mail in clear text');
      }
      await command(socket, reader, 'STARTTLS', [220]);
      reader.detach();
      socket = tls.connect({ socket: socket as net.Socket, servername: config.host });
      socket.setTimeout(SMTP_TIMEOUT_MS, () => socket.destroy(new Error('SMTP timed out')));
      await onceReady(socket);
      reader = new SmtpReader(socket);
      // The capabilities are re-announced after the upgrade, so ask again.
      await command(socket, reader, `EHLO ${hostname}`, [250]);
    }

    if (config.user && config.pass) {
      const token = Buffer.from(`\0${config.user}\0${config.pass}`, 'utf8').toString('base64');
      await command(socket, reader, `AUTH PLAIN ${token}`, [235]);
    }

    await command(socket, reader, `MAIL FROM:<${envelopeAddress(config.from)}>`, [250]);
    await command(socket, reader, `RCPT TO:<${envelopeAddress(message.to)}>`, [250, 251]);
    await command(socket, reader, 'DATA', [354]);
    await command(socket, reader, `${buildSmtpMessage(config.from, message)}\r\n.`, [250], 'DATA payload');
    // The server may close before answering QUIT; the message is already accepted.
    await command(socket, reader, 'QUIT', [221]).catch(() => undefined);
    reader.detach();
  } finally {
    socket.destroy();
  }
}

// ---------------------------------------------------------------------------
// HTTP bridge
// ---------------------------------------------------------------------------

async function sendViaWebhook(message: MailMessage): Promise<void> {
  const url = env.MAIL_WEBHOOK_URL;
  if (!url) throw new MailNotConfiguredError('MAIL_WEBHOOK_URL is not configured');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM ?? '', to: message.to, subject: message.subject, text: message.text }),
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Mail webhook answered ${response.status}`);
  }
}

// ---------------------------------------------------------------------------
// Console (development)
// ---------------------------------------------------------------------------

function sendToConsole(message: MailMessage): void {
  // No transport is configured, so the log is the only way a developer can
  // finish the flow locally. Never reached in production: see activeMailTransport.
  console.info(
    `[mail] development transport, nothing was emailed\n  To: ${message.to}\n  Subject: ${message.subject}\n\n${message.text}\n`
  );
}

/**
 * Send one plain-text message and report which transport carried it.
 * Throws MailNotConfiguredError when nothing is configured, and any transport's
 * own error upwards: a caller that must not leak (password reset) has to catch
 * this itself rather than have the mailer pretend it worked.
 */
export async function sendMail(message: MailMessage): Promise<MailTransportName> {
  const transport = activeMailTransport();
  if (transport === 'none') {
    throw new MailNotConfiguredError(
      'No mail transport is configured (set SMTP_HOST/SMTP_PORT/MAIL_FROM or MAIL_WEBHOOK_URL)'
    );
  }
  if (transport === 'console') {
    sendToConsole(message);
    return transport;
  }
  if (transport === 'http') {
    await sendViaWebhook(message);
    return transport;
  }
  await sendViaSmtp(message);
  return transport;
}
