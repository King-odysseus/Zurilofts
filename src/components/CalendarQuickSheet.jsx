import PropTypes from 'prop-types';
import { Check, Plus, X } from 'lucide-react';

/**
 * The phone counterpart of the desktop action bar on the host calendar.
 *
 * The dark cards mirror the reference bottom sheet, where availability and
 * price sit side by side above a single wide row. It is mobile only because the
 * desktop calendar has room to keep that bar inline above the grid.
 *
 * Stateless on purpose: the selection and every action live on the calendar
 * page, so this renders exactly what it is handed and never drifts from it.
 */
export default function CalendarQuickSheet({
  open,
  title,
  subtitle,
  rateLabel,
  rate,
  summary,
  allOpen,
  saving,
  canBlock,
  canOpen,
  onBlock,
  onOpen,
  onClear,
  onSettings,
}) {
  if (!open) return null;

  // Only one segment may look filled: the chosen mode is the single solid
  // shape, and the other reads as a tint on hover so the pair never competes.
  // The chosen mode is also the no-op one, so it must stay solid when disabled
  // rather than fade out and look unavailable.
  const segmentBase = 'grid h-9 place-items-center rounded-full transition-colors ';
  const segmentActive = 'bg-white text-navy-bg';
  const segmentIdle = 'text-white hover:bg-white/10';
  const segmentUnavailable = 'text-white/40';

  return (
    <div
      className="fixed inset-x-3 bottom-[calc(var(--zl-bottom-nav-space)_+_8px)] z-30 mx-auto flex max-w-md flex-col gap-2 md:hidden"
      role="region"
      aria-label="Selected dates"
    >
      <div className="flex items-center justify-end gap-2">
        <span className="rounded-full bg-elevated px-3 py-2 text-xs font-semibold tabular-nums text-navy shadow-lg ring-1 ring-border">
          {title}
          <span className="ml-1.5 font-medium text-muted">{subtitle}</span>
        </span>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selected dates"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-elevated text-navy shadow-lg ring-1 ring-border transition-colors hover:bg-surface"
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-navy-bg p-3 text-white shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">Available</span>
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${allOpen ? 'bg-emerald-400' : 'bg-white/30'}`}
            />
          </div>

          <div
            className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1"
            role="group"
            aria-label="Availability for the selected nights"
          >
            <button
              type="button"
              onClick={onBlock}
              disabled={saving || !canBlock}
              aria-pressed={!allOpen}
              aria-label="Block the selected nights"
              className={`${segmentBase}${!allOpen ? segmentActive : (canBlock ? segmentIdle : segmentUnavailable)}`}
            >
              <X className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onOpen}
              disabled={saving || !canOpen}
              aria-pressed={allOpen}
              aria-label="Open the selected nights"
              className={`${segmentBase}${allOpen ? segmentActive : (canOpen ? segmentIdle : segmentUnavailable)}`}
            >
              <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>

          <p className="mt-2 truncate text-[10px] leading-tight text-white/60">{summary}</p>
        </div>

        <div className="rounded-2xl bg-navy-bg p-3 text-white shadow-xl">
          <p className="truncate text-xs font-semibold text-white/70">{rateLabel}</p>
          <p className="mt-1 truncate text-lg font-bold tabular-nums">{rate}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSettings}
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-navy-bg px-4 py-3 text-sm font-semibold text-white shadow-xl transition-colors hover:bg-navy-hover"
      >
        <span>Custom settings</span>
        <Plus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

CalendarQuickSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  rateLabel: PropTypes.string.isRequired,
  rate: PropTypes.string.isRequired,
  summary: PropTypes.string,
  allOpen: PropTypes.bool.isRequired,
  saving: PropTypes.bool.isRequired,
  canBlock: PropTypes.bool.isRequired,
  canOpen: PropTypes.bool.isRequired,
  onBlock: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onSettings: PropTypes.func.isRequired,
};
