// End-to-end check against the live production site: the become-a-host page must
// load the real fee schedule and compute take-home with 10% commission.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'https://thezurilofts.com';
const fees = (await (await fetch(`${BASE}/api/public/fees`)).json()).data;
console.log('live fees:', JSON.stringify(fees));

const gross = 6500 * 20;
const net = gross - gross * (fees.commissionPercent / 100) - gross * (fees.withholdingTaxPercent / 100);
const expected = `KES ${Math.round(net).toLocaleString('en-KE')}`;

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(30000);
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`${BASE}/become-a-host`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);

const state = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    showsTen: text.includes('10%'),
    takeHome: text.match(/Your take-home\s*\n?\s*(KES [\d,]+)/)?.[1] ?? null,
    loadingStuck: text.includes('Loading the current fee schedule'),
    loadError: text.includes('could not load'),
  };
});
console.log('h1:', state.h1);
console.log('shows 10%:', state.showsTen);
console.log('take-home:', state.takeHome, 'expected:', expected, state.takeHome === expected ? 'MATCH' : 'MISMATCH');
console.log('stuck loading:', state.loadingStuck, '| error banner:', state.loadError);
console.log('console errors:', errors.length ? errors.slice(0, 3).join(' / ') : 'none');

await page.screenshot({ path: '.kai/review/become-host/production-390.png' });
await browser.close();
