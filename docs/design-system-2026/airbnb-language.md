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
| Primary action | `#FF385C` pink, white text | `#C49A6C` bronze, white text | Same single-accent rule |
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

These are the visible inconsistencies the audit found, and what replaces them.

| Current | Replacement |
|---|---|
| Six separate stylesheets, 9 radii, 8 border greys | One stylesheet, 4 radii, 1 border grey |
| Four identical metric tiles on every page | One statement figure + inline stats |
| Buttons in bronze, navy, blue, outline, `rounded-full` and `rounded-lg` mixed | 3 button shapes, every one a pill: primary bronze, dark navy, secondary outline |
| Page titles at 20, 24, 26 and 32px | One page title size (28px/600) |
| Tables with zebra rows and heavy headers | Divider rows, 11px uppercase labels, hover `#F7F7F5` |
| Sidebar with filled coloured active state | White sidebar, pill hover, 3px accent marker |
| Empty states as coloured alert boxes | Centred icon, one bold line, one muted line, one action |

## Buttons are pills, and they come from Flowbite

The shape is Airbnb's: fully rounded, 48px tall, one accent fill per screen.
In this codebase that shape belongs to the Flowbite `Button` component, not to a
page stylesheet, so it is set once in `src/theme/flowbiteTheme.js`:

```js
button: {
  base: '... rounded-full ...',
  pill: 'rounded-full',
  size: { sm: 'h-9 px-4 text-sm', md: 'min-h-[44px] px-5 text-sm', lg: 'min-h-[48px] px-6 text-base' },
  color: {
    default: bronze fill,   // primary action
    dark:    navy fill,     // strong secondary
    light:   white + grey border, // secondary
  },
}
```

What that means when building a screen:

| Need | Use | Not this |
|---|---|---|
| Primary action | `<Button pill>` (bronze default) | a hand-written `.btn` div |
| Secondary action | `<Button color="light" pill>` | an outlined `span` with a click handler |
| Icon-only control | `<Button color="light" pill>` with an icon | a bare `<button>` with CSS |
| Shape override | the theme above | `border-radius` in a page stylesheet |

### Remaining work before pills are visible everywhere

The Flowbite shape is now a pill, but seven surface stylesheets still force their
own corner radius on buttons, so those screens keep square corners until the
rules are deleted. Counted per file (`src/admin-design.css` no longer exists, the
admin pages were already moved onto Flowbite):

| File | Button radius rules |
|---|---|
| `guest-discovery.css` | 6 |
| `openpencil-theme.css` | 6 |
| `host-workspace.css` | 4 |
| `account-travel.css` | 3 |
| `auth-design.css` | 1 |
| `checkout-design.css` | 1 |
| `saved-stays.css` | 1 |

Two rules of thumb for that cleanup: a dropdown menu item or a tab is a row, not
an action, so it keeps an 8px radius; only real actions become pills.
