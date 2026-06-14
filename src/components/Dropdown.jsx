import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

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
        className={`flex items-center justify-between gap-2 ${triggerClassName}`}
      >
        <span className={selected ? 'truncate' : 'truncate text-[#6b7280]'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 flex-shrink-0 text-[#6b7280] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute left-0 mt-2 bg-white rounded-2xl shadow-lg border border-[#D9D9D9] py-2 z-30 max-h-72 overflow-y-auto min-w-full w-max max-w-[18rem] ${menuClassName}`}
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
                className={`flex items-center w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  isSel ? 'bg-[#C49A6C]/10 text-[#262262] font-semibold' : 'text-[#1f2937] hover:bg-[#D9D9D9]/30'
                }`}
              >
                <span className="flex-1">{o.label}</span>
                {isSel && (
                  <svg className="w-4 h-4 text-[#C49A6C] flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
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
