// Screenshots the become-a-host calculator and checks its arithmetic against
// the published fee schedule, at phone and desktop width in both themes.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review/become-host';
mkdirSync(OUT, { recursive: true });

const fees = (await (await fetch('http://localhost:3000/api/public/fees')).json()).data;
console.log('fees', fees);

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

for (const theme of ['light', 'dark']) {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript((t) => localStorage.setItem('zurilofts_theme', t), theme);
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${BASE}/become-a-host`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const state = await page.evaluate(() => {
      const text = document.body.innerText;
      const has = (needle) => text.includes(needle);
      return {
        url: location.href,
        heading: document.querySelector('h1')?.textContent?.trim(),
        loading: has('Loading the current fee schedule'),
        error: has('could not load'),
        takeHome: text.match(/Your take-home\s*\n?\s*(KES [\d,]+)/)?.[1] ?? null,
        commission: text.match(/Our commission\s*\n?\s*(KES [\d,]+|- KES [\d,]+|[\d.]+%)/)?.[1] ?? null,
      };
    });

    // Independent check of the headline figure.
    const gross = 6500 * 20;
    const expected = gross - gross * (fees.commissionPercent / 100) - gross * (fees.withholdingTaxPercent / 100);
    const fmt = `KES ${Math.round(expected).toLocaleString('en-KE')}`;
    const ok = state.takeHome === fmt;
    console.log(`\n${theme} ${width}  heading="${state.heading}"`);
    console.log(`  take-home shown ${state.takeHome} | expected ${fmt} | ${ok ? 'MATCH' : 'MISMATCH'}`);
    console.log(`  loading=${state.loading} error=${state.error} consoleErrors=${errors.length}`);
    if (errors.length) console.log('  ', errors.slice(0, 2).join(' / '));

    await page.screenshot({ path: `${OUT}/${theme}-${width}.png`, fullPage: width === 1440 });
    await context.close();
  }
}
await browser.close();
console.log('DONE');
