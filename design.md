# ZuriLofts Design System

This is the only design document. It describes what the app actually renders today, read from the source, not what it is meant to become. When this file and the code disagree, the code is right and this file needs fixing in the same commit.

Verified against the code on 2026-11-07.

## 1. Where the system lives

| Concern | File |
|---|---|
| Colour, spacing, legacy component CSS, dark-mode overrides, motion | `src/styles.css` (single stylesheet, imported once by `src/main.jsx`) |
| Tailwind token names, shadow scale, fonts | `tailwind.config.js` |
| Styling for every Flowbite component (Button, Card, Badge, Alert, Input, Tabs, Modal, Dropdown, Table, Pagination) | `src/theme/flowbiteTheme.js` |
| Dark theme state, stored per account | `src/context/ThemeContext.jsx`, `src/utils/themeStorage.js`, `public/theme-init.js` |

Three layers of the same palette exist and all three are live. Prefer the Tailwind names in section 3 for new work; the `--ds-*`/`--op-*`/`--zl-*` variables exist so that shared CSS classes and dark mode keep working.

## 2. Who this app is

A premium short-let marketplace in Nairobi and the coast. One product, four audiences, one palette:

- Guest: discovery, search, listing detail, checkout, trips, messages, profile.
- Host: workspace (today, calendar, listings, earnings, reviews).
- Admin: full-bleed dashboard, queues, moderation.
- Public: places, restaurants, guides, legal, blog.

The brand reads navy first, brass as a highlight, warm off-white as the only warm tint. Never the other way round. Buttons are navy; brass is used for hairlines, eyebrows, small marks and the footer's top rule.

## 3. Colour

### 3.1 Core palette (light mode)

| Role | Hex | Tailwind name | Notes |
|---|---|---|---|
| Interactive (buttons, active states, links, focus) | `#143A80` | `primary`, `action` | White text: 10.8:1. Lightest navy that keeps AAA with white. |
| Interactive hover | `#0B2A5E` | `primary-hover`, `action-hover` | Every navy hover step goes here, not to a lighter tint. |
| Heading and body ink | `#143A80` light / `#E7EEF8` dark | `navy`, `indigo` | Flips with the theme, so it is text only, never a background. |
| Brand surface behind white text | `#0D1E3B` | `navy-bg` | Fixed. Footer, primary pills, avatars, mobile bar. White text: 16.6:1. |
| Brass (antique) | `#C5A28C` | `bronze` | Hairlines, eyebrows, small marks, footer rule. 2.4:1 on white, so never text and never a button fill. |
| Brass as text | `#8A6B52` | - | 4.9:1 on white, the only brass that may carry words. |
| Lighter brass | `#E5CCB3` | `champagne` | Sparingly, on dark surfaces. |
| Warm tint | `#F4F0E8` | `floral` | Icon washes, note panels, quiet highlights. |
| Heading ink (design-system 2026) | `#222222` | `ink` | Guest pages that have moved onto the 2026 names. |
| Secondary text | `#5B6B82` | `muted`, `cool-grey` | 5.4:1 on white. The only muted grey for body metadata. |
| Divider grey | `#E5E7EB` | `line`, `border` | The one divider colour. |
| Link / focus blue | `#2563EB` | `link` | Links and focus only. Never a button fill; it is there to stay distinct from heading ink. |
| Faint panel | `#F7F9FC` | `surface` | List rows, table headers, hovers. Reads as white on the canvas. |
| Inset panel | `#F6F8FC` | `inset` | Inputs, pressed states, quiet wells. |
| Page canvas | `#FFFFFF` | `canvas` | White, not cream. |
| Raised card | `#FFFFFF` | `elevated` | White on white; the shadow carries the edge. |
| Body text | `#1F2937` | `charcoal` | Paragraph copy on white. |

Two navy names are deliberately separate. `navy` is ink and flips to light in dark mode; `navy-bg` is a fixed surface that always carries white text. Merging them is what once turned buttons invisible in dark mode.

### 3.2 Dark mode values

