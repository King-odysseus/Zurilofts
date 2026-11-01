import { env } from '../config/env.js';

/**
 * Machine translation for the text a dictionary cannot hold.
 *
 * Every string that belongs to the product itself is translated by hand and
 * lives in src/i18n. This service is for the other kind of text: listing copy,
 * review comments, add-on names, guide paragraphs - words a host or a guest
 * wrote, which only exist in the database. Those are translated on demand and
 * cached, so a page that shows the same listing twice is paid for once.
 *
 * Failure is deliberately quiet. If the provider is slow, out of credit or
 * misconfigured, the caller gets its original English back and the page still
 * renders. A translation improves the page; it must never be able to break it.
 */

export type TranslationTarget = 'sw';

const SOURCE_LANGUAGE = 'en';
const SUPPORTED_TARGETS: readonly TranslationTarget[] = ['sw'];

// Bounds on what one request can cost. The browser splits anything larger, and
// a single over-long field (a guide paragraph) is cut rather than rejected:
// 1000 characters of Swahili beats an empty section.
export const MAX_TEXTS_PER_REQUEST = 40;
const MAX_CHARS_PER_TEXT = 1000;

// Provider answers repeat heavily within a session but a new visitor is a new
// set of lookups, so the server keeps its own copy for the life of the process.
// The cap counts entries rather than bytes; 1000 characters is the worst case
// per entry, so this is a few megabytes at most.
const CACHE_LIMIT = 5000;
const cache = new Map<string, string>();

function cacheKey(target: TranslationTarget, text: string): string {
  return `${target}\u0000${text}`;
}

function remember(target: TranslationTarget, source: string, translated: string): void {
  const key = cacheKey(target, source);
  // Re-insert so the entry counts as freshly used and is not the one evicted.
  cache.delete(key);
  cache.set(key, translated);
  if (cache.size > CACHE_LIMIT) {
    // A Map iterates in insertion order, so the first key is the oldest.
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
}

/**
 * Whether a translation provider is usable at all. With no provider the
 * endpoint still answers, with the original text, so the client needs no
 * special case: it always gets one string back per string it sent.
 */
export function isTranslationConfigured(): boolean {
  switch (env.TRANSLATION_PROVIDER) {
    case 'none':
      return false;
    case 'libretranslate':
      // A self-hosted instance needs a URL but no key; the hosted service needs
      // a key. Either one is enough to be worth calling.
      return Boolean(env.TRANSLATION_ENDPOINT || env.TRANSLATION_API_KEY);
    default:
      return Boolean(env.TRANSLATION_API_KEY);
  }
}

/**
 * Private message bodies are a different promise from public listing copy:
 * translating them sends a guest's words to a third party. The switch exists so
 * that decision is made on purpose, and only after the privacy policy says so.
 */
export function isPrivateTranslationAllowed(): boolean {
  return env.TRANSLATION_PRIVATE_CONTENT === 'true';
}

export function isSupportedTarget(value: unknown): value is TranslationTarget {
  return typeof value === 'string' && (SUPPORTED_TARGETS as readonly string[]).includes(value);
}

// Machine translators escape quotes and ampersands even when asked for plain
// text. Left alone these arrive on screen as "&#39;" in the middle of a
// description, which reads like a bug rather than a translation.
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const code = isHex
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      // Only printable code points: a broken number would otherwise throw or
      // produce a character the reader cannot see or act on.
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

// Whitespace, prices, dates and reference numbers carry no English to
// translate, and a provider charging per character should not be asked.
function needsTranslation(text: string): boolean {
  return text.trim().length > 1 && /[a-zA-Z]/.test(text);
}

async function readError(res: Response): Promise<string> {
  const body = await res.text().catch(() => '');
  return `${res.status} ${body.slice(0, 200)}`;
}

async function translateWithGoogle(
  texts: string[],
  target: TranslationTarget
): Promise<string[]> {
  const key = encodeURIComponent(env.TRANSLATION_API_KEY ?? '');
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: texts, source: SOURCE_LANGUAGE, target, format: 'text' }),
    }
  );
  if (!res.ok) throw new Error(`Google Translate failed: ${await readError(res)}`);
  const body = (await res.json()) as {
    data?: { translations?: { translatedText?: string }[] };
  };
  const out = body.data?.translations;
  if (!Array.isArray(out) || out.length !== texts.length) {
    throw new Error('Google Translate returned a different number of strings than it was sent');
  }
  return out.map((entry, i) => decodeEntities(entry.translatedText ?? texts[i]));
}

