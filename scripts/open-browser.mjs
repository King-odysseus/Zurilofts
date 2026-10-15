// Opens the local app in a visible Chromium browser and keeps it open
// so the user can inspect the changes. Run with: node scripts/open-browser.mjs
import { chromium } from "playwright";

const url = process.env.ZURL || "http://localhost:5173/";

const browser = await chromium.launch({
  headless: false,
  slowMo: 80,
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});

const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle" });
console.log(`Opened ${url} in a visible Chromium window.`);
console.log(
  "Keep this process running to keep the browser open. Press Ctrl+C in this terminal to close.",
);

// Keep the process alive so the browser window stays open. The browser closes
// automatically when this process exits.
process.stdin.resume();
