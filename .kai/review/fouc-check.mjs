/*
 * Definitive FOUC test: block every app bundle so React never mounts.
 *
 * If the dark class is still applied with the app completely absent, the theme
 * came from the head script before any rendering, which is exactly what stops the
 * white flash. If it is not applied, the theme is coming from React after mount.
 */
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = process.argv[2] || 'https://thezurilofts.com';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: 900, height: 800 } });
await context.addInitScript(() => localStorage.setItem('zurilofts_theme', 'dark'));
const page = await context.newPage();

// Only the page's own JavaScript is blocked; the HTML and the theme script still load.
await page.route('**/assets/**', (route) => route.abort());

const cspErrors = [];
page.on('console', (m) => {
  if (/Content Security Policy|Refused to execute/i.test(m.text())) cspErrors.push(m.text().slice(0, 120));
});

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

const state = await page.evaluate(() => ({
  cls: document.documentElement.className,
  colorMode: document.documentElement.dataset.colorMode,
  bg: getComputedStyle(document.body).backgroundColor,
  appMounted: Boolean(document.querySelector('#root')?.children.length),
  themeScriptPresent: Boolean(document.querySelector('script[src="/theme-init.js"]')),
}));

console.log('app mounted (should be false):', state.appMounted);
console.log('theme script in head:', state.themeScriptPresent);
console.log('dark class applied :', JSON.stringify(state.cls), '| data-color-mode:', state.colorMode);
console.log('body background    :', state.bg);
console.log('CSP errors         :', cspErrors.length ? cspErrors.join(' || ') : 'none');

const dark = state.cls.includes('dark');
console.log(
  dark && !state.appMounted
    ? 'PASS theme is applied by the head script alone, no flash before React'
    : 'FAIL theme depends on React mounting, so a flash remains'
);
await browser.close();
