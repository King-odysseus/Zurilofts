import PropTypes from 'prop-types';
import { Button } from 'flowbite-react';

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

// The chip is the app's secondary pill, not a look of its own: the Flowbite theme
// already defines that as a fully rounded white button with the #E2DAD0 border and
// #203565 ink, plus an inset/muted disabled state that reads as "already used"
// without a second colour being invented here.
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
            <Button
              key={item.id}
              type="button"
              color="light"
              size="sm"
              onClick={() => onPick(item.text)}
              disabled={used}
              aria-disabled={used}
              title={used ? item.label : undefined}
            >
              {item.label}
            </Button>
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
