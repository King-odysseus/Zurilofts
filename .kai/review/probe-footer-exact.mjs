// Reproduces the reported footer gap: 1656 wide, and reports the real box
// of the shell, page and footer so the white strip can be attributed.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1656, height: 1057 } });
await page.goto(`${BASE}/guides`, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);

const info = await page.evaluate(() => {
  const footer = document.querySelector('.opg-footer');
  const app = document.querySelector('.zl-app');
  const main = document.querySelector('main');
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) };
  };
  return {
    viewH: window.innerHeight,
    scrollH: document.documentElement.scrollHeight,
    bodyScrollH: document.body.scrollHeight,
    app: box(app),
    appMinH: cs(app)?.minHeight,
    appDisplay: cs(app)?.display,
    appPadding: cs(app) ? `${cs(app).paddingTop} / ${cs(app).paddingBottom}` : null,
    main: box(main),
    mainMinH: cs(main)?.minHeight,
    mainMarginBottom: cs(main)?.marginBottom,
    footer: box(footer),
    footerMargin: cs(footer) ? `${cs(footer).marginTop} / ${cs(footer).marginBottom}` : null,
    footerPosition: cs(footer)?.position,
    lastInApp: app ? app.lastElementChild?.tagName + '.' + (app.lastElementChild?.className || '') : null,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlBg: getComputedStyle(document.documentElement).backgroundColor,
  };
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: '.kai/review/footer-guides-1656.png' });
await page.screenshot({ path: '.kai/review/footer-guides-1656-full.png', fullPage: true });
await browser.close();
