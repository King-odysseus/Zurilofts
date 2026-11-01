/*
 * Applies the saved theme before first paint.
 *
 * This runs as a separate same-origin file rather than an inline <script> because
 * the API server sends a strict Content-Security-Policy (script-src 'self'), which
 * blocks inline scripts. Blocked, it ran only after React mounted, so anyone on the
 * dark theme saw a white flash on every page load.
 *
 * The choice belongs to the signed-in account (src/utils/themeStorage.js owns the
 * rules):
 *   zurilofts_theme:<id>    the choice for one account
 *   zurilofts_theme_active  which account to expect on load
 *
 * The account id is read from storage rather than from the API because the
 * session lives in an httpOnly cookie that cannot be checked this early, and a
 * returning dark-mode user must not see a white page while it is.
 *
 * Those key names are repeated from themeStorage.js, which this file cannot
 * import. Change them in both places or the page will paint one theme and
 * settle on another.
 *
 * Two deliberate omissions:
 * - The old shared 'zurilofts_theme' value is deleted here and never read. It
 *   holds the last user's choice on browsers that ran the previous code, and
 *   reading it is what let one person's dark page greet the next person.
 * - Falls back to light, not the operating system: following the OS landed
 *   brand-new visitors on a dark page they never asked for.
 */
(() => {
  try {
    localStorage.removeItem('zurilofts_theme');
  } catch {
    // Storage unavailable; nothing to clear and the light default still applies.
  }

  try {
    const account = localStorage.getItem('zurilofts_theme_active');
    const stored = account ? localStorage.getItem(`zurilofts_theme:${account}`) : null;
    const preferred = stored === 'dark' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', preferred === 'dark');
    document.documentElement.dataset.colorMode = preferred;
    document.documentElement.style.colorScheme = preferred;
  } catch {
    // Storage unavailable: React applies the light default a moment later.
  }
})();
