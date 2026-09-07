export const NAV_MODE_STORAGE_KEY = 'zurilofts_nav_mode';
const POST_AUTH_MODE_STORAGE_KEY = 'zurilofts_post_auth_mode';

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

export function rememberNavMode(mode) {
  try {
    window.localStorage.setItem(
      NAV_MODE_STORAGE_KEY,
      mode === 'hosting' ? 'hosting' : 'travelling',
    );
  } catch (err) {
    console.error('Failed to persist nav mode:', err);
  }
}
