// Verifies the button ink rule after the fixes:
// A) a dark surface must carry light ink
// B) no button under 4.5:1 between its surface and its label
// Runs one login only, to stay clear of the sign-in rate limiter.
import { writeFileSync } from 'node:fs';
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const PUBLIC = ['/', '/properties', '/guides', '/login', '/register'];
const AUTHED = ['/admin', '/admin/users', '/admin/addons', '/admin/earnings', '/admin/trust-safety',
  '/host/today', '/host/calendar', '/host/earnings', '/host/discounts', '/profile'];

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);

const PROBE = () => {
  const parse = (v) => {
    const m = String(v).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const blend = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const bgOf = (el) => {
    let node = el; let acc = null;
    while (node && node !== document.documentElement) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0) acc = acc ? blend(acc, c) : c;
      if (acc && acc.a >= 1) return acc;
      node = node.parentElement;
    }
    const pageBg = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    return acc ? blend(acc, pageBg) : pageBg;
  };

  const out = [];
  for (const el of document.querySelectorAll('button, [role="button"], [data-testid="flowbite-button"], input[type="submit"]')) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) continue;
    const bg = bgOf(el);
    const raw = parse(st.color);
    if (!raw) continue;
    const fg = blend(raw, bg);
    const bgL = lum(bg); const fgL = lum(fg);
    const ratio = (Math.max(bgL, fgL) + 0.05) / (Math.min(bgL, fgL) + 0.05);
    const darkBg = bgL < 0.18;
    const lightInk = fgL > 0.5;
    const kind = (darkBg && !lightInk) ? 'A' : (ratio < 4.5 ? 'B' : null);
    if (!kind) continue;
    out.push({
      kind,
      label: (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      cls: (el.className || '').toString().slice(0, 70),
      bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
      fg: `rgb(${Math.round(fg.r)},${Math.round(fg.g)},${Math.round(fg.b)})`,
      ratio: Number(ratio.toFixed(2)),
    });
  }
  return out;
};

async function setTheme(theme) {
  await page.evaluate((v) => {
    localStorage.setItem('zurilofts_theme', v);
    document.documentElement.classList.toggle('dark', v === 'dark');
  }, theme);
  await page.waitForTimeout(260);
}

async function sweep() {
  const found = [];
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((t) => window.scrollTo(0, t), y);
    await page.waitForTimeout(140);
    found.push(...await page.evaluate(PROBE));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return found;
}

const findings = [];
const failedRoutes = [];

async function scan(route, theme) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(700);
  if (AUTHED.includes(route) && page.url().includes('/login')) {
    failedRoutes.push(route);
    return;
  }
  await setTheme(theme);
  for (const item of await sweep()) findings.push({ route, theme, ...item });
}

for (const route of PUBLIC) {
  for (const theme of ['light', 'dark']) {
    try { await scan(route, theme); } catch (e) { failedRoutes.push(`${route} ${theme}: ${e.message.slice(0, 40)}`); }
  }
}

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.fill('input[type="email"]', 'admin@zurilofts.co.ke');
await page.fill('input[type="password"]', 'Admin@123');
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
await page.waitForTimeout(600);

for (const route of AUTHED) {
  for (const theme of ['light', 'dark']) {
    try { await scan(route, theme); } catch (e) { failedRoutes.push(`${route} ${theme}: ${e.message.slice(0, 40)}`); }
  }
}

const grouped = new Map();
for (const f of findings) {
  const key = `${f.kind}|${f.theme}|${f.cls}|${f.bg}|${f.fg}`;
  if (!grouped.has(key)) grouped.set(key, { ...f, routes: new Set() });
  grouped.get(key).routes.add(f.route);
}
const rows = [...grouped.values()].map((r) => ({ ...r, routes: [...r.routes] })).sort((a, b) => a.kind.localeCompare(b.kind) || a.ratio - b.ratio);

writeFileSync('.kai/review/verify-buttons.json', JSON.stringify({ failedRoutes, rows }, null, 2));

let text = `distinct=${rows.length} occurrences=${findings.length} skippedRoutes=${failedRoutes.length}\n\n`;
for (const r of rows) text += `${r.kind} [${r.theme}] "${r.label}" ratio=${r.ratio} bg=${r.bg} fg=${r.fg}\n    ${r.cls}\n    ${r.routes.join(' ')}\n`;
if (failedRoutes.length) text += `\nskipped:\n${failedRoutes.join('\n')}\n`;
writeFileSync('.kai/review/verify-buttons.txt', text);
await browser.close();
