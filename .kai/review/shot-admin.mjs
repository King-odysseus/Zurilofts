// Captures the admin Add-ons page and measures the collapsed-rail flyout,
// which is the element visibly spilling over the content in the report.
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
await page.waitForTimeout(1000);

for (const theme of ['light', 'dark']) {
  await page.evaluate((t) => {
    localStorage.setItem('zurilofts_theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  }, theme);

  // Click the real sidebar link so this stays an in-app navigation.
  await page.locator('nav a[href="/admin/addons"]').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${theme}-addons-expanded.png` });

  await page.locator('button[aria-label="Collapse admin sidebar"]').first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${theme}-addons-collapsed.png` });

  // Hover the active item: that is the label that spilled in the report.
  const activeItem = page.locator('nav a[aria-label]').first();
  await activeItem.hover();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${theme}-addons-flyout.png` });

  const measure = await page.evaluate(() => {
    const rail = document.querySelector('aside');
    const tip = document.querySelector('[data-testid="flowbite-tooltip"]');
    const box = (el) => (el ? el.getBoundingClientRect() : null);
    const r = box(rail);
    const t = box(tip);
    return {
      railRight: r ? Math.round(r.right) : null,
      tooltip: t && { left: Math.round(t.left), right: Math.round(t.right), top: Math.round(t.top), w: Math.round(t.width), h: Math.round(t.height) },
      tooltipText: tip ? tip.textContent.trim() : null,
      tooltipOverflowsRail: t && r ? t.right > r.right : null,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  console.log(theme, JSON.stringify(measure));

  await page.locator('button[aria-label="Expand admin sidebar"]').first().click();
  await page.waitForTimeout(400);
}

await browser.close();
console.log('done');
