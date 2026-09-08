# ZuriLofts - Design System

This document is the single source of truth for visual design. All AI agents and developers must follow these guidelines when building any page or component.

> Last updated: 2026-09-08 - redesign: bronze is now the primary CTA color and navy the strong secondary; blue is reserved for links, active/selected states, focus rings, and informational UI - never the default CTA. Admin navigation is a light surface, not navy; buttons default to `rounded-lg` (12px), with pills reserved for filters/status badges.

---

## Brand Colors

| Role              | Name            | Hex       | Usage                                                        |
|-------------------|-----------------|-----------|---------------------------------------------------------------|
| Primary CTA       | Warm Bronze     | `#C49A6C` | Primary buttons - white text                                  |
| Primary CTA Hover | Bronze Hover    | `#B8895C` | Hover/active state for primary buttons                        |
| Strong Secondary  | Dark Navy       | `#0B0B45` | Strong secondary buttons (white text), logo wordmark, footer background, brand headers/dividers |
| Navy Hover        | Navy Hover      | `#07072e` | Hover/active state for navy strong secondary buttons          |
| Interactive Blue  | Interactive Blue| `#2563EB` | Links, active nav/tab state, selected filters/radios/toggles, focus rings, informational UI |
| Blue Hover        | Blue Hover      | `#1D4ED8` | Hover/active state for anything using Interactive Blue        |
| Canvas            | Off-White       | `#F7F7F5` | Page background                                                |
| Surface           | White           | `#ffffff` | Cards, inputs, modals, navbar - flat surfaces                  |
| Border            | Neutral Grey    | `#E5E7EB` | Card borders, input borders, dividers, outlined secondary buttons |
| Body Text         | Charcoal        | `#222222` | Paragraphs, labels, headings on light backgrounds              |
| Muted Text        | Cool Grey       | `#6b7280` | Captions, placeholders, meta info                               |
| White Text        | White           | `#ffffff` | Text on bronze, navy, blue, or dark backgrounds                |

### Color Rules
- **Warm Bronze `#C49A6C`** is the primary CTA color - every filled primary button uses bronze with white text. Hover/active state darkens to `#B8895C`.
- **Dark Navy `#0B0B45`** is the strong secondary button color (white text, hover/active darkens to `#07072e`) and the brand color for the logo wordmark, footer background, brand headers/dividers, and decorative accents.
- **Interactive Blue `#2563EB`** is reserved for links, active navigation/tab indicators, selected filters/radios/toggles, focus rings, and informational UI - it is never a filled CTA or primary button. Hover/active state darkens to `#1D4ED8`.
- **Canvas `#F7F7F5`** is the page background. **White `#ffffff`** is reserved for cards, inputs, modals, and other flat surfaces sitting on the canvas.
- **Neutral Grey `#E5E7EB`** is the shared border color for cards, inputs, dividers, and outlined secondary buttons.
- Secondary/tertiary controls are **outlined and neutral** (white background, `#E5E7EB` border, charcoal text) - never bronze or navy outlines.
- Semantic status colors (green/amber/red) are used for success/pending/error/danger states only, and must always be paired with a text label or icon, never color alone (see Semantic Status Colors below).
- Never place bronze or navy text on white for body copy - use charcoal. Bronze and navy appear as solid button fills (primary and strong secondary respectively) and inside their reserved brand contexts (logo, footer, brand headers, dividers/decorative accents).
- Bronze and navy buttons use white text; outlined neutral buttons use charcoal text with a grey border; blue appears only on links, active/selected states, focus rings, and informational UI.

### Semantic Status Colors

| Status  | Color              | Usage                                              |
|---------|--------------------|-----------------------------------------------------|
| Success | Green `#16a34a`    | Confirmed, paid, approved, published                |
| Pending | Amber `#d97706`    | Awaiting review, processing, draft submitted        |
| Danger  | Red `#dc2626`      | Failed, rejected, suspended, destructive actions    |

Every status indicator (badge, banner, icon) pairs its color with a readable text label and/or icon - color is never the only signal. "Pending" must never look or read like "confirmed"; only mark a payment confirmed after verification succeeds.