async function translateWithAzure(
  texts: string[],
  target: TranslationTarget
): Promise<string[]> {
  const base = (env.TRANSLATION_ENDPOINT || 'https://api.cognitive.microsofttranslator.com')
    .replace(/\/+$/, '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': env.TRANSLATION_API_KEY ?? '',
  };
  if (env.TRANSLATION_REGION) headers['Ocp-Apim-Subscription-Region'] = env.TRANSLATION_REGION;

  const res = await fetch(
    `${base}/translate?api-version=3.0&from=${SOURCE_LANGUAGE}&to=${target}`,
    { method: 'POST', headers, body: JSON.stringify(texts.map((Text) => ({ Text }))) }
  );
  if (!res.ok) throw new Error(`Azure Translator failed: ${await readError(res)}`);
  const body = (await res.json()) as { translations?: { text?: string }[] }[];
  if (!Array.isArray(body) || body.length !== texts.length) {
    throw new Error('Azure Translator returned a different number of strings than it was sent');
  }
  return body.map((entry, i) => decodeEntities(entry?.translations?.[0]?.text ?? texts[i]));
}

async function translateWithLibreTranslate(
  texts: string[],
  target: TranslationTarget
): Promise<string[]> {
  const base = (env.TRANSLATION_ENDPOINT || 'https://libretranslate.com').replace(/\/+$/, '');
  const res = await fetch(`${base}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: texts,
      source: SOURCE_LANGUAGE,
      target,
      format: 'text',
      ...(env.TRANSLATION_API_KEY ? { api_key: env.TRANSLATION_API_KEY } : {}),
    }),
  });
  if (!res.ok) throw new Error(`LibreTranslate failed: ${await readError(res)}`);
  const body = (await res.json()) as { translatedText?: string | string[] };
  const out = body.translatedText;
  if (Array.isArray(out) && out.length === texts.length) {
    return out.map((entry, i) => decodeEntities(entry || texts[i]));
  }
  // Older LibreTranslate builds answer one string at a time and ignore the
  // array form, which is still usable when the caller sent a single string.
  if (typeof out === 'string' && texts.length === 1) return [decodeEntities(out)];
  throw new Error('LibreTranslate returned an unexpected shape; upgrade the instance to batch translations');
}

async function callProvider(
  texts: string[],
  target: TranslationTarget
): Promise<string[]> {
  switch (env.TRANSLATION_PROVIDER) {
    case 'google':
      return translateWithGoogle(texts, target);
    case 'azure':
      return translateWithAzure(texts, target);
    case 'libretranslate':
      return translateWithLibreTranslate(texts, target);
    default:
      throw new Error(`Unknown translation provider "${env.TRANSLATION_PROVIDER}"`);
  }
}

export interface TranslationResult {
  // One entry per string that was sent, in the same order. Untranslatable or
  // failed strings come back unchanged, so the caller can render the result
  // without checking whether translation happened.
  translations: string[];
  provider: string;
  // False when no provider is configured. The browser uses this to stop asking:
  // without it, every Swahili page would make a request that could only ever
  // return the original English.
  configured: boolean;
  // How many strings were fetched from the provider this time, which is the
  // part that costs money. Zero means everything was cached or skipped.
  translatedCount: number;
}

export async function translateTexts(
  input: string[],
  target: TranslationTarget
): Promise<TranslationResult> {
  const texts = input.map((text) => (typeof text === 'string' ? text.slice(0, MAX_CHARS_PER_TEXT) : ''));
  const provider = env.TRANSLATION_PROVIDER;
  const answers = new Map<string, string>();
  const configured = isTranslationConfigured();
  const unchanged = (): TranslationResult => ({
    translations: texts.map((text) => answers.get(text) ?? text),
    provider,
    configured,
    translatedCount: 0,
  });

  if (!configured) return unchanged();

  // Asking for the same string twice in one batch would pay for it twice, so
  // work per unique string and map the answers back onto the original order.
  const missing: string[] = [];
  const requested = new Set<string>();
  for (const text of texts) {
    if (!needsTranslation(text)) {
      answers.set(text, text);
      continue;
    }
    const cached = cache.get(cacheKey(target, text));
    if (cached !== undefined) {
      answers.set(text, cached);
      continue;
    }
    if (requested.has(text)) continue;
    requested.add(text);
    missing.push(text);
  }

  if (missing.length === 0) return unchanged();

  let translated: string[];
  try {
    translated = await callProvider(missing, target);
  } catch (error) {
    // Fall back to English rather than failing the request. Logged with the
    // reason, because a provider that is out of credit looks identical to one
    // that is merely slow, and only the log can tell them apart.
    console.error(
      '[translation] provider call failed:',
      error instanceof Error ? error.message : error
    );
    return unchanged();
  }

  missing.forEach((text, i) => {
    const result = translated[i]?.trim();
    if (!result || result === text) {
      answers.set(text, text);
      return;
    }
    answers.set(text, result);
    remember(target, text, result);
  });

  return {
    translations: texts.map((text) => answers.get(text) ?? text),
    provider,
    configured,
    translatedCount: missing.length,
  };
}
