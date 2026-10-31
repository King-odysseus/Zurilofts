/**
 * Single source of truth for how Flowbite components look.
 *
 * Flowbite is styled from here, never from a page stylesheet. The values below
 * are the brand tokens the design system already uses (the --control-* and
 * --zl-* variables in index.css), so a control looks the same on every screen
 * without each surface re-declaring border colours and focus rings.
 *
 * Flowbite deep-merges this object over its own defaults, so a component is only
 * listed here when the brand differs from stock. Anything not listed keeps the
 * Flowbite default on purpose.
 *
 * Migrating a surface? Move its control styling out of CSS and rely on this
 * theme instead. docs/flowbite-migration.md records the agreed order.
 */

// Brand colours are written into the class strings below as literal hexes on
// purpose: Tailwind only generates a utility it can actually see in the source,
// so a class built from "[${CONST}]" is emitted as plain text and never compiled.
// That is how a navy button once rendered as an invisible box.
// Action blue #203565 is the interactive colour; brass #C5A28C is an accent only.
const CONTROL_LIGHT = `border-[#E2DAD0] bg-white text-[#111827] placeholder-[#6b7280] focus:border-[#2563EB] focus:ring-[#2563EB]`;

// Dark variants stay on Flowbite's own greys: the app's dark mode is built on
// them, and the brand border is too dark to read against a dark panel.
const CONTROL_DARK =
  `dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-[#2563EB] dark:focus:ring-[#2563EB]`;

const ERROR_STATE =
  'border-red-500 bg-white text-red-900 placeholder-red-700 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:bg-gray-700 dark:text-red-300';
const SUCCESS_STATE =
  'border-green-500 bg-white text-green-900 placeholder-green-700 focus:border-green-500 focus:ring-green-500 dark:border-green-400 dark:bg-gray-700 dark:text-green-300';

// 10px for single-line controls, 12px for multi-line, matching the shape the
// admin and host surfaces already use.
const INPUT_SHAPE = 'rounded-[10px]';

// Fill / outline pairs shared by Button and any other interactive surface. The
// focus ring is a translucent navy ring so it reads on white and on tinted rows.
const FOCUS_RING = `focus:ring-2 focus:ring-[#2563EB]/35`;