---

## Typography

### Font Stack
```
Primary:   'Inter', system-ui, sans-serif
Fallback:  Helvetica, Arial, sans-serif
```

### Typography Scale & Text Conventions

All text follows a consistent scale. Never use arbitrary `text-[Npx]` - use the mapped class below.

| Size | Tailwind | Usage |
|------|----------|-------|
| 11px | `text-[11px]` | Meta labels, compact badges, sidebar captions |
| 12px | `text-xs` | Metadata, form hints, badge text, secondary descriptions |
| 14px | `text-sm` | Body text, form input text, dropdown items, button text, card content |
| 16px | `text-base` | Medium headings, stat values |
| 18px | `text-lg` | Section subtitles, dialog titles |
| 20px | `text-xl` | Card titles, dashboard section headings |
| 24px | `text-2xl` | Page titles |
| 30px | `text-3xl` | Hero sub-headings |
| 36px | `text-4xl` | Hero headings, large stat displays |

### Text Roles

| Context | Class |
|---------|-------|
| Page title | `text-2xl font-bold text-[#222222]` |
| Card heading | `text-sm font-bold text-[#222222]` |
| Dialog title | `text-lg font-bold text-[#222222]` |
| Section heading | `text-sm font-semibold text-[#222222]` |
| Body text | `text-sm text-[#222222]` |
| Description | `text-sm text-[#6b7280]` |
| Metadata / hints | `text-xs text-[#6b7280]` |
| Form field label | `text-sm font-medium text-[#222222]` |
| Form field hint | `text-xs text-[#6b7280]` |
| Eyebrow | `text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b7280]` |
| Price / amount | `font-semibold text-[#222222]` |
| Error text | `text-sm text-red-600` |
| Success text | `text-sm text-green-600` |
| Link | `text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]` |
| Badge / pill | `text-xs font-semibold` |
| Placeholder | `text-sm text-[#6b7280]` |

---

## Spacing System

