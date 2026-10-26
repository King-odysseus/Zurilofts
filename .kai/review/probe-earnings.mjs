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
await page.goto('http://localhost:5173/host/earnings', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);

const out = await page.evaluate(() => {
  const all = [...document.querySelectorAll('*')];
  const pills = all
    .filter((el) => ['Calendar', 'Earnings'].includes(el.textContent.trim()) && el.children.length === 0)
    .map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        text: el.textContent.trim(), tag: el.tagName,
        color: cs.color, bg: cs.backgroundColor,
        visible: r.width > 0 && cs.display !== 'none' && cs.visibility !== 'hidden',
        classList: [...el.classList],
      };
    });
  const overview = all
    .filter((el) => el.textContent.trim() === 'Overview' && el.children.length === 0)
    .map((el) => {
      const cs = getComputedStyle(el);
      const parent = el.parentElement;
      return {
        tag: el.tagName, color: cs.color,
        parentBg: parent ? getComputedStyle(parent).backgroundColor : null,
        parentCls: parent ? [...parent.classList] : null,
        ownCls: [...el.classList],
      };
    });
  return { pills, overview };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
