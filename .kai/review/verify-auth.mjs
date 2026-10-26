// One login, then covers the host workspace (most converted surfaces) and the
// guest account pages in dark mode, reporting any text unreadable on its panel.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review';
const PASS = process.argv[2];
const EMAIL = process.argv[3];

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.setDefaultTimeout(20000);

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASS);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
await page.waitForTimeout(1000);
await page.evaluate(() => {
  localStorage.setItem('zurilofts_theme', 'dark');
  document.documentElement.classList.add('dark');
});
await page.waitForTimeout(400);

const ROUTES = process.argv.slice(4);

for (const route of ROUTES) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  const name = route.replace(/\//g, '_').replace(/^_/, '') || 'root';
  await page.screenshot({ path: `${OUT}/v2-dark-${name}.png` });

  const report = await page.evaluate(() => {
    const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = (rgb) => {
      const [r, g, b] = rgb.slice(0, 3).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const bad = [];
    for (const el of document.querySelectorAll('p, h1, h2, h3, h4, span, a, button, td, th, label, li, strong')) {
      const text = (el.textContent || '').trim();
      if (!text || text.length > 70 || el.children.length) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.2) continue;
      const fg = parse(cs.color);
      if (fg.length < 3) continue;
      let node = el; let bg = null;
      while (node && node !== document.documentElement) {
        const b = parse(getComputedStyle(node).backgroundColor);
        if (b.length >= 3 && (b.length < 4 || b[3] > 0.5)) { bg = b; break; }
        node = node.parentElement;
      }
      if (!bg) continue;
      const l1 = lum(fg); const l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      if (ratio < 1.7) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) bad.push({ text: text.slice(0, 40), ratio: Number(ratio.toFixed(2)), fg: cs.color, bg: `rgb(${bg.slice(0, 3).join(',')})` });
      }
    }
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bad: bad.slice(0, 6),
      badCount: bad.length,
    };
  });
  console.log(route, JSON.stringify(report));
}

await browser.close();
console.log('done');