Use multiples of 4px (Tailwind's default scale).

| Token  | Value  | Usage                              |
|--------|--------|------------------------------------|
| xs     | 4px    | Icon gap, tight inline spacing     |
| sm     | 8px    | Internal card padding, tag gap     |
| md     | 16px   | Component padding, input padding   |
| lg     | 24px   | Card padding, section inner gap    |
| xl     | 40px   | Section vertical padding (top/bot) |
| 2xl    | 64px   | Between major page sections        |
| 3xl    | 96px   | Hero padding                       |

### Spacing Conventions

| Context | Class |
|---------|-------|
| Page sections | `space-y-6 pb-10` |
| Card sections | `space-y-4` |
| Form fields | `space-y-4` inside card content |
| Between form actions | `gap-2` or `gap-3` |
| Search bar above table | `mb-4` |
| Page header below content | `mb-6` |
| Section padding desktop | `py-16` |
| Section padding mobile | `py-10` |

---

## Layout

- **Max content width:** `1280px` centered with `mx-auto px-6` (client pages only)
- **Admin layout:** Full-bleed - no `max-w-7xl` wrapper; sidebar + content fills viewport
- **Grid:** 12-column conceptual grid; use Tailwind `grid-cols-3` for card grids, `grid-cols-2` for split layouts
- **Sidebar split:** 40% text / 60% image (or image grid)
- **Card grid:** 3 columns desktop -&gt; 2 tablet -&gt; 1 mobile

---

## Card System

Cards are flat white surfaces on the off-white canvas: a neutral border plus one restrained shadow. No dual/inset neumorphic shadows, no heavy elevation.

```css
.neu-card {
  background: #ffffff;
  border: 1px solid #E5E7EB;
  border-radius: 14px;          /* rounded-[14px] */
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04), 0 2px 8px -2px rgb(0 0 0 / 0.05);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.neu-card-hover:hover {
  box-shadow: 0 4px 16px -4px rgb(0 0 0 / 0.08);
  transform: translateY(-2px);
}
```

### Card Subcomponents

When building structured cards, use these internal sections:

| Element | Class/Usage |
|---------|-------------|
| Card Header | `flex items-start justify-between gap-4 px-6 pt-6 pb-5` |
| Card Title | `text-lg font-bold tracking-tight text-[#222222]` |
| Card Description | `mt-1 text-sm text-[#6b7280]` |
| Card Content | `p-6 pb-7` with `space-y-4` for form fields |
| Card Footer | `flex items-center gap-3 border-t border-[#E5E7EB] px-6 py-4` |

---

## Form Inputs

All form inputs are flat and bordered - no inset shadows.

```css
.neu-input {
  background: #ffffff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;          /* rounded-xl */
  color: #222222;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.neu-input:focus {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
  outline: none;
}
```

### Radio / Option Cards

```css
.neu-radio-card {
  border: 1px solid #E5E7EB;
  border-radius: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.neu-radio-card:hover {
  border-color: #2563EB;
  box-shadow: 0 2px 8px rgb(37 99 235 / 0.12);
}
.neu-radio-selected {
  border: 2px solid #2563EB;
  border-radius: 14px;
}
```

### Auth Cards

Auth cards over dark photo backgrounds use a single soft drop shadow - no neumorphic white-glow.

```css
.auth-card { box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5); }
```

---

## Buttons

| Variant        | Background | Text       | Border         | Hover              |
|----------------|------------|------------|----------------|--------------------|
| Primary (CTA) | `#C49A6C` | `#ffffff` | None | `#B8895C` darken |
| Strong secondary | `#0B0B45` | `#ffffff` | None | `#07072e` darken |
| Secondary (outlined, neutral) | White | `#222222` | 1px `#E5E7EB` | `#F7F7F5` bg |
| Ghost | Transparent | `#2563EB` | None | Blue underline |
| Danger | `#dc2626` | `#ffffff` | None | `#b91c1c` darken |

Primary actions use bronze, strong secondary actions use navy, and lighter secondary/tertiary actions use the outlined neutral style (or the ghost text button). Blue `#2563EB` never appears as a button fill - it is reserved for links, active/selected states, focus rings, and informational UI.

All buttons: `rounded-lg` (12px), `px-6 py-2.5`, `font-semibold`, `transition-all`, inline-flex with gap-2. Fully rounded (`rounded-full`) is reserved for filter chips and status/badge pills, not general buttons.

**Button sizes:**
- `sm`: `px-3 py-1.5 text-xs`
- `md` (default): `px-6 py-2.5 text-sm`
- `lg`: `px-8 py-3 text-base`

**Active state:** `transform translateY(1px)` on press.
**Disabled:** `opacity-50 cursor-not-allowed`.

---

## StatCard Component

Dashboard stat cards use a consistent pattern:

```
┌─────────────────────────┐
│  Icon          Value    │
│  Label         Hint     │
└─────────────────────────┘
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | string | Stat description (e.g. "Total Revenue") |
| `value` | string/number | Display value |
| `icon` | LucideIcon | Icon component |
| `tone` | `"primary"` / `"success"` / `"warning"` / `"danger"` / `"info"` | Color theme (primary = bronze `#C49A6C`; info = blue `#2563EB`; success/warning/danger are semantic status colors, always paired with a label/icon) |
| `hint` | string? | Small hint text below value |

StatCards sit in responsive grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.

---

## PageHeader Component

Every page uses a consistent header:

```
┌──────────────────────────────────────────────┐
│  EYEBROW                                     │
│  Page Title                    [Action Btn]  │
│  Description text here...                    │
└──────────────────────────────────────────────┘
```

| Prop | Type | Description |
|------|------|-------------|
| `title` | string | Page title (text-2xl) |
| `description` | string? | Descriptive subtext |
| `eyebrow` | string? | Small uppercase label above title |
| `actions` | ReactNode? | Action buttons on the right |

---

## Page Patterns

### List Pages

Every list page MUST use this structure:

```
PageHeader (title, eyebrow, actions)
  └── SearchInput above table
  └── ErrorState (if error)
  └── Spinner (if loading)
  └── EmptyState (if no results)
  └── DataTable + Pagination
```

### Form Pages

Every create/edit form MUST use this structure:

```
BackLink
  └── Card
        ├── CardHeader (CardTitle)
        ├── CardContent (space-y-4 with Field + Input pairs)
        └── CardFooter (Cancel + Save buttons)
```

### Detail Pages

```
BackLink
  └── PageHeader (title, actions)
  └── Card(s) with content sections
```

---

## Components

### Navbar
- White background with a subtle bottom border (`border-b border-[#E5E7EB]`)
- Logo: Bronze icon + Navy bold wordmark (the signature bronze + navy pairing)
- Nav links: Charcoal, `font-medium`, hover state -&gt; blue underline
- Right side: outlined neutral button ("Sign In") + solid bronze button ("Get It Now")
- Sticky on scroll with `shadow-sm`
- Height: `64px`

**Design Techniques:**
- **Scroll-aware styling**: Uses `useState` and `useEffect` with scroll listener to toggle between transparent (hero) and white (scrolled) states
- **Dynamic color transitions**: Text and border colors change based on scroll position (`scrolled` state)
- **Animated underline**: Blue underline expands on hover using `group-hover:w-full` with `transition-all duration-200`
- **Responsive mobile menu**: Hamburger menu with slide-down animation and mobile-specific CTA buttons
- **Fixed positioning**: `fixed w-full z-20 top-0` for persistent navigation

```jsx
// Scroll detection pattern
const [scrolled, setScrolled] = useState(false);
useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 50);
  window.addEventListener('scroll', onScroll);
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

### Hero Section
- Full-width photographic background (property exterior, dusk/golden hour preferred)
- Dark overlay: `bg-black/40` for text legibility
- Centered content: large white heading + short white subtext
- Search bar: white pill-shaped input, bronze "Search" button on the right
- Search bar width: max `680px`, centered

**Design Techniques:**
- **Multi-layer gradient overlay**: `bg-gradient-to-b from-[#0B0B45]/70 via-[#0B0B45]/40 to-[#0B0B45]/70` for depth
- **Animated number counters**: Custom `AnimatedNumber` component using `IntersectionObserver` and `requestAnimationFrame` with easing
- **Easing function**: `easeOutQuart = 1 - Math.pow(1 - progress, 4)` for smooth number animation
- **Status badge with pulse**: Green pulse dot using `animate-pulse` to indicate availability
- **Text shadow enhancement**: Inline style `textShadow: '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)'`
- **Hover scale effects**: Stats numbers scale and change color on hover
- **Backdrop blur**: `backdrop-blur-sm` for frosted glass effect on badges
- **Background blur on image**: `filter: blur(1.5px); transform: scale(1.1)` on `.hero-bg` for depth illusion

### Search Bar
- Background: White `#ffffff`
- Border radius: `9999px` (fully rounded pill)
- Padding: `px-5 py-3`
- Left icon: magnifying glass in charcoal
- Button: Bronze background `#C49A6C`, white text, `rounded-full`, `px-6 py-3`
- Box shadow: `shadow-lg`

### Property Card
- White background, `rounded-[14px]`, restrained shadow (`shadow-sm hover:shadow-md`)
- Image: top of card, `aspect-[4/3]`, `object-cover`, rounded to match card top corners
- Price stats row: 3 columns (each with a label and bold value)
- Bronze `+` floating action button on image corner
- Hover: slight lift (`hover:-translate-y-1 transition-all`)

**Design Techniques:**
- **Group hover effects**: `group` class enables coordinated hover states across child elements
- **Image zoom on hover**: `group-hover:scale-110` with `transition-transform duration-500`
- **Gradient overlay reveal**: `bg-gradient-to-t from-black/30` fades in on hover for text legibility
- **Floating action button**: Absolute positioned favorite button with `backdrop-blur-sm` glass effect
- **Interactive heart icon**: State-driven color change (red when liked, gray when not)
- **Badge positioning**: `absolute top-4 left-4` with shadow for depth
- **Stats divider**: Absolute positioned vertical dividers between stat items
- **Price highlight**: Charcoal `#222222`, bold, to draw attention without borrowing a brand color
- **Rating badge**: Neutral background with amber star icon (rating uses the conventional star color, independent of brand palette)
- **Border separator**: `border-y border-[#E5E7EB]` for stats section

```jsx
// Group hover pattern
<div className="group ...">
  <img className="... transition-transform duration-500 group-hover:scale-110" />
  <div className="... opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
</div>
```

### Property Page
- Full property detail view with image gallery
- Two-column layout: details (left) + booking card (right)
- Sticky booking card on scroll

**Design Techniques:**
- **Asymmetric image gallery**: Main large image + stacked smaller images using `md:col-span-2`
- **Sticky sidebar**: `sticky top-24` for booking card that follows scroll
- **Icon + text pairs**: Consistent pattern of charcoal icon + label + value
- **Form input styling**: Uses `.neu-input` with `focus:border-[#2563EB]` focus ring
- **Custom Tailwind colors**: Uses extended colors from `tailwind.config.js` (`text-primary`, `text-navy`, `text-bronze`, etc.)
- **Back navigation**: Styled link with icon for intuitive navigation

### Dashboard Header Panel

Used on the guest Trip Hub, host Today page, and admin Overview. Defaults to a light surface with a concise, task-focused header - not a navy fill:

```jsx
<div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8">
  <p className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Greeting</p>
  <h1 className="mt-1 text-2xl font-bold text-[#222222] sm:text-3xl">Welcome back, Name</h1>
  <p className="mt-2 max-w-md text-sm text-[#6b7280]">Contextual description.</p>
  {/* Quick actions dropdown in bronze */}
</div>
```

A navy gradient variant (`from-[#0B0B45] to-[#07072e]`, white text) is available as an optional brand/promotional moment - not the default header, and used sparingly rather than as a template for buttons or interactive surfaces elsewhere.

Key properties:
- Default: light surface (`bg-white`), `rounded-[14px]`, `border-[#E5E7EB]`, charcoal/cool-grey text
- Optional navy brand variant: `bg-gradient-to-br from-[#0B0B45] to-[#07072e]`, white text
- Never use decorative orbs/blobs behind text
- Quick actions button: bronze `bg-[#C49A6C]` with `Plus` icon
- Quick actions menu: white card with `shadow-elevated`, `rounded-xl`, `animate-fade-in`

### Contact Section
- Two-column layout: form (left) + contact info (right)
- Canvas background `#F7F7F5`
- Form card with white background and restrained shadow

### Footer
- Dark Navy `#0B0B45` background for the footer and occasional brand moments
- White text for links and headings
- Blue `#2563EB` for link hover states; bronze for the logo accent
- Minimal: copyright left, social icons right

---

## Imagery Style
- **Real estate photography:** exterior shots of modern homes, warm lighting, dusk/golden hour
- **Mood:** aspirational, warm, trustworthy
- **Overlay:** always use a dark overlay on hero images for text legibility
- **Aspect ratios:** hero = `16:9` or full viewport height; cards = `4:3` or `16:9`
- **No stock illustrations** - photos only

---

## Shadows & Radius

| Element        | Radius        | Shadow          |
|----------------|---------------|-----------------|
| Cards          | `14px` (`rounded-[14px]`) | `.neu-card` (border + restrained shadow) |
| Buttons        | `12px` (`rounded-lg`) | None           |
| Filter chips / status badges | `rounded-full` | None |
| Input / Search | `12px` (`rounded-xl`) | `shadow-lg` (pill search), border (standard input) |
| Modals         | `14px` (`rounded-[14px]`) | `shadow-xl`, restrained |
| Navbar         | None          | `shadow-sm`   |
| Stat cards     | `14px` (`rounded-[14px]`) | Same as `.neu-card` |

Corner radius across the system sits in the 12-14px range (cards, buttons, inputs, modals, stat cards). Fully rounded (`rounded-full`) is reserved for filter chips, status badges, and the pill search bar - a deliberate shape choice for those specific elements, not the general button radius.

---

## Motion / Transitions

### Standard Transitions
- All interactive elements: `transition-all duration-200`
- Card hover: `hover:-translate-y-1 hover:shadow-lg`
- Button hover: `hover:opacity-90` or darken by one shade
- No heavy animations - keep it fast and professional

### Advanced Animation Patterns

**1. Intersection Observer Animations**
```jsx
const observer = new IntersectionObserver(
  ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
  { threshold: 0.5 }
);
```

**2. Number Counter Animation**
```jsx
const easeOutQuart = 1 - Math.pow(1 - progress, 4);
const currentValue = numericValue * easeOutQuart;
```

**3. Group Hover Coordination**
```jsx
<div className="group">
  <div className="opacity-0 group-hover:opacity-100 transition-opacity" />
</div>
```

**4. Scale Transforms**
- Hover scale: `hover:scale-110` for icons
- Card lift: `hover:-translate-y-2` for elevation
- Overflow hidden on parent prevents layout shift

**5. Marquee Scroll**
```css
@keyframes marquee-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.marquee-track { animation: marquee-scroll 60s linear infinite; }
.marquee-track:hover { animation-play-state: paused; }
```
Used with gradient mask edges (`mask-image: linear-gradient(...)`) for smooth fade at boundaries.

**6. Fade-in Animations**
```css
@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
```

---

## Responsive Design Patterns

### Breakpoint Strategy
| Breakpoint | Tailwind | Usage |
|------------|----------|-------|
| Mobile | default | Single column, stacked layout |
| Tablet | `md:` (768px) | Two columns where appropriate |
| Desktop | `lg:` (1024px) | Full multi-column layouts |
| Wide | `xl:` (1280px) | Max-width containers |

### Common Responsive Patterns
- **Grid transforms**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (list) or `lg:grid-cols-4` (dashboard stats)
- **Typography scaling**: `text-3xl md:text-4xl lg:text-5xl`
- **Hidden elements**: `hidden md:block` for desktop-only content
- **Padding adjustments**: `p-4 md:p-8` for comfortable touch targets
- **Navigation**: Full nav on desktop, hamburger menu on mobile
- **Dashboard**: Sidebar collapses to `w-[72px]` (icons only) on toggle

---

## Tailwind Configuration

### Custom Colors (tailwind.config.js)
```javascript
colors: {
  primary:        '#C49A6C', // Warm Bronze - primary CTA
  'primary-hover':'#B8895C', // Bronze Hover
  navy:     '#0B0B45',    // Dark Navy - strong secondary + brand
  'navy-hover': '#07072e', // Navy Hover
  bronze:   '#C49A6C',    // Warm Bronze (alias of primary)
  blue:     '#2563EB',    // Interactive Blue - links/active/focus/informational
  'blue-hover': '#1D4ED8', // Blue Hover
  canvas:   '#F7F7F5',    // Off-White page background
  border:   '#E5E7EB',    // Neutral Grey
  charcoal: '#222222',    // Body text
  'cool-grey': '#6b7280', // Muted Text
}
```

---

## Navigation Rules

### Guest Navigation
Explore, Saved, Trips, Messages, Profile.
- **Saved** combines favourites and shortlists into one section.
- **Explore** groups local guides and places (`/places`, `/guides`) together.
- Support stays reachable from within Messages rather than as a separate nav item.
- Guest-facing pages (bookings, trips, profile) must never render admin navigation, even when reached through a page also used by admins (e.g. the shared profile page). Payout preferences appear only for eligible hosts, even on that shared page.

### Host Navigation
Today, Calendar, Listings, Messages, Earnings.
- **Payouts** live inside Earnings, not as a separate top-level item.
- Administrative actions (moderation, platform-wide settings) stay inside the admin workspace, never surfaced in the host nav.

### Admin Navigation
Grouped: Overview, Listings, Bookings, Payments, People, Content.
- Expanded submenus must retain access to every existing admin route (properties, bookings, earnings, users, host applications, identity verifications, disputes, promos, addons, feedback, messages, guides, payouts).
- Admin sidebar uses a light background (white or `#F7F7F5`) with collapsible `w-64 <-> w-16` behavior; active nav item uses blue, not navy or bronze.

---

## Booking Flow

Three steps: **Stay -> Details -> Payment.**
- Optional extras/add-ons expand inline within the Details step rather than becoming a fourth step.
- Dates, guest count, and running total stay visible throughout all three steps.
- Preserve entered details across identity verification and payment recovery/retry flows - never make the guest re-enter them.
- Prices show a nightly rate before dates are chosen, and a full stay total (nightly x nights + fees) once dates are selected.
- Payment success, pending, and failure are mutually exclusive states; a pending payment must never present another "pay now" prompt. Only mark a payment confirmed after verification succeeds.
- Hide secondary/global navigation during the checkout/payment steps to keep guests focused.

### Host Listing & Moderation States
- Draft, submitted, approved, published, and suspended are distinct listing/application states - never collapse them into a single "active/inactive" flag.
- Hosts may keep preparing a draft listing while a prior submission is under review.
- Reserved calendar dates are read-only in the availability editor; hosts can only change availability on unreserved dates. Reservation changes happen through the booking flow, not the calendar editor.
- Moderation notes (private, admin/host-facing) and public review replies (guest-facing) must be visibly separate fields - private feedback is never exposed to guests.

---

## Responsive & Accessibility Rules

- Tables collapse into labelled cards or a horizontal-scroll table on mobile - never truncate columns silently.
- Mobile uses full-screen drawers for filters, menus, and multi-field forms rather than small popovers.
- Maintain a minimum 44px touch target for tappable actions on mobile.
- Hide secondary/global navigation during checkout on mobile to reduce distraction and accidental exits.
- Every reusable page pattern (list, form, detail) needs empty, loading, failed-load, and inline validation states - not just the happy path.
- Icon-only buttons require `aria-label`; interactive elements require visible `focus-visible` states, using the blue focus ring defined above.

---

## NEVER Use

- Hardcoded hex colors in JSX (use Tailwind arbitrary `bg-[#...]` or config tokens)
- Squared inputs - use `.neu-input` or `rounded-xl` (12px)
- Multiple border classes on the same element - `.neu-input` already provides the border
- `rounded-lg` for cards - use the `rounded-[14px]` card radius
- `text-[10px]` outside of compact document templates - use `text-xs` minimum
- Instant state changes without `transition-*`
- Decorative orbs, gradient blobs, or bokeh circles as backgrounds
- Black (`#000`) for text - use charcoal `#222222` instead
- Blue `#2563EB` as a filled button or CTA - blue is reserved for links, active/selected states, focus rings, and informational UI
- Bronze or navy as a link, active-state, selected-state, or focus ring - bronze is the primary CTA fill and navy the strong secondary fill; links and selection states stay blue
- Status color (green/amber/red) used alone without an accompanying text label or icon
- Raw `<input>`/`<select>`/`<textarea>` without `.neu-input` styling in form contexts
- `border` + `neo-input` on the same element (double-border effect)

---

## Component Implementation Checklist

When implementing new components:

- [ ] Use bronze `#C49A6C` for primary CTAs, navy `#0B0B45` for strong secondary buttons, neutral outlined for lighter secondary actions, and blue `#2563EB` only for links, active/selected states, focus rings, and informational UI
- [ ] Pair every status color (success/warning/danger) with a text label or icon
- [ ] Apply appropriate border-radius (`rounded-[14px]` for cards/modals/stat cards, `rounded-lg` for buttons, `rounded-xl` for inputs, `rounded-full` for filter chips/status badges)
- [ ] Add `transition-all duration-200` for interactive elements
- [ ] Include hover states with shadow and/or transform
- [ ] Use group hover for coordinated child animations
- [ ] Ensure responsive behavior with mobile-first approach
- [ ] Add focus states (`focus-visible:outline-*`) for accessibility
- [ ] Use proper semantic HTML elements (`<header>`, `<nav>`, `<section>`, `<aside>`)
- [ ] Include aria-labels for icon-only buttons
- [ ] Test color contrast for accessibility
- [ ] Use loading skeletons (`animate-pulse bg-surface-secondary`) while data loads
- [ ] Handle empty states with EmptyState component
- [ ] Handle error states with ErrorState + retry button
- [ ] Follow list/form/detail page patterns above