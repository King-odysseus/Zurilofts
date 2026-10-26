/*
 * Applies the saved theme before first paint.
 *
 * This runs as a separate same-origin file rather than an inline <script> because
 * the API server sends a strict Content-Security-Policy (script-src 'self'), which
 * blocks inline scripts. Blocked, it ran only after React mounted, so anyone on the
 * dark theme saw a white flash on every page load.
 *
 * Kept blocking and in <head> so the class is set before the first paint.
 */
(() => {
  try {
    const stored = localStorage.getItem('zurilofts_theme');
    const preferred =
      stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', preferred === 'dark');
    document.documentElement.dataset.colorMode = preferred;
    document.documentElement.style.colorScheme = preferred;
  } catch {
    // Storage or matchMedia unavailable: the light default is fine.
  }
})();
