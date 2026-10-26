// Sweep every plausible width on both directory pages, and hold each toolbar
// to three rules: controls stay pill shaped, no label wraps, the row never
// overflows. Longest option labels are selected too, since a long value is the
// likeliest thing to break a fixed-width trigger.
import { chromium } from 'file:///C:/Users/Mega-Mind/AppData/Local/npm-cache/_npx/381cec31605a419a/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const WIDTHS = [1600, 1440, 1280, 1180, 1100, 1024, 960, 900, 860, 851, 820, 768, 700, 600, 480, 390, 360];

const browser = await chromium.launch({
  executablePath: 'C:/Users/Mega-Mind/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
const page = await context.newPage();
page.setDefaultTimeout(20000);
await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, body: '{}' }));

const probe = () => page.evaluate(() => {
  const lines = (el) => {
    if (!el) return 0;
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || 17;
    return Math.round(el.getBoundingClientRect().height / lh);
  };
  const radius = (el) => (el ? getComputedStyle(el).borderTopLeftRadius : null);
  const row = document.querySelector('.op-places-list > div:nth-child(2)');
  const triggers = [...document.querySelectorAll('.op-place-select-field button')];
  return {
    overflow: row ? row.scrollWidth > row.clientWidth + 1 : false,
    rowW: row?.clientWidth,
    rowScrollW: row?.scrollWidth,
    clearLines: lines(document.querySelector('.op-place-clear')),
    countLines: lines(document.querySelector('.op-place-count')),
    searchRadius: radius(document.querySelector('.op-place-search-wrap input')),
    triggerRadius: triggers.map(radius),
    // A label inside the trigger that is taller than one text line wrapped.
    triggerLabelLines: triggers.map((b) => {
      const span = b.querySelector('span');
      return span ? lines(span) : 0;
    }),
    triggerHeights: triggers.map((b) => Math.round(b.getBoundingClientRect().height)),
    triggerLabels: triggers.map((b) => b.textContent.trim()),
  };
});

const problems = [];
const summary = [];

for (const path of ['/places', '/restaurants']) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.op-place-search-wrap', { timeout: 15000 });
    await page.waitForTimeout(350);
    const d = await probe();
    summary.push({ path, width, ...d });
    const bad = [];
    if (d.overflow) bad.push(`row overflows ${d.rowScrollW}>${d.rowW}`);
    if (d.clearLines > 1) bad.push(`clear all on ${d.clearLines} lines`);
    if (d.countLines > 1) bad.push(`count on ${d.countLines} lines`);
    if (d.searchRadius !== '9999px') bad.push(`search radius ${d.searchRadius}`);
    d.triggerRadius.forEach((r, i) => { if (r !== '9999px') bad.push(`trigger ${i + 1} radius ${r}`); });
    d.triggerLabelLines.forEach((n, i) => { if (n > 1) bad.push(`trigger ${i + 1} label on ${n} lines`); });
    if (bad.length) problems.push({ path, width, bad });
  }
}

// Longest selected value in each trigger: open the menu and pick the widest label.
for (const path of ['/places', '/restaurants']) {
  for (const width of [1440, 1024, 860, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.op-place-search-wrap', { timeout: 15000 });
    await page.waitForTimeout(350);

    const triggers = page.locator('.op-place-select-field button');
    const n = await triggers.count();
    for (let i = 0; i < n; i += 1) {
      await triggers.nth(i).click();
      await page.waitForTimeout(200);
      // Pick the option with the longest text.
      const options = page.locator('[data-testid="flowbite-dropdown"] [role="menuitem"], [data-testid="flowbite-dropdown"] li, [data-testid="flowbite-dropdown"] button');
      const count = await options.count();
      let bestIdx = -1;
      let bestLen = -1;
      for (let j = 0; j < count; j += 1) {
        const t = (await options.nth(j).textContent()) || '';
        if (t.trim().length > bestLen) { bestLen = t.trim().length; bestIdx = j; }
      }
      if (bestIdx >= 0) {
        await options.nth(bestIdx).click();
        await page.waitForTimeout(250);
      } else {
        await page.keyboard.press('Escape');
      }
      const d = await probe();
      const bad = [];
      if (d.overflow) bad.push('row overflows');
      if (d.clearLines > 1) bad.push(`clear all on ${d.clearLines} lines`);
      if (d.countLines > 1) bad.push(`count on ${d.countLines} lines`);
      d.triggerLabelLines.forEach((lines, k) => { if (lines > 1) bad.push(`trigger ${k + 1} label "${d.triggerLabels[k]}" on ${lines} lines`); });
      if (bad.length) problems.push({ path, width, afterSelecting: d.triggerLabels[i], bad });
    }
  }
}

console.log('PROBLEMS', JSON.stringify(problems, null, 2));

// Compact table of the plain sweep.
console.log('\nPATH WIDTH overflow clearLines countLines searchR triggerR triggerLabelLines');
for (const r of summary) {
  console.log([
    r.path, String(r.width).padEnd(5), r.overflow ? 'YES' : 'no ', r.clearLines, r.countLines,
    r.searchRadius, r.triggerRadius.join(','), r.triggerLabelLines.join(','),
  ].join(' '));
}

await browser.close();
