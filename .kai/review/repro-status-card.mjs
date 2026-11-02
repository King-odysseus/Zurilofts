// Approves the local dev application (so the review page shows the verified-host
// state from the report), then measures the "Status and decision" card and its
// open status menu at a window width close to the reported screenshot.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review';
const WIDTH = Number(process.argv[2] || 1280);

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: WIDTH, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.fill('input[type="email"]', 'admin@zurilofts.co.ke');
await page.fill('input[type="password"]', 'Admin@123');
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
await page.waitForTimeout(600);

await page.goto(`${BASE}/admin/host-applications`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
const href = await page.$eval('table a[href^="/admin/host-applications/"]', (n) => n.getAttribute('href'));
await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

const heading = page.locator('h2', { hasText: 'Status and decision' }).first();
const selectCount = await page.locator('#host-application-status').count();
if (!selectCount) {
  console.log('no select on this application; state:');
}

// Make it verified if the approve option is on offer.
const options = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].map((n) => n.textContent.trim()));
console.log('options before open:', options);

await page.click('#host-application-status');
await page.waitForTimeout(400);
const labels = await page.$$eval('[role="menuitem"]', (nodes) => nodes.map((n) => n.textContent.trim()));
console.log('menu labels:', labels);
const approve = page.locator('[role="menuitem"]', { hasText: 'Verified - approve this host' }).first();
if (await approve.count()) {
  await approve.click();
  await page.waitForTimeout(300);
  await page.locator('button', { hasText: 'Mark as verified' }).first().click();
  await page.waitForTimeout(2500);
  console.log('approved');
} else {
  await page.keyboard.press('Escape');
  console.log('already verified');
}
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

const measure = await page.evaluate(() => {
  const r = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { l: +b.left.toFixed(1), r: +b.right.toFixed(1), w: +b.width.toFixed(1) };
  };
  const h2 = [...document.querySelectorAll('h2')].find((n) => n.textContent.trim() === 'Status and decision');
  const card = h2.closest('section');
  const hint = h2.nextElementSibling;
  const content = hint.nextElementSibling;
  const trigger = document.querySelector('#host-application-status');
  return {
    card: r(card),
    h2: r(h2),
    hint: r(hint),
    hintLines: Math.round(hint.getBoundingClientRect().height / parseFloat(getComputedStyle(hint).lineHeight)),
    content: r(content),
    label: r(document.querySelector('label[for="host-application-status"]')),
    trigger: r(trigger),
    triggerText: r(trigger.querySelector('span')),
  };
});
console.log('MEASURE', JSON.stringify(measure, null, 1));

// Is the panel's text column consistent? Compare text left edges.
await page.locator('h2', { hasText: 'Status and decision' }).first().scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const statusPanel = page.locator('section', { has: page.locator('h2', { hasText: 'Status and decision' }) }).first();
await statusPanel.screenshot({ path: `${OUT}/status-card-verified.png` });

await page.click('#host-application-status');
await page.waitForTimeout(500);
const menu = await page.evaluate(() => {
  const r = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { l: +b.left.toFixed(1), r: +b.right.toFixed(1), w: +b.width.toFixed(1) };
  };
  const trigger = document.querySelector('#host-application-status');
  const items = [...document.querySelectorAll('[role="menuitem"]')];
  const host = items[0]?.closest('.z-50') || items[0]?.parentElement;
  return {
    trigger: r(trigger),
    panel: r(host),
    panelStyle: host?.getAttribute('style'),
    panelClass: host?.className,
    items: items.map((item) => {
      const label = item.querySelector('span span') || item.querySelector('span');
      return { text: item.textContent.trim(), item: r(item), label: r(label), clipped: label.scrollWidth > label.clientWidth };
    }),
  };
});
console.log('MENU', JSON.stringify(menu, null, 1));
await page.screenshot({ path: `${OUT}/status-menu-open-${WIDTH}.png`, fullPage: false });

await browser.close();
console.log('done');
