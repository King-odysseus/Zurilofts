# ZuriLofts — Premium Short-Let Apartments

A modern React + Vite web application for ZuriLofts, offering premium furnished apartments in Nairobi. Built with Tailwind CSS, DaisyUI, and modern animation techniques.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI library with functional components and hooks |
| **Vite** | Fast development server and optimized builds |
| **Tailwind CSS** | Utility-first CSS framework |
| **DaisyUI** | Tailwind component library with custom theme |
| **Flowbite React** | Additional UI components |
| **React Router DOM** | Client-side routing |
| **PropTypes** | Runtime type checking |

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project
cd zurilofts

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server
The development server runs on `http://localhost:5173` by default.

---

## Project Structure

```
zurilofts/
├── public/                 # Static assets
│   └── vite.svg
├── src/
│   ├── components/         # React components
│   │   ├── Contact.jsx     # Contact form section
│   │   ├── Footer.jsx      # Site footer
│   │   ├── Hero.jsx        # Hero section with search
│   │   ├── Navbar.jsx      # Navigation bar
│   │   ├── PropertyCard.jsx# Property listing card
│   │   └── PropertyPage.jsx# Property detail page
│   ├── assets/             # Images and media
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Entry point
│   ├── index.css           # Global styles + Tailwind
│   └── App.css             # Component-specific styles
├── index.html              # HTML template
├── tailwind.config.js      # Tailwind + DaisyUI config
├── postcss.config.js       # PostCSS configuration
├── vite.config.js          # Vite configuration
├── package.json            # Dependencies
├── DESIGN.md               # Design system documentation
└── README.md               # This file
```

---

## Component Documentation

### PropertyCard

A feature-rich card component displaying property listings with interactive elements.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `property.image` | string | ✓ | Property image URL |
| `property.title` | string | ✓ | Property name |
| `property.location` | string | ✓ | Location address |
| `property.price` | number | ✓ | Price per night (KES) |
| `property.rating` | number | ✓ | Star rating (e.g., 5.0) |
| `property.reviews` | number | ✓ | Number of reviews |
| `property.bedrooms` | number | ✓ | Bedroom count |
| `property.bathrooms` | number | ✓ | Bathroom count |
| `property.area` | number | ✓ | Area in sq ft |
| `property.badge` | string | | Optional badge text (e.g., "Featured") |

**Design Techniques:**
- **Group hover coordination**: Parent `group` class enables synchronized hover effects
- **Image zoom**: `group-hover:scale-110` creates elegant zoom effect
- **Gradient overlay**: Fades in on hover for text legibility
- **Like button**: State-driven heart icon with color transitions
- **Floating badge**: Absolute positioned with shadow depth

```jsx
import PropertyCard from './components/PropertyCard';

const property = {
  image: 'https://example.com/image.jpg',
  title: 'Luxury Apartment',
  location: 'Westlands, Nairobi',
  price: 8000,
  rating: 5.0,
  reviews: 12,
  bedrooms: 2,
  bathrooms: 2,
  area: 950,
  badge: 'Featured'
};

<PropertyCard property={property} />
```

### Navbar

Responsive navigation with scroll-aware styling.

**Features:**
- Transparent on hero, white background on scroll
- Animated underline on nav link hover
- Mobile hamburger menu with slide-down animation
- Dynamic CTA buttons based on scroll state

**Design Techniques:**
- **Scroll detection**: `useEffect` with `window.scrollY` listener
- **State transitions**: `transition-all duration-300` for smooth color changes
- **Animated underline**: `w-0` to `w-full` on hover with `group-hover`

### Hero

Full-width hero section with animated statistics and search functionality.

**Features:**
- Full-bleed background image with gradient overlay
- Animated number counters (5.0, 50+, 100%)
- Pill-shaped search bar with hover effects
- Status badge with pulse animation

**Design Techniques:**
- **Intersection Observer**: Triggers animations when scrolled into view
- **RequestAnimationFrame**: Smooth number counting with 60fps
- **Easing function**: `easeOutQuart` for natural deceleration
- **Text shadow**: Multi-layer shadow for readability on images
- **Backdrop blur**: Frosted glass effect on badges

