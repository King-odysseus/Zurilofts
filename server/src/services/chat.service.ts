import { env } from '../config/env.js';

// ── In-memory chat store ──────────────────────────────────────────────
// Conversations live in memory only; an active chat is lost on restart.
// That is acceptable for live website chat (the visitor is on the page).

export interface ChatMessage {
  id: number;
  from: 'user' | 'agent';
  text: string;
  ts: number;
}

interface Session {
  id: string;
  messages: ChatMessage[];
  seq: number;
  lastActivity: number;
}

const MAX_MESSAGES_PER_SESSION = 100;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_SESSIONS = 500;

const sessions = new Map<string, Session>(); // full sessionId -> Session
const suffixIndex = new Map<string, string>(); // last-8 chars -> full sessionId
let recentSessionId: string | null = null; // fallback target for non-reply replies

function pruneSessions(): void {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastActivity > SESSION_TTL_MS) {
      sessions.delete(id);
      suffixIndex.delete(id.slice(-8));
    }
  }
  if (sessions.size > MAX_SESSIONS) {
    const oldest = [...sessions.values()].sort((a, b) => a.lastActivity - b.lastActivity);
    for (const s of oldest.slice(0, sessions.size - MAX_SESSIONS)) {
      sessions.delete(s.id);
      suffixIndex.delete(s.id.slice(-8));
    }
  }
}

function getOrCreate(sessionId: string): Session {
  let s = sessions.get(sessionId);
  if (!s) {
    pruneSessions();
    s = { id: sessionId, messages: [], seq: 0, lastActivity: Date.now() };
    sessions.set(sessionId, s);
    suffixIndex.set(sessionId.slice(-8), sessionId);
  }
  return s;
}

function append(sessionId: string, from: 'user' | 'agent', text: string): void {
  const s = getOrCreate(sessionId);
  s.seq += 1;
  s.messages.push({ id: s.seq, from, text, ts: Date.now() });
  if (s.messages.length > MAX_MESSAGES_PER_SESSION) {
    s.messages.splice(0, s.messages.length - MAX_MESSAGES_PER_SESSION);
  }
  s.lastActivity = Date.now();
}

export function recordUserMessage(sessionId: string, text: string): void {
  append(sessionId, 'user', text);
  recentSessionId = sessionId;
}

export function recordAgentReply(sessionId: string, text: string): void {
  append(sessionId, 'agent', text);
}

export function getMessagesAfter(sessionId: string, afterId: number): ChatMessage[] {
  const s = sessions.get(sessionId);
  if (!s) return [];
  return s.messages.filter((m) => m.id > afterId);
}

// ── Telegram reply poller ─────────────────────────────────────────────
// Long-polls getUpdates. When the team *replies* (Telegram reply) to a
// forwarded guest message, the session token embedded in that message is
// parsed and the reply is routed back to the right conversation.

let pollerStarted = false;
let offset = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function resolveSession(suffix: string): string | null {
  return suffixIndex.get(suffix) ?? null;
}

function handleUpdate(update: any): void {
  const msg = update?.message;
  if (!msg || typeof msg.text !== 'string') return;

  const text: string = msg.text.trim();
  if (!text || text.startsWith('/')) return; // ignore bot commands

  // Only accept replies from the configured chat
  if (env.TELEGRAM_CHAT_ID && String(msg.chat?.id) !== String(env.TELEGRAM_CHAT_ID)) {
    return;
  }

  let sessionId: string | null = null;
  const replyText: string | undefined = msg.reply_to_message?.text;
  if (replyText) {
    const m = replyText.match(/Session:\s*`?([A-Za-z0-9]{6,})`?/);
    if (m) sessionId = resolveSession(m[1]);
  }
  // Fallback: route to the most recently active guest.
  // Works well for the common case (one visitor at a time).
  // Edge case: if two guests chat simultaneously, a non-reply
  // message from the team will go to whichever sent a message last.
  // The fix is to always use Telegram Reply on the guest message,
  // which embeds the session token and routes precisely.
  if (!sessionId) sessionId = recentSessionId;
  if (!sessionId) return;

  recordAgentReply(sessionId, text);
}

async function pollLoop(token: string): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?timeout=30&offset=${offset}&allowed_updates=${encodeURIComponent('["message"]')}`,
      );
      const data: any = await res.json();
      if (data?.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          handleUpdate(update);
        }
      } else if (data && data.ok === false) {
        console.error('Telegram getUpdates error:', data.description);
        await sleep(5000);
      }
    } catch (err) {
      console.error('Telegram poll error:', (err as Error).message);
      await sleep(5000);
    }
  }
}

export function startTelegramPoller(): void {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('💬 Telegram reply poller not started (TELEGRAM_BOT_TOKEN not set)');
    return;
  }
  if (pollerStarted) return;
  pollerStarted = true;
  console.log('💬 Telegram reply poller started');
  void pollLoop(token);
}