| Token | Light | Dark |
|---|---|---|
| canvas | `#FFFFFF` | `#08101F` |
| elevated | `#FFFFFF` | `#162238` |
| surface | `#F7F9FC` | `#111B2D` |
| inset | `#F6F8FC` | `#0D1728` |
| line | `#E5E7EB` | `#26344A` |
| ink, navy | `#143A80` | `#E7EEF8` |
| muted | `#5B6B82` | `#9FB0C6` |
| link | `#2563EB` | `#7EA6FF` |
| brand surface (fixed) | `#0D1E3B` | `#0D1E3B` |
| footer | `#0D1E3B` | `#0B1424` |
| mobile bars | `#0D1E3B` | `#13233A` |

The dark block also redeclares the older `--op-*`, `--zl-*`, `--control-*` and `--dm-*` families. A new colour must be given a dark value in the same edit; a light-only token will render as a light patch on a dark page.

### 3.3 Status colours

Status means a labelled state, never decoration. Solid on guest surfaces, tinted on host and admin.

| Meaning | Text on tint (light) | Tint | Dark tint |
|---|---|---|---|
| Success, confirmed, paid | `#157347` | `#E7F6EE` | `green-900/40` with `green-300` text |
| Pending, awaiting, warning | `#8A5A00` | `#FDF3D8` | `amber-900/40` with `amber-200` text |
| Failure, cancelled, danger | `#B42318` | `#FDECEC` | `red-900/40` with `red-300` text |
| Neutral, info | `#475569` / `#203565` | `#F1F5F9` / `#EEF2F8` | `gray-700` with `gray-200` text |

Solid status buttons use `green-700` (5.0:1 with white), not `green-600` (3.3:1, below the small-text floor), and `red-600` with white.

### 3.4 Colour rules

1. Navy fills buttons. Brass never fills a button, a badge or a card.
2. One interactive colour per surface. Do not put brass and blue actions side by side.
3. Do not introduce a hex that is not in this document. If a screen seems to need one, it needs the nearest token instead.
4. Hard-coded light hexes inside pages are mapped to dark surfaces by attribute selectors in `styles.css`, and that matcher also matches `hover:bg-[#...]`. Adding a new pale hex to a hover state can therefore paint every row at rest in dark mode. Use a token class for hovers.
5. Contrast is measured, not assumed. Brass on white (2.4:1) and `green-600` on white (3.3:1) both fail and are both used only where already noted.

## 4. Typography

| Use | Family | Size / weight |
|---|---|---|
| Body, forms, UI labels | Inter | 16px base; `text-sm` (14px) is the working size for almost all UI, 12px metadata, 11px micro-labels, 10px only on dense mobile chrome |
| Headings, eyebrows, wordmark, buttons in shared CSS | Montserrat | `h1` to `h3`, `b`, `strong` are Montserrat inside `.zl-app` |
| Long-form article text | Roboto (available, rarely used) | - |

Loaded families: Inter 400-800, Montserrat 500-800, Roboto 400-500, from Google Fonts in `index.html`.

Real scale, from usage counts across `src/components` and `src/pages`:

- `text-sm` (14px) is the workhorse: labels, table cells, body in cards.
- `text-xs` (12px) for metadata; `text-[11px]` for table heads and eyebrows, uppercase with `tracking-wide`.
- Page titles `text-2xl` to `text-3xl`; hero `text-4xl` to `text-5xl`, with tight tracking (`-1px` to `-2.6px`).
- Eyebrow pattern: Montserrat, 10-11px, weight 700-800, uppercase, letter-spacing `.06em` to `1.25px`, brass at `#8A6B52`.
- Line height 1.5 for body, 1.1-1.2 for display headings.
- No font weights below 400, no italics for emphasis, no all-caps body copy.

## 5. Layout and spacing

| Thing | Value |
|---|---|
| Header height | 72px desktop, 56px under 768px, sticky, `z-20` |
| Header padding | `max(24px, calc((100vw - 1200px) / 2))` |
| Section container | `min(1240px, 100%)` (`.zl-section`, `.zl-page`), `min(1200px, calc(100% - 48px))` (`.opg-container`) |
| Wide app shell | `max-w-[1344px]` where a screen needs the full dashboard width |
| Narrow reading measure | `max-w-3xl` (768px) for forms and settings |
| Legal copy | 800px |
| Page rhythm | `--zl-space-page` 64px desktop / 32px mobile, `--zl-space-section` 48 / 32, `--zl-space-heading` 36 / 26, `--zl-space-card` 24 / 20 |
| Card grid gap | 20-24px |
| Mobile bottom bars | Reserve `--zl-bottom-nav-space` = 64px + safe-area; bars sit 12-16px off the edges |
| Breakpoints | `sm` 640, `md` 768, `lg` 1024, `xl` 1280. The mobile/desktop split that matters is `md`: below it the desktop nav is replaced by the bottom bar. |

