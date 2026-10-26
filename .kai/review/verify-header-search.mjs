// Checks the header search opens inside the header band (not below it):
// measures the field's box against the navbar's box, and saves screenshots.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

const results = [];

for (const [label, width, height] of [['desktop', 1280, 800], ['mobile', 390, 844]]) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  await page.goto(`${BASE}/properties`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('nav.zl-navbar');

  await page.click('button[aria-label="Search stays"]');
  await page.waitForSelector('#navbar-search');
  // Let the 220ms expand animation settle before measuring.
  await page.waitForTimeout(450);

  const geo = await page.evaluate(() => {
    const nav = document.querySelector('nav.zl-navbar').getBoundingClientRect();
    const form = document.querySelector('#navbar-search').getBoundingClientRect();
    const input = document.querySelector('#navbar-search input');
    return {
      navTop: Math.round(nav.top), navBottom: Math.round(nav.bottom),
      formTop: Math.round(form.top), formBottom: Math.round(form.bottom),
      formWidth: Math.round(form.width),
      formHeight: Math.round(form.height),
      inputFocused: document.activeElement === input,
      animation: getComputedStyle(document.querySelector('#navbar-search')).animationName,
    };
  });

  const inside = geo.formTop >= geo.navTop && geo.formBottom <= geo.navBottom;
  results.push({ device: label, insideHeader: inside, ...geo });

  await page.screenshot({ path: `.kai/review/header-search-${label}.png`, clip: { x: 0, y: 0, width, height: 220 } });
  await context.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
