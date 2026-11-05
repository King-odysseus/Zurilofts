# Accessibility audit, 2026-11-05

Read-only audit of the running app at commit `5afe0e0`. No page code was changed.

## Scope and method

The app was served locally (Vite on `http://localhost:5173`, API on `http://localhost:3000`) against the seeded SQLite database. Every page below was loaded, inspected in the DOM, and driven with the keyboard in Chromium through Playwright. Automated checks used axe-core 4.10.2 with the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa` tags.

Manual checks on each page: Tab order from the top, visible focus, Enter and Space activation, Escape on every dialog and popover, focus return after closing, heading and landmark structure, page title, form labels and error announcements, 200 percent zoom (CSS root zoom, which reflows as browser zoom does), a 390 pixel viewport, dark mode, and `prefers-reduced-motion`.

### Pages covered

Public: home, stays list, property detail, places, restaurants, guides list and article, help centre, privacy, terms, credits, become a host, earnings calculator, 404, sign in, create account, forgot password, reset password.

Signed in as a guest: trips, bookings, inbox, messages, profile, favourites, shortlists, identity verification, checkout.

Signed in as a host: today, reservations, listings, listing form, inbox, earnings, payouts, settings, insights, calendar, discounts, verification, host application.

### Not covered

- Admin workspace in the first pass: no `ADMIN_EMAIL` or `ADMIN_PASSWORD` was set, so there was no way to sign in. Covered later the same day, see "Admin workspace" below.
- Payment callback and the Paystack iframe.
- Real screen reader output. Findings are based on the accessibility tree, computed styles and keyboard behaviour, not on NVDA or VoiceOver speech.

## Barriers

Ordered by how much they block. Each gives the page, the steps, what was observed, and the smallest fix.

### 1. Every page has seven invisible controls in the Tab order

Pages: all.

Steps: load any page at desktop width, press Tab from the top.
Observed: after the header account button, focus disappears for seven presses. It lands on `Close menu`, `Sign in`, `Create account`, `Become a host`, `Switch to dark mode`, `English`, `Swahili`. Each has an effective opacity of 0. They sit inside `#navbar-main`, the mobile navigation panel, which stays mounted when closed with `opacity: 0`, `role="dialog"`, `aria-modal="true"`, and no `aria-hidden` or `inert`. A screen reader announces a dialog that is not displayed, inside a page where it is also claimed to be the only thing on screen.

Why it matters: a sighted keyboard user loses the focus ring seven times per page and cannot tell where they are. A screen reader user is told about controls that are not visible and may be blocked from reading the page behind a dialog that is not actually modal.

Fix pattern: when the panel is closed, remove it from the accessibility tree and the tab order, for example `hidden` or `inert` plus `aria-hidden="true"`, and set `aria-modal` only while it is open and focus is trapped. Unmounting it on close is simplest.

### 2. The photo viewer is unusable by keyboard and invisible to screen readers

Page: property detail, any photo tile.

Steps: Tab to a photo tile, press Enter, then Tab.
Observed: a full screen overlay (`fixed inset-0 z-50 bg-black/95`) opens with no `role="dialog"`, no accessible name and no `aria-modal`. Focus stays on the page behind the overlay, and the next Tab moves through content the overlay is covering: `View photo 1`, `View photo 3`, `Read the reviews`. The viewer's own `Close gallery` button is reached only after 35 Tab presses. Six thumbnail buttons inside the viewer have no accessible name. Escape does close the viewer, but focus is left on whatever was tabbed to, not on the photo that opened it.

Why it matters: a keyboard user cannot see the viewer controls or know that a viewer opened, and a screen reader user is never told anything changed.

Fix pattern: give the overlay `role="dialog"`, `aria-modal="true"` and an `aria-label` such as the photo caption, move focus to `Close gallery` on open, trap Tab inside, close on Escape and return focus to the tile that opened it, and label the thumbnail buttons `View photo N`.

### 3. The search calendar cannot be operated without sight

Page: stays list, date field.

