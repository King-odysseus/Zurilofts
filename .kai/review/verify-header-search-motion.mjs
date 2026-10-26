// Captures the field mid-expansion and checks closing restores the header.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:5173/properties', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('nav.zl-navbar');

const navOpacity = () => page.evaluate(() => getComputedStyle(document.querySelector('.zl-desktop-nav')).opacity);

await page.click('button[aria-label="Search stays"]');
await page.waitForTimeout(80);
const midWidth = await page.evaluate(() => Math.round(document.querySelector('#navbar-search').getBoundingClientRect().width));
await page.screenshot({ path: '.kai/review/header-search-midway.png', clip: { x: 0, y: 0, width: 1280, height: 90 } });

await page.waitForTimeout(400);
const openWidth = await page.evaluate(() => Math.round(document.querySelector('#navbar-search').getBoundingClientRect().width));
const navHidden = await navOpacity();

await page.click('#navbar-search button[aria-label="Close search"]');
await page.waitForTimeout(300);
const closed = await page.evaluate(() => ({
  formGone: !document.querySelector('#navbar-search'),
  navOpacity: getComputedStyle(document.querySelector('.zl-desktop-nav')).opacity,
  brandOpacity: getComputedStyle(document.querySelector('nav.zl-navbar a[href="/"]')).opacity,
}));

await browser.close();
console.log(JSON.stringify({ midWidth, openWidth, navHidden, closed }, null, 2));
