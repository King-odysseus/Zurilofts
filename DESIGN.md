# ZuriLofts — Design System

This document is the single source of truth for visual design. All AI agents and developers must follow these guidelines when building any page or component.

---

## Brand Colors

| Role            | Name            | Hex       | Usage                                               |
|-----------------|-----------------|-----------|-----------------------------------------------------|
| Primary         | Dark Navy     | `#0B0B45` | Navbar, headings, footer, primary text, hero overlay|
| Accent          | Warm Bronze/Gold| `#C49A6C` | CTA buttons, highlights, badges, hover states, icons|
| Surface         | Silver Grey     | `#D9D9D9` | Section backgrounds, input fields, dividers, borders|
| Background      | White           | `#ffffff` | Page background, cards                              |
| Body Text       | Dark Charcoal   | `#1f2937` | Paragraphs, labels, secondary text                  |
| Muted Text      | Cool Grey       | `#6b7280` | Captions, placeholders, meta info                   |
| White Text      | White           | `#ffffff` | Text on navy or bronze backgrounds                |

### Color Rules
- **Dark Navy `#0B0B45`** is the authority color — navbar, all headings, footer background, hero overlay tint, section titles.
- **Warm Bronze `#C49A6C`** is the action color — every CTA button, hover state, active nav indicator, badge, price highlight, and icon accent uses bronze.
- **Silver Grey `#D9D9D9`** is the neutral surface — alternate section backgrounds, input borders, card dividers, skeleton loaders.
- **White** is the default page and card background — keeps the layout breathing.
- Never place bronze text on white — contrast is low. Use navy or charcoal for text on light backgrounds.
- Bronze buttons always use navy (`#0B0B45`) or white text depending on button size — never charcoal.
- Dark navy and bronze can be paired directly (e.g. navy footer with bronze links/icons).

---

## Typography

### Font Stack
```
Primary:   'Inter', system-ui, sans-serif
Fallback:  Helvetica, Arial, sans-serif
```

### Scale

| Element          | Size       | Weight | Color          | Notes                          |
|------------------|------------|--------|----------------|--------------------------------|
| Hero Heading     | 3rem–4rem  | 800    | White          | On dark/blurred image overlay  |
| Section Heading  | 2rem–2.5rem| 700    | Dark Navy `#0B0B45` | Left-aligned or centered       |
| Card Title       | 1.125rem   | 600    | Charcoal       |                                |
| Body Text        | 1rem       | 400    | Charcoal       | Line height 1.6                |
| Muted / Caption  | 0.875rem   | 400    | Cool Grey      |                                |
| Price / Stat     | 1.25rem    | 700    | Charcoal       | Paired with a small label above|
| Button Label     | 0.9375rem  | 600    | Navy or White  | Depends on button variant      |
| Nav Links        | 0.9375rem  | 500    | Navy           | Hover → Gold underline         |

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

Section padding: `py-16` (64px) on desktop, `py-10` (40px) on mobile.

---

## Layout

- **Max content width:** `1280px` centered with `mx-auto px-6`
- **Grid:** 12-column conceptual grid; use Tailwind `grid-cols-3` for card grids, `grid-cols-2` for split layouts
- **Sidebar split:** 40% text / 60% image (or image grid) — as seen in the features section
- **Card grid:** 3 columns desktop → 2 tablet → 1 mobile

---

## Components

### Navbar
- White background with a subtle bottom border (`border-b border-gray-200`)
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

### Search Bar
- Background: White `#ffffff`
- Border radius: `9999px` (fully rounded pill)
- Padding: `px-5 py-3`
- Left icon: magnifying glass in gold or grey
- Button: Gold background, navy/dark text, rounded-full, `px-6 py-3`
- Box shadow: `shadow-lg`

**Design Techniques:**
- **Hover scale transformation**: `hover:scale-[1.02]` with `transform` for subtle interactivity
- **Icon color accent**: Gold search icon `#C49A6C` for brand consistency

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
- **Form input styling**: Rounded inputs with focus states using `focus:border-[#C49A6C]`
- **Custom Tailwind colors**: Uses extended colors from `tailwind.config.js` (`text-gold`, `text-navy`, etc.)
- **Back navigation**: Styled link with icon for intuitive navigation

### Buttons

| Variant        | Background | Text       | Border         | Hover              |
|----------------|------------|------------|----------------|--------------------|
| Primary (CTA)  | Gold       | Navy       | None           | Gold-600 darken    |
| Secondary      | Transparent| Navy       | 2px Navy       | Navy bg, white text|
| Ghost          | Transparent| Gold       | None           | Gold underline     |

All buttons: `rounded-full`, `px-6 py-2.5`, `font-semibold`, `transition-all`

**Design Techniques:**
- **Shadow elevation on hover**: `hover:shadow-lg` for depth feedback
- **Color darken on hover**: `hover:bg-[#b8895c]` (darker bronze)
- **Full-width on mobile**: Responsive buttons that adapt to container width
- **State-based styling**: Buttons change appearance based on parent scroll state

