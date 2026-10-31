// Verifies the spacing fix on the pages that were cramped, and refuses to
// report numbers for a page that bounced to the sign-in screen (a redirected
// page has none of the app's content, so its numbers are meaningless).
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';

const CASES = [
  { tag: 'host', email: 'host@zurilofts.co.ke', password: 'Host@1234', routes: ['/host/today', '/host/listings', '/host/earnings', '/host/payouts', '/host/verification'] },
  { tag: 'guest', email: 'user@example.com', password: 'User@1234', routes: ['/profile', '/favourites', '/properties', '/places', '/terms', '/become-a-host', '/'] },
];

const PROBE = () => {
  const root = document.querySelector('.zl-app-main') || document.querySelector('main') || document.body;
  const px = (v) => parseFloat(v) || 0;
  const cTop = (el) => { const cs = getComputedStyle(el); return el.getBoundingClientRect().top + px(cs.paddingTop) + px(cs.borderTopWidth); };
  const cBottom = (el) => { const cs = getComputedStyle(el); return el.getBoundingClientRect().bottom - px(cs.paddingBottom) - px(cs.borderBottomWidth); };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (cs.position === 'absolute' || cs.position === 'fixed') return false;
    const r = el.getBoundingClientRect();
    return r.height > 4 && r.width > 4;
  };

  // The shape every workspace page repeats: eyebrow, title, description.
  const h1 = root.querySelector('h1');
  let eyebrowGap = null;
  let descriptionGap = null;
  if (h1) {
    const prev = h1.previousElementSibling;
    if (prev && visible(prev)) eyebrowGap = Math.round(cTop(h1) - cBottom(prev));
    const next = h1.nextElementSibling;
    if (next && visible(next) && ['P', 'SPAN', 'SMALL'].includes(next.tagName)) {
      descriptionGap = Math.round(cTop(next) - cBottom(h1));
    }
  }

  // Count of stacks that still read as welded.
  let tight = 0;
  for (const el of root.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const kids = [...el.children].filter(visible);
    if (kids.length < 2) continue;
    for (let i = 1; i < kids.length; i += 1) {
      const a = kids[i - 1].getBoundingClientRect();
      const b = kids[i].getBoundingClientRect();
      const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      if (overlap < 40) continue;
      const gap = cTop(kids[i]) - cBottom(kids[i - 1]);
      if (gap >= 0 && gap < 6) tight += 1;
    }
  }

  return { eyebrowGap, descriptionGap, tight, h1: h1 ? (h1.textContent || '').trim().slice(0, 34) : null };
};

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

for (const { tag, email, password, routes } of CASES) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('input[type="email"]'), null, { timeout: 25000 });
  await page.waitForTimeout(600);

  console.log(`\n=== ${tag} ===`);
  for (const route of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    if (page.url().includes('/login')) {
      console.log(`${route}  SKIPPED: bounced to sign-in`);
      continue;
    }
    const r = await page.evaluate(PROBE);
    console.log(`${route.padEnd(20)} eyebrow->title ${String(r.eyebrowGap).padStart(3)}px   title->desc ${String(r.descriptionGap).padStart(3)}px   welded stacks ${r.tight}   h1: ${r.h1}`);
  }
  await context.close();
}
await browser.close();
