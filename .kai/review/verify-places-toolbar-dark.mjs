// Dark mode pass for the same toolbar: pills must stay pill-shaped and the
// clear/count text must stay on one line against the dark surface.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
const page = await context.newPage();
await page.goto('http://localhost:5173/places', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.setItem('zurilofts_theme', 'dark');
  document.documentElement.classList.add('dark');
});
await page.waitForTimeout(800);
const data = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { radius: cs.borderTopLeftRadius, h: Math.round(el.getBoundingClientRect().height), bg: cs.backgroundColor, border: cs.borderTopColor, color: cs.color };
  };
  return {
    search: pick('.op-place-search-wrap input'),
    select: pick('.op-place-select-wrap'),
    clear: pick('.op-place-clear'),
    count: pick('.op-place-count'),
  };
});
console.log(JSON.stringify(data, null, 2));
await page.screenshot({ path: '.kai/review/places-toolbar-dark-1440.png' });
await browser.close();
