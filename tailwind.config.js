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
        indigo:   '#262262',
        bronze:   '#C49A6C',
        silver:   '#D9D9D9',
        charcoal: '#1f2937',
        'cool-grey': '#6b7280',
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
          primary:            '#262262',  // Deep Indigo
          secondary:          '#C49A6C',  // Warm Bronze
          accent:             '#C49A6C',  // Warm Bronze
          neutral:            '#D9D9D9',  // Silver Grey
          'base-100':         '#ffffff',  // White
          'base-200':         '#D9D9D9',  // Silver Grey
          'base-300':         '#b0b0b0',  // Darker grey
          'base-content':     '#1f2937',  // Charcoal
          'primary-content':  '#ffffff',  // White on indigo
          'secondary-content':'#ffffff',  // White on bronze
        },
      },
    ],
  },
}
