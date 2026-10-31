# Cognitive1 - Session Workflow

## Session checklist (do this FIRST)
1. Sync brain from GitHub
2. Call MCP tool `session_start` with `project_path` and `task` - auto-claims project and delivers briefing.
3. Restate scope, approach, and assumptions to the user, then call `recap_check` with `action="log"`.
4. Before every task: `brain_recall "topic"` - always.
5. Before editing: check `active_list` for other agents already working here.
6. After learning: `brain_learn` to feed it back.
7. If leaving: `brain_handoff` with status and next steps.
8. End: commit + push, `session_end "summary"`, push brain.


# ZuriLofts - Premium Short-Let Apartments

React 18 + Vite + Tailwind 3 + DaisyUI + Flowbite React. Font: Inter.

## Quick Commands

```bash
npm run dev      # http://localhost:5173
npm run build    # production build
npm run preview  # preview production build
```

## Cognitive1 Brain (mandatory - do not skip)

**Before every task**, recall the brain for cached knowledge. The `UserPromptSubmit` hook auto-runs this, but also call it manually if needed:

```
mcp__cognitive1__brain_recall { "query": "your task keywords" }
```

**After fixing a bug, making a decision, or discovering a pattern:**

```
mcp__cognitive1__brain_learn { type, project: "zurilofts", title, ... }
```

**Full standing instructions:** See [Instruct.md](./Instruct.md) for the complete rule checklist.

## Project Architecture

```
src/
├── components/       # Shared: Navbar, Footer, StayCard, Dropdown, Spinner, etc.
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
- `#143A80` Brand Navy - the only button/CTA fill, active tabs, selected states, links, focus rings, and the brand ink for headings (white type on it still passes AAA)
- `#0B2A5E` Deep Navy - inverse surfaces (footer, mobile nav, dark panels, avatars) and every navy hover state
- `#C5A28C` Antique Brass - hairlines, dividers, eyebrows, small accents; never a button fill (`#8A6B52` as text on white, `#E5CCB3` on dark)
- `#F4F0E8` Floral White - the only warm tint, for washes behind icons and notes
- `#FFFFFF` White - page canvas and card surfaces; `#E5E7EB` Neutral Grey for borders and dividers
- `#1f2937` Charcoal - body text
- `#6b7280` Cool Grey - muted/secondary

**Neumorphic classes** (from `src/styles.css`, the single stylesheet entry point): `.neu-card`, `.neu-card-hover`, `.neu-input`, `.neu-btn`, `.neu-radio-card`. Admin forms use flat inputs (`rounded-xl border border-[#D9D9D9]`).

**Buttons:** Primary = brand navy pill `bg-[#143A80] text-white rounded-full`, Dark = `bg-[#0B2A5E] text-white rounded-full`. Never fill a button with brass.

**Rounding:** cards `rounded-2xl`, pills/buttons `rounded-full`, inputs/thumbnails `rounded-xl`.

**Admin:** sidebar bg `#0B2A5E`, active nav `bg-[#143A80]`, collapsible w-64<->w-16, routes nested under `/admin` via `<Outlet/>`.

## Key Patterns

- PropTypes required on all new components
- Use existing Dropdown component (not native selects) for app-styled fly-outs
- Responsive-first: mobile hamburger, grid-cols-1-&gt;lg:grid-cols-2-&gt;3
- Images: `aspect-[4/3] object-cover` in cards, server optimizes uploads with sharp
- Interaction: group hover, IntersectionObserver for scroll-triggered animations
- Admin full-bleed layout (not max-w-3xl), client pages use standard widths
