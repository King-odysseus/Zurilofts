import { writeFileSync } from 'node:fs';
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.fill('input[type="email"]', 'admin@zurilofts.co.ke');
await page.fill('input[type="password"]', 'Admin@123');
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
await page.waitForTimeout(800);

await page.evaluate(() => {
  localStorage.setItem('zurilofts_theme', 'dark');
  document.documentElement.classList.add('dark');
});
await page.waitForTimeout(400);

const dump = await page.evaluate(() => {
  const wanted = ['Back', 'Sign out', 'Search'];
  const out = [];
  for (const el of document.querySelectorAll('button, a, [role="button"], [data-testid="flowbite-button"]')) {
    const label = (el.textContent || el.getAttribute('aria-label') || '').trim();
    if (!wanted.some((w) => label.toLowerCase().includes(w.toLowerCase()))) continue;
    const st = getComputedStyle(el);
    out.push({
      label: label.slice(0, 30),
      tag: el.tagName.toLowerCase(),
      cls: (el.className || '').toString().slice(0, 160),
      bg: st.backgroundColor,
      color: st.color,
      opacity: st.opacity,
    });
  }
  const token = getComputedStyle(document.documentElement);
  return {
    rows: out.slice(0, 12),
    tokens: {
      surface: token.getPropertyValue('--ds-surface').trim(),
      elevated: token.getPropertyValue('--ds-elevated').trim(),
      navy: token.getPropertyValue('--ds-navy').trim(),
    },
    dark: document.documentElement.classList.contains('dark'),
  };
});

writeFileSync('.kai/review/probe-out.json', JSON.stringify(dump, null, 2));
await browser.close();
