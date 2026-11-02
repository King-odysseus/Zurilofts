// Measures the "Status and decision" card on the admin host-application review
// page: card box vs its text, and the open status menu vs the trigger above it.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.fill('input[type="email"]', 'admin@zurilofts.co.ke');
await page.fill('input[type="password"]', 'Admin@123');
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
await page.waitForTimeout(800);

await page.goto(`${BASE}/admin/host-applications`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

const hrefs = await page.$$eval('table a[href^="/admin/host-applications/"]', (nodes) =>
  [...new Set(nodes.map((n) => n.getAttribute('href')))]);
console.log('applications on page:', hrefs.length, hrefs);

const box = (b) => (b ? { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) } : null);

for (const href of hrefs) {
  await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const hasSelect = await page.locator('#host-application-status').count();
  if (!hasSelect) { console.log(`${href}: decided, no select`); continue; }

  const measured = await page.evaluate(() => {
    const rect = (el) => (el ? { l: Math.round(el.getBoundingClientRect().left), r: Math.round(el.getBoundingClientRect().right), t: Math.round(el.getBoundingClientRect().top), b: Math.round(el.getBoundingClientRect().bottom), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null);
    const headings = [...document.querySelectorAll('h2')];
    const heading = headings.find((h) => h.textContent.trim() === 'Status and decision');
    if (!heading) return { error: 'heading not found' };
    const card = heading.closest('section');
    const hint = heading.nextElementSibling;
    const content = hint.nextElementSibling;
    const trigger = document.querySelector('#host-application-status');
    const cs = getComputedStyle(card);
    return {
      card: rect(card),
      cardPadding: [cs.paddingLeft, cs.paddingRight, cs.paddingTop, cs.paddingBottom],
      heading: rect(heading),
      hint: rect(hint),
      hintText: hint.textContent.trim().slice(0, 60),
      content: rect(content),
      contentMarginTop: getComputedStyle(content).marginTop,
      trigger: rect(trigger),
      triggerWrapper: rect(trigger.parentElement),
      wrapperClass: trigger.parentElement.className,
      label: rect(document.querySelector('label[for="host-application-status"]')),
    };
  });
  console.log(href, JSON.stringify(measured, null, 1));

  // Open the menu and measure the floating list against the trigger.
  await page.click('#host-application-status');
  await page.waitForTimeout(500);
  const menu = await page.evaluate(() => {
    const rect = (el) => (el ? { l: Math.round(el.getBoundingClientRect().left), r: Math.round(el.getBoundingClientRect().right), w: Math.round(el.getBoundingClientRect().width) } : null);
    const trigger = document.querySelector('#host-application-status');
    const list = document.querySelector('ul[aria-labelledby], .z-50');
    const floating = list ? list.closest('.z-50') || list : null;
    const items = [...document.querySelectorAll('[role="menuitem"]')].map((item) => {
      const label = item.querySelector('span span') || item.querySelector('span');
      return {
        text: item.textContent.trim(),
        box: rect(item),
        labelBox: rect(label),
        clipped: label ? label.scrollWidth > label.clientWidth : null,
        scrollW: label ? label.scrollWidth : null,
        clientW: label ? label.clientWidth : null,
      };
    });
    return {
      trigger: rect(trigger),
      floatingLeft: floating ? Math.round(floating.getBoundingClientRect().left) : null,
      floatingRight: floating ? Math.round(floating.getBoundingClientRect().right) : null,
      floatingWidth: floating ? Math.round(floating.getBoundingClientRect().width) : null,
      floatingInlineStyle: floating ? floating.getAttribute('style') : null,
      items,
    };
  });
  console.log('MENU', JSON.stringify(menu, null, 1));
  await page.screenshot({ path: `${OUT}/status-card-open.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  break;
}

await browser.close();
console.log('done');
