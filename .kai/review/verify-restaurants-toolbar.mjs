// The restaurants toolbar must match the places one: pill-shaped controls on a
// single line, with "Clear all" and the count never wrapping.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
const page = await context.newPage();
page.setDefaultTimeout(20000);

// A local API may not be running; stub auth refresh so the SPA does not bounce
// the visitor away from the page under test.
await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, body: '{}' }));

const report = [];
for (const width of [1440, 1024, 768, 390]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}/restaurants`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.op-place-search-wrap', { timeout: 15000 });
  await page.waitForTimeout(600);

  const data = await page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        radius: cs.borderTopLeftRadius,
        whiteSpace: cs.whiteSpace,
      };
    };
    const lines = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || 17;
      return Math.round(el.getBoundingClientRect().height / lh);
    };
    const row = document.querySelector('.op-places-list > div:nth-child(2)');
    const clear = document.querySelector('.op-place-clear');
    const count = document.querySelector('.op-place-count');
    return {
      path: location.pathname,
      heading: document.querySelector('.op-places-list h2')?.textContent,
      row: row ? { clientW: row.clientWidth, scrollW: row.scrollWidth, overflow: row.scrollWidth > row.clientWidth + 1 } : null,
      searchInput: box(document.querySelector('.op-place-search-wrap input')),
      selects: [...document.querySelectorAll('.op-place-select-wrap select')].map(box),
      clear: box(clear),
      clearLines: lines(clear),
      clearText: clear?.textContent,
      count: box(count),
      countLines: lines(count),
      countText: count?.textContent,
    };
  });
  report.push({ width, ...data });
  await page.screenshot({ path: `${OUT}/restaurants-toolbar-${width}.png` });
}

// Dark mode pass at desktop width.
await page.emulateMedia({ colorScheme: 'dark' });
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/restaurants`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => document.documentElement.classList.add('dark'));
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/restaurants-toolbar-dark.png` });

console.log(JSON.stringify(report, null, 2));
await browser.close();
