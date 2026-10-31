import { ValidationError } from '../types/index.js';

/**
 * Attachments on a chat message.
 *
 * Storage is a single JSON column rather than a join table: a message carries at
 * most five files and they are always read together with it, so a relation would
 * only add a join to every thread query.
 *
 * Everything that reaches the column goes through normalizeAttachments, which
 * rebuilds each entry from known fields. Storing the client object as received
 * would let it smuggle arbitrary keys into a row that every thread response
 * hands back to the other party.
 */

export interface MessageAttachment {
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

const MAX_ATTACHMENTS = 5;
const MAX_NAME_LENGTH = 200;
const MAX_MIME_LENGTH = 100;
// Generous cap: a Cloudinary delivery URL is well under this, and it stops a
// multi-kilobyte string being used as an attachment url.
const MAX_URL_LENGTH = 2000;
const FALLBACK_NAME = 'Attachment';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Only urls our own upload endpoint can produce: a local /uploads/* path or an
 *  absolute http(s) Cloudinary url. javascript:, data: and file: are refused so
 *  a crafted message cannot become a click-to-run link in the other party's UI. */
function isAllowedUrl(url: string): boolean {
  // A ".." segment never comes from our upload endpoint, and these urls are
  // rendered straight into <img src> and <a href>, so refuse the shape outright
  // rather than relying on the static handler to normalise it away.
  if (url.includes('..')) return false;
  return url.startsWith('/uploads/') || url.startsWith('http://') || url.startsWith('https://');
}

function normalizeOne(entry: unknown, index: number): MessageAttachment {
  const label = `Attachment ${index + 1}`;

  if (!isRecord(entry)) {
    throw new ValidationError(`${label} is not a valid attachment`);
  }

  const url = typeof entry.url === 'string' ? entry.url.trim() : '';
  if (!url || url.length > MAX_URL_LENGTH || !isAllowedUrl(url)) {
    throw new ValidationError(`${label} has an invalid url`);
  }

  // The name is only a label under the file icon, so a missing or unusable one
  // falls back instead of failing a message the user has already sent.
  const rawName = typeof entry.name === 'string' ? entry.name.trim() : '';
  const name = rawName ? rawName.slice(0, MAX_NAME_LENGTH) : FALLBACK_NAME;

  const mimeType = typeof entry.mimeType === 'string' ? entry.mimeType.trim().slice(0, MAX_MIME_LENGTH) : '';
  if (!mimeType) {
    throw new ValidationError(`${label} has an invalid type`);
  }

  // A bad size only affects the "1.2 MB" caption, so it degrades to 0.
  const size =
    typeof entry.size === 'number' && Number.isFinite(entry.size) && entry.size >= 0
      ? Math.round(entry.size)
      : 0;

  return { url, name, mimeType, size };
}

/**
 * Validate client-supplied attachments and return the JSON to store, or null
 * when there are none. Throws ValidationError on input that cannot be trusted,
 * so the caller can reject the message before writing anything.
 */
export function normalizeAttachments(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (!Array.isArray(input)) {
    throw new ValidationError('Attachments must be a list');
  }
  if (input.length === 0) return null;
  if (input.length > MAX_ATTACHMENTS) {
    throw new ValidationError(`You can attach at most ${MAX_ATTACHMENTS} files to a message`);
  }

  return JSON.stringify(input.map(normalizeOne));
}

function isMessageAttachment(value: unknown): value is MessageAttachment {
  if (!isRecord(value)) return false;
  return (
    typeof value.url === 'string' &&
    typeof value.name === 'string' &&
    typeof value.mimeType === 'string' &&
    typeof value.size === 'number'
  );
}

/**
 * Read the stored JSON back as an array. Never throws: a row written by an older
 * client, or hand-edited, must not break the whole thread response.
 */
export function parseAttachments(raw: string | null | undefined): MessageAttachment[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not JSON: a row written before the column existed or by a broken client.
    // No attachment beats a 500 for the whole thread.
    return [];
  }

  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isMessageAttachment);
}

/**
 * API shape for a message row: the column becomes a real array so no client ever
 * has to JSON.parse it.
 */
export function withParsedAttachments<T extends { attachments: string | null }>(message: T) {
  // Return type is inferred on purpose. An explicit Omit<T, 'attachments'> & {...}
  // annotation asks tsc to prove a rest-spread over a generic row matches, which
  // it sometimes refuses; inference yields the same shape without that argument.
  const { attachments, ...rest } = message;
  return { ...rest, attachments: parseAttachments(attachments) };
}
