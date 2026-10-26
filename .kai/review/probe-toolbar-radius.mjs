// Close-up of the places/restaurants toolbar plus the measured radius of every
// control in it, so a rounded box is not mistaken for a pill at a glance.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const page = await context.newPage();
page.setDefaultTimeout(20000);
await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, body: '{}' }));

for (const path of ['/places', '/restaurants']) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.op-place-search-wrap', { timeout: 15000 });
  await page.waitForTimeout(600);

  const data = await page.evaluate(() => {
    const row = document.querySelector('.op-places-list > div:nth-child(2)');
    const measure = (el, label) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        label,
        tag: el.tagName.toLowerCase(),
        w: Math.round(r.width),
        h: Math.round(r.height),
        radius: cs.borderTopLeftRadius,
        border: cs.borderTopWidth + ' ' + cs.borderTopColor,
      };
    };
    return {
      rowWidth: row?.clientWidth,
      controls: [
        measure(document.querySelector('.op-place-search-wrap'), 'search wrapper'),
        measure(document.querySelector('.op-place-search-wrap input'), 'search input'),
        ...[...document.querySelectorAll('.op-place-select-field')].map((el, i) => measure(el, `select wrapper ${i + 1}`)),
        ...[...document.querySelectorAll('.op-place-select-field button')].map((el, i) => measure(el, `select trigger ${i + 1}`)),
        measure(document.querySelector('.op-place-clear'), 'clear all'),
        measure(document.querySelector('.op-place-count'), 'count'),
      ].filter(Boolean),
    };
  });
  const name = path.replace('/', '');
  await page.locator('.op-places-list > div:nth-child(2)').screenshot({ path: `${OUT}/toolbar-zoom-${name}.png` });
  console.log(path, JSON.stringify(data, null, 2));
}

await browser.close();