Steps: open Check in from the keyboard, then Tab through the popover.
Observed: the two month navigation arrows are icon buttons with no accessible name, so they are announced as just "button". Day cells are buttons whose only name is the number, for example "26", with no weekday, no month, no selected state and no `aria-current`. There is no grid or table semantics, and the month change is not announced.

Why it matters: a screen reader user hears "26, button" sixteen times with no way to tell which date is chosen or which month they are in. Choosing a date blind is guesswork.

Fix pattern: `aria-label="Previous month"` and `"Next month"` on the arrows, an `aria-label` per day with the full date and the selected state (`20 November 2026, selected`), `aria-pressed` or `aria-selected` for the chosen dates, and a grid role with an `aria-live` month heading.

### 4. Identity document uploads have no labels

Pages: identity verification (guest, 4 inputs) and host verification (3 inputs).

Steps: open either page with a screen reader or in the tab order and reach a file input.
Observed: every input is `<input type="file" class="sr-only" accept=... capture=...>` with no `label`, no `aria-label` and no `aria-labelledby`. axe reports the `label` rule as critical on all of them. Each is announced as an unnamed "Choose file" button, so the front of an ID, the back of an ID and a selfie are indistinguishable.

Why it matters: a blind user cannot tell which document each upload expects and can easily upload the wrong image to the wrong slot.

Fix pattern: give each input its own `aria-label` ("Front of ID", "Back of ID", "Selfie with ID") or an id plus a `<label>`, and keep the visible text as the label text.

### 5. The focus ring fails contrast on light surfaces

Pages: all, most visibly the header links.

Steps: Tab to a header link and inspect the indicator.
Observed: the ring is `0 0 0 2px #FFFFFF, 0 0 0 4px #C5A28C`. On a white header, the white ring is invisible and the visible part is the brass ring. Brass `#C5A28C` on white is 2.35 to 1. The bar for a focus indicator is 3 to 1. The carousel dots use a white ring on a white pill, which is invisible outright.

Why it matters: low vision users can lose the indicator on the surfaces where most navigation happens.

Fix pattern: use the brand navy `#143A80` as the outer ring on light surfaces (10.79 to 1 on white), keep brass for dark surfaces where it reaches 5.92 to 1 on `#0B2A5E`, and make sure every indicator has a 3 to 1 change against both the component and the page.

### 6. Photo carousel dots are 6 by 6 pixels

Page: home and stays list, each property card.

Steps: inspect `button[aria-label^="Show photo"]`.
Observed: ten per page at 6 by 6 pixels with 6 pixel gaps. WCAG 2.2 target size minimum asks for 24 by 24, or 24 pixels of spacing, so these fail both. Their focus ring is white on white.

Fix pattern: keep the 6 pixel visual dot but give the button a 24 by 24 transparent hit area, and a visible navy ring on focus.

### 7. Menus that declare themselves modal do not behave as modal

Pages: all, header account menu.

Steps: open the account menu with Enter, then Tab ten times; or open the mobile menu, press Escape.
Observed: the account menu is `role="dialog"`, `aria-modal="true"`. Opening moves focus to the first item, which is good, but Tab then leaves the dialog and lands on page content and on the hidden mobile panel. Escape closes it without returning focus to the account button. On mobile, opening the menu leaves focus on the trigger, and Escape closes the panel while focus stays on a now hidden `Sign in` item.

Why it matters: keyboard users lose their place, and screen readers are told the rest of the page is unavailable when it is not.

Fix pattern: either drop `aria-modal` and treat these as non modal popovers, or trap focus while open, mark the rest of the page inert, and return focus to the trigger on Escape.

### 8. Missing headings and landmarks on key pages

Observed:
- Places and Restaurants have no `h1` at all.
- Property detail has no `main` landmark.
- Checkout has neither an `h1` nor a `main` landmark.
- Sign in, create account, forgot password and reset password use the marketing line "Find your place in Nairobi." as their `h1` instead of the page purpose. The page title is correct, so sighted users are not affected, but heading navigation lands on marketing copy.

