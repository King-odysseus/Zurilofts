# ZuriLofts - Design System

This document is the single source of truth for visual design. All AI agents and developers must follow these guidelines when building any page or component.

> Last updated: 2026-08-08 — migrated from neumorphic to flat card/input system, merged TijhaBooks patterns.

---

## Brand Colors

| Role            | Name            | Hex       | Usage                                               |
|-----------------|-----------------|-----------|-----------------------------------------------------|
| Primary         | Dark Navy     | `#0B0B45` | Navbar, headings, footer, primary text, hero overlay|
| Accent          | Warm Bronze/Gold| `#C49A6C` | CTA buttons, highlights, badges, hover states, icons|
| Surface         | Silver Grey     | `#D9D9D9` | Section backgrounds, input borders, dividers, disabled|
| Background      | White           | `#ffffff` | Page background, cards                              |
| Body Text       | Dark Charcoal   | `#1f2937` | Paragraphs, labels, secondary text                  |
| Muted Text      | Cool Grey       | `#6b7280` | Captions, placeholders, meta info                   |
| White Text      | White           | `#ffffff` | Text on navy or bronze backgrounds                |
| Surface Secondary| Soft Grey      | `#F8F9FA` | Page backgrounds, hover states                      |
| Border Light    | Subtle Grey     | `#EFEFF2` | Card borders, light dividers                        |

### Color Rules
- **Dark Navy `#0B0B45`** is the authority color — navbar, all headings, footer background, hero overlay tint, admin sidebar, section titles.
- **Warm Bronze `#C49A6C`** is the action color — every CTA button, hover state, active nav indicator, badge, price highlight, and icon accent uses bronze. Never used as a large background fill.
- **Silver Grey `#D9D9D9`** is the neutral surface — alternate section backgrounds, input borders, card dividers, skeleton loaders.
- **White** is the default page and card background — keeps the layout breathing.
- Never place bronze text on white — contrast is low. Use navy or charcoal for text on light backgrounds.
- Bronze buttons use white text for readability against the gold background — never navy or charcoal on bronze.
- Dark navy and bronze can be paired directly (e.g. navy footer with bronze links/icons).

---

## Typography

### Font Stack
```
Primary:   'Inter', system-ui, sans-serif
Fallback:  Helvetica, Arial, sans-serif
```

### Typography Scale & Text Conventions

All text follows a consistent scale. Never use arbitrary `text-[Npx]` — use the mapped class below.

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
| Page title | `text-2xl font-bold text-[#0B0B45]` |
| Card heading | `text-sm font-bold text-[#0B0B45]` |
| Dialog title | `text-lg font-bold text-[#0B0B45]` |
| Section heading | `text-sm font-semibold text-[#1f2937]` |
| Body text | `text-sm text-[#1f2937]` |
| Description | `text-sm text-[#6b7280]` |
| Metadata / hints | `text-xs text-[#6b7280]` |
| Form field label | `text-sm font-medium text-[#1f2937]` |
| Form field hint | `text-xs text-[#6b7280]` |
| Eyebrow | `text-[11px] font-bold uppercase tracking-[0.12em] text-[#C49A6C]` |
| Price / amount | `font-semibold text-[#0B0B45]` |
| Error text | `text-sm text-red-600` |
| Success text | `text-sm text-green-600` |
| Link | `text-sm font-medium text-[#0B0B45] hover:text-[#15155c]` |
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
- **Admin layout:** Full-bleed — no `max-w-7xl` wrapper; sidebar + content fills viewport
- **Grid:** 12-column conceptual grid; use Tailwind `grid-cols-3` for card grids, `grid-cols-2` for split layouts
- **Sidebar split:** 40% text / 60% image (or image grid)
- **Card grid:** 3 columns desktop → 2 tablet → 1 mobile

---

## Card System

Cards use a flat style with subtle border + single drop shadow (migrated from neumorphic dual shadows in 2026-08).

```css
.neu-card {
  background: #ffffff;
  border: 1px solid #EFEFF2;
  border-radius: 1rem;         /* rounded-2xl */
  box-shadow: 0 1px 2px rgb(38 34 98 / 0.04), 0 4px 16px -4px rgb(38 34 98 / 0.06);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}
.neu-card-hover:hover {
  box-shadow: 0 8px 30px -6px rgb(38 34 98 / 0.12), 0 4px 12px -6px rgb(38 34 98 / 0.06);
  transform: translateY(-3px);
}
```