Mobile-first: one column, then `lg:grid-cols-2`, then `lg:grid-cols-3` for card grids. The admin shell is full-bleed with a collapsible sidebar (`w-64` to `w-16`), never a centred column.

## 6. Shape and elevation

The app is flat and largely borderless. Depth comes from shadow, and shadow is the only thing that makes a card an object.

| Element | Radius | Border | Shadow |
|---|---|---|---|
| Button (shared Flowbite Button) | `9999px` pill | none | none at rest |
| Input, select, icon button | 10px | 1px `#E2DAD0` | none |
| Card | 14px | none | `shadow-md` |
| Panel, modal | 14px to 16px | none | `shadow-lg` |
| Listing image | 12px | none | none |
| Avatar, chip, badge, toggle | pill | none | none |
| Table | 14px on the first and last row corners | none | `shadow` behind the grid |

Shadow scale (in `tailwind.config.js`, all built for borderless cards, each a tight contact edge plus a soft base):

- `shadow-sm`: controls and chips.
- `shadow-md`: cards on the canvas.
- `shadow-lg` / `shadow-xl`: panels, modals, sticky checkout summaries.
- `shadow-2xl`: overlays only.

Rules:

1. No 1px hairline outline around a card or a button. Flowbite's own `border border-gray-200` is overridden in the theme on purpose.
2. Do not mix a border and a shadow to define the same edge.
3. The legacy `.neu-*` neumorphic classes and the `.zl-card`/`.op-card` CSS families still exist in `styles.css`. They are not the target: new surfaces use the Flowbite `Card` theme plus Tailwind tokens. Do not add new uses of `.neu-*`, `.ui-btn-*` or `.opg-*` unless you are editing an existing screen that is built from them.

Known inconsistency, recorded rather than hidden: shared CSS buttons (`.ui-btn-primary`, 9px radius, `#0D1E3B` fill, Montserrat) and the themed Flowbite `Button` (pill, `#143A80` fill) still coexist. The Flowbite `Button` is the current system and carries the vast majority of usage; the CSS button classes have no remaining callers in JSX and should be deleted, not extended.

## 7. Components

All component styling goes through `src/theme/flowbiteTheme.js`. A page stylesheet must not restyle a Flowbite control.

### Button

| Variant | Fill | Text | Hover |
|---|---|---|---|
| `color="default"` (primary) | `#143A80` | white | `#0B2A5E` |
| `color="alternative"` / `light` (secondary) | white, 1px `#E2DAD0` | `#203565` | `#F8FAFC` |
| `outline` | transparent, 1px `#203565` | `#203565` | `#F8FAFC` |
| `gray` (quiet) | `#F1F5F9` | `#203565` | `#E2E8F0` |
| `success` | `green-700` | white | `green-800` |
| `failure` | `red-600` | white | `red-700` |
| disabled | `bg-inset` | `text-muted` | none, full opacity |

Shape and size: pill, `whitespace-nowrap`, `sm` 36px, `md` 44px (default), `lg` 48px, `xl` 52px. Focus: `ring-2` in `primary` at 35% alpha.

Rules:

1. Every clickable target is at least 44x44px. Icon-only buttons are 40-44px squares with a pill or 10px radius.
2. One primary button per view. Everything else is secondary, outline or a text link.
3. Labels are verbs in sentence case ("Save changes", "Continue to payment"), never "Submit" or "OK".
4. Pills size to their label, so a row of buttons wraps as a whole. Never let a label break across two lines.

### Form controls

Min height 44px (`sm` 38px, `lg` 52px), 10px radius, 1px `#E2DAD0` border, white fill, `#111827` text, `#6B7280` placeholder, 1px focus ring plus navy border on focus. Error and success states switch border and text together and always carry a written message next to the field, never colour alone.

### Card

