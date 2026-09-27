import { useState } from 'react';
import PropTypes from 'prop-types';

function ActionIcon({ icon, danger }) {
  const tone = danger ? '#B42318' : '#5B6B82';
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: tone, strokeWidth: 1.8, className: 'h-4 w-4 shrink-0', 'aria-hidden': true };
  if (icon === '✎') return <svg {...common}><path d="m4 16.5-.7 3.2 3.2-.7L18.3 7.2a2.1 2.1 0 0 0-3-3L4 16.5Z" /><path d="m14.5 5.5 3 3" /></svg>;
  if (icon === '×') return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
  if (icon === '⌕') return <svg {...common}><circle cx="10.8" cy="10.8" r="5.8" /><path d="m15.2 15.2 4.3 4.3" /></svg>;
  if (icon === '↻') return <svg {...common}><path d="M20 11a8 8 0 0 0-14.8-4L3 10" /><path d="M3 5v5h5M4 13a8 8 0 0 0 14.8 4L21 14" /><path d="M21 19v-5h-5" /></svg>;
  if (icon === '✓') return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  if (icon === '–') return <svg {...common}><path d="M5 12h14" /></svg>;
  if (icon === '⌁') return <svg {...common}><path d="M7 8h10M7 12h10M7 16h6" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="2" fill={tone} stroke="none" /></svg>;
}

ActionIcon.propTypes = { icon: PropTypes.string, danger: PropTypes.bool };

function TableActionsMenu({ label = 'More actions', actions }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-[10px] border border-[#E3E8EF] bg-white text-[#0B1F42] transition-colors hover:bg-[#F7F4EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C]/40">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
      </button>
      {open && <div className="absolute right-0 top-full z-30 mt-2 w-44 rounded-2xl border border-[#E3E8EF] bg-white p-2 shadow-[0_12px_30px_rgba(11,31,66,0.14)]">
        {actions.map((action) => <button key={action.label} type="button" disabled={action.disabled} onClick={() => { setOpen(false); action.onClick(); }} className={`flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-[#F7F4EF] disabled:cursor-not-allowed disabled:opacity-50 ${action.danger ? 'text-[#B42318]' : 'text-[#0B1F42]'}`}>
          <ActionIcon icon={action.icon} danger={action.danger} />{action.label}
        </button>)}
      </div>}
    </div>
  );
}

TableActionsMenu.propTypes = { label: PropTypes.string, actions: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string.isRequired, onClick: PropTypes.func.isRequired, icon: PropTypes.string, danger: PropTypes.bool, disabled: PropTypes.bool })).isRequired };

export default TableActionsMenu;
