// Verifies the theme bootstrap survives the production Content-Security-Policy,
// which is what broke it in production: an inline script was blocked, so the dark
// class was only applied after React mounted (a white flash on every load).
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = process.argv[2] || 'http://localhost:3100';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

// Dark preference saved, exactly as a returning dark-mode visitor has.
const context = await browser.newContext({ viewport: { width: 900, height: 800 } });
await context.addInitScript(() => localStorage.setItem('zurilofts_theme', 'dark'));
const page = await context.newPage();
page.setDefaultTimeout(30000);

const cspErrors = [];
page.on('console', (m) => {
  const t = m.text();
  if (/Content Security Policy|Refused to execute/i.test(t)) cspErrors.push(t.slice(0, 160));
});

// Record the class before any app JavaScript runs: if the theme script worked this
// is already 'dark' at first paint, which is the whole point.
let classAtFirstPaint = null;
await page.goto(`${BASE}/`, { waitUntil: 'commit' });
classAtFirstPaint = await page.evaluate(() => document.documentElement.className).catch(() => 'unreadable');
await page.waitForTimeout(3500);
const after = await page.evaluate(() => ({
  cls: document.documentElement.className,
  colorMode: document.documentElement.dataset.colorMode,
  bg: getComputedStyle(document.body).backgroundColor,
}));

console.log('theme-init.js status:', (await page.request.get(`${BASE}/theme-init.js`)).status());
console.log('class at first paint:', JSON.stringify(classAtFirstPaint));
console.log('class after load   :', JSON.stringify(after.cls), '| data-color-mode:', after.colorMode);
console.log('body background    :', after.bg);
console.log('CSP errors         :', cspErrors.length ? cspErrors.join(' || ') : 'none');

const ok = after.cls.includes('dark') && cspErrors.length === 0;
console.log(ok ? 'PASS' : 'FAIL');
await browser.close();