### Contact Section
- Two-column layout: form (left) + contact info (right)
- Silver grey background `#D9D9D9`
- Form card with white background and shadow

**Design Techniques:**
- **Split layout**: `grid-cols-1 lg:grid-cols-2` for responsive two-column design
- **Form input styling**: Rounded-full inputs with `focus:border-[#C49A6C]` transition
- **Icon containers**: Circular bronze backgrounds with navy icons for contact methods
- **Response time highlight**: Bronze background card for emphasis
- **Form validation**: Native HTML5 validation with `required` attributes

### Footer
- Dark Navy `#0B0B45` background
- White text for links and headings
- Gold for link hover states and logo accent
- Minimal: copyright left, social icons right

**Design Techniques:**
- **Four-column grid**: Company info (2 cols) + Quick Links + Contact
- **Social icon hover**: Bronze background reveal on hover with color transition
- **Logo abbreviation**: Simple "Z" in bronze square for brand recognition
- **Link hover animation**: `hover:text-[#C49A6C]` with `transition-colors duration-200`
- **Dividers**: `border-t border-white/10` for section separation
- **Current year**: Dynamic copyright using `new Date().getFullYear()`

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
| Cards          | `rounded-2xl` | `shadow-md`   |
| Buttons        | `rounded-full`| None           |
| Input / Search | `rounded-full`| `shadow-lg`   |
| Modals         | `rounded-2xl` | `shadow-xl`   |
| Navbar         | None          | `shadow-sm`   |

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
// Trigger animations when elements enter viewport
const observer = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) {
      setIsVisible(true);
    }
  },
  { threshold: 0.5 }
);
```

**2. Number Counter Animation**
```jsx
// Eased number counting with requestAnimationFrame
const easeOutQuart = 1 - Math.pow(1 - progress, 4);
const currentValue = numericValue * easeOutQuart;
```

**3. Group Hover Coordination**
```jsx
// Parent 'group' class enables child 'group-hover:' variants
<div className="group">
  <div className="opacity-0 group-hover:opacity-100 transition-opacity" />
</div>
```

**4. Scale Transforms**
- Hover scale: `hover:scale-110` for icons and interactive elements
- Card lift: `hover:-translate-y-2` for elevation effect
- Contained scaling: `overflow-hidden` on parent prevents layout shift

**5. Color Transitions**
- State changes: `transition-colors duration-200`
- Fill animations: Heart icon fills with `fill-current` class toggle
- Background shifts: Navbar background transitions on scroll

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
- **Grid transforms**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Typography scaling**: `text-3xl md:text-4xl lg:text-5xl`
- **Hidden elements**: `hidden md:block` for desktop-only content
- **Padding adjustments**: `p-4 md:p-8` for comfortable touch targets
- **Navigation**: Full nav on desktop, hamburger menu on mobile

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

### DaisyUI Theme Configuration
```javascript
themes: [{
  zuriloft: {
    primary:            '#0B0B45',  // Dark Navy
    secondary:          '#C49A6C',  // Warm Bronze
    accent:             '#C49A6C',  // Warm Bronze
    neutral:            '#D9D9D9',  // Silver Grey
    'base-100':         '#ffffff',  // White
    'base-200':         '#D9D9D9',  // Silver Grey
    'base-content':     '#1f2937',  // Charcoal
    'primary-content':  '#ffffff',  // White on navy
    'secondary-content':'#0B0B45',  // Navy on bronze
  }
}]
```

---

## Do's and Don'ts

| Do                                              | Don't                                         |
|-------------------------------------------------|-----------------------------------------------|
| Use gold exclusively for actions and highlights | Use gold as a background for large sections   |
| Keep section backgrounds white or light grey    | Mix many background colors in one section     |
| Use navy for all headings and authority text    | Use black (`#000`) — use charcoal instead     |
| Maintain generous whitespace between sections   | Crowd elements together                       |
| Use rounded-full for all buttons and inputs     | Use squared or slightly-rounded buttons       |
| Lead with large bold property photography       | Use illustrations or abstract graphics        |
| Apply `transition-all duration-200` on hover    | Use instant state changes without transitions |
| Use `group` class for coordinated hover states  | Animate individual elements independently     |
| Include `overflow-hidden` on image containers   | Allow scaled images to break layout           |
| Implement scroll-aware navbar styling           | Keep navbar static regardless of position     |

---

## Component Implementation Checklist

When implementing new components:

- [ ] Use correct brand colors from the palette
- [ ] Apply appropriate border-radius (rounded-2xl for cards, rounded-full for buttons)
- [ ] Add `transition-all duration-200` for interactive elements
- [ ] Include hover states with shadow and/or transform
- [ ] Use group hover for coordinated child animations
- [ ] Ensure responsive behavior with mobile-first approach
- [ ] Add focus states for accessibility
- [ ] Use proper semantic HTML elements
- [ ] Include aria-labels for icon buttons
- [ ] Test color contrast for accessibility
