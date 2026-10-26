// Checks the admin revenue report renders with real data and is readable in
// both themes. Signs in as admin, then screenshots /admin/revenue.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review/revenue';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

for (const theme of ['light', 'dark']) {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript((t) => localStorage.setItem('zurilofts_theme', t), theme);
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="password"]');
    await page.fill('input[type="email"], input[name="email"]', 'admin@zurilofts.co.ke');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
    await page.goto(`${BASE}/admin/revenue`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const summary = await page.evaluate(() => {
      const heading = document.querySelector('h1, h2')?.textContent?.trim();
      const text = document.body.innerText.replace(/\n{2,}/g, '\n');
      return { heading, url: location.href, snippet: text.slice(0, 420) };
    });
    console.log(`\n### ${theme} ${width}`, summary.url, '|', summary.heading);
    console.log(summary.snippet);
    await page.screenshot({ path: `${OUT}/${theme}-${width}.png`, fullPage: false });
    await context.close();
  }
}
await browser.close();
console.log('REVENUE SHOTS DONE');
