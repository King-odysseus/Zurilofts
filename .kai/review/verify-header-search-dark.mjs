// Dark mode check for the in-header search field.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => localStorage.setItem('zurilofts_theme', 'dark'));
await page.goto('http://localhost:5173/properties', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('nav.zl-navbar');
await page.click('button[aria-label="Search stays"]');
await page.waitForTimeout(400);

const style = await page.evaluate(() => {
  const form = document.querySelector('#navbar-search');
  const input = form.querySelector('input');
  return {
    dark: document.documentElement.classList.contains('dark'),
    formBg: getComputedStyle(form).backgroundColor,
    inputBg: getComputedStyle(input).backgroundColor,
    inputColor: getComputedStyle(input).color,
  };
});
await page.screenshot({ path: '.kai/review/header-search-dark.png', clip: { x: 0, y: 0, width: 1280, height: 90 } });
await browser.close();
console.log(JSON.stringify(style, null, 2));
