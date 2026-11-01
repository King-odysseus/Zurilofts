/**
 * Where the light/dark choice is kept.
 *
 * One browser is often shared - a family laptop, an internet cafe, a hotel
 * machine - so a single saved value meant whoever toggled last decided for
 * everyone else, and the next person to use that browser inherited it. The
 * choice now belongs to the signed-in account alone.
 *
 * Two keys:
 *   zurilofts_theme:<id>    the choice for one account
 *   zurilofts_theme_active  which account the page should expect on load
 *
 * The second key exists because the session is restored from an httpOnly cookie
 * after React mounts: at first paint the page cannot ask the API who is signed
 * in, but it must still draw the right theme. So the account id is mirrored
 * here at sign-in and removed at sign-out.
 *
 * Nobody is signed in outside those two keys, and nothing is saved in that
 * state: an anonymous visitor always starts light, and a toggle then lasts for
 * the page in front of them. Saving it again is what let one person's choice
 * follow the next person, which is the bug this file exists to prevent.
 *
 * public/theme-init.js needs the same key names to pick the theme before first
 * paint. That file is served as-is and cannot import this module, so it repeats
 * the strings; change them in both places or the page will paint one theme and
 * settle on another.
 */

export const THEMES = ['light', 'dark'];

// Light unless a person has chosen otherwise. Following the operating system
// put brand-new visitors on a dark page they never asked for, and made "the
// default" different on every device.
export const DEFAULT_THEME = 'light';

const ACCOUNT_KEY_PREFIX = 'zurilofts_theme:';
const ACTIVE_ACCOUNT_KEY = 'zurilofts_theme_active';

// The single shared value used before choices were per account. It holds the
// last user's theme on every browser that ran the old code, so it is deleted
// rather than read: whoever left it there must not decide for the next person.
const LEGACY_SHARED_KEY = 'zurilofts_theme';

// localStorage throws rather than returning null when storage is blocked
// (private browsing, third-party cookie settings), so every access is wrapped.
function readKey(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The theme still applies to this page; only remembering it next time fails.
  }
}

function removeKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to do: the marker stays, and the next load falls back to light.
  }
}

export function activeThemeAccount() {
  return readKey(ACTIVE_ACCOUNT_KEY);
}

/** The storage key for one account, or null when nobody is signed in. */
export function themeKeyFor(accountId) {
  return accountId ? `${ACCOUNT_KEY_PREFIX}${accountId}` : null;
}

/**
 * Deletes the old shared value.
 *
 * Safe to call on every load: it removes one key that is never written again,
 * so a browser that already ran this pays nothing for it.
 */
export function clearLegacySharedTheme() {
  removeKey(LEGACY_SHARED_KEY);
}

/** The saved theme of whoever the page expects to be signed in, else light. */
export function readStoredTheme() {
  const key = themeKeyFor(activeThemeAccount());
  const stored = key ? readKey(key) : null;
  return THEMES.includes(stored) ? stored : DEFAULT_THEME;
}

/** Records the theme against the active account. Does nothing while signed out. */
export function storeTheme(theme) {
  if (!THEMES.includes(theme)) return;
  const key = themeKeyFor(activeThemeAccount());
  if (key) writeKey(key, theme);
}

// The theme provider sits above the auth provider, so it cannot read the signed
// in user directly. Sign-in and sign-out announce the change here instead.
const listeners = new Set();

export function subscribeToThemeAccount(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Points the stored theme at `accountId`, or at nobody when it is null.
 *
 * The account's own saved value is never touched, so signing back in returns
 * that person to the theme they chose.
 */
export function setActiveThemeAccount(accountId) {
  const next = accountId ? String(accountId) : null;
  if (activeThemeAccount() === next) return;

  if (next) writeKey(ACTIVE_ACCOUNT_KEY, next);
  else removeKey(ACTIVE_ACCOUNT_KEY);

  listeners.forEach((listener) => listener());
}
