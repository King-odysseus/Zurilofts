import { useState } from 'react';
import PropTypes from 'prop-types';

function TableActionsMenu({ label = 'More actions', actions }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-[10px] border border-[#E3E8EF] bg-white text-[#0B1F42] transition-colors hover:bg-[#F7F4EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C]/40">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
      </button>
      {open && <div className="absolute right-0 top-full z-30 mt-2 w-44 rounded-2xl border border-[#E3E8EF] bg-white p-2 shadow-[0_12px_30px_rgba(11,31,66,0.14)]">
        {actions.map((action) => <button key={action.label} type="button" disabled={action.disabled} onClick={() => { setOpen(false); action.onClick(); }} className={`flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-[#F7F4EF] disabled:cursor-not-allowed disabled:opacity-50 ${action.danger ? 'text-[#B42318]' : 'text-[#0B1F42]'}`}>
          <span className={`text-base leading-none ${action.danger ? 'text-[#B42318]' : 'text-[#5B6B82]'}`} aria-hidden="true">{action.icon || '•'}</span>{action.label}
        </button>)}
      </div>}
    </div>
  );
}

TableActionsMenu.propTypes = { label: PropTypes.string, actions: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string.isRequired, onClick: PropTypes.func.isRequired, icon: PropTypes.string, danger: PropTypes.bool, disabled: PropTypes.bool })).isRequired };

export default TableActionsMenu;