`rounded-[14px]`, `border-0`, `bg-elevated`, `shadow-md`, internal padding 20px, children in a 16px-gap column. Borders are removed in the theme so the shadow alone carries the edge.

### Status badge

Pill, 11-12px, weight 600, `px-2.5 py-0.5`, colour pairs from section 3.3. A badge always names the state in words; the colour is a second signal, not the only one.

### Table

Header row `#F8FAFC`, 11px uppercase `#5B6B82`, cells 14px, row dividers `#F1F5F9` with no outer border, rows hover to `#FBFCFD`, corners rounded 14px on the first and last row.

### Tabs

Underline variant for page sections (2px brass underline when active, `#5B6B82` when not). Pill variant only for filters inside a toolbar. Active pill: navy fill, white text, pill radius.

### Modal and dropdown

Modal: 16px radius, white, `shadow-lg`, header and footer divided by `#E3E8EF`, body scrolls, max height 90dvh. Dropdown: 10px radius, white, `shadow-md`, `#E3E8EF` dividers, list capped at `min(20rem, 40dvh)` and scrollable, hover and focus both `#E8EDF7`.

### Navigation

- Guest header: white, 56-72px, brand mark left, centred search, actions right, 1px `#E3E8EF` bottom rule, sticky.
- Guest mobile bar: floating navy pill, 5 items (Explore, Saved, Trips, Messages, Profile), 40px radius, white icons, brass active rail under the active item, hidden on checkout, host and admin.
- Host bar: same pattern, host destinations.
- Footer: navy surface, 4px brass top rule, brass uppercase column headings, 12px `#E0E6ED` links, 11px legal row with the cookie settings button.

## 8. Motion

- Transitions 150-200ms, `ease`, on colour, shadow and transform only.
- Hover lifts are 1-3px at most (`translateY(-1px)` to `-3px`), never on text-only rows.
- Images scale 1.04 inside their mask on card hover.
- No entrance animations on content that the person is waiting to read.
- Every animation respects `prefers-reduced-motion: reduce`; `styles.css` already disables the marquee, header search and mode transitions there. New animation must be added to a reduced-motion block in the same edit.

## 9. Accessibility baseline

1. Text contrast 4.5:1 minimum, 7:1 for body copy where the pairing allows.
2. Focus is always visible: `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`, or the Flowbite `ring-2` ring. Removing an outline without a replacement is a defect.
3. 44x44px minimum targets, including icon buttons and mobile nav items.
4. Status and error never rely on colour alone; pair with words or an icon plus a text alternative.
5. Every form control has a real label. Placeholders are hints, not labels.
6. Images carry descriptive `alt`; decorative images use `alt=""` and `aria-hidden`.
7. Icons that sit next to a visible label are `aria-hidden="true"`.
8. Motion, including the auto-advancing pieces, stops under reduced-motion.
9. The theme is a person's own choice, stored per account, defaulting to light and never following the OS.

## 10. Dark mode

- A `dark` class plus `data-color-mode` on `<html>`; Tailwind `darkMode: 'class'`.
- `public/theme-init.js` applies the saved theme before first paint. It is a file rather than an inline script because the API sends `script-src 'self'`.
- The choice is per account: `zurilofts_theme:<id>` and `zurilofts_theme_active` in local storage. The old shared key is deleted and never read, so one person's dark page can never greet the next person.
- New UI must be checked in both themes. Any hard-coded light value needs its dark counterpart in the dark block of `styles.css` or a `dark:` variant in the class list.

## 11. Imagery and content

- Listing images 4:3 in cards (`aspect-[4/3] object-cover`), 16:9 in heroes, 282:182 in the compact search results grid.
- Images are rounded 12-14px, never with a border, and always have a defined background tint so a missing image does not flash white.
- Copy is sentence case, short, specific. Prices show the currency and the unit together ("KES 12,500 / night"). Dates are written out, never numeric-only.
- Error and empty states say what happened, what it means and the one action available.

## 12. Before adding UI

1. Find the closest existing screen and reuse its component, not its pixel values.
2. Use a token from this file, not a new hex.
3. Style Flowbite through the theme file, not a page-level override.
4. Check both themes, 390px and 1440px, keyboard focus, and reduced motion.
5. Delete, do not comment out, the style you replaced.
6. If the result is intentionally different from this document, change this document in the same commit.
