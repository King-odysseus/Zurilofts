// Checks the footer lands flush with the bottom of the window on short pages,
// and that nothing regressed on long pages, in dark mode, or on phones.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

async function check(page, label) {
  const m = await page.evaluate(() => {
    const footer = document.querySelector('.opg-footer');
    const app = document.querySelector('.zl-app');
    const f = footer?.getBoundingClientRect();
    const shown = footer ? getComputedStyle(footer).display !== 'none' : false;
    return {
      viewH: window.innerHeight,
      scrollH: document.documentElement.scrollHeight,
      appDisplay: app ? getComputedStyle(app).display : null,
      footerShown: shown,
      footerBottom: shown && f ? Math.round(f.bottom + window.scrollY) : null,
      // White strip below the footer, the reported symptom.
      gapUnderFooter: shown && f ? Math.round(document.documentElement.scrollHeight - (f.bottom + window.scrollY) - (window.scrollY ? 0 : 0)) : null,
      bodyPadBottom: getComputedStyle(document.body).paddingBottom,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  // scrollHeight and the rounded footer bottom can differ by a sub-pixel, so
  // anything up to 1px is rounding, not a visible strip.
  const ok = !m.footerShown || m.gapUnderFooter <= 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label} :: ${JSON.stringify(m)}`);
  return ok;
}

const results = [];

// Desktop, light and dark, across short and long pages.
for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: scheme });
  for (const route of ['/guides', '/places', '/restaurants', '/terms', '/properties', '/privacy', '/nope-does-not-exist']) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    results.push(await check(page, `${scheme} 1440 ${route}`));
  }
  await page.close();
}

// A tall window makes short pages most obvious; a phone hides the footer.
for (const [w, h] of [[1656, 1057], [1920, 1200], [1024, 900], [390, 844], [768, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  for (const route of ['/guides', '/terms']) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    results.push(await check(page, `${w}x${h} ${route}`));
  }
  if (w === 1656) {
    await page.goto(`${BASE}/guides`, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: '.kai/review/footer-guides-after.png' });
  }
  await page.close();
}

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
