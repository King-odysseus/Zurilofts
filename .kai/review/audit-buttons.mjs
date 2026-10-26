// Thorough audit of button ink on dark surfaces.
// A) genuinely dark background (navy family) that did not get light ink  -> violates the rule
// B) any button whose text contrast is under 4.5:1                        -> hard to read
// Scans below the fold and inside open modals, menus and dropdowns.
import { writeFileSync } from 'node:fs';
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review';

const PUBLIC_PAGES = ['/', '/properties', '/guides', '/login', '/register'];
const ADMIN_PAGES = [
  '/admin', '/admin/users', '/admin/addons', '/admin/guides', '/admin/feedback',
  '/admin/governance', '/admin/host-applications', '/admin/trust-safety',
  '/admin/properties', '/admin/earnings', '/admin/payouts', '/admin/promos',
  '/admin/bookings', '/admin/messages',
];
const HOST_PAGES = ['/host/today', '/host/calendar', '/host/earnings', '/host/payouts', '/host/listings', '/host/discounts'];

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

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
  const backgroundOf = (el) => {
    let node = el; let acc = null;
    while (node && node !== document.documentElement) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0) acc = acc ? blend(acc, c) : c;
      if (acc && acc.a >= 1) return acc;
      node = node.parentElement;
    }
    const page = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    return acc ? blend(acc, page) : page;
  };

  const out = [];
  const sel = 'button, [role="button"], [data-testid="flowbite-button"], input[type="submit"], a[class*="btn"], a[class*="ui-btn"]';
  for (const el of document.querySelectorAll(sel)) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none') continue;

    // Effective ink includes the disabled wash, which is what the eye sees.
    const opacity = Number(st.opacity) || 1;
    if (opacity === 0) continue;
    const bg = backgroundOf(el);
    const rawFg = parse(st.color);
    if (!rawFg) continue;
    const fg = blend({ ...rawFg, a: (rawFg.a ?? 1) * opacity }, bg);

    const bgL = lum(bg); const fgL = lum(fg);
    const ratio = (Math.max(bgL, fgL) + 0.05) / (Math.min(bgL, fgL) + 0.05);
    const darkBg = bgL < 0.18;
    const lightInk = fgL > 0.5;
    const disabled = el.disabled === true || st.cursor === 'not-allowed';

    const kind = darkBg && !lightInk ? 'A' : (ratio < 4.5 ? 'B' : null);
    if (!kind) continue;
    out.push({
      kind,
      label: (el.textContent || el.getAttribute('aria-label') || el.title || '').trim().replace(/\s+/g, ' ').slice(0, 44),
      cls: (el.className || '').toString().slice(0, 80),
      bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
      fg: `rgb(${Math.round(fg.r)},${Math.round(fg.g)},${Math.round(fg.b)})`,
      ratio: Number(ratio.toFixed(2)),
      disabled,
    });
  }
  return out;
};

async function setTheme(page, theme) {
  await page.evaluate((v) => {
    localStorage.setItem('zurilofts_theme', v);
    document.documentElement.classList.toggle('dark', v === 'dark');
  }, theme);
  await page.waitForTimeout(280);
}

// Walk the page in viewport steps so nothing below the fold escapes the scan.
async function sweep(page) {
  const found = [];
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(160);
    found.push(...await page.evaluate(PROBE));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return found;
}

const findings = [];

async function scan(page, route, theme) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(500);

  // A dropped session silently turns every admin scan into a scan of the
  // login page, which is how the first run produced misleading rows. Fail loudly
  // and re-establish the session instead.
  if (route.startsWith('/admin') || route.startsWith('/host')) {
    if (page.url().includes('/login')) {
      await login(page);
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(500);
      if (page.url().includes('/login')) throw new Error('session lost');
    }
  }

  await setTheme(page, theme);
  const seen = await sweep(page);
  for (const item of seen) findings.push({ route, theme, ...item });

  // Open any menu / dropdown / modal trigger and rescan the revealed surface.
  const triggers = await page.$$('[data-testid="flowbite-dropdown"] button, button[aria-haspopup], button[aria-expanded]');
  for (const trigger of triggers.slice(0, 6)) {
    try {
      await trigger.click({ timeout: 1200 });
      await page.waitForTimeout(260);
      for (const item of await page.evaluate(PROBE)) findings.push({ route, theme, surface: 'open-menu', ...item });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(160);
    } catch { /* a trigger that will not open in this state is not a finding */ }
  }
}

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);

for (const route of PUBLIC_PAGES) {
  for (const theme of ['light', 'dark']) {
    try { await scan(page, route, theme); } catch (e) { findings.push({ route, theme, kind: 'ERR', label: e.message.slice(0, 60) }); }
  }
}

async function login(page) {
  // Clear the in-memory limiter budget by waiting only when actually refused.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'admin@zurilofts.co.ke');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
      await page.waitForTimeout(600);
      return;
    } catch {
      await page.waitForTimeout(5000 * (attempt + 1));
    }
  }
  throw new Error('could not sign in');
}

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await login(page);

for (const route of [...ADMIN_PAGES, ...HOST_PAGES]) {
  for (const theme of ['light', 'dark']) {
    try { await scan(page, route, theme); } catch (e) { findings.push({ route, theme, kind: 'ERR', label: e.message.slice(0, 60) }); }
  }
}

const errors = findings.filter((f) => f.kind === 'ERR');
const real = findings.filter((f) => f.kind === 'A' || f.kind === 'B');

const grouped = new Map();
for (const f of real) {
  const key = `${f.kind}|${f.theme}|${f.cls}|${f.bg}|${f.fg}`;
  if (!grouped.has(key)) grouped.set(key, { ...f, routes: new Set() });
  grouped.get(key).routes.add(f.route);
}
const rows = [...grouped.values()].map((r) => ({ ...r, routes: [...r.routes], count: [...r.routes].length }))
  .sort((a, b) => a.kind.localeCompare(b.kind) || a.ratio - b.ratio);

writeFileSync(`${OUT}/audit-buttons.json`, JSON.stringify({ errors: errors.map((e) => `${e.route} ${e.theme}: ${e.label}`), rows }, null, 2));

let text = `distinct=${rows.length} occurrences=${real.length} errors=${errors.length}\n\n`;
for (const r of rows) {
  text += `${r.kind} [${r.theme}]${r.disabled ? ' disabled' : ''} "${r.label}" ratio=${r.ratio} bg=${r.bg} fg=${r.fg}\n    cls=${r.cls}\n    pages: ${r.routes.join(' ')}\n`;
}
writeFileSync(`${OUT}/audit-buttons.txt`, text);
await browser.close();
