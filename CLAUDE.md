# ZuriLofts — Premium Short-Let Apartments

React 18 + Vite + Tailwind 3 + DaisyUI + Flowbite React. Font: Inter.

## Quick Commands

```bash
npm run dev      # http://localhost:5173
npm run build    # production build
npm run preview  # preview production build
```

## Cognitive1 Brain (mandatory — do not skip)

**Before every task**, recall the brain for cached knowledge. The `UserPromptSubmit` hook auto-runs this, but also call it manually if needed:

```
mcp__cognitive1__brain_recall { "query": "your task keywords" }
```

**After fixing a bug, making a decision, or discovering a pattern:**

```
mcp__cognitive1__brain_learn { type, project: "zurilofts", title, ... }
```

**Full standing instructions:** See [cognitive1/Instruct.md](../cognitive1/Instruct.md) for the complete 50-rule session checklist.

## Project Architecture

```
src/
├── components/       # Shared: Navbar, Footer, PropertyCard, Dropdown, Spinner, etc.
├── pages/            # Route pages: HomePage, PropertiesPage, PropertyDetailPage, ContactPage,
│                     #   BookingPage, LoginPage, RegisterPage, ProfilePage, FavouritesPage,
│                     #   BookingHistoryPage, MessagesPage
│                     #   Admin: AdminDashboard, AdminBookings, AdminEarnings, AdminCalendar,
│                     #          AdminPromos, AdminPropertyForm, AdminPropertyEdit
├── App.jsx           # Router definitions
├── main.jsx          # Entry point
├── index.css         # Tailwind + neumorphic .neu-* classes
server/               # Express + Prisma backend
├── src/controllers/  # booking, auth, upload, property, message, review controllers
├── src/services/     # Business logic layer
├── src/routes/       # API routes
└── prisma/           # Schema + SQLite DB
```

## Design System

**Source:** [DESIGN.md](DESIGN.md) and the brain's `ZuriLofts design system` pattern (recall it before UI work).

**Core colors (use arbitrary hex, per file convention):**
- `#262262` Deep Indigo — headings, navbar, admin sidebar, footer
- `#C49A6C` Warm Bronze — CTAs, accents, highlights, active states
- `#D9D9D9` Silver Grey — borders, dividers, disabled
- `#1f2937` Charcoal — body text
- `#6b7280` Cool Grey — muted/secondary

**Neumorphic classes** (from `src/index.css`): `.neu-card`, `.neu-card-hover`, `.neu-input`, `.neu-btn`, `.neu-radio-card`. Admin forms use flat inputs (`rounded-xl border border-[#D9D9D9]`).

**Buttons:** Primary = bronze pill `bg-[#C49A6C] text-[#262262] rounded-full`, Dark = `bg-[#262262] text-white rounded-full`.

**Rounding:** cards `rounded-2xl`, pills/buttons `rounded-full`, inputs/thumbnails `rounded-xl`.

**Admin:** sidebar bg `#262262`, active nav `bg-[#C49A6C]`, collapsible w-64↔w-16, routes nested under `/admin` via `<Outlet/>`.

## Key Patterns

- PropTypes required on all new components
- Use existing Dropdown component (not native selects) for app-styled fly-outs
- Responsive-first: mobile hamburger, grid-cols-1→lg:grid-cols-2→3
- Images: `aspect-[4/3] object-cover` in cards, server optimizes uploads with sharp
- Interaction: group hover, IntersectionObserver for scroll-triggered animations
- Admin full-bleed layout (not max-w-3xl), client pages use standard widths
