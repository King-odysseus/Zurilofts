/** @type {import('tailwindcss').Config} */
import daisyui from 'daisyui';

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    'node_modules/flowbite-react/dist/**/*.{js,mjs}',
  ],
  theme: {
    extend: {
      colors: {
        // `primary` is the interactive colour and it is the brand navy: the app
        // should read navy first, brass only as a highlight. #143A80 is the
        // lightest navy that still carries white text at AAA (10.8:1) and it is
        // blue enough to be told apart from black at button size.
        primary: {
          DEFAULT: '#2563EB',
          50:  '#EEF3FB',
          100: '#DCE6F5',
          200: '#BFD0EC',
          300: '#9AB3DC',
          400: '#5A7FBF',
          500: '#2D5699',
          600: '#143A80',
          700: '#0B2A5E',
          800: '#0A2450',
          900: '#071C3F',
          950: '#05142C',
        },
        'primary-hover': '#1D4ED8',
        action:         '#143A80',
        'action-hover': '#0B2A5E',
        // 'navy' is the heading/body ink and therefore flips in dark mode;
        // 'navy-bg' is the fixed brand surface that always carries white text
        // (footer, primary buttons, avatars). Keeping them apart is what lets
        // a dark theme invert text without inverting buttons behind white text.
        navy:           'rgb(var(--ds-navy) / <alpha-value>)',
        'navy-bg':      '#0D1E3B',
        'navy-hover':   '#16294B',
        indigo:         'rgb(var(--ds-navy) / <alpha-value>)', // Alias to navy, flips with it
        bronze:         '#C5A28C', // Antique brass: hairlines and rare accents only
        champagne:      '#E5CCB3', // Lighter brass, sparingly
        floral:         '#F4F0E8', // Warm off-white tint
        silver:         '#D9D9D9',
        charcoal:       'rgb(var(--ds-ink) / <alpha-value>)',
        muted:          'rgb(var(--ds-muted) / <alpha-value>)',
        'cool-grey':    'rgb(var(--ds-muted) / <alpha-value>)',
        border:         'rgb(var(--ds-line) / <alpha-value>)',
        // Design system 2026 (docs/design-system-2026/airbnb-language.md).
        // Guest pages are being moved onto these names; `ink` is the heading
        // colour and `line` the only divider grey, so a page that uses them
        // cannot drift back to navy headings or a second border tint.
        ink:            'rgb(var(--ds-ink) / <alpha-value>)',
        line:           'rgb(var(--ds-line) / <alpha-value>)',
        inset:          'rgb(var(--ds-inset) / <alpha-value>)',
        link:           'rgb(var(--ds-link) / <alpha-value>)',
        surface:        'rgb(var(--ds-surface) / <alpha-value>)',
        // App canvas stays white; warm brand accents are applied intentionally
        // to sections, controls, and status surfaces rather than the whole app.
        canvas:         'rgb(var(--ds-canvas) / <alpha-value>)',
        // Raised card that sits on the canvas; lifts slightly in dark mode.
        elevated:       'rgb(var(--ds-elevated) / <alpha-value>)',
      },
      // Whole-app elevation scale. Default Tailwind shadows are too faint for
      // borderless cards, so each level is a tight contact edge + a soft base.
      // Cards on the grey canvas read clearly at md/lg; controls stay at sm.
      boxShadow: {
        sm:  '0 1px 2px rgb(15 23 42 / 0.06), 0 4px 10px -3px rgb(15 23 42 / 0.10)',
        DEFAULT: '0 1px 2px rgb(15 23 42 / 0.06), 0 6px 16px -6px rgb(15 23 42 / 0.13)',
        md:  '0 2px 4px rgb(15 23 42 / 0.06), 0 10px 22px -8px rgb(15 23 42 / 0.15)',
        lg:  '0 3px 6px rgb(15 23 42 / 0.07), 0 16px 32px -10px rgb(15 23 42 / 0.19)',
        xl:  '0 4px 8px rgb(15 23 42 / 0.08), 0 24px 48px -12px rgb(15 23 42 / 0.24)',
        '2xl': '0 6px 12px rgb(15 23 42 / 0.10), 0 32px 64px -12px rgb(15 23 42 / 0.30)',
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        montserrat: ['Montserrat', 'system-ui', 'sans-serif'],
        roboto: ['Roboto', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [daisyui, 'flowbite/plugin'],
  daisyui: {
    themes: [
      {
        zuriloft: {
          primary:            '#143A80',  // Brand navy
          secondary:          '#0B2A5E',  // Deep navy
          accent:             '#C5A28C',  // Antique brass, accents only
          neutral:            '#E5E7EB',  // Border Grey
          'base-100':         '#ffffff',  // White canvas
          'base-200':         '#F4F0E8',  // Floral white tint
          'base-300':         '#D1D5DB',  // Darker grey
          'base-content':     '#222222',  // Charcoal
          'primary-content':  '#ffffff',  // White on navy
          'secondary-content':'#ffffff',  // White on navy
        },
      },
    ],
  },
}
