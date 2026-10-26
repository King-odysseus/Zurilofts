import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.setDefaultTimeout(20000);

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.fill('input[type="email"]', 'host@zurilofts.co.ke');
await page.fill('input[type="password"]', 'Host@1234');
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
await page.evaluate(() => {
  localStorage.setItem('zurilofts_theme', 'dark');
  document.documentElement.classList.add('dark');
});
await page.goto('http://localhost:5173/host/calendar', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1600);

const out = await page.evaluate(() => {
  const links = [...document.querySelectorAll('a')].filter((a) => /host\/(today|calendar|listings|inbox|earnings)/.test(a.getAttribute('href') || ''));
  return links.map((a) => {
    const cs = getComputedStyle(a);
    return {
      href: a.getAttribute('href'),
      cls: a.className.toString(),
      color: cs.color,
      bg: cs.backgroundColor,
      text: a.textContent.trim(),
    };
  });
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
