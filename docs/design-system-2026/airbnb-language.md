# Airbnb visual language applied to ZuriLofts

Audited 2026-10-25 against the live airbnb.co.uk site. Two published screenshots
of the host app are stored here as evidence:

| File | What it shows |
|---|---|
| `reference/airbnb-host-earnings.webp` | Host earnings sheet: cream panel, full width dark CTA, centred heading |
| `reference/airbnb-host-payout.webp` | Host earnings header: statement figure, quiet secondary line, small dark button |

The other pages were read live in a browser and are listed here so anyone can
re-check them rather than take my word for it:

| URL | What to look at |
|---|---|
| `airbnb.co.uk` | Pill search bar with 3 segments, category tabs, card rows, 12px image radius |
| `airbnb.co.uk/s/Nairobi--Kenya/homes` | Card grid, filter pills, 24px map panel, sticky header |
| `airbnb.co.uk/rooms/<id>` | Photo mosaic, 26px title, sticky booking card with date boxes |
| `airbnb.co.uk/host/homes` | Host display headline, generous whitespace, cream callout band |

Screens behind a login (guest Trips, host Today, admin) could not be captured.
Those boards extrapolate from the public host pages, Airbnb's published app
screenshots and the patterns above, so treat them as interpretation, not a copy.

## What actually makes it look like Airbnb

1. **White canvas, almost no chrome.** There are no coloured panels, no tinted
   page backgrounds, no gradients. Structure is carried by 1px `#DDDDDD` lines
   and empty space. Cards are white on white, lifted only by a soft shadow when
   they float over content (the booking card).
2. **One typeface, tight and calm.** Headline weight is 600, never 800. Large
   headings are set tight (`-0.02em`) so they read as one shape. Body is 14-15px
   with generous line height. Muted text is a real grey (`#717171`), not a tint.
3. **Small radius, big spacing, pill buttons.** Images 12px, card containers
   12-16px, inputs and date boxes 8px. Buttons, filters and badges are fully
   rounded pills - a pill reads as an action, an 8px box reads as a field.
   Gaps are large: 24px between cards, 48px between sections.
4. **Photography is the colour.** The only saturated thing on a page is the photo.
   Everything else is white, near-black and grey.
5. **Statements instead of stat boxes.** Airbnb does not use rows of four
   identical metric tiles. Money and counts appear as one large number with a
   quiet line under it ("You've made 604.11 this month / Upcoming 535.72").
6. **One clear action per screen.** A dark or accent filled pill button, 48px
   tall, full width inside cards. Secondary actions are white pills with a grey
   border at the same height, so a row of two never looks uneven.

## Mapping onto ZuriLofts brand

Airbnb's single accent is pink. ZuriLofts already has a defined palette in
`DESIGN.md`, so the structure is copied but the colour roles stay ours.

| Role | Airbnb | ZuriLofts | Notes |
|---|---|---|---|
| Primary action | `#FF385C` pink, white text | `#C49A6C` bronze, navy ink | Same single-accent rule; white on bronze only reaches ~2.3:1, so the ink is navy |
| Text / ink | `#222222` | `#222222` charcoal | Headings are charcoal, not navy |
| Strong secondary | `#222222` black | `#0B1F42` navy | Filled dark buttons, wordmark |
| Links, active nav | `#FF385C` / underline | `#2563EB` blue | Links and focus only |
| Canvas | `#FFFFFF` | `#FFFFFF` | White page, no tinted panels |
| Inset block | `#F7F7F7` | `#F7F7F5` warm off-white | Info strips, table heads |
| Border | `#DDDDDD` | `#E5E7EB` | Every divider uses this |
| Muted text | `#717171` | `#6b7280` | |
| Status | green / amber / red | `#16a34a` / `#d97706` / `#dc2626` | Badges only |

Rule carried over from `DESIGN.md` that the old mockups broke: bronze is the
only filled primary, blue is never a filled button, and secondary buttons are
white with a grey border.

## Concrete tokens used in the mockups

```
radius:    img 12  |  card 16  |  input 8  |  pill 999 (all buttons)
height:    control 48  |  small control 38  |  search field 56  |  row 72
space:     4 8 12 16 24 32 48 64
type:      display 44/600/-0.02em   page 28/600   section 20/600
           card 15/600   body 14/400   meta 13/400   label 11/600/+0.08em
shadow:    0 6px 16px rgba(0,0,0,.12)   (floating cards only)
border:    1px #E5E7EB   (never 2px, never coloured)
```

## Deltas this creates against the current app

These are the visible inconsistencies the audit found, and where each one stands.

