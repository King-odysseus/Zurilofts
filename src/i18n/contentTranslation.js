import apiClient from '../api/client.js';

/**
 * Machine translation for the words a dictionary cannot hold.
 *
 * Everything the product itself says is translated by hand in src/i18n. This
 * module is for the other text on a page: the listing copy, review comments and
 * guide paragraphs that arrive from the database after a host or guest wrote
 * them. Those are fetched on demand, one batch per screen, and remembered in the
 * browser so a second visit costs nothing.
 *
 * Nothing here can fail loudly. A string that cannot be translated comes back as
 * the English the page already had, so the layout never waits and never breaks.
 */

const TARGET = 'sw';
// Matches MAX_TEXTS_PER_REQUEST on the server: a larger batch would be refused.
const MAX_BATCH = 40;
// Long enough to collect every component that mounts in one render, short
// enough that a reader does not notice the switch from English.
const FLUSH_DELAY_MS = 40;
const STORAGE_KEY = 'zuri_translation_sw_v1';
const STORAGE_LIMIT = 400;
const RETRY_AFTER_MS = 5 * 60 * 1000;

// Set when the server says no provider is configured. Asking again cannot
// produce a translation, so the browser stops asking until the page reloads.
let translationOff = false;

const cache = loadCache();
const inFlight = new Map();
const retryAfter = new Map();
let queue = [];
let flushTimer = null;
let persistTimer = null;

function loadCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return new Map();
    return new Map(
      Object.entries(parsed).filter(([, value]) => typeof value === 'string')
    );
  } catch {
    // Private browsing, or a storage partition the browser blocks. Translations
    // then live for the visit only, which costs a call but changes nothing the
    // reader sees.
    return new Map();
  }
}

function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      // Keep the newest entries: the map iterates in insertion order, so the
      // oldest keys are the ones nobody is likely to ask for again.
      const newest = [...cache.entries()].slice(-STORAGE_LIMIT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(newest)));
    } catch {
      // Quota or blocked storage. The in-memory copy still serves this visit.
    }
  }, 500);
}

function remember(text, translated) {
  cache.set(text, translated);
  schedulePersist();
}

/** Only Swahili is machine-translated; English is the source text. */
export function supportsAutoTranslation(lang) {
  return lang === TARGET;
}

/**
 * The known translation for a string, if it has already arrived. Lets a
 * component render in Swahili on the first paint instead of flashing English
 * and then correcting itself.
 */
export function peekTranslation(text) {
  if (typeof text !== 'string') return undefined;
  return cache.get(text);
}

/**
 * Resolves with the Swahili for `text`, or with `text` itself when it cannot be
 * translated. It never rejects, so a caller can render either way.
 */
export function translateText(text, { private: isPrivate = false } = {}) {
  if (translationOff) return Promise.resolve(text);
  if (typeof text !== 'string' || text.trim().length < 2) return Promise.resolve(text);

  const cached = cache.get(text);
  if (cached !== undefined) return Promise.resolve(cached);

  const retryAt = retryAfter.get(text);
  if (retryAt !== undefined && retryAt > Date.now()) return Promise.resolve(text);

  const existing = inFlight.get(text);
  if (existing) return existing;

  const promise = new Promise((resolve) => {
    queue.push({ text, isPrivate, resolve });
    scheduleFlush();
  });
  inFlight.set(text, promise);
  promise.then(() => inFlight.delete(text));
  return promise;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
}

function flush() {
  flushTimer = null;
  if (queue.length === 0) return;

  const batch = queue.splice(0, MAX_BATCH);
  if (queue.length > 0) scheduleFlush();

  // Public listing copy and private message bodies are sent separately: the
  // server treats them differently and must not cache one as the other.
  const publicEntries = batch.filter((entry) => !entry.isPrivate);
  const privateEntries = batch.filter((entry) => entry.isPrivate);
  if (publicEntries.length > 0) void send(publicEntries, false);
  if (privateEntries.length > 0) void send(privateEntries, true);
}

async function send(entries, isPrivate) {
  const texts = [...new Set(entries.map((entry) => entry.text))];
  let translations = [];

  try {
    const res = await apiClient.post('/translations', {
      target: TARGET,
      texts,
      private: isPrivate,
    });
    const data = res?.data?.data;
    if (Array.isArray(data?.translations)) translations = data.translations;
    if (data?.configured === false) translationOff = true;
  } catch (error) {
    // 403 means translating private content is switched off on the server, so
    // retrying changes nothing until someone turns it on. Anything else is
    // treated as temporary, and either way the reader keeps the English.
    const status = error?.response?.status;
    const wait = status === 403 ? 24 * 60 * 60 * 1000 : RETRY_AFTER_MS;
    entries.forEach((entry) => retryAfter.set(entry.text, Date.now() + wait));
    if (status !== 403) {
      console.warn('[translation] request failed:', error?.message ?? error);
    }
  }

  entries.forEach((entry) => {
    const index = texts.indexOf(entry.text);
    const value = index >= 0 ? translations[index] : undefined;
    if (typeof value === 'string' && value && value !== entry.text) {
      remember(entry.text, value);
      retryAfter.delete(entry.text);
      entry.resolve(value);
      return;
    }
    entry.resolve(entry.text);
  });
}
