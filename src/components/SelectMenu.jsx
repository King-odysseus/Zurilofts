import PropTypes from 'prop-types';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { Check, ChevronDown } from 'lucide-react';

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
 */

// Trigger styling mirrors brandTheme's TextInput (theme/flowbiteTheme.js) so a
// select and a text field on the same row line up. It lives here, not in a page
// stylesheet, because this is the single place selects are defined.
const TRIGGER_BASE =
  'flex w-full items-center justify-between gap-2 rounded-[10px] border border-[#E2DAD0] bg-elevated text-left text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#C49A6C] dark:border-gray-600 dark:bg-gray-700 dark:text-white';

const TRIGGER_SIZES = {
  sm: 'min-h-[38px] px-3 text-xs',
  md: 'min-h-[44px] px-3 text-sm',
  lg: 'min-h-[52px] px-4 text-base',
};

// Panel and item styling for this component only. Kept as a module constant
// rather than inline per call site so every select menu looks identical.
const MENU_THEME = {
  floating: {
    base: 'z-50 w-full overflow-hidden rounded-[10px] border border-[#E2DAD0] bg-elevated shadow-lg dark:border-gray-600 dark:bg-gray-700',
    content: 'max-h-72 overflow-y-auto py-1 text-sm text-[#111827] dark:text-gray-200',
  },
};

function SelectMenu({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Select',
  sizing = 'md',
  disabled = false,
  invalid = false,
  ariaLabel,
  placement = 'bottom-start',
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
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <DropdownItem
              key={option.value}
              onClick={() => onChange(option.value)}
              className={isSelected ? 'font-semibold text-[#0B1F42] dark:text-white' : undefined}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-[#C49A6C]" strokeWidth={2.5} aria-hidden="true" />}
              </span>
            </DropdownItem>
          );
        })}
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
  disabled: PropTypes.bool,
  invalid: PropTypes.bool,
  ariaLabel: PropTypes.string,
  placement: PropTypes.oneOf(['top', 'top-start', 'top-end', 'bottom', 'bottom-start', 'bottom-end', 'left', 'right']),
  wrapperClassName: PropTypes.string,
  className: PropTypes.string,
};

export default SelectMenu;
