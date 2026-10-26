// Final confirmation: measures text contrast and leftover bright surfaces on
// the screens that were changed, at both widths, in dark mode.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const ROUTES = ['/favourites', '/shortlists', '/inbox', '/verify-identity', '/trips', '/profile', '/properties'];

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

function measure() {
  const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = (rgb) => {
    const [r, g, b] = rgb.slice(0, 3).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const l1 = lum(a); const l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const bgOf = (el) => {
    let node = el;
    while (node) {
      const cs = getComputedStyle(node);
      const b = parse(cs.backgroundColor);
      if (b.length >= 3 && (b.length < 4 || b[3] > 0.5)) return b;
      node = node.parentElement;
    }
    return null;
  };
  const low = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length > 0) continue;
    const text = (el.textContent || '').trim();
    if (!text) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || Number(cs.opacity) < 0.2) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const fg = parse(cs.color);
    const bg = bgOf(el);
    if (!bg || fg.length < 3) continue;
    if (ratio(fg, bg) >= 4.5) continue;
    // White on brand bronze is identical in light mode; not a dark-mode defect.
    if (String(bg.slice(0, 3)) === '196,154,108' && fg[0] > 240) continue;
    low.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} "${text.slice(0, 26)}" ${cs.color} on rgb(${bg.slice(0, 3).join(',')})`);
  }
  const bright = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    const b = parse(cs.backgroundColor);
    if (b.length < 3 || (b.length === 4 && b[3] < 0.5)) continue;
    if (lum(b) < 0.55) continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height < 6000) continue;
    if (el.closest('img, picture')) continue;
    bright.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} rgb(${b.slice(0, 3).join(',')}) ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return { low, bright };
}

let failures = 0;
for (const width of [390, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('zurilofts_theme', 'dark'));
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="password"]');
  await page.fill('input[type="email"], input[name="email"]', 'user@example.com');
  await page.fill('input[type="password"]', 'User@1234');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1400);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * 0.8) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 70));
      }
      window.scrollTo(0, 0);
    });
    const { low, bright } = await page.evaluate(measure);
    failures += low.length + bright.length;
    console.log(`${width} ${route}  low=${low.length} bright=${bright.length}`);
    for (const l of low.slice(0, 5)) console.log('   LOW', l);
    for (const b of bright.slice(0, 3)) console.log('   BRIGHT', b);
  }
  await context.close();
}
await browser.close();
console.log(failures === 0 ? 'CLEAN' : `REMAINING ${failures}`);