```jsx
// AnimatedNumber component usage
<AnimatedNumber value="50" suffix="+" duration={2000} />
```

### Contact

Two-column contact section with form and information.

**Features:**
- Split layout: Form (left) + Contact info (right)
- Rounded form inputs with focus states
- Icon containers with brand colors
- Fast response highlight card

**Design Techniques:**
- **Form validation**: Native HTML5 `required` attributes
- **Focus transitions**: Border color change on input focus
- **Grid layout**: Responsive `grid-cols-1 lg:grid-cols-2`

### Footer

Multi-column footer with navigation, contact info, and social links.

**Features:**
- Four-column responsive grid
- Social icons with hover reveal
- Dynamic copyright year
- Brand-consistent color scheme

**Design Techniques:**
- **Hover reveals**: Bronze background on social icon hover
- **Grid spans**: `md:col-span-2` for wider company info column

---

## Design System

See [`DESIGN.md`](DESIGN.md) for comprehensive design documentation including:
- Brand colors and usage rules
- Typography scale
- Spacing system
- Component specifications
- Animation patterns
- Responsive design guidelines

### Quick Reference: Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Deep Indigo | `#0B0B45` | Headings, navbar, footer |
| Warm Bronze | `#C49A6C` | CTAs, accents, highlights |
| Silver Grey | `#D9D9D9` | Borders, backgrounds |
| Charcoal | `#1f2937` | Body text |
| Cool Grey | `#6b7280` | Muted text |

---

## Animation & Interaction Patterns

### 1. Scroll-Aware Components
```jsx
const [scrolled, setScrolled] = useState(false);

useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 50);
  window.addEventListener('scroll', onScroll);
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

### 2. Group Hover Effects
```jsx
<div className="group">
  {/* Image scales on parent hover */}
  <img className="transition-transform duration-500 group-hover:scale-110" />
  
  {/* Overlay fades in on parent hover */}
  <div className="opacity-0 group-hover:opacity-100 transition-opacity" />
</div>
```

### 3. Number Counter Animation
```jsx
// Easing function for smooth deceleration
const easeOutQuart = 1 - Math.pow(1 - progress, 4);

// Intersection Observer for viewport detection
const observer = new IntersectionObserver(
  ([entry]) => entry.isIntersecting && setIsVisible(true),
  { threshold: 0.5 }
);
```

### 4. State-Driven Icons
```jsx
// Heart icon with fill state
<svg 
  className={`${isLiked ? 'text-red-500 fill-current' : 'text-gray-400'}`}
  fill={isLiked ? 'currentColor' : 'none'}
>
```

---

## Tailwind Configuration

### Custom Colors
```javascript
// tailwind.config.js
colors: {
  indigo:   '#0B0B45',
  bronze:   '#C49A6C',
  silver:   '#D9D9D9',
  charcoal: '#1f2937',
  'cool-grey': '#6b7280',
}
```

### DaisyUI Theme
```javascript
daisyui: {
  themes: [{
    zuriloft: {
      primary:   '#0B0B45',
      secondary: '#C49A6C',
      accent:    '#C49A6C',
      neutral:   '#D9D9D9',
      'base-100': '#ffffff',
      'base-content': '#1f2937',
    }
  }]
}
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Contributing

1. Follow the design system in [`DESIGN.md`](DESIGN.md)
2. Use existing component patterns for consistency
3. Ensure responsive behavior across breakpoints
4. Add PropTypes for new components
5. Test animations on lower-powered devices

---

## Developer Manual

A separate visual developer manual lives in the `manual/` folder. It documents the entire codebase with live component previews, code examples, step-by-step guides, and a complete API reference.

```bash
cd manual
npm install
npm run dev
# → opens at http://localhost:5174
```

The manual is a standalone React app. It shares no code or dependencies with the main ZuriLofts app. The `manual/` folder is gitignored and never deployed.

---

## License

© 2024 ZuriLofts. All rights reserved.
