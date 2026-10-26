// Checks the Nearby widget filter toolbar: every control is a pill and no label
// wraps onto a second line.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});

const out = [];
for (const [label, width, height] of [['desktop', 1280, 900], ['tablet', 820, 900], ['mobile', 390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto('http://localhost:5173/places', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.op-place-search-wrap');

  const data = await page.evaluate(() => {
    const measure = (el, name) => {
      if (!el) return { name, missing: true };
      const st = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const lineHeight = parseFloat(st.lineHeight) || 0;
      return {
        name,
        radius: st.borderRadius,
        height: Math.round(box.height),
        width: Math.round(box.width),
        whiteSpace: st.whiteSpace,
        wrapped: lineHeight > 0 ? box.height > lineHeight * 1.9 : false,
        text: (el.textContent || '').trim().slice(0, 40),
      };
    };
    const toolbar = document.querySelector('.op-place-search-wrap')?.parentElement;
    return {
      controls: [
        measure(document.querySelector('.op-place-search-wrap input'), 'search input'),
        ...Array.from(document.querySelectorAll('.op-place-select-wrap')).map((el, i) => measure(el, `select ${i + 1}`)),
        measure(document.querySelector('.op-place-clear'), 'clear all'),
        measure(document.querySelector('.op-place-count'), 'count'),
      ],
      toolbarRows: toolbar ? Math.round(toolbar.getBoundingClientRect().height) : null,
    };
  });

  await page.screenshot({ path: `.kai/review/nearby-toolbar-${label}.png`, clip: { x: 0, y: 0, width, height: 700 } });
  out.push({ label, ...data });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(out, null, 2));
