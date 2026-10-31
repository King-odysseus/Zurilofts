import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Form rows for the two-pane listing editor, in the reference's shape: one
 * bordered white box per group, each row a small grey label above a larger
 * dark value, and a chevron where the row opens a menu.
 *
 * These are deliberately NOT the app's labelled fields. An editor row carries no
 * visible box or placeholder chrome of its own - the group's dividers and the
 * label/value pair are the whole affordance - so a screen made of them reads as
 * a settings list rather than a form dropped onto a page.
 *
 * Every row renders exactly one root element because EditorFieldGroup spaces its
 * children with a child combinator (`[&>*+*]`); a row with two roots would draw
 * a divider in the wrong place.
 */

// The option panel. Compact and scroll-capped: a time list runs to eighteen
// entries, and an uncapped panel would hang past the bottom of the form.
const MENU_CLASS =
  'absolute left-0 top-full z-30 mt-1 max-h-64 w-full max-w-[320px] overflow-y-auto rounded-xl border border-border bg-elevated py-1 shadow-lg';
const OPTION_CLASS =
  'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-navy transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface';

// The trigger's own chrome, shared by nothing else: flat until hovered, so a
// stack of rows looks like one surface rather than a column of buttons.
const TRIGGER_CLASS = [
  'flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface',
  // Inset ring: the row is full-bleed inside an `overflow-hidden` group, so an
  // outset ring would be clipped by the group's rounded corners.
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy/30',
].join(' ');

const TEXT_INPUT_CLASS =
  'mt-0.5 w-full border-0 bg-transparent p-0 text-[15px] text-navy placeholder:text-muted focus:outline-none focus:ring-0';
const TEXTAREA_CLASS =
  'mt-0.5 w-full resize-y border-0 bg-transparent p-0 text-[15px] leading-relaxed text-navy placeholder:text-muted focus:outline-none focus:ring-0';

export function EditorFieldGroup({ children, className }) {
  return (
    <div
      className={[
        'rounded-xl border border-border bg-elevated',
        // Rows are rounded at the ends rather than clipped by `overflow-hidden`,
        // because clipping would also cut off a row's open menu.
        '[&>*:first-child]:rounded-t-xl [&>*:last-child]:rounded-b-xl',
        // Divider between rows, drawn by the group rather than by each row: a
        // row then never has to know whether it is first or last.
        '[&>*+*]:border-t [&>*+*]:border-border',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

export function EditorSelectRow({ id, label, value, onChange, options, placeholder = 'Select', ariaLabel, disabled = false }) {
  const [open, setOpen] = useState(false);
  const row = useRef(null);
  const selected = options.find((option) => option.value === value);

  // A panel left open behind a click elsewhere would sit over the form until
  // another row was pressed, so it closes on an outside press and on Escape.
  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (row.current && !row.current.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function choose(next) {
    onChange(next);
    setOpen(false);
  }

  return (
    // `relative` anchors the panel to this row rather than to the page.
    <div ref={row} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className={disabled ? `${TRIGGER_CLASS} cursor-not-allowed opacity-60` : TRIGGER_CLASS}
      >
        <span className="min-w-0">
          <span className="block text-xs text-muted">{label}</span>
          {/* Placeholder text is muted; a real choice takes the row's ink, so an
              unfilled row is visible at a glance in a long stack. */}
          <span className={`mt-0.5 block truncate text-[15px] ${selected ? 'text-navy' : 'text-muted'}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div role="listbox" aria-label={ariaLabel || label} className={MENU_CLASS}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(option.value)}
                className={`${OPTION_CLASS} ${isSelected ? 'font-semibold' : ''}`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-primary-600" strokeWidth={2.5} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function EditorTextRow({ id, label, value, onChange, placeholder, type = 'text', maxLength, autoComplete }) {
  return (
    <div className="bg-elevated px-4 py-3">
      <label htmlFor={id} className="block text-xs text-muted">{label}</label>
      <input
        id={id}
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        className={TEXT_INPUT_CLASS}
      />
    </div>
  );
}

export function EditorTextAreaRow({ id, label, value, onChange, placeholder, rows = 4, maxLength }) {
  return (
    <div className="bg-elevated px-4 py-3">
      <label htmlFor={id} className="block text-xs text-muted">{label}</label>
      <textarea
        id={id}
        rows={rows}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={TEXTAREA_CLASS}
      />
    </div>
  );
}

EditorFieldGroup.propTypes = {
  // Not `isRequired`: a group whose rows are still loading renders empty for a
  // moment, and that is not a caller mistake worth a console warning.
  children: PropTypes.node,
  className: PropTypes.string,
};

EditorSelectRow.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string.isRequired,
  // Undefined is a real state (nothing chosen yet), which is what keeps the
  // placeholder showing instead of an empty value line.
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  placeholder: PropTypes.string,
  ariaLabel: PropTypes.string,
  disabled: PropTypes.bool,
};

EditorTextRow.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  type: PropTypes.string,
  maxLength: PropTypes.number,
  autoComplete: PropTypes.string,
};

EditorTextAreaRow.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  rows: PropTypes.number,
  maxLength: PropTypes.number,
};
