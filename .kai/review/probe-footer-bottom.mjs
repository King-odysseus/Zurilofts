// Measures where the footer lands on short pages and whether the shell
// stretches the footer down to the bottom of the viewport.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const ROUTES = ['/guides', '/places', '/restaurants', '/terms'];
const WIDTHS = [390, 768, 1024, 1440];

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const page = await browser.newPage();

for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 900 });
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const m = await page.evaluate(() => {
      const doc = document.documentElement;
      const app = document.querySelector('.zl-app');
      const footer = document.querySelector('.opg-footer') || document.querySelector('footer');
      const body = document.body;
      const f = footer?.getBoundingClientRect();
      return {
        scrollH: Math.round(doc.scrollHeight),
        viewH: window.innerHeight,
        appH: app ? Math.round(app.getBoundingClientRect().height) : null,
        appDisplay: app ? getComputedStyle(app).display : null,
        footerTop: f ? Math.round(f.top + window.scrollY) : null,
        footerBottom: f ? Math.round(f.bottom + window.scrollY) : null,
        footerBg: footer ? getComputedStyle(footer).backgroundColor : null,
        bodyBg: getComputedStyle(body).backgroundColor,
        gapUnderFooter: f ? Math.round(doc.scrollHeight - (f.bottom + window.scrollY)) : null,
        appChildren: app ? [...app.children].map((c) => `${c.tagName.toLowerCase()}.${c.className.split(' ')[0] || ''}`) : [],
      };
    });
    console.log(width, route, JSON.stringify(m));
  }
}

await browser.close();
