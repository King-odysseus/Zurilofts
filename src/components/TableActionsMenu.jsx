import PropTypes from 'prop-types';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { AlignLeft, Check, Circle, Ellipsis, Minus, Pencil, RefreshCw, Search, X } from 'lucide-react';

function ActionIcon({ icon, danger }) {
  const className = `h-4 w-4 shrink-0 ${danger ? 'text-[#B42318]' : 'text-[#5B6B82]'}`;
  const Icon = {
    // Semantic names are the supported API; the glyph keys below are kept
    // so any existing call site that passed a symbol still resolves.
    edit: Pencil,
    delete: X,
    view: Search,
    refresh: RefreshCw,
    approve: Check,
    pause: Minus,
    notes: AlignLeft,
    '✎': Pencil,
    '×': X,
    '⌕': Search,
    '↻': RefreshCw,
    '✓': Check,
    '-': Minus,
    '⌁': AlignLeft,
  }[icon] || Circle;
  return <Icon className={className} strokeWidth={1.8} aria-hidden="true" />;
}

ActionIcon.propTypes = { icon: PropTypes.string, danger: PropTypes.bool };

function TableActionsMenu({ label = 'More actions', actions }) {
  return (
    <Dropdown
      arrowIcon={false}
      inline
      aria-label={label}
      placement="bottom-end"
      className="op-table-actions-menu"
      // Icon-only trigger, so the accessible name has to come from the caller's
      // label text - Flowbite puts its aria-label on the wrapper, not the button.
      label={<><span className="sr-only">{label}</span><Ellipsis className="h-5 w-5" strokeWidth={2} aria-hidden="true" /></>}
      // An `inline` Dropdown renders a bare <button> whose entire className is
      // this string: Flowbite's own inlineWrapper default contributes only
      // "flex items-center", so the visual styling has to live here. Do not
      // move it to a stylesheet or trim it without checking the trigger still
      // looks like a control - there is nothing underneath to fall back to.
      // (theme is deep-merged with twMerge, not replaced, so conflict resolution
      // keeps these utilities while non-conflicting defaults survive.)
      theme={{ inlineWrapper: 'inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-[10px] border border-[#E3E8EF] bg-white text-[#0B1F42] transition-colors hover:bg-[#F7F4EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C]/40' }}
    >
      {actions.map((action) => (
        <DropdownItem key={action.label} disabled={action.disabled} onClick={action.onClick} className={action.danger ? 'text-[#B42318]' : ''}>
          <ActionIcon icon={action.icon} danger={action.danger} />{action.label}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

TableActionsMenu.propTypes = { label: PropTypes.string, actions: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string.isRequired, onClick: PropTypes.func.isRequired, icon: PropTypes.string, danger: PropTypes.bool, disabled: PropTypes.bool })).isRequired };

export default TableActionsMenu;
