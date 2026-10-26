import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.setItem('zurilofts_theme', 'dark');
  document.documentElement.classList.add('dark');
});
await page.waitForTimeout(900);

const out = await page.evaluate(() => {
  const nav = document.querySelector('.zl-navbar');
  const bar = nav ? getComputedStyle(nav) : null;
  const items = [];
  for (const btn of document.querySelectorAll('.zl-header-actions button, .zl-header-actions a')) {
    const cs = getComputedStyle(btn);
    const r = btn.getBoundingClientRect();
    const svg = btn.querySelector('svg');
    items.push({
      label: btn.getAttribute('aria-label') || btn.textContent.trim().slice(0, 14) || '(none)',
      box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      btnBg: cs.backgroundColor,
      btnColor: cs.color,
      svgColor: svg ? getComputedStyle(svg).color : null,
      className: btn.className.toString().slice(0, 90),
    });
  }
  const tile = document.querySelector('.op-brand-tile');
  const tileCs = tile ? getComputedStyle(tile) : null;
  const tileImg = tile ? tile.querySelector('img') : null;
  return {
    navBg: bar ? bar.backgroundColor : null,
    items,
    tileBg: tileCs ? tileCs.backgroundColor : null,
    tileImgFilter: tileImg ? getComputedStyle(tileImg).filter : null,
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
