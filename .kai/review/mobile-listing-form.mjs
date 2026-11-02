// Mobile look at the host listing form: screenshots plus the horizontal box of
// each section card and the widest child inside it, so a card whose content
// stops short of its padding is obvious rather than guessed at.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const OUT = '.kai/review';
const WIDTH = Number(process.env.W || 390);

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: WIDTH, height: 900 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
page.setDefaultTimeout(20000);

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.fill('input[type="email"]', 'host@zurilofts.co.ke');
await page.fill('input[type="password"]', 'Host@1234');
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
await page.waitForTimeout(800);

await page.goto(`${BASE}/host/listings/new`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

const measured = await page.evaluate(() => {
  const r = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width), t: Math.round(b.top), h: Math.round(b.height) };
  };
  const sections = [...document.querySelectorAll('form section')];
  return {
    viewport: window.innerWidth,
    form: r(document.querySelector('form')),
    grid: r(document.querySelector('form > div')),
    sections: sections.map((s) => {
      const cs = getComputedStyle(s);
      const kids = [...s.children].map((k) => ({ tag: k.tagName, cls: k.className.slice(0, 60), box: r(k) }));
      const inputs = [...s.querySelectorAll('input, textarea, select, [role="combobox"]')].slice(0, 6).map((i) => r(i));
      return {
        id: s.id,
        pad: [cs.paddingLeft, cs.paddingRight],
        textAlign: cs.textAlign,
        box: r(s),
        kids,
        inputs,
      };
    }),
    asides: [...document.querySelectorAll('form aside')].map((a) => ({ box: r(a), textAlign: getComputedStyle(a).textAlign })),
  };
});
console.log(JSON.stringify(measured, null, 1));

await page.screenshot({ path: `${OUT}/form-mobile-${WIDTH}.png`, fullPage: true });
await browser.close();
console.log('done');