Fix pattern: one `h1` per page naming the page, and wrap the primary content in `<main>`. The auth pages already have a heading slot; use "Sign in", "Create account", "Reset your password".

### 9. The mobile filter sheet has no dialog semantics or focus handling

Page: stays list at 390 pixels wide.

Steps: activate Filters.
Observed: a `div.opg-filter-backdrop` opens with no role and no name, and focus stays on the Filters button. Escape closes it and focus returns to the button, but nothing tells assistive technology a panel opened.

Fix pattern: same pattern as the lightbox, a labelled dialog with focus moved into it.

### 10. Text contrast failures

Measured with axe and confirmed by hand:
- Active nav item `#C89B6D` on white: 2.51 to 1, at 14 pixels. This is on every page.
- Home hero badge, white on `#16a34a` at 10 pixel bold: 3.29 to 1.
- Three home paragraphs `#6E7686` on `#F8FAFC`: 4.36 to 1, just under the 4.5 requirement.
- Mobile search field labels `#64748b` on `#f6f7f9` at 11 pixels: 4.43 to 1.
- Host verification eyebrow `#8A6B52` on navy `#16294B`: 2.96 to 1. The design system asks for `#E5CCB3` on dark.

Fix pattern: `#8A6B52` for the active nav item, darken the home paragraphs to at least 4.5 to 1, darken the mobile search labels, and swap the navy eyebrow to `#E5CCB3`.

### 11. Switching to Swahili leaves the page declaring English

Pages: all, language switcher.

Steps: open the account menu, choose Swahili.
Observed: the `h1` becomes "Pata makazi yako Nairobi" and the title becomes Swahili, but `document.documentElement.lang` stays `en`.

Why it matters: a screen reader will pronounce Swahili with an English voice, which is often unintelligible.

Fix pattern: set `document.documentElement.lang` to `sw` when the locale changes, and back to `en` on switch.

### 12. Form errors are announced but not attached to their fields

Pages: sign in, create account.

Observed: both errors use `role="alert"`, so they are announced once. On sign in, after a failed submit, focus falls to the document body, so the keyboard user has to start again from the top. On create account, the "Passwords do not match" error leaves the confirm field without `aria-invalid` or `aria-describedby`.

Fix pattern: set `aria-invalid` and an `aria-describedby` pointing at the error text on the field that failed, and keep or move focus to that field.

### 13. No skip link

Pages: all. There is no "skip to main content" link, so every page starts with eight or more header stops, then the seven invisible panel stops described above.

Fix pattern: a visually hidden link that appears on focus, pointing at the `main` id.

### Minor

- The push notification banner is the first element in the DOM on every page, ahead of the brand and heading, and has no landmark or `aria-live`. Its close control is 16 by 16 pixels and shares the name "Not now" with the visible dismiss button.
- The Filters button's accessible name includes a decorative glyph, read as part of the name.
- Heading order skips from `h1` to `h3` on the stays list, because property cards use `h3` with no `h2` above them.
- Dark mode resets to light after any navigation, so the setting does not persist.

## What passed

- Host workspace: every screen has one `h1`, one `main`, a correct page title and no axe violations except the two host verification items above.
- The listing form: 33 visible fields, all labelled, 7 marked required, no violations.
- Guest screens: trips, bookings, inbox, messages, profile, favourites, shortlists all have a single `h1` and a `main`.
- Sign in and create account have correctly associated labels and sensible field types.
- Images: no missing `alt` and no misleading empty `alt` on the pages checked.
- Dark mode contrast on the stays list: zero violations.
- 200 percent zoom: no horizontal overflow and no clipped text on home, stays list, property detail and checkout.
- No auto-playing video, marquee or animated carousel on the home page, and nothing changes on its own over 8 seconds.
- `prefers-reduced-motion: reduce` is respected, though `scroll-behavior: smooth` stays on.
- Language buttons expose `aria-pressed`, the theme toggle exposes `aria-pressed`, and the account menu exposes `aria-expanded`.

