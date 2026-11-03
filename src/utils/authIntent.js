export const NAV_MODE_STORAGE_KEY = 'zurilofts_nav_mode';
const POST_AUTH_MODE_STORAGE_KEY = 'zurilofts_post_auth_mode';
const POST_AUTH_PATH_KEY = 'zurilofts_post_auth_path';
// The remembered side belongs to the account that chose it. Without this the
// value sat in a browser-wide key, so the next person to sign in on the same
// browser inherited the previous account's side - a guest arriving to a host
// header, which is what made Messages point at the wrong inbox.
const NAV_MODE_OWNER_KEY = 'zurilofts_nav_mode_owner';

export function rememberPostAuthMode(mode) {
  try {
    window.localStorage.setItem(
      POST_AUTH_MODE_STORAGE_KEY,
      mode === 'hosting' ? 'hosting' : 'travelling',
    );
  } catch (err) {
    console.error('Failed to persist post-auth mode:', err);
  }
}

export function consumePostAuthMode() {
  try {
    const mode = window.localStorage.getItem(POST_AUTH_MODE_STORAGE_KEY);
    window.localStorage.removeItem(POST_AUTH_MODE_STORAGE_KEY);
    return mode === 'hosting' ? 'hosting' : 'travelling';
  } catch {
    return 'travelling';
  }
}

export function rememberNavMode(mode, userId) {
  try {
    window.localStorage.setItem(
      NAV_MODE_STORAGE_KEY,
      mode === 'hosting' ? 'hosting' : 'travelling',
    );
    if (userId) window.localStorage.setItem(NAV_MODE_OWNER_KEY, userId);
  } catch (err) {
    console.error('Failed to persist nav mode:', err);
  }
}

// The side to open on for the signed-in account. Someone else's stored side is
// ignored rather than inherited, so every sign-in starts where it should.
export function readNavMode(userId) {
  try {
    if (!userId) return 'travelling';
    if (window.localStorage.getItem(NAV_MODE_OWNER_KEY) !== userId) return 'travelling';
    return window.localStorage.getItem(NAV_MODE_STORAGE_KEY) === 'hosting' ? 'hosting' : 'travelling';
  } catch {
    return 'travelling';
  }
}

/**
 * Accept only a path on this site as a return destination.
 *
 * A link someone else wrote can put anything in returnUrl, so a scheme, a host
 * or a protocol-relative start is refused rather than passed to the router:
 * otherwise signing in could forward the person to another site, which is the
 * classic open-redirect shape.
 */
export function safeInternalPath(candidate) {
  if (typeof candidate !== 'string') return null;
  const value = candidate.trim();
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  // Backslashes are normalised to slashes by some browsers, so "/\evil.com"
  // would become a host.
  if (value.includes('\\')) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

/**
 * Remember where the person was headed before they were asked to sign in.
 *
 * sessionStorage rather than localStorage: it belongs to this tab, it survives
 * the full-page round trip through Google sign-in, and it is gone when the tab
 * closes, so a stale destination cannot greet the next person.
 */
export function rememberPostAuthPath(path) {
  const safe = safeInternalPath(path);
  if (!safe) return;
  try {
    window.sessionStorage.setItem(POST_AUTH_PATH_KEY, safe);
  } catch (err) {
    console.error('Failed to persist return path:', err);
  }
}

/** Read and clear the remembered destination. */
export function consumePostAuthPath() {
  try {
    const value = window.sessionStorage.getItem(POST_AUTH_PATH_KEY);
    window.sessionStorage.removeItem(POST_AUTH_PATH_KEY);
    return safeInternalPath(value);
  } catch {
    return null;
  }
}
