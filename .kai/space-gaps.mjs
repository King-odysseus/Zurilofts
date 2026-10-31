// Row-gap audit: every stacked group whose rows sit closer than a comfortable
// rhythm, reported with the element that owns the stack. This is the "cramped"
// signal that reads the same on every page family.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review';

const ROUTES = {
  host: ['/host/today', '/host/listings', '/host/inbox', '/host/reservations', '/host/insights', '/host/earnings', '/host/payouts', '/host/discounts', '/host/settings', '/host/verification', '/host/application'],
  guest: ['/', '/properties', '/places', '/restaurants', '/guides', '/profile', '/favourites', '/shortlists', '/booking-history', '/trips', '/terms', '/privacy', '/become-a-host', '/verify-identity'],
  admin: ['/admin', '/admin/users', '/admin/properties', '/admin/revenue', '/admin/guides', '/admin/messages', '/admin/addons', '/admin/settings', '/admin/governance', '/admin/trust-safety'],
};
const ACCOUNTS = {
  host: ['host@zurilofts.co.ke', 'Host@1234'],
  guest: ['user@example.com', 'User@1234'],
  admin: ['admin@zurilofts.co.ke', 'Admin@123'],
};

const MEASURE = () => {
  const root = document.querySelector('.zl-app-main') || document.querySelector('main') || document.body;
  const px = (v) => parseFloat(v) || 0;
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    if (cs.position === 'absolute' || cs.position === 'fixed') return false;
    const r = el.getBoundingClientRect();
    return r.height > 4 && r.width > 4;
  };
  const contentTop = (el) => {
    const cs = getComputedStyle(el);
    return el.getBoundingClientRect().top + px(cs.paddingTop) + px(cs.borderTopWidth);
  };
  const contentBottom = (el) => {
    const cs = getComputedStyle(el);
    return el.getBoundingClientRect().bottom - px(cs.paddingBottom) - px(cs.borderBottomWidth);
  };
  const name = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}`;
  };

  const found = new Map();
  let maxRootGap = 0;
  let lastRootBottom = null;
  for (const rootChild of root.children) {
    if (!visible(rootChild)) continue;
    const top = contentTop(rootChild);
    if (lastRootBottom !== null) {
      const gap = Math.round(top - lastRootBottom);
      if (gap > maxRootGap) maxRootGap = gap;
    }
    lastRootBottom = contentBottom(rootChild);
  }
  for (const el of root.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const kids = [...el.children].filter(visible);
    if (kids.length < 2) continue;

    const sorted = kids.map((k) => ({ k, t: k.getBoundingClientRect().top, b: k.getBoundingClientRect().bottom, r: k.getBoundingClientRect() }));
    sorted.sort((a, b) => a.t - b.t);
    const rows = [];
    for (const item of sorted) {
      const row = rows.find((x) => Math.abs(x.t - item.t) < 6);
      if (row) row.items.push(item);
      else rows.push({ t: item.t, items: [item] });
    }
    if (rows.length < 2) continue;

    let minGap = Infinity;
    for (let i = 1; i < rows.length; i += 1) {
      for (const prev of rows[i - 1].items) {
        for (const next of rows[i].items) {
          const overlap = Math.min(prev.r.right, next.r.right) - Math.max(prev.r.left, next.r.left);
          if (overlap < 30) continue;
          const gap = contentTop(next.k) - contentBottom(prev.k);
          if (gap >= 0 && gap < minGap) minGap = gap;
        }
      }
    }
    if (!Number.isFinite(minGap) || minGap >= 12) continue;

    const key = `${name(el)}|${rows.length}`;
    const existing = found.get(key);
    if (!existing || minGap < existing.gap) {
      found.set(key, { parent: name(el), gap: Math.round(minGap), rows: rows.length, kids: kids.length });
    }
  }
  return [...found.values(), { parent: 'MAX-ROOT-GAP', gap: maxRootGap, rows: root.children.length }].sort((a, b) => a.gap - b.gap);
};

const ONLY = process.env.ONLY;
const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

async function signIn(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // The session is a cookie, so success shows as the sign-in form unmounting.
  // Watching the form rather than the URL survives accounts that land on
  // different dashboards.
  await page.waitForFunction(() => !document.querySelector('input[type="email"]'), null, { timeout: 25000 });
  await page.waitForTimeout(600);
}

const results = {};
for (const tag of Object.keys(ROUTES).filter((t) => !ONLY || t === ONLY)) {
  const [email, password] = ACCOUNTS[tag];
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    try {
      await signIn(page, email, password);
    } catch (error) {
      console.log(`login failed ${tag}: ${String(error).slice(0, 90)}`);
      await context.close();
      continue;
    }
    const bucket = {};
    for (const route of ROUTES[tag]) {
      try {
        await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1100);
        bucket[route] = await page.evaluate(MEASURE);
      } catch (error) {
        bucket[route] = [{ error: String(error).slice(0, 90) }];
      }
    }
    results[`${tag}@${width}`] = bucket;
    await context.close();
  }
}
await browser.close();

for (const [key, routes] of Object.entries(results)) {
  console.log(`\n=== ${key} ===`);
  for (const [route, rows] of Object.entries(routes)) {
    if (!rows.length || rows[0].error) continue;
    console.log(`${route}  (${rows.length})`);
    for (const row of rows.slice(0, 9)) console.log(`   ${String(row.gap).padStart(3)}px  ${row.rows} rows  ${row.parent}`);
  }
}

import { writeFileSync } from 'node:fs';
writeFileSync(`${OUT}/gaps-${ONLY || 'all'}.json`, JSON.stringify(results, null, 2));
console.log(`\nwrote ${OUT}/gaps-${ONLY || 'all'}.json`);