export const brandTheme = {
  // -- Form controls --------------------------------------------------------
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
  label: {
    root: {
      base: 'text-sm font-semibold',
      colors: { default: `text-[#203565] dark:text-gray-200` },
    },
  },
  checkbox: {
    base: `h-4 w-4 appearance-none rounded border border-[#E2DAD0] bg-white bg-[length:0.55em_0.55em] bg-center bg-no-repeat checked:border-transparent checked:bg-current checked:bg-check-icon focus:outline-none focus:ring-2 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700`,
    color: {
      default: `text-[#203565] focus:ring-[#2563EB] dark:ring-offset-gray-800 dark:focus:ring-[#2563EB]`,
    },
  },
  toggleSwitch: {
    toggle: {
      base: 'relative rounded-full after:absolute after:rounded-full after:border after:bg-white after:transition-all group-focus:ring-4',
      checked: {
        off: `bg-[#E2DAD0] dark:bg-gray-700`,
        color: {
          default: `bg-[#2563EB] group-focus:ring-[#2563EB]/30 dark:group-focus:ring-[#2563EB]/30`,
        },
      },
    },
    root: { label: `ms-3 mt-0.5 text-start text-sm font-medium text-[#111827] dark:text-gray-300` },
  },

  // -- Actions --------------------------------------------------------------
  button: {
    // Pill by default: a fully rounded button reads as an action, while an
    // 8-10px box reads as a field. This is the Airbnb shape the design system
    // settled on, so every Flowbite Button gets it without a per-page class.
    // whitespace-nowrap: a pill is sized to its label, so the label must never
    // break across two lines and turn the pill into a tall blob. Where a row of
    // buttons is too wide for the screen, the row wraps as a whole (flex-wrap on
    // the parent) instead of each label breaking up.
    // A disabled pill used to render as 50%-opacity bronze, so its label looked
    // washed out and unreadable rather than clearly unavailable. Swap it for the
    // inset surface with muted ink, which also follows the dark theme.
    base: 'relative flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-center font-semibold focus:outline-none disabled:pointer-events-none disabled:bg-inset disabled:text-muted disabled:opacity-100',
    pill: 'rounded-full',
    size: {
      xs: 'h-8 px-3 text-xs',
      sm: 'h-9 px-4 text-sm',
      md: 'min-h-[44px] px-5 text-sm',
      lg: 'min-h-[48px] px-6 text-base',
      xl: 'min-h-[52px] px-7 text-base',
    },
    color: {
      // `default` is the primary action, so it carries the one interactive
      // colour in the palette. Brass stays on hairlines and small marks; navy is
      // the `dark` variant below when a surface wants a quieter button.
      default: `bg-[#2563EB] text-white hover:bg-[#1D4ED8] ${FOCUS_RING} dark:bg-[#2563EB] dark:text-white dark:hover:bg-[#1D4ED8]`,
      alternative: `border border-[#E2DAD0] bg-white text-[#203565] hover:bg-[#F8FAFC] ${FOCUS_RING} dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700`,
      light: `border border-[#E2DAD0] bg-white text-[#203565] hover:bg-[#F8FAFC] ${FOCUS_RING} dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700`,
      dark: `bg-[#2563EB] text-white hover:bg-[#1D4ED8] ${FOCUS_RING} dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8]`,
      gray: `bg-[#F1F5F9] text-[#203565] hover:bg-[#E2E8F0] ${FOCUS_RING} dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600`,
      success: `bg-green-600 text-white hover:bg-green-700 ${FOCUS_RING} dark:bg-green-600 dark:hover:bg-green-700`,
      failure: `bg-red-600 text-white hover:bg-red-700 ${FOCUS_RING} dark:bg-red-600 dark:hover:bg-red-700`,
      warning: `bg-amber-500 text-[#203565] hover:bg-amber-600 ${FOCUS_RING} dark:bg-amber-500 dark:text-[#203565] dark:hover:bg-amber-600`,
    },
    outlineColor: {
      default: `border border-[#203565] text-[#203565] hover:bg-[#F8FAFC] ${FOCUS_RING} dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700`,
      dark: `border border-[#203565] text-[#203565] hover:bg-[#1D4ED8] hover:text-white ${FOCUS_RING} dark:border-gray-600 dark:text-gray-300`,
    },
  },

  // -- Status ---------------------------------------------------------------
  // Status pills are solid on the guest surfaces and tinted on admin/host. The
  // tinted set is the shared default; pages that need solid pass a colour prop.
  badge: {
    root: {
      base: 'inline-flex h-fit items-center gap-1 font-semibold',
      color: {
        gray: 'bg-[#F1F5F9] text-[#475569] dark:bg-gray-700 dark:text-gray-200',
        light: 'bg-[#F3F5F9] text-[#4B5563] dark:bg-gray-700 dark:text-gray-300',
        info: `bg-[#EEF2F8] text-[#203565] dark:bg-gray-700 dark:text-gray-200`,
        success: 'bg-[#E7F6EE] text-[#157347] dark:bg-green-900/40 dark:text-green-300',
        warning: 'bg-[#FDF3D8] text-[#8A5A00] dark:bg-amber-900/40 dark:text-amber-200',
        failure: 'bg-[#FDECEC] text-[#B42318] dark:bg-red-900/40 dark:text-red-300',
        red: 'bg-[#FDECEC] text-[#B42318] dark:bg-red-900/40 dark:text-red-300',
        green: 'bg-[#E7F6EE] text-[#157347] dark:bg-green-900/40 dark:text-green-300',
        yellow: 'bg-[#FDF3D8] text-[#8A5A00] dark:bg-amber-900/40 dark:text-amber-200',
      },
    },
    icon: {
      off: 'rounded-full px-2.5 py-0.5',
      on: 'rounded-full p-1.5',
    },
  },
  alert: {
    base: 'flex flex-col gap-2 rounded-[10px] p-4 text-sm',
    color: {
      info: `border-[#203565] bg-[#EEF2F8] text-[#203565] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200`,
      gray: 'border-gray-500 bg-[#F8FAFC] text-[#334155] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300',
      success: 'border-green-600 bg-[#E7F6EE] text-[#157347] dark:border-green-500 dark:bg-gray-800 dark:text-green-300',
      warning: 'border-amber-500 bg-[#FDF3D8] text-[#8A5A00] dark:border-amber-500 dark:bg-gray-800 dark:text-amber-200',
      failure: 'border-red-600 bg-[#FDECEC] text-[#B42318] dark:border-red-500 dark:bg-gray-800 dark:text-red-300',
      red: 'border-red-600 bg-[#FDECEC] text-[#B42318] dark:border-red-500 dark:bg-gray-800 dark:text-red-300',
      green: 'border-green-600 bg-[#E7F6EE] text-[#157347] dark:border-green-500 dark:bg-gray-800 dark:text-green-300',
      yellow: 'border-amber-500 bg-[#FDF3D8] text-[#8A5A00] dark:border-amber-500 dark:bg-gray-800 dark:text-amber-200',
    },
  },
  spinner: {
    base: 'inline animate-spin text-gray-200',
    color: { default: `fill-[#203565]` },
    size: { xs: 'h-3 w-3', sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8', xl: 'h-10 w-10' },
  },

  // -- Containers and data --------------------------------------------------
  // One card for the whole app. The host workspace leans on it hardest (see
  // components/HostCard.jsx), so it carries the brand tokens directly instead
  // of white/gray-800: the warm canvas behind a card and the card's own surface
  // have to stay related in both themes.
  card: {
    root: {
      base: 'flex rounded-[14px] border border-border bg-elevated text-navy shadow-sm',
      children: 'flex h-full w-full flex-col gap-3 p-4 sm:p-5',
      href: 'transition-colors hover:bg-surface dark:hover:bg-surface',
    },
    img: {
      horizontal: {
        off: 'rounded-t-[14px]',
        on: 'h-96 w-full rounded-t-[14px] object-cover md:h-auto md:w-48 md:rounded-none md:rounded-l-[14px]',
      },
    },
  },
  table: {
    root: {
      base: `w-full text-left text-sm text-[#111827] dark:text-gray-300`,
      shadow: `absolute left-0 top-0 -z-10 h-full w-full rounded-[14px] border border-[#E3E8EF] bg-white dark:border-gray-700 dark:bg-gray-800`,
    },
    head: {
      base: `group/head text-[11px] font-semibold uppercase tracking-wide text-[#5B6B82] dark:text-gray-400`,
      cell: {
        base: `bg-[#F8FAFC] px-5 py-3 group-first/head:first:rounded-tl-[14px] group-first/head:last:rounded-tr-[14px] dark:bg-gray-700`,
      },
    },
    body: {
      cell: {
        base: 'px-5 py-3.5 align-middle group-first/body:group-first/row:first:rounded-tl-[14px] group-first/body:group-first/row:last:rounded-tr-[14px] group-last/body:group-last/row:first:rounded-bl-[14px] group-last/body:group-last:row:last:rounded-br-[14px]',
      },
    },
    row: {
      base: 'group/row border-b border-[#F1F5F9] last:border-0 dark:border-gray-700',
      hovered: 'hover:bg-[#FBFCFD] dark:hover:bg-gray-700',
    },
  },
  tabs: {
    base: 'flex flex-col gap-4',
    tablist: {
      base: 'flex text-center',
      variant: {
        default: `flex-wrap border-b border-[#E3E8EF] dark:border-gray-700`,
        underline: `-mb-px flex-wrap border-b border-[#E3E8EF] dark:border-gray-700`,
        pills: 'flex-wrap gap-2 text-sm font-medium',
      },
      tabitem: {
        base: 'flex items-center justify-center gap-2 rounded-t-lg p-4 text-sm font-medium first:ml-0 focus:outline-none disabled:cursor-not-allowed disabled:text-gray-400',
        variant: {
          default: {
            active: {
              on: `bg-[#F4F0E8] text-[#9A7B61] dark:bg-gray-800 dark:text-[#C5A28C]`,
              off: `text-[#5B6B82] hover:bg-[#F8FAFC] hover:text-[#203565] dark:text-gray-400 dark:hover:bg-gray-800`,
            },
          },
          underline: {
            active: {
              on: `rounded-t-lg border-b-2 border-[#C5A28C] text-[#203565] dark:border-[#C5A28C] dark:text-white`,
              off: `border-b-2 border-transparent text-[#5B6B82] hover:border-[#E2DAD0] hover:text-[#203565] dark:text-gray-400 dark:hover:text-gray-200`,
            },
          },
          pills: {
            active: {
              // Token classes, not interpolated arbitrary values: `dark:bg-[#C5A28C]`
              // never reaches Tailwind's scanner as a real class, so the dark
              // branch silently did nothing and the active pill stayed navy with
              // navy text. Plain utilities are always generated.
              on: 'rounded-full bg-navy-bg text-white dark:bg-primary dark:text-white',
              off: `rounded-full text-[#5B6B82] hover:bg-[#F1F5F9] hover:text-[#203565] dark:text-gray-400 dark:hover:bg-gray-800`,
            },
          },
        },
      },
    },
  },
  pagination: {
    pages: {
      previous: {
        base: `ml-0 rounded-l-[10px] border border-[#E2DAD0] bg-white px-3 py-2 leading-tight text-[#5B6B82] enabled:hover:bg-[#F8FAFC] enabled:hover:text-[#203565] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400`,
      },
      next: {
        base: `rounded-r-[10px] border border-[#E2DAD0] bg-white px-3 py-2 leading-tight text-[#5B6B82] enabled:hover:bg-[#F8FAFC] enabled:hover:text-[#203565] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400`,
      },
      selector: {
        base: `w-12 border border-[#E2DAD0] bg-white py-2 leading-tight text-[#5B6B82] enabled:hover:bg-[#F8FAFC] enabled:hover:text-[#203565] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400`,
        active: `border-[#C5A28C] bg-[#C5A28C] text-white hover:bg-[#9A7B61] hover:text-white dark:border-[#C5A28C] dark:bg-[#C5A28C] dark:text-white`,
      },
    },
  },

  // -- Overlays and navigation ----------------------------------------------
  modal: {
    content: {
      inner: `relative flex max-h-[90dvh] flex-col rounded-2xl bg-white shadow-lg dark:bg-gray-800`,
    },
    header: {
      base: `flex items-start justify-between rounded-t-2xl border-b border-[#E3E8EF] p-5 dark:border-gray-700`,
      title: `text-lg font-semibold text-[#203565] dark:text-white`,
      close: {
        base: `ml-auto inline-flex items-center rounded-[10px] bg-transparent p-1.5 text-sm text-[#5B6B82] hover:bg-[#F8FAFC] hover:text-[#203565] dark:hover:bg-gray-700`,
      },
    },
    body: { base: 'flex-1 overflow-auto p-5' },
    footer: {
      base: `flex items-center gap-3 rounded-b-2xl border-t border-[#E3E8EF] p-5 dark:border-gray-700`,
    },
  },
  dropdown: {
    floating: {
      base: `z-[70] w-fit max-w-[min(24rem,calc(100vw-2rem))] divide-y divide-[#E3E8EF] rounded-[10px] shadow-md focus:outline-none`,
      // Cap the panel to the viewport and let it scroll: an open menu used to run
      // past the bottom of the screen with no way to reach the last options.
      content: `max-h-[min(70vh,20rem)] overflow-y-auto py-1 text-sm text-[#111827] dark:text-gray-200`,
      header: `block px-4 py-2 text-sm font-semibold text-[#203565] dark:text-gray-200`,
      item: {
        base: `flex w-full cursor-pointer items-center justify-start px-4 py-2 text-sm text-[#111827] hover:bg-[#F8FAFC] focus:bg-[#F8FAFC] focus:outline-none dark:text-gray-200 dark:hover:bg-gray-600`,
      },
      style: {
        auto: `border border-[#E3E8EF] bg-white text-[#203565] dark:border-gray-600 dark:bg-gray-700 dark:text-white`,
        light: `border border-[#E3E8EF] bg-white text-[#203565]`,
      },
    },
  },
};
