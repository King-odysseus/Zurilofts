import PropTypes from 'prop-types';

/**
 * Starter examples for one arrival-guide section.
 *
 * A host who does not know what to write stares at an empty box and skips the
 * section, so the guide reaches the guest with nothing in it. A chip drops a
 * ready-made line into that box for the host to edit to match their own place:
 * correcting a sentence is far easier than inventing one.
 *
 * Purely presentational. It holds no state and never touches the form, so the
 * section that owns the text area decides where the inserted line goes and
 * which examples are already covered.
 */

// Two complete looks rather than a base plus overrides: a used chip must not
// light up on hover, and when two equal Tailwind utilities disagree the winner
// is decided by the order they were generated in, not by the order written here.
const CHIP_BASE =
  'inline-flex min-h-8 items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors';
const CHIP_ACTIVE = 'border-border bg-surface text-navy hover:border-primary hover:bg-primary-50';
const CHIP_USED = 'cursor-default border-border bg-surface text-muted opacity-60';

export default function ArrivalExamples({ label, items, onPick, disabledIds = [] }) {
  // A heading over no chips reads as a broken control rather than a hint, so a
  // section without examples renders nothing at all.
  if (!Array.isArray(items) || items.length === 0) return null;

  // A caller with no used ids may pass undefined, null or an empty list; all
  // three mean "everything is still available".
  const usedIds = Array.isArray(disabledIds) ? disabledIds : [];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {items.map((item) => {
          // Used examples stay in place instead of disappearing, so the host can
          // see what the section already covers and the row does not reshuffle
          // under their finger between taps. A used chip's label doubles as its
          // tooltip, so no extra wording has to be translated.
          const used = usedIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item.text)}
              disabled={used}
              aria-disabled={used}
              title={used ? item.label : undefined}
              className={`${CHIP_BASE} ${used ? CHIP_USED : CHIP_ACTIVE}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const exampleShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
});

ArrivalExamples.propTypes = {
  label: PropTypes.string.isRequired,
  // Optional rather than required: a section with nothing to suggest is a
  // normal state, not a caller mistake.
  items: PropTypes.arrayOf(exampleShape),
  onPick: PropTypes.func.isRequired,
  disabledIds: PropTypes.arrayOf(PropTypes.string),
};
