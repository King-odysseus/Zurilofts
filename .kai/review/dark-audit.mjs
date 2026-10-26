// Dark theme audit: walks every page as guest, host and admin, and reports
// text that is too close in colour to what sits behind it, plus light
// surfaces that were never given a dark variant. Screenshots go to .kai/review/dark.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review/dark';
const API = 'http://localhost:3000';
mkdirSync(OUT, { recursive: true });

const ACCOUNTS = {
  admin: { email: 'admin@zurilofts.co.ke', password: 'Admin@123' },
  host: { email: 'host@zurilofts.co.ke', password: 'Host@1234' },
  guest: { email: 'user@example.com', password: 'User@1234' },
};

const GUEST = [
  '/', '/properties', '/places', '/restaurants', '/guides', '/privacy', '/terms',
  '/login', '/register',
];
const GUEST_AUTHED = ['/trips', '/booking-history', '/favourites', '/inbox', '/profile', '/shortlists', '/verify-identity'];
const HOST = ['/host/today', '/host/listings', '/host/calendar', '/host/earnings', '/host/payouts', '/host/discounts', '/host/application', '/host/properties/new'];
const ADMIN = ['/admin', '/admin/properties', '/admin/users', '/admin/host-applications', '/admin/trust-safety', '/admin/governance', '/admin/addons', '/admin/feedback', '/admin/messages', '/admin/guides'];

const report = {};

// Runs in the page: text whose colour is too close to the surface behind it,
// and surfaces that are still bright in dark mode.
function auditPage() {
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
  const opaqueBg = (el) => {
    let node = el;
    while (node) {
      const cs = getComputedStyle(node);
      const b = parse(cs.backgroundColor);
      const hasImage = cs.backgroundImage !== 'none';
      if (b.length >= 3 && (b.length < 4 || b[3] > 0.5)) return { rgb: b, hasImage };
      node = node.parentElement;
    }
    return null;
  };
  const sig = (el) => {
    const cls = (el.className && typeof el.className === 'string' ? el.className : '')
      .split(/\s+/).filter(Boolean).slice(0, 3).join('.');
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
  };
  const lowContrast = {};
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length > 0) continue;
    const text = (el.textContent || '').trim();
    if (!text || text.length > 70) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.2) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const fg = parse(cs.color);
    if (fg.length < 3) continue;
    if (fg.length === 4 && fg[3] < 0.3) continue;
    const bg = opaqueBg(el);
    if (!bg || bg.hasImage) continue;
    const cr = ratio(fg, bg.rgb);
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 600;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    if (cr >= need) continue;
    const key = `${sig(el)}|${cs.color}|rgb(${bg.rgb.slice(0, 3).join(',')})`;
    const entry = lowContrast[key] || (lowContrast[key] = {
      selector: sig(el), color: cs.color, bg: `rgb(${bg.rgb.slice(0, 3).join(',')})`,
      fontSize: cs.fontSize, count: 0, samples: [], html: el.outerHTML.slice(0, 150),
    });
    entry.count += 1;
    if (entry.samples.length < 3) entry.samples.push(text.slice(0, 30));
  }
  // Bright surfaces in dark mode: a large, near-white box is almost always a
  // card that never got a dark variant.
  const bright = {};
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    const bg = parse(cs.backgroundColor);
    if (bg.length < 3 || (bg.length === 4 && bg[3] < 0.5)) continue;
    if (lum(bg) < 0.55) continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height < 6000) continue;
    if (el.closest('img, picture, [style*="background-image"]')) continue;
    const key = `${sig(el)}|rgb(${bg.slice(0, 3).join(',')})`;
    const entry = bright[key] || (bright[key] = { selector: sig(el), bg: `rgb(${bg.slice(0, 3).join(',')})`, size: `${Math.round(r.width)}x${Math.round(r.height)}`, count: 0 });
    entry.count += 1;
  }
  return {
    lowContrast: Object.values(lowContrast).sort((a, b) => b.count - a.count).slice(0, 14),
    bright: Object.values(bright).sort((a, b) => b.count - a.count).slice(0, 10),
  };
}

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

async function makeContext(width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(() => { localStorage.setItem('zurilofts_theme', 'dark'); });
  return context;
}

async function login(page, who) {
  const c = ACCOUNTS[who];
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.fill('input[type="email"], input[name="email"]', c.email);
  await page.fill('input[type="password"]', c.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  return page.url();
}

async function run(label, routes, width, height, who) {
  const context = await makeContext(width, height);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  if (who) {
    const url = await login(page, who);
    console.log(`login ${who} -> ${url}`);
  }
  for (const route of routes) {
    const name = route.replace(/[^a-z0-9]+/gi, '_') || 'root';
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      // Scroll through so anything revealed on scroll is measured too.
      await page.evaluate(async () => {
        const step = window.innerHeight * 0.8;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 90));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(400);
      const result = await page.evaluate(auditPage);
      const key = `${label}${width}${route}`;
      report[key] = { route, ...result };
      const problems = result.lowContrast.length + result.bright.length;
      if (problems) await page.screenshot({ path: `${OUT}/${label}-${width}-${name}.png`, fullPage: false });
      console.log(`${width} ${route} lowContrast=${result.lowContrast.length} bright=${result.bright.length}`);
    } catch (error) {
      console.log(`${width} ${route} ERROR ${error.message.split('\n')[0]}`);
    }
  }
  await context.close();
}

const widths = process.argv.includes('--desktop') ? [[390, 844], [1440, 900]] : [[390, 844]];

// A live property id so the detail and booking pages render real content.
let propertyId = '';
try {
  const res = await fetch(`${API}/api/properties?limit=1`);
  const json = await res.json();
  propertyId = json?.data?.properties?.[0]?.id || json?.data?.[0]?.id || '';
} catch { /* handled below */ }
console.log('property', propertyId);

for (const [w, h] of widths) {
  await run('guest', [...GUEST, ...(propertyId ? [`/property/${propertyId}`, `/booking/${propertyId}`] : [])], w, h, null);
  await run('guestauth', GUEST_AUTHED, w, h, 'guest');
  await run('host', HOST, w, h, 'host');
  await run('admin', ADMIN, w, h, 'admin');
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log('AUDIT DONE');
