// Screenshots the pages that were broken, after logging in the same way the
// audit does (open the site first, then sign in, then walk the routes).
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review/dark-fixed';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

async function session(who, width) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('zurilofts_theme', 'dark'));
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  const creds = {
    guest: { email: 'user@example.com', password: 'User@1234' },
    host: { email: 'host@zurilofts.co.ke', password: 'Host@1234' },
  }[who];
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="password"]');
  await page.fill('input[type="email"], input[name="email"]', creds.email);
  await page.fill('input[type="password"]', creds.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  return { context, page };
}

const jobs = [
  { who: 'guest', path: '/favourites', name: 'favourites' },
  { who: 'guest', path: '/shortlists', name: 'shortlists' },
  { who: 'guest', path: '/inbox', name: 'inbox' },
  { who: 'guest', path: '/verify-identity', name: 'verify' },
  { who: 'guest', path: '/booking/cmsknou3f00051ooonor8ej3k', name: 'booking' },
  { who: 'guest', path: '/login', name: 'login' },
];

for (const width of [390, 1440]) {
  const { context, page } = await session('guest', width);
  for (const job of jobs) {
    await page.goto(`${BASE}${job.path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    const title = await page.evaluate(() => document.querySelector('h1, h2')?.textContent);
    console.log(width, job.path, '->', page.url(), '|', title);
    await page.screenshot({ path: `${OUT}/${width}-${job.name}.png` });
  }
  await context.close();
}

await browser.close();
console.log('SHOTS DONE');
