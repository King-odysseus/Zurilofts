// Public pages need no login, so this checks the helper-reworked navbar,
// hero, listing cards and property page in both themes for regressions.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);

const PAGES = [['home', '/'], ['explore', '/properties'], ['guides', '/guides']];

for (const theme of ['light', 'dark']) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((v) => {
    localStorage.setItem('zurilofts_theme', v);
    document.documentElement.classList.toggle('dark', v === 'dark');
  }, theme);
  await page.waitForTimeout(500);

  for (const [name, path] of PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${OUT}/v2-${theme}-${name}.png` });

    const report = await page.evaluate(() => {
      const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
      const lum = (rgb) => {
        const [r, g, b] = rgb.slice(0, 3).map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      // Find visible text whose colour is nearly the same as its background.
      const bad = [];
      for (const el of document.querySelectorAll('p, h1, h2, h3, span, a, button, td, li')) {
        const text = (el.textContent || '').trim();
        if (!text || text.length > 60 || el.children.length) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.15) continue;
        const fg = parse(cs.color);
        if (fg.length < 3) continue;
        // Walk up for the first opaque background.
        let node = el;
        let bg = null;
        while (node && node !== document.documentElement) {
          const b = parse(getComputedStyle(node).backgroundColor);
          if (b.length >= 3 && (b.length < 4 || b[3] > 0.5)) { bg = b; break; }
          node = node.parentElement;
        }
        if (!bg) continue;
        const l1 = lum(fg); const l2 = lum(bg);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        if (ratio < 1.6) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) bad.push({ text: text.slice(0, 34), ratio: Number(ratio.toFixed(2)), fg: cs.color, bg: `rgb(${bg.slice(0, 3).join(',')})` });
        }
      }
      return {
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        lowContrastCount: bad.length,
        samples: bad.slice(0, 4),
      };
    });
    console.log(theme, name, JSON.stringify(report));
  }
}

await browser.close();
console.log('done');
