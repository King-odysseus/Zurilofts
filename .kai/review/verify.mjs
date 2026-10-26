// Verifies the three reported defects on the admin Add-ons page:
// dark mode flipping, the collapsed-rail flyout, and a row action menu
// opened on the LAST row (the one that used to be clipped by the card).
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
await page.waitForTimeout(900);

async function setTheme(t) {
  await page.evaluate((v) => {
    localStorage.setItem('zurilofts_theme', v);
    document.documentElement.classList.toggle('dark', v === 'dark');
  }, t);
  await page.waitForTimeout(350);
}

for (const theme of ['light', 'dark']) {
  await setTheme(theme);
  await page.locator('nav a[href="/admin/addons"]').first().click();
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${OUT}/v2-${theme}-addons.png` });

  // Report the header contrast: this was the invisible title in the report.
  const header = await page.evaluate(() => {
    const el = document.querySelector('header');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const title = el.querySelector('span, p, div');
    return {
      headerBg: cs.backgroundColor,
      titleColor: title ? getComputedStyle(title).color : null,
      isDark: document.documentElement.classList.contains('dark'),
    };
  });
  console.log(theme, 'header', JSON.stringify(header));

  // Open the action menu on the last row: the clipping case.
  const triggers = page.locator('table button[aria-haspopup="menu"], button[aria-haspopup="menu"]');
  const count = await triggers.count();
  if (count) {
    await triggers.nth(count - 1).scrollIntoViewIfNeeded();
    await triggers.nth(count - 1).click();
    await page.waitForTimeout(500);
    const menu = await page.evaluate(() => {
      const m = document.querySelector('[role="menu"]');
      if (!m) return null;
      const r = m.getBoundingClientRect();
      return {
        top: Math.round(r.top), bottom: Math.round(r.bottom),
        left: Math.round(r.left), right: Math.round(r.right),
        insideViewport: r.top >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth,
        visibleHeight: Math.round(r.height),
      };
    });
    console.log(theme, 'menu', JSON.stringify(menu));
    await page.screenshot({ path: `${OUT}/v2-${theme}-addons-menu.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
}

// Collapsed rail flyout, checked for overlap with the page title.
await setTheme('light');
await page.locator('button[aria-label="Collapse admin sidebar"]').first().click();
await page.waitForTimeout(500);
await page.locator('nav a[aria-label]').first().hover();
await page.waitForTimeout(600);
const fly = await page.evaluate(() => {
  const tip = document.querySelector('[data-testid="flowbite-tooltip"]');
  const heading = document.querySelector('h1, h2');
  if (!tip || !heading) return null;
  const t = tip.getBoundingClientRect();
  const h = heading.getBoundingClientRect();
  const overlap = !(t.right < h.left || t.left > h.right || t.bottom < h.top || t.top > h.bottom);
  const cs = getComputedStyle(tip);
  return {
    tipBg: cs.backgroundColor, tipColor: cs.color,
    tipRect: { left: Math.round(t.left), right: Math.round(t.right), top: Math.round(t.top), bottom: Math.round(t.bottom) },
    overlapsHeading: overlap,
  };
});
console.log('flyout', JSON.stringify(fly));
await page.screenshot({ path: `${OUT}/v2-light-flyout.png` });

// Phone width.
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/v2-phone-addons.png`, fullPage: false });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('phoneHorizontalOverflow', overflow);

await browser.close();
console.log('done');
