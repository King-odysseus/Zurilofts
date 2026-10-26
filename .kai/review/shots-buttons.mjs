import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const page = await context.newPage();

async function theme(v) {
  await page.evaluate((t) => {
    localStorage.setItem('zurilofts_theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  }, v);
  await page.waitForTimeout(350);
}

// Login page: the bronze CTA is the clearest read on the new ink pairing.
await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
await theme('light');
await page.screenshot({ path: '.kai/review/fix-login-light.png' });

await page.fill('input[type="email"]', 'admin@zurilofts.co.ke');
await page.fill('input[type="password"]', 'Admin@123');
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
await page.waitForTimeout(800);

await page.goto('http://localhost:5173/admin/addons', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await theme('dark');
await page.screenshot({ path: '.kai/review/fix-addons-dark.png' });
await theme('light');
await page.screenshot({ path: '.kai/review/fix-addons-light.png' });

await page.goto('http://localhost:5173/host/earnings', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await theme('dark');
await page.screenshot({ path: '.kai/review/fix-earnings-dark.png' });

await browser.close();
