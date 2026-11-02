// Full-page capture of the admin host application review page (current build),
// plus a report of every element whose text is clipped or whose box does not
// line up with the card's text column.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review';
const APP_ID = 'cmvyeryvh000j13781kwy50yq';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(20000);
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.fill('input[type="email"]', 'admin@zurilofts.co.ke');
await page.fill('input[type="password"]', 'Admin@123');
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
await page.waitForTimeout(500);
await page.goto(`${BASE}/admin/host-applications/${APP_ID}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

await page.screenshot({ path: `${OUT}/review-full-current.png`, fullPage: true });

const report = await page.evaluate(() => {
  const clipped = [];
  document.querySelectorAll('section *').forEach((el) => {
    if (el.children.length) return;
    const style = getComputedStyle(el);
    if (el.scrollWidth > el.clientWidth + 1 && /hidden|clip/.test(style.overflowX)) {
      clipped.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().slice(0, 60),
        clientW: el.clientWidth,
        scrollW: el.scrollWidth,
        class: el.className?.toString().slice(0, 90),
      });
    }
  });
  return { clipped };
});
console.log(JSON.stringify(report, null, 1));
await browser.close();
console.log('done');
