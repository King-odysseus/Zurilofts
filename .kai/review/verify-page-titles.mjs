// The tab title must name the page you are on, for every route, and must never
// keep the previous page's title (the bug: leaving the host workspace left the
// tab reading "Today | ZuriLofts Host" on the public site). This walks public
// routes, a route that names itself from its own data, then the signed-in host
// workspace, and reports the title each one ends on.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);

let failures = 0;

function report(path, title) {
  console.log(`${path.padEnd(32)} -> ${title}`);
}

const routes = [
  '/',
  '/properties',
  '/places',
  '/restaurants',
  '/guides',
  '/become-a-host',
  '/host-earnings-calculator',
  '/privacy',
  '/terms',
  '/login',
  '/register',
  '/this-route-does-not-exist',
];

console.log('public routes');
for (const route of routes) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  report(route, await page.title());
}

// A page that names itself from loaded data: the specific title must win over
// the route default, and must be replaced when leaving for another route.
await page.goto(`${BASE}/properties`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const firstStay = await page.locator('a[href^="/property/"]').first().getAttribute('href');

console.log('\ndata-driven title');
if (firstStay) {
  await page.goto(`${BASE}${firstStay}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  report(firstStay, await page.title());

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const back = await page.title();
  report('back to /', back);
  if (/Host/.test(back)) {
    failures += 1;
    console.log('FAIL: the host title survived navigation back to the home page');
  }
} else {
  failures += 1;
  console.log('FAIL: no property link found, the data-driven title was not checked');
}

// The signed-in workspace titles are the ones that used to leak onto the public
// site, so sign in as the seeded host, walk them, then leave.
console.log('\nhost workspace');
const login = await context.newPage();
await login.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await login.fill('input[type="email"]', 'host@zurilofts.co.ke');
await login.fill('input[type="password"]', 'Host@1234');
await login.click('button[type="submit"]');
await login.waitForTimeout(3000);

if (new URL(login.url()).pathname === '/login') {
  failures += 1;
  console.log('FAIL: could not sign in as the seeded host, workspace titles not checked');
} else {
  const hostRoutes = ['/host/today', '/host/calendar', '/host/listings', '/host/earnings', '/host/discounts', '/host/payouts', '/host/application'];
  for (const route of hostRoutes) {
    await login.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await login.waitForTimeout(1500);
    const title = await login.title();
    report(route, title);
    if (/not found/i.test(title)) {
      failures += 1;
      console.log(`FAIL: ${route} fell through to the not-found title`);
    }
  }

  // The original bug: the host title survived leaving the workspace.
  await login.goto(`${BASE}/properties`, { waitUntil: 'domcontentloaded' });
  await login.waitForTimeout(1200);
  const afterHost = await login.title();
  report('leaving for /properties', afterHost);
  if (/Host/.test(afterHost)) {
    failures += 1;
    console.log('FAIL: the host title survived leaving the workspace');
  }
}

await browser.close();
console.log(failures ? `\n${failures} problem(s)` : '\nno problems');
process.exit(failures ? 1 : 0);
