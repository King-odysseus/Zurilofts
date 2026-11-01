import { useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { Check, ChevronDown, Search } from 'lucide-react';

/**
 * A select built on Flowbite's Dropdown, so the option list is styled by the
 * app instead of the browser's native popup (which ignores the brand palette
 * and renders the blue system list on Windows).
 *
 * Every screen should use this instead of Flowbite's `Select` or a raw
 * `<select>`: `Select` still renders a real <select> element underneath, which
 * is exactly the plain blue list this replaces.
 *
 * Contrast the two APIs when migrating a page:
 *   <Select value={v} onChange={(e) => setV(e.target.value)}>  native
 *   <SelectMenu value={v} onChange={(next) => setV(next)} />   this
 *
 * `onChange` receives the option's value directly, not a DOM event.
 *
 * Pass `searchable` when the list is long enough that scanning it is work: a
 * bank list runs to dozens of names. The search box filters on the option
 * label, ignoring case and accents, so "equity" finds "Equity Bank Kenya Ltd".
 */

// Trigger styling mirrors brandTheme's TextInput (theme/flowbiteTheme.js) so a
// select and a text field on the same row line up. The radius is chosen by the
// `shape` prop rather than passed in through className: two utilities for the
// same property resolve by CSS order, not by prop order, so `rounded-full` in a
// caller's className may silently lose to the field radius. It lives here, not
// in a page stylesheet, because this is the single place selects are defined.
const TRIGGER_BASE =
  'flex w-full items-center justify-between gap-2 border border-[#E2DAD0] bg-elevated text-left text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#C5A28C] dark:border-gray-600 dark:bg-gray-700 dark:text-white';

// A select on a form is a field (10px); one sitting in a header toolbar beside
// pill controls is a pill, so the two never look mismatched on the same row.
const TRIGGER_SHAPES = {
  field: 'rounded-[10px]',
  pill: 'rounded-full',
};

const TRIGGER_SIZES = {
  sm: 'min-h-[38px] px-3 text-xs',
  md: 'min-h-[44px] px-3 text-sm',
  lg: 'min-h-[52px] px-4 text-base',
};

// Panel and item styling for this component only. Kept as a module constant
// rather than inline per call site so every select menu looks identical.
//
// The two clamp utilities carry Tailwind's `!` modifier on purpose. Flowbite
// measures the trigger once, when the menu mounts, and writes that width onto
// the open panel as an inline `min-width`. Rotate a phone, or drag a window
// narrower, and the panel keeps the old, wider measurement - at that point the
// open list runs off the right of the screen and the whole page scrolls
// sideways. A class cannot beat an inline style without `!`, and a viewport
// cap cannot beat `min-width` at all, so both the floor and the cap are
// important here. The floor stays useful (an `sm` select in a narrow table
// still opens a readable list) and is itself capped, so it can never exceed the
// screen.
//
// The height cap lives on the top-level `content` key, not on
// `floating.content`. flowbite-react 0.12 renders an open menu as
// <div class={floating.base}><ul class={content}>, so a cap written on
// `floating.content` is never applied to anything and the list grows to its
// full height. A 43-bank list then measured 1619px tall in a 720px window: the
// panel flipped above the trigger, ran off the top of the screen, and took the
// search box with it, so typing to narrow the list was impossible.
//
// The cap is min(18rem, 40dvh). The first value is the comfortable size on a
// normal screen. The second is what makes the panel fit at every window size:
// the trigger splits the screen into a side above and a side below it, so the
// roomier of the two is always at least about half the viewport. Capping below
// that half means one side can hold the whole panel, and floating-ui's flip is
// then free to choose it. Capping against the full viewport instead (100dvh)
// still left the panel 80px past the bottom edge of a 480px-tall window, whose
// list was unusable past the fourth bank. `overscroll-contain` stops the page
// scrolling once the list itself reaches its end.
const MENU_THEME = {
  content: 'max-h-[min(18rem,40dvh)] overflow-y-auto overscroll-contain py-1 text-sm text-[#111827] focus:outline-none dark:text-gray-200',
  floating: {
    base: 'z-50 w-full overflow-hidden rounded-[10px] bg-elevated shadow-lg dark:bg-gray-700 !min-w-[min(11rem,calc(100vw-2rem))] !max-w-[calc(100vw-2rem)]',
  },
};

// Case and accent folding: a host typing "mpesa" or "M-PESA", or "Cafe" for
// "Café", should still narrow the list.
function foldForSearch(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * The menu body, split out so its search query resets every time the menu
 * opens: the panel (and therefore this component) only mounts while open, and
 * unmounting throws the query away. Keeping the query in the parent would
 * leave a stale filter in place the next time the menu is opened.
 */
function MenuBody({
  options,
  value,
  onChange,
  searchable,
  searchPlaceholder,
  noMatchLabel,
}) {
  const [query, setQuery] = useState('');
  const itemRefs = useRef(new Map());

  const term = foldForSearch(query.trim());
  const visible = useMemo(
    () => (term ? options.filter((option) => foldForSearch(option.label).includes(term)) : options),
    [options, term],
  );

  // Enter picks the top match, so a host can type "equity" and press Enter
  // without reaching for the mouse. Clicking that item's own button lets the
  // dropdown run its normal select-and-close path instead of duplicating it.
  function handleSearchKeyDown(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const first = visible[0];
    if (first) itemRefs.current.get(first.value)?.click();
  }

  return (
    <>
      {searchable && (
        <li role="presentation" className="sticky top-0 z-10 border-b border-[#E2DAD0] bg-elevated px-2 pb-2 pt-2 dark:border-gray-600 dark:bg-gray-700">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280] dark:text-gray-400" strokeWidth={2} aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              autoComplete="off"
              spellCheck={false}
              // The menu toggles open on click, so focusing this box saves a
              // second click for anyone who came here to type.
              autoFocus
              className="w-full rounded-[8px] border border-[#E2DAD0] bg-white py-2 pl-8 pr-2 text-sm text-[#111827] placeholder:text-[#6b7280] focus:border-[#C5A28C] focus:outline-none focus:ring-1 focus:ring-[#C5A28C] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
            />
          </div>
        </li>
      )}
      {visible.map((option) => {
        const isSelected = option.value === value;
        return (
          <DropdownItem
            key={option.value}
            ref={(node) => {
              if (node) itemRefs.current.set(option.value, node);
              else itemRefs.current.delete(option.value);
            }}
            onClick={() => onChange(option.value)}
            className={isSelected ? 'font-semibold text-[#203565] dark:text-white' : undefined}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="truncate">{option.label}</span>
              {isSelected && <Check className="h-4 w-4 shrink-0 text-[#8A6B52]" strokeWidth={2.5} aria-hidden="true" />}
            </span>
          </DropdownItem>
        );
      })}
      {visible.length === 0 && (
        <li role="presentation" className="px-3 py-2.5 text-sm text-[#6b7280] dark:text-gray-400">
          {noMatchLabel}
        </li>
      )}
    </>
  );
}

function SelectMenu({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Select',
  sizing = 'md',
  shape = 'field',
  disabled = false,
  invalid = false,
  ariaLabel,
  placement = 'bottom-start',
  searchable = false,
  searchPlaceholder = 'Search',
  noMatchLabel = 'No matches',
  className = '',
  wrapperClassName,
}) {
  const selected = options.find((option) => option.value === value);
  // An empty-string value is a real choice ("Any", "Not set"), so only a value
  // with no matching option counts as unset.
  const hasValue = Boolean(selected);
  const isUnset = !hasValue || selected.value === '';

  return (
    // The wrapper must be `relative`: Flowbite positions the floating panel
    // against the nearest positioned ancestor, and without this it anchors to
    // <body>, making `w-full` span the whole page instead of the field.
    <div className={wrapperClassName ? `relative ${wrapperClassName}` : 'relative w-full'}>
      {/* Forms read fields by name; the trigger is a button, so mirror the
          chosen value into a hidden input or <FormData> would miss it. */}
      {name && <input type="hidden" name={name} value={value ?? ''} />}
      <Dropdown
        dismissOnClick
        placement={placement}
        disabled={disabled}
        // Typeahead jumps the highlight between items on a keypress, which
        // would fight the search box: a hidden filter would eat the letters
        // the person meant to type.
        enableTypeAhead={!searchable}
        theme={MENU_THEME}
        renderTrigger={() => (
          <button
            type="button"
            id={id}
            aria-label={ariaLabel || placeholder}
            aria-haspopup="menu"
            aria-invalid={invalid || undefined}
            className={[
              TRIGGER_BASE,
              TRIGGER_SHAPES[shape] || TRIGGER_SHAPES.field,
              TRIGGER_SIZES[sizing] || TRIGGER_SIZES.md,
              invalid ? 'border-red-500 focus:ring-red-500' : '',
              disabled ? 'cursor-not-allowed opacity-50' : '',
              className,
            ].filter(Boolean).join(' ')}
          >
            <span className={['truncate', isUnset ? 'text-[#6b7280] dark:text-gray-400' : ''].join(' ')}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#6b7280] dark:text-gray-400" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      >
        <MenuBody
          options={options}
          value={value}
          onChange={onChange}
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          noMatchLabel={noMatchLabel}
        />
      </Dropdown>
    </div>
  );
}

SelectMenu.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  placeholder: PropTypes.string,
  sizing: PropTypes.oneOf(['sm', 'md', 'lg']),
  shape: PropTypes.oneOf(['field', 'pill']),
  disabled: PropTypes.bool,
  invalid: PropTypes.bool,
  ariaLabel: PropTypes.string,
  placement: PropTypes.oneOf(['top', 'top-start', 'top-end', 'bottom', 'bottom-start', 'bottom-end', 'left', 'right']),
  searchable: PropTypes.bool,
  searchPlaceholder: PropTypes.string,
  noMatchLabel: PropTypes.string,
  wrapperClassName: PropTypes.string,
  className: PropTypes.string,
};

export default SelectMenu;
