import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
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
  }[icon] || Circle;
  return <Icon className={className} strokeWidth={1.8} aria-hidden="true" />;
}

ActionIcon.propTypes = { icon: PropTypes.string, danger: PropTypes.bool };

const MENU_WIDTH = 200;
const GAP = 6;

/**
 * Row action menu for admin tables.
 *
 * The menu is rendered into document.body with fixed positioning rather than
 * inline. Every admin table sits inside a card that needs `overflow-hidden` to
 * clip its own rounded corners, and inside an `overflow-x-auto` scroll box for
 * narrow screens. An inline absolutely-positioned menu is clipped by both, so
 * the last rows' menus were cut off mid-row. A portal escapes those boxes
 * entirely, which is why the position has to be measured from the trigger.
 */
function TableActionsMenu({ label = 'More actions', actions }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? actions.length * 40 + 8;

    // Open upward when there is not enough room below but there is above.
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + GAP && rect.top > menuHeight + GAP;

    setPos({
      top: openUp ? Math.max(GAP, rect.top - menuHeight - GAP) : rect.bottom + GAP,
      // Right-align to the trigger so the menu never runs past the viewport.
      left: Math.max(GAP, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - GAP)),
    });
  }, [actions.length]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(e) {
      if (menuRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    // Any scroll or resize invalidates the measured position, so close instead
    // of letting the menu drift away from its trigger.
    const onReflow = () => setOpen(false);

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-[10px] border border-border bg-elevated text-navy transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Ellipsis className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
          className="fixed z-[80] overflow-hidden rounded-xl border border-border bg-elevated p-1 shadow-lg"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                action.danger ? 'text-[#B42318] hover:bg-[#B42318]/10' : 'text-navy hover:bg-surface'
              }`}
            >
              <ActionIcon icon={action.icon} danger={action.danger} />
              {action.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

TableActionsMenu.propTypes = {
  label: PropTypes.string,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
      icon: PropTypes.string,
      danger: PropTypes.bool,
      disabled: PropTypes.bool,
    }),
  ).isRequired,
};

export default TableActionsMenu;
