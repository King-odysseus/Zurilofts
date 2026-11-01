/**
 * Removes 1px hairline borders from card surfaces only.
 *
 * The app's card convention (see tailwind.config.js boxShadow and the comment on
 * Panel in src/components/admin/Panel.jsx) is: a card has no border and takes its
 * edge from the elevation scale. Field controls, buttons, badges, dashed empty
 * states and one-pixel dividers keep their border, so this script edits exact
 * lines instead of sweeping the tokens globally.
 *
 * Every edit asserts that its match exists on the expected line, so a drifted
 * file fails loudly rather than being half-rewritten.
 *
 * Run from the project root: node .kai/strip-card-hairlines.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const E3 = 'border border-[#E3E8EF] ';
const LINE = 'border border-line ';
const BORDER = 'border border-border ';
const D9 = 'border border-[#D9D9D9] ';

/** [file, line (1-based), match, replacement] */
const EDITS = [
  // --- Panels, dialogs and popovers that already carry a shadow -------------
  ['src/components/AddOnsSection.jsx', 65, E3, ''],
  ['src/components/CancelBookingDialog.jsx', 69, E3, ''],
  ['src/components/ChatWidget.jsx', 156, E3, ''],
  ['src/components/CookieConsent.jsx', 113, E3, ''],
  ['src/components/Hero.jsx', 213, E3, ''],
  ['src/components/Navbar.jsx', 391, E3, ''],
  ['src/components/Navbar.jsx', 467, E3, ''],
  ['src/components/Navbar.jsx', 551, ' bg-elevated rounded-2xl shadow-xl py-2 z-30 border border-[#E3E8EF]', ' bg-elevated rounded-2xl shadow-xl py-2 z-30'],
  ['src/components/NearbySection.jsx', 74, E3, ''],
  ['src/components/PropertyPage.jsx', 255, E3, ''],
  ['src/components/PropertyPage.jsx', 263, E3, ''],
  ['src/components/PropertyPage.jsx', 292, E3, ''],
  ['src/components/PropertyPage.jsx', 353, E3, ''],
  ['src/components/PropertyPage.jsx', 479, E3, ''],
  ['src/components/PropertyPage.jsx', 518, E3, ''],
  ['src/components/PushNotificationPrompt.jsx', 27, E3, ''],
  ['src/components/ReviewSection.jsx', 142, E3, ''],
  ['src/components/SaveToShortlistButton.jsx', 93, E3, ''],
  ['src/components/TripSearchBar.jsx', 10, E3, ''],
  ['src/components/Dropdown.jsx', 57, 'border border-[#E5E7EB] ', ''],
  ['src/components/SelectMenu.jsx', 82, 'rounded-[10px] border border-[#E2DAD0] bg-elevated shadow-lg dark:border-gray-600', 'rounded-[10px] bg-elevated shadow-lg'],
  ['src/components/DayRateDialog.jsx', 133, 'rounded-t-2xl border border-border bg-elevated shadow-lg', 'rounded-t-2xl bg-elevated shadow-lg'],
  ['src/components/MobileBottomNav.jsx', 102, BORDER, ''],
  ['src/components/HostMobileBottomNav.jsx', 23, BORDER, ''],
  ['src/components/ListingMirrorBody.jsx', 106, BORDER, ''],
  ['src/components/ListingMirrorBody.jsx', 119, BORDER, ''],
  ['src/components/ListingMirrorBody.jsx', 132, 'rounded-2xl border border-border', 'rounded-2xl'],
  ['src/components/SearchDateGuestFields.jsx', 79, 'sm:border sm:border-[#E3E8EF] ', ''],
  ['src/components/SearchDateGuestFields.jsx', 130, 'sm:border sm:border-[#E3E8EF] ', ''],

  // --- Cards that had a hairline but no shadow: they get the scale instead ---
  ['src/components/LegalPageContents.jsx', 47, 'rounded-2xl border border-[#E3E8EF] bg-elevated lg:hidden', 'rounded-2xl bg-elevated shadow-sm lg:hidden'],
  ['src/pages/BookingPage.jsx', 905, '"border border-[#D9D9D9] rounded-2xl p-4', '"rounded-2xl p-4 shadow-sm'],

  // --- Admin and host cards ------------------------------------------------
  ['src/pages/AdminListingDetail.jsx', 81, 'rounded-xl border border-border bg-elevated p-5 shadow-sm', 'rounded-xl bg-elevated p-5 shadow-sm'],
  ['src/pages/AdminListingDetail.jsx', 174, BORDER, ''],
  ['src/pages/AdminListingDetail.jsx', 190, BORDER, ''],
  ['src/pages/AdminListingDetail.jsx', 248, 'rounded-xl border border-border bg-elevated p-5 shadow-sm', 'rounded-xl bg-elevated p-5 shadow-sm'],
  ['src/pages/AdminListingDetail.jsx', 303, 'rounded-xl border border-border bg-elevated p-5 shadow-sm', 'rounded-xl bg-elevated p-5 shadow-sm'],
  ['src/pages/AdminListingDetail.jsx', 364, 'rounded-xl border border-border bg-elevated p-5 shadow-sm', 'rounded-xl bg-elevated p-5 shadow-sm'],
  ['src/pages/AdminListingPreviewPage.jsx', 75, BORDER, ''],
  ['src/pages/AdminListingPreviewPage.jsx', 127, BORDER, ''],
  ['src/pages/AdminMessages.jsx', 220, 'lg:rounded-xl lg:border lg:border-border lg:bg-elevated', 'lg:rounded-xl lg:bg-elevated'],
  ['src/pages/BecomeAHostPage.jsx', 133, LINE, ''],
  ['src/pages/BecomeAHostPage.jsx', 220, LINE, ''],
  ['src/pages/BookingPage.jsx', 1327, D9, ''],
  ['src/pages/BookingPage.jsx', 1337, D9, ''],
  ['src/pages/BookingDetailPage.jsx', 289, 'opg-detail-panel !mt-6 rounded-xl border border-border', 'opg-detail-panel !mt-6 rounded-xl'],
  ['src/pages/HostCalendarPage.jsx', 1174, 'rounded-full border border-border bg-elevated px-2 py-2 shadow-xl', 'rounded-full bg-elevated px-2 py-2 shadow-xl'],
  ['src/pages/TripHubPage.jsx', 85, 'opg-trip-feature rounded-xl border border-border', 'opg-trip-feature rounded-xl'],

  // --- Stylesheet: option cards and trust panels ---------------------------
  ['src/styles.css', 296, '  border: 1px solid #E3E8EF;\n  border-radius: 16px;\n  box-shadow: 0 8px 28px rgba(20,58,128,0.08);', '  border: 0;\n  border-radius: 16px;\n  box-shadow: 0 8px 28px rgba(20,58,128,0.08);'],
  ['src/styles.css', 2082, '.op-trust-sidebar,\n.op-trust-panel {\n  border: 1px solid #e5e7eb;\n  border-radius: 14px;\n  background: #fff;\n}', '.op-trust-sidebar,\n.op-trust-panel {\n  border: 0;\n  border-radius: 14px;\n  background: #fff;\n  box-shadow: var(--op-shadow);\n}'],
];

