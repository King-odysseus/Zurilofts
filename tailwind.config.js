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
        primary: {
          DEFAULT: '#C49A6C',
          50:  '#FBF7F1',
          100: '#F6EDE0',
          200: '#EAD8BE',
          300: '#DDBE97',
          400: '#D0A981',
          500: '#C49A6C',
          600: '#B8895C',
          700: '#9A744A',
          800: '#7C5D3B',
          900: '#5E472C',
          950: '#3D2E1B',
        },
        'primary-hover': '#B8895C',
        navy:           '#0B1F42',
        indigo:         '#0B1F42', // Backward-compatible alias to navy
        bronze:         '#C49A6C', // Branding
        silver:         '#D9D9D9',
        charcoal:       '#0B1F42',
        muted:          '#5B6B82',
        'cool-grey':    '#5B6B82',
        border:         '#E3E8EF',
        surface:        '#F7F4EF',
        // App canvas stays white; warm brand accents are applied intentionally
        // to sections, controls, and status surfaces rather than the whole app.
        canvas:         '#FFFFFF',
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
          primary:            '#C49A6C',  // Bronze
          secondary:          '#0B0B45',  // Dark Navy
          accent:             '#C49A6C',  // Warm Bronze
          neutral:            '#E5E7EB',  // Border Grey
          'base-100':         '#ffffff',  // White
          'base-200':         '#F7F7F5',  // Canvas
          'base-300':         '#D1D5DB',  // Darker grey
          'base-content':     '#222222',  // Charcoal
          'primary-content':  '#ffffff',  // White on blue
          'secondary-content':'#ffffff',  // White on navy
        },
      },
    ],
  },
}