| Current | Replacement |
|---|---|
| Six separate stylesheets, 9 radii, 8 border greys | Resolved: three global stylesheets (`index.css`, `tailwind.css`, `flowbite-controls.css`), radius by role, border colours in the token block |
| Four identical metric tiles on every page | One statement figure + inline stats |
| Buttons in bronze, navy, blue, outline, `rounded-full` and `rounded-lg` mixed | Resolved: one pill shape for every Flowbite `Button`, set once in the theme; only the `color` prop varies |
| Page titles at 20, 24, 26 and 32px | One page title size (28px/600) |
| Tables with zebra rows and heavy headers | Divider rows, 11px uppercase labels, hover `#F7F7F5` |
| Sidebar with filled coloured active state | White sidebar, pill hover, 3px accent marker. Still the target: the app sidebar is navy. Its rhythm was tightened, though - menu rows sit 2px apart in one block, each section label carries its own top padding, labels, icons and item text share one left gutter, and the icon-only rail separates its groups with a hairline |
| Empty states as coloured alert boxes | Centred icon, one bold line, one muted line, one action |

The rows marked Resolved have landed; the rest are still the target.

## Buttons are pills, and they come from Flowbite

The shape is Airbnb's: fully rounded, 48px tall, one accent fill per screen.
In this codebase that shape belongs to the Flowbite `Button` component, not to a
page stylesheet, so it is set once in `src/theme/flowbiteTheme.js`:

```js
button: {
  base: 'relative flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-center font-semibold focus:outline-none disabled:pointer-events-none disabled:bg-inset disabled:text-muted disabled:opacity-100',
  pill: 'rounded-full',
  size: {
    xs: 'h-8 px-3 text-xs',
    sm: 'h-9 px-4 text-sm',
    md: 'min-h-[44px] px-5 text-sm',
    lg: 'min-h-[48px] px-6 text-base',
    xl: 'min-h-[52px] px-7 text-base',
  },
  color: {
    default:     #C49A6C bronze fill, #0B1F42 navy ink   // primary action
    alternative: white with a #E2DAD0 border              // secondary
    light:       white with a #E2DAD0 border              // secondary
    dark:        #0B1F42 navy fill, white ink             // strong secondary
    gray:        #F1F5F9 fill, navy ink
    success:     green 600 fill, white ink                // status only
    failure:     red 600 fill, white ink                  // status only
    warning:     amber 500 fill, navy ink                 // status only
  },
  outlineColor: { default: bronze outline, dark: navy outline },
}
```

Labels never wrap. `whitespace-nowrap` sits in the base, so a label cannot break
across two lines and turn the pill into a tall blob. Where a row of buttons is
too wide for the screen, the row wraps as a whole - `flex-wrap` on the parent -
instead of each label breaking up.

What that means when building a screen:

| Need | Use | Not this |
|---|---|---|
| Primary action | `<Button pill>` (bronze default) | a hand-written `.btn` div |
| Secondary action | `<Button color="light" pill>` | an outlined `span` with a click handler |
| Icon-only control | `<Button color="light" pill>` with an icon | a bare `<button>` with CSS |
| Shape override | the theme above | `border-radius` in a page stylesheet |

### Where the pill shape now comes from

The pill shape has exactly one intended source: the Flowbite theme object in
`src/theme/flowbiteTheme.js`, which every `Button` in the app reads. Stylesheets
under `src/` are retired as each surface moves onto shared Flowbite components,
so treat the theme as authoritative rather than any one stylesheet. A stylesheet
that restates a button radius is drift to be removed, not a rule to follow.

When a surface still restates a radius in its own stylesheet, that is a bug on
that surface, not a precedent: the fix is to let the Flowbite `Button` paint it.

Two rules of thumb survive that cleanup: a dropdown item or a tab is a row, not
an action, so it keeps a small radius (the menu panel is `rounded-[10px]`, a tab
item `rounded-t-lg`); only real actions are pills.

## Two later decisions

**Row actions on phones.** A list row's actions never leave one pill stranded on
a line of its own. Below 860px the action group takes the row width and its
buttons flex, so a single action reads as a deliberate card action rather than a
wrapped leftover (`docs/design-system-2026/preview.css`, `.list__actions`).

**A filter bar is a toolbar, not a search bar.** The page-level filter and
selector bar is one slim row - small search field, two selectors, a clear action
and a result count - about 38px tall, the `sizing="sm"` control height, stacked
full width on phones (`src/components/NearbySection.jsx`). The large segmented
pill search bar is reserved for discovery headers (`SearchForm` in
`src/GuestDiscovery.jsx`: 940px max, full pill from `lg` up). Inside the boards
the app-bar search is always the compact variant: 44px tall and at most 440px
wide (`preview.css`, `.searchpill--compact`), so all six boards carry the same
control rather than a board-specific size.

## Where the mockups live

All six boards are static HTML in `docs/design-system-2026/` and share
`preview.css` from the same folder:

| File | Surface |
|---|---|
| `admin-dashboard.html` | Admin overview |
| `admin-users.html` | Admin people table |
| `host-dashboard.html` | Host today |
| `host-calendar.html` | Host month calendar |
| `guest-booking-dashboard.html` | Guest booking detail |
| `guest-trip.html` | Guest trips |

`index.html` in that folder is the landing page that links all six, and is the
right place to start a review.
