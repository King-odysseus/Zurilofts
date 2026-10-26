// Both calculator URLs must serve the same page, and the fee maths must match
// the published schedule on each.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const fees = (await (await fetch('http://localhost:3000/api/public/fees')).json()).data;

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
await context.addInitScript(() => localStorage.setItem('zurilofts_theme', 'dark'));
const page = await context.newPage();
page.setDefaultTimeout(20000);

const gross = 6500 * 20;
const expected = gross - gross * (fees.commissionPercent / 100) - gross * (fees.withholdingTaxPercent / 100);
const expectedText = `KES ${Math.round(expected).toLocaleString('en-KE')}`;

for (const url of ['/become-a-host', '/host-earnings-calculator']) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  const state = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    hasCalculator: document.body.innerText.includes('What you keep in a month'),
    takeHome: document.body.innerText.match(/Your take-home\s*\n?\s*(KES [\d,]+)/)?.[1] ?? null,
  }));
  console.log(`${url} -> h1="${state.h1}" calculator=${state.hasCalculator} takeHome=${state.takeHome} expected=${expectedText}`);
}

// The nav CTA from the home page must reach the calculator.
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const link = [...document.querySelectorAll('a')].find((a) => a.getAttribute('href') === '/become-a-host');
  link?.click();
});
await page.waitForTimeout(2000);
console.log('after clicking a become-a-host link:', new URL(page.url()).pathname);

await browser.close();
