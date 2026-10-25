# Flowbite as the single source of truth

The goal: one place defines how things look, and pages compose Flowbite
components instead of carrying their own CSS.

Two files hold that source today:

| What | Where |
| --- | --- |
| Colours, spacing tokens | `src/index.css` (`:root` block) |
| Flowbite component styling | `src/theme/flowbiteTheme.js` |

`main.jsx` wraps the app in Flowbite's `ThemeProvider` with `brandTheme`, so
every Flowbite component inherits that theme without a page passing anything.

## Why pages are not converted yet

The app carries about 8,600 lines of CSS across 12 stylesheets. Roughly 75
pages and components use `op-*` classes, 16 use `opg-*`. None of that can be
deleted until the page using it is rebuilt on Flowbite components, so this is a
surface-by-surface migration, not a single change.

## Order

Each step is one session: convert the surface, delete the rules it no longer
needs, check the screens, commit.

1. Admin panel (`admin-design.css`) - 10 pages, the most self-contained.
2. Host workspace (`host-workspace.css`) - today, listings, earnings, payouts, calendar.
3. Guest account (`account-travel.css`) - trips, booking history, details, inbox.
4. Trust and recovery (`trust-design.css`).
5. Checkout and payment result (`checkout-design.css`).
6. Auth screens (`auth-design.css`).
7. Guest discovery and public pages (`guest-discovery.css`, `openpencil-theme.css`) - largest, do last.
8. `flowbite-controls.css` - delete once no plain `<input>`/`<select>` markup is left.

## How to migrate one surface

1. Replace native controls with the Flowbite equivalent (`TextInput`, `Select`,
   `Textarea`, `Checkbox`, `Button`, `Table`, `Badge`, `Alert`).
2. Delete the surface's rules for those controls' colour, border, radius, height
   and focus ring. The theme already sets them.
3. Keep only layout rules in CSS (widths, grid placement, icon offsets).
4. Check the screens at desktop and phone width, plus dark mode.
5. `npm run lint && npm run build`, then delete the stylesheet if nothing is left.

## Rules

- Do not add a colour, radius or focus style to a page. Add it to `brandTheme`
  if every surface needs it.
- Do not pass a per-use `theme` prop for one-off styling. It reintroduces the
  drift this is meant to remove.
- A stylesheet may only be deleted when nothing references a class in it. Check
  with a search across `src` and `index.html` first.
