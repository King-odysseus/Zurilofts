/** @type {import('tailwindcss').Config} */
import daisyui from 'daisyui';

export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    'node_modules/flowbite-react/lib/esm/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        indigo:   '#0B0B45', // Dark Navy
        bronze:   '#C49A6C',
        silver:   '#D9D9D9',
        charcoal: '#1f2937',
        'cool-grey': '#6b7280',
        // App canvas: cards are white and float on this grey. Tune the tone
        // here (one place) rather than editing page backgrounds everywhere.
        canvas:   '#EEF1F5',
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
      },
    },
  },
  plugins: [daisyui, 'flowbite/plugin'],
  daisyui: {
    themes: [
      {
        zuriloft: {
          primary:            '#0B0B45',  // Dark Navy
          secondary:          '#C49A6C',  // Warm Bronze
          accent:             '#C49A6C',  // Warm Bronze
          neutral:            '#D9D9D9',  // Silver Grey
          'base-100':         '#ffffff',  // White
          'base-200':         '#D9D9D9',  // Silver Grey
          'base-300':         '#b0b0b0',  // Darker grey
          'base-content':     '#1f2937',  // Charcoal
          'primary-content':  '#ffffff',  // White on navy
          'secondary-content':'#ffffff',  // White on bronze
        },
      },
    ],
  },
}
