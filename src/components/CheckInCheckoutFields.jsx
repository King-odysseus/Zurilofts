import PropTypes from 'prop-types';
import { EditorFieldGroup, EditorSelectRow } from './EditorFieldGroup.jsx';

/**
 * The check-in and checkout half of the arrival guide, as rows.
 *
 * These four fields answer the question a guest asks the moment they book: how
 * do I get in, and when? They sit together rather than beside the wifi and the
 * manual because a guest reads them as one block on the day of arrival.
 *
 * The method wording is carried over unchanged from the card the guide used
 * before, so a saved value still matches its option after this screen replaced
 * that card (see HostArrivalGuidePage.jsx).
 */

// Every row has to be clearable: once a time has been chosen there would
// otherwise be no way back to "not set", and an empty row is what the API stores
// as null. Selecting it sends an empty value, which the page turns into null.
const UNSET = { value: '', label: 'Not set' };

const CHECK_IN_METHODS = [
  UNSET,
  { value: 'Lockbox', label: 'Lockbox' },
  { value: 'Keypad', label: 'Keypad' },
  { value: 'Smart lock', label: 'Smart lock' },
  { value: 'Building staff', label: 'Building staff' },
  { value: 'Host greets', label: 'Host greets you' },
];

// Every hour from 06:00 to 23:00. Built from the hour rather than typed out so
// the value and the label can never drift apart: both read HH:00.
const TIMES = Array.from({ length: 18 }, (_, index) => {
  const label = `${String(index + 6).padStart(2, '0')}:00`;
  return { value: label, label };
});

const TIME_OPTIONS = [UNSET, ...TIMES];

// The end of a check-in window can also be left open-ended, so "Flexible" leads
// the list. Named for that row, not for the checkout block.
const CHECK_IN_WINDOW_END_OPTIONS = [UNSET, { value: 'Flexible', label: 'Flexible' }, ...TIMES];

const HEADING = 'text-sm font-semibold text-navy';

export default function CheckInCheckoutFields({ value, onChange }) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <span className={HEADING}>Check-in method</span>
        <EditorFieldGroup>
          <EditorSelectRow
            id="guide-checkin-method"
            label="Method"
            value={value.checkInMethod}
            onChange={(next) => onChange('checkInMethod', next)}
            options={CHECK_IN_METHODS}
            placeholder="Choose how guests get in"
            ariaLabel="Check-in method"
          />
        </EditorFieldGroup>
      </div>

      <div className="flex flex-col gap-2">
        <span className={HEADING}>Check-in window</span>
        <EditorFieldGroup>
          <EditorSelectRow
            id="guide-checkin-start"
            label="Start time"
            value={value.checkInWindowStart}
            onChange={(next) => onChange('checkInWindowStart', next)}
            options={TIME_OPTIONS}
            placeholder="Select a time"
            ariaLabel="Check-in window start time"
          />
          <EditorSelectRow
            id="guide-checkin-end"
            label="End time"
            value={value.checkInWindowEnd}
            onChange={(next) => onChange('checkInWindowEnd', next)}
            options={CHECK_IN_WINDOW_END_OPTIONS}
            placeholder="Select a time"
            ariaLabel="Check-in window end time"
          />
        </EditorFieldGroup>
      </div>

      <div className="flex flex-col gap-2">
        <span className={HEADING}>Checkout</span>
        <EditorFieldGroup>
          <EditorSelectRow
            id="guide-checkout-time"
            label="Time"
            value={value.checkOutTime}
            onChange={(next) => onChange('checkOutTime', next)}
            options={TIME_OPTIONS}
            placeholder="Select a time"
            ariaLabel="Checkout time"
          />
        </EditorFieldGroup>
      </div>
    </div>
  );
}

CheckInCheckoutFields.propTypes = {
  value: PropTypes.shape({
    checkInMethod: PropTypes.string.isRequired,
    checkInWindowStart: PropTypes.string.isRequired,
    checkInWindowEnd: PropTypes.string.isRequired,
    checkOutTime: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};