### Card Subcomponents

When building structured cards, use these internal sections:

| Element | Class/Usage |
|---------|-------------|
| Card Header | `flex items-start justify-between gap-4 px-6 pt-6 pb-5` |
| Card Title | `text-lg font-bold tracking-tight text-[#0B0B45]` |
| Card Description | `mt-1 text-sm text-[#6b7280]` |
| Card Content | `p-6 pb-7` with `space-y-4` for form fields |
| Card Footer | `flex items-center gap-3 border-t border-[#EFEFF2] px-6 py-4` |

---

## Form Inputs

All form inputs use flat bordered style — no inset shadows.

```css
.neu-input {
  background: #ffffff;
  border: 1px solid #D9D9D9;
  border-radius: 0.75rem;       /* rounded-xl */
  color: #1f2937;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.neu-input:focus {
  border-color: #C49A6C;
  box-shadow: 0 0 0 3px rgba(196, 154, 108, 0.18);
  outline: none;
}
```

### Radio / Option Cards

```css
.neu-radio-card {
  border: 1px solid #D9D9D9;
  border-radius: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.neu-radio-card:hover {
  border-color: #C49A6C;
  box-shadow: 0 2px 8px rgb(196 154 108 / 0.15);
}
.neu-radio-selected {
  border: 2px solid #C49A6C;
  border-radius: 1rem;
}
```

### Auth Cards

Auth cards over dark photo backgrounds use a single soft drop shadow — no neumorphic white-glow.

```css
.auth-card { box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5); }
```

---

## Buttons

| Variant        | Background | Text       | Border         | Hover              |
|----------------|------------|------------|----------------|--------------------|
| Primary (CTA)  | `#C49A6C`  | `#ffffff` | None           | `#b0895a` darken   |
| Secondary      | Transparent| `#0B0B45` | 2px `#0B0B45`  | Navy bg, white text|
| Outline        | Transparent| `#1f2937` | 1px `#D9D9D9`  | Surface-secondary bg|
| Ghost          | Transparent| `#C49A6C` | None           | Gold underline     |
| Danger         | `#dc2626`  | `#ffffff` | None           | `#b91c1c` darken   |

All buttons: `rounded-full`, `px-6 py-2.5`, `font-semibold`, `transition-all`, inline-flex with gap-2.

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
| `tone` | `"primary"` / `"gold"` / `"success"` / `"warning"` / `"danger"` / `"info"` | Color theme |
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
- White background with a subtle bottom border (`border-b border-[#EFEFF2]`)
- Logo: Gold icon + Navy bold wordmark
- Nav links: Navy, `font-medium`, hover state → gold underline
- Right side: outlined navy button ("Sign In") + solid gold button ("Get It Now")
- Sticky on scroll with `shadow-sm`
- Height: `64px`

**Design Techniques:**
- **Scroll-aware styling**: Uses `useState` and `useEffect` with scroll listener to toggle between transparent (hero) and white (scrolled) states
- **Dynamic color transitions**: Text and border colors change based on scroll position (`scrolled` state)
- **Animated underline**: Gold underline expands on hover using `group-hover:w-full` with `transition-all duration-200`
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
- Search bar: white pill-shaped input, gold "Search" button on the right
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
- Left icon: magnifying glass in gold
- Button: Gold background `#C49A6C`, white text, `rounded-full`, `px-6 py-3`
- Box shadow: `shadow-lg`

### Property Card
- White background, `rounded-2xl`, `shadow-md hover:shadow-lg`
- Image: top of card, `aspect-[4/3]`, `object-cover`, `rounded-t-2xl`
- Price stats row: 3 columns (each with a label and bold value)
- Gold `+` floating action button on image corner
- Hover: slight lift (`hover:-translate-y-1 transition-all`)

