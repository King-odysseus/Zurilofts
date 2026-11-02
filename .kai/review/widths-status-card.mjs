// Runs the admin review page at several window widths and reports, for the
// "Status and decision" card: whether any text is clipped or wrapped next to
// free space, and whether the open status menu lines up with its field.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review';
const widths = [1440, 1280, 1100, 1024, 900, 768, 600, 420];
// The one seeded application in the local database.
const APP_ID = 'cmvyeryvh000j13781kwy50yq';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'admin@zurilofts.co.ke');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.goto(`${BASE}/admin/host-applications/${APP_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const panel = page.locator('section', { has: page.locator('h2', { hasText: 'Status and decision' }) }).first();
  await panel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const result = await page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) };
    };
    const h2 = [...document.querySelectorAll('h2')].find((n) => n.textContent.trim() === 'Status and decision');
    const card = h2.closest('section');
    const hint = h2.nextElementSibling;
    const trigger = document.querySelector('#host-application-status');
    return {
      card: r(card),
      hint: r(hint),
      trigger: r(trigger),
      label: r(document.querySelector('label[for="host-application-status"]')),
      docScrollW: document.documentElement.scrollWidth,
      docClientW: document.documentElement.clientWidth,
      hintClipped: hint.scrollWidth > hint.clientWidth,
      triggerTextClipped: trigger.querySelector('span') ? trigger.querySelector('span').scrollWidth > trigger.querySelector('span').clientWidth : null,
    };
  });

  let menu = null;
  if (await page.locator('#host-application-status').count()) {
    await page.click('#host-application-status');
    await page.waitForTimeout(400);
    menu = await page.evaluate(() => {
      const r = (el) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) };
      };
      const items = [...document.querySelectorAll('[role="menuitem"]')];
      const host = items[0]?.closest('.z-50') || items[0]?.parentElement;
      return {
        trigger: r(document.querySelector('#host-application-status')),
        panel: r(host),
        viewport: document.documentElement.clientWidth,
        overflowingRight: host ? Math.round(host.getBoundingClientRect().right) > document.documentElement.clientWidth : null,
        items: items.map((item) => {
          const label = item.querySelector('span span') || item.querySelector('span');
          const lr = label.getBoundingClientRect();
          // A label that occupies more than one line height is wrapping.
          const lineH = parseFloat(getComputedStyle(label).lineHeight) || 20;
          return { text: item.textContent.trim().slice(0, 30), lines: Math.round(lr.height / lineH), clipped: label.scrollWidth > label.clientWidth };
        }),
      };
    });
    await page.screenshot({ path: `${OUT}/w${width}-menu.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  await panel.screenshot({ path: `${OUT}/w${width}-card.png` });
  console.log(width, JSON.stringify({ ...result, menu }));
  await context.close();
}

await browser.close();
console.log('done');