## Admin workspace (follow-up, same day)

The first pass could not reach the admin area. This second pass configured the account, tested all of it, and fixed what it found. `npm run lint` and `npm run build` pass.

### How the account was configured

The account comes from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, synced at boot by `server/src/services/admin-bootstrap.service.ts`. Locally neither was set, and `server/.env.example` did not mention them, so nothing told a new environment that the variables existed. Both are now documented in `server/.env.example`, and set in the local `server/.env`, which git ignores.

Two accounts already held ADMIN in the dev database: `admin@zurilofts.co.ke` and a leftover test account, `qa-form-check@example.com`. The first boot after configuring demoted the second to USER. That is the service's one-admin rule working as intended, and it explains how a test account had been left with admin rights: nothing was enforcing the rule because the variables were unset.

Verified end to end: a fresh boot of the API, then signing in through the real form with the configured password returns role ADMIN, and every admin route loads.

### Method

Signed in through the form, then for each of the 15 admin routes plus a listing review, a listing preview and a host application review: axe 4.10.2 with the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa` tags, heading and landmark structure, page title, an accessible name for every control, a Tab walk from the top, reflow at 640 pixels (the equivalent of 200 percent zoom), a 390 pixel viewport, dark mode, and the mobile drawer.

### Barriers, all fixed

1. **The sidebar's "Workspace" label was effectively invisible.** It was brand navy `#143A80` on the navy column `#0d1e3b`, 1.53 to 1 where 4.5 is required. Now brass `#E5CCB3`, 10.76 to 1. Every one of the 15 screens showed it.
2. **The four sidebar group labels were too faint.** "Overview", "People", "Platform" and "Account" were `text-white/40`, computed `#6e7889` at 10 pixels, 3.72 to 1. Now `text-white/60`, 6.69 to 1.
3. **Success buttons failed contrast.** White on `green-600` `#16a34a` at 12 pixels is 3.29 to 1; the two publish buttons on Add-ons showed it. This is the shared button theme, so the fix applies wherever a success button appears: `green-700` for the fill (5.02 to 1) and `green-800` for hover (7.13 to 1).
4. **The listing preview page had two `h1` elements**, the page's own "Guest view" and the listing title rendered by the embedded guest view. The host preview had the same fault. The embedded view now takes a heading level, and both callers pass `h2`, so each page has one `h1` and the sections below remain `h2`.
5. **A host application review kept the dashboard's tab title.** `/admin/host-applications/:id` fell through to "Overview | ZuriLofts Admin" while showing a named applicant. It now reads "Host application | ZuriLofts Admin", with the title table and both language files updated.
6. **No skip link.** Fourteen sidebar links sat before the content on every screen. A "Skip to main content" link now comes first; verified it becomes visible on focus (170 pixels wide) and that Enter moves focus to the main region.
7. **The account menu announced itself as "AUAdmin".** The decorative initials were part of the name. They are now `aria-hidden`, and the button is labelled "Account menu".
8. **The cookie banner covered the mobile bottom bar.** At 390 by 844 the panel's lower 42 pixels sat over the 58 pixel navigation, so the last items could not be tapped until the visitor answered. The panel now clears the bar below the large breakpoint; measured again at an 18 pixel gap.

### What passed

- One `h1`, one `main` and a correct page title on every admin screen, apart from items 4 and 5 above.
- Every control on every admin screen has an accessible name, and no image lacks `alt`.
- Dark mode: no violations beyond the sidebar items now fixed.
- 640 pixel reflow: no horizontal overflow on the dashboard or the users table.
- The mobile "More" drawer is a labelled `role="dialog"`, mounts on open, and Escape closes it and returns focus to the More button.
- After the fixes, axe reports zero violations on all 17 admin URLs checked.

### Still open, and not admin-specific

- The focus ring is brass on white at 2.35 to 1, item 5 in the main list above.
- The push prompt's two "Not now" buttons are still the first stops on every page, ahead of the brand link.
- The skip link now exists only in the admin workspace; the guest site and the host workspace still have none.
