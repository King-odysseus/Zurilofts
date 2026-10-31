export const NAV_MODE_STORAGE_KEY = 'zurilofts_nav_mode';
const POST_AUTH_MODE_STORAGE_KEY = 'zurilofts_post_auth_mode';
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
