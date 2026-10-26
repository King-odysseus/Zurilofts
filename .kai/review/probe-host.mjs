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
await page.waitForTimeout(1800);

const out = await page.evaluate(() => {
  const ds = getComputedStyle(document.documentElement);
  const pick = (btn) => {
    if (!btn) return null;
    const cs = getComputedStyle(btn);
    const kids = [...btn.querySelectorAll('*')].slice(0, 3).map((k) => ({
      tag: k.tagName, cls: k.className?.toString().slice(0, 60), color: getComputedStyle(k).color,
    }));
    return { tag: btn.tagName, cls: btn.className.toString(), classList: [...btn.classList], color: cs.color, bg: cs.backgroundColor, kids };
  };
  const byText = (t) => [...document.querySelectorAll('button, a')].find((b) => b.textContent.trim() === t);
  const nav = [...document.querySelectorAll('nav a, header a')].find((a) => a.textContent.trim() === 'Calendar');
  return {
    vars: { navy: ds.getPropertyValue('--ds-navy').trim(), ink: ds.getPropertyValue('--ds-ink').trim() },
    manage: pick(byText('Manage availability')),
    blockDates: pick(byText('Block dates')),
    navCalendar: nav ? { cls: nav.className.toString().slice(0, 160), color: getComputedStyle(nav).color, bg: getComputedStyle(nav).backgroundColor, kids: [...nav.querySelectorAll('*')].slice(0,3).map(k => ({ tag: k.tagName, color: getComputedStyle(k).color, cls: k.className?.toString().slice(0,50) })) } : null,
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