**Design Techniques:**
- **Group hover effects**: `group` class enables coordinated hover states across child elements
- **Image zoom on hover**: `group-hover:scale-110` with `transition-transform duration-500`
- **Gradient overlay reveal**: `bg-gradient-to-t from-black/30` fades in on hover for text legibility
- **Floating action button**: Absolute positioned favorite button with `backdrop-blur-sm` glass effect
- **Interactive heart icon**: State-driven color change (red when liked, gray when not)
- **Badge positioning**: `absolute top-4 left-4` with shadow for depth
- **Stats divider**: Absolute positioned vertical dividers between stat items
- **Price highlight**: Bronze color `#C49A6C` for price to draw attention
- **Rating badge**: Bronze background with 10% opacity `bg-[#C49A6C]/10`
- **Border separator**: `border-y border-[#D9D9D9]` for stats section

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
- **Icon + text pairs**: Consistent pattern of gold icon + label + value
- **Form input styling**: Uses `.neu-input` with `focus:border-[#C49A6C]` focus ring
- **Custom Tailwind colors**: Uses extended colors from `tailwind.config.js` (`text-gold`, `text-navy`, etc.)
- **Back navigation**: Styled link with icon for intuitive navigation

### Dashboard Hero Panel (navy-panel)

Used on admin dashboard, trip hub, and host today pages:

```jsx
<div className="bg-gradient-to-br from-[#0B0B45] to-[#07072e] rounded-2xl p-6 sm:p-8 text-white">
  <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Greeting</p>
  <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Welcome back, Name</h1>
  <p className="mt-2 max-w-md text-sm text-white/60">Contextual description.</p>
  {/* Quick actions dropdown in gold */}
</div>
```

Key properties:
- Gradient: `from-[#0B0B45] to-[#07072e]`
- Never use decorative orbs/blobs behind text
- Quick actions button: gold `bg-[#C49A6C]` with `Plus` icon
- Quick actions menu: white card with `shadow-elevated`, `rounded-xl`, `animate-fade-in`

### Contact Section
- Two-column layout: form (left) + contact info (right)
- Silver grey background `#D9D9D9`
- Form card with white background and shadow

### Footer
- Dark Navy `#0B0B45` background
- White text for links and headings
- Gold for link hover states and logo accent
- Minimal: copyright left, social icons right

---

## Imagery Style
- **Real estate photography:** exterior shots of modern homes, warm lighting, dusk/golden hour
- **Mood:** aspirational, warm, trustworthy
- **Overlay:** always use a dark overlay on hero images for text legibility
- **Aspect ratios:** hero = `16:9` or full viewport height; cards = `4:3` or `16:9`
- **No stock illustrations** — photos only

---

## Shadows & Radius

| Element        | Radius      | Shadow          |
|----------------|-------------|-----------------|
| Cards          | `rounded-2xl` | `.neu-card` (border + subtle shadow) |
| Buttons        | `rounded-full`| None           |
| Input / Search | `rounded-xl` | `shadow-lg` (pill), border (input) |
| Modals         | `rounded-2xl` | `shadow-xl`   |
| Navbar         | None          | `shadow-sm`   |
| Stat cards     | `rounded-2xl` | Same as `.neu-card` |

---

## Motion / Transitions

### Standard Transitions
- All interactive elements: `transition-all duration-200`
- Card hover: `hover:-translate-y-1 hover:shadow-lg`
- Button hover: `hover:opacity-90` or darken by one shade
- No heavy animations — keep it fast and professional

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
  navy:     '#0B0B45',    // Dark Navy
  bronze:   '#C49A6C',    // Warm Bronze
  silver:   '#D9D9D9',    // Silver Grey
  charcoal: '#1f2937',    // Dark Charcoal
  'cool-grey': '#6b7280', // Muted Text
}
```

---

## NEVER Use

- Hardcoded hex colors in JSX (use Tailwind arbitrary `bg-[#...]` or config tokens)
- Squared or `rounded-lg` inputs — use `.neu-input` or `rounded-xl`
- Multiple border classes on the same element — `.neu-input` already provides the border
- `rounded-lg` for cards — use `rounded-2xl`
- `text-[10px]` outside of compact document templates — use `text-xs` minimum
- Instant state changes without `transition-*`
- Decorative orbs, gradient blobs, or bokeh circles as backgrounds
- Black (`#000`) for text — use charcoal `#1f2937` instead
- Gold/bronze as a large background fill — reserved for interactive elements only
- Raw `<input>`/`<select>`/`<textarea>` without `.neu-input` styling in form contexts
- `border` + `neo-input` on the same element (double-border effect)

---

## Component Implementation Checklist

When implementing new components:

- [ ] Use correct brand colors from the palette
- [ ] Apply appropriate border-radius (rounded-2xl for cards, rounded-full for buttons, rounded-xl for inputs)
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