/** Multi-line matches: apply as whole-substring replacements, then assert gone. */
const BLOCK_EDITS = EDITS.filter(([, , match]) => match.includes('\n'));
const LINE_EDITS = EDITS.filter(([, , match]) => !match.includes('\n'));

const byFile = new Map();
for (const edit of EDITS) {
  if (!byFile.has(edit[0])) byFile.set(edit[0], []);
  byFile.get(edit[0]).push(edit);
}

let changed = 0;
for (const [file, fileEdits] of byFile) {
  let text = readFileSync(file, 'utf8');

  for (const [, lineNo, match, replacement] of fileEdits) {
    if (match.includes('\n')) {
      const hits = text.split(match).length - 1;
      if (hits !== 1) throw new Error(`${file}: block match found ${hits} times, expected 1\n${match}`);
      text = text.replace(match, replacement);
      changed += 1;
      continue;
    }

    const lines = text.split('\n');
    const original = lines[lineNo - 1];
    if (original === undefined) throw new Error(`${file}: line ${lineNo} does not exist`);
    const hits = original.split(match).length - 1;
    if (hits !== 1) {
      throw new Error(`${file}: line ${lineNo} contains the match ${hits} times, expected 1\n  ${original}`);
    }
    lines[lineNo - 1] = original.replace(match, replacement);
    text = lines.join('\n');
    changed += 1;
  }

  writeFileSync(file, text);
  console.log(`rewrote ${file} (${fileEdits.length} edit${fileEdits.length === 1 ? '' : 's'})`);
}

console.log(`\n${changed} edits applied across ${byFile.size} files`);
