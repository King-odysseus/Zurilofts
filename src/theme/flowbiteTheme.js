/**
 * Single source of truth for how Flowbite components look.
 *
 * Flowbite is styled from here, never from a page stylesheet. The values below
 * are the brand tokens the design system already uses (the --control-* and
 * --zl-* variables in index.css), so a control looks the same on every screen
 * without each surface re-declaring border colours and focus rings.
 *
 * Migrating a surface? Move its control styling out of CSS and rely on this
 * theme instead. docs/flowbite-migration.md records the agreed order.
 */
const CONTROL_LIGHT =
  'border-[#E2DAD0] bg-white text-[#111827] placeholder-[#6b7280] focus:border-[#C49A6C] focus:ring-[#C49A6C]';

// Dark variants stay on Flowbite's own greys: the app's dark mode is built on
// them, and the brand border is too dark to read against a dark panel.
const CONTROL_DARK =
  'dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-[#C49A6C] dark:focus:ring-[#C49A6C]';

const ERROR_STATE =
  'border-red-500 bg-white text-red-900 placeholder-red-700 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:bg-gray-700 dark:text-red-300';
const SUCCESS_STATE =
  'border-green-500 bg-white text-green-900 placeholder-green-700 focus:border-green-500 focus:ring-green-500 dark:border-green-400 dark:bg-gray-700 dark:text-green-300';

// 10px for single-line controls, 12px for multi-line, matching the shape the
// admin and host surfaces already use.
const INPUT_SHAPE = 'rounded-[10px]';

export const brandTheme = {
  textInput: {
    field: {
      input: {
        base: 'block w-full border focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
        sizes: {
          sm: 'min-h-[38px] px-3 text-xs',
          md: 'min-h-[44px] px-3 text-sm',
          lg: 'min-h-[52px] px-4 text-base',
        },
        colors: {
          gray: `${CONTROL_LIGHT} ${CONTROL_DARK}`,
          failure: ERROR_STATE,
          success: SUCCESS_STATE,
        },
        withAddon: { on: 'rounded-r-[10px]', off: INPUT_SHAPE },
      },
    },
  },
  select: {
    field: {
      select: {
        base: 'block w-full min-h-[44px] appearance-none border bg-arrow-down-icon bg-[length:0.75em_0.75em] bg-[position:right_12px_center] bg-no-repeat pr-10 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
        colors: {
          gray: `${CONTROL_LIGHT} ${CONTROL_DARK}`,
          failure: ERROR_STATE,
          success: SUCCESS_STATE,
        },
        withAddon: { on: 'rounded-r-[10px]', off: INPUT_SHAPE },
      },
    },
  },
  textarea: {
    base: 'block w-full min-h-[44px] rounded-xl border p-3 text-sm focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
    colors: {
      gray: `${CONTROL_LIGHT} ${CONTROL_DARK}`,
      failure: ERROR_STATE,
      success: SUCCESS_STATE,
    },
  },
};
