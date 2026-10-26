// The places toolbar must read as one line of pill controls: no wrapped
// "Clear all" / count text, and rounded search + selects at every width.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

// The MCP browser kept a stale service worker that redirected /places to /,
// so block workers here to be sure the URL under test is the one rendered.
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
const page = await context.newPage();
page.setDefaultTimeout(20000);

const report = [];
for (const width of [1440, 1024, 768, 390]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}/places`, { waitUntil: 'domcontentloaded' });
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
        // Line height in px vs box height tells us whether text wrapped.
        lineHeight: Math.round(parseFloat(cs.lineHeight) || 0),
      };
    };
    const row = document.querySelector('.op-places-list > div:nth-child(2)');
    return {
      path: location.pathname,
      row: row ? { clientW: row.clientWidth, scrollW: row.scrollWidth, wrap: getComputedStyle(row).flexWrap } : null,
      searchInput: box(document.querySelector('.op-place-search-wrap input')),
      selects: [...document.querySelectorAll('.op-place-select-wrap')].map(box),
      selectFields: [...document.querySelectorAll('.op-place-select-field')].map(box),
      clear: box(document.querySelector('.op-place-clear')),
      count: box(document.querySelector('.op-place-count')),
      clearText: document.querySelector('.op-place-clear')?.textContent,
      countText: document.querySelector('.op-place-count')?.textContent,
      // A single "Clear all" line is ~17px; anything near twice that wrapped.
      clearLines: Math.round((document.querySelector('.op-place-clear')?.getBoundingClientRect().height || 0) / (parseFloat(getComputedStyle(document.querySelector('.op-place-clear')).lineHeight) || 17)),
      countLines: Math.round((document.querySelector('.op-place-count')?.getBoundingClientRect().height || 0) / (parseFloat(getComputedStyle(document.querySelector('.op-place-count')).lineHeight) || 17)),
    };
  });
  report.push({ width, ...data });
  await page.screenshot({ path: `${OUT}/places-toolbar-${width}.png` });
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
