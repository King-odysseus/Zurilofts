import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Custom select that renders an app-styled fly-out menu (matching the navbar
 * account menu) instead of the browser's native option list.
 *
 * props:
 *  - value: current value (compared as string)
 *  - onChange: (value) => void
 *  - options: [{ value, label }]
 *  - triggerClassName: classes for the trigger button (keeps each placement's box style)
 *  - menuClassName: extra classes for the fly-out (width/alignment)
 *  - placeholder, ariaLabel
 */
function Dropdown({ value, onChange, options, triggerClassName = '', menuClassName = '', placeholder = 'Select', ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const selected = options.find((o) => String(o.value) === String(value));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B6FD4] focus-visible:ring-offset-2 ${triggerClassName}`}
      >
        <span className={selected ? 'truncate text-[#0B1F42]' : 'truncate text-[#94A3B8]'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-[#5B6B82] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={2} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute left-0 z-30 mt-2 max-h-72 min-w-full w-max max-w-[18rem] overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white p-1 shadow-lg ${menuClassName}`}
        >
          {options.map((o) => {
            const isSel = String(o.value) === String(value);
            return (
              <button
                key={String(o.value)}
                type="button"
                role="option"
                aria-selected={isSel}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex items-center w-full text-left px-3 py-2.5 text-sm rounded-md transition-colors ${
                  isSel ? 'bg-[#E8EDF7] font-semibold text-[#0B1F42]' : 'text-[#0B1F42] hover:bg-[#F3F4F6]'
                }`}
              >
                <span className="flex-1">{o.label}</span>
                {isSel && (
                  <Check className="ml-2 h-4 w-4 flex-shrink-0 text-[#C49A6C]" strokeWidth={2} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

Dropdown.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.node,
    })
  ).isRequired,
  triggerClassName: PropTypes.string,
  menuClassName: PropTypes.string,
  placeholder: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default Dropdown;
