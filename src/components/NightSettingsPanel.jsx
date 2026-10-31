import { useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * The body of the phone sheet's "Custom settings" dropdown.
 *
 * Airbnb lets a host change the nights they picked without leaving the sheet:
 * open the row, make the change, and the calendar behind is already updated.
 * The same idea here, so a rate, a promotion or a minimum stay is three taps
 * from the calendar instead of a trip to the listing editor.
 *
 * The rows read the current state and hand edits back to the calendar page,
 * which owns every request; `on*` handlers resolve true once the change stuck,
 * and only then does the open row close.
 */

const PROMOTION_STEPS = [10, 15, 20, 25];
const MINIMUM_STAY_STEPS = [2, 3, 4, 5, 7, 14];

const rowClass =
  'flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-semibold text-white transition-colors hover:bg-white/5';
const chipBase = 'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ';
const chipActive = 'border-white bg-white text-navy-bg';
const chipIdle = 'border-white/25 text-white hover:bg-white/10';

function nightWord(count) {
  return count === 1 ? 'night' : 'nights';
}

export default function NightSettingsPanel({
  nightsLabel,
  baseRate,
  nightRate,
  hasDatedRate,
  promotionPercent = null,
  minNights,
  saving,
  onSaveRate,
  onClearRate,
  onSavePromotion,
  onClearPromotion,
  onSaveMinimumStay,
}) {
  const [row, setRow] = useState(null);
  const [rateDraft, setRateDraft] = useState('');

  function openRow(next) {
    setRow(next);
    if (next === 'rate') setRateDraft(nightRate ? String(nightRate) : '');
  }

  async function submit(handler, ...args) {
    const ok = await handler(...args);
    if (ok) setRow(null);
  }

  const summary = {
    rate: hasDatedRate ? `KES ${Number(nightRate).toLocaleString()}` : `Base · KES ${Number(nightRate).toLocaleString()}`,
    promotion: promotionPercent ? `${promotionPercent}% off` : 'None',
    stay: minNights > 1 ? `${minNights} ${nightWord(minNights)}` : 'No minimum',
  };

  const rows = [
    { id: 'rate', label: 'Nightly rate', value: summary.rate },
    { id: 'promotion', label: 'Promotion', value: summary.promotion },
    { id: 'stay', label: 'Minimum stay', value: summary.stay },
  ];

  return (
    <div className="text-white">
      {!row && (
        <>
          <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/50">
            {nightsLabel}
          </p>
          <ul className="mt-1 divide-y divide-white/10">
            {rows.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openRow(item.id)}
                  className={rowClass}
                >
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-white/70">
                    <span className="tabular-nums">{item.value}</span>
                    <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {row && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-1 py-2">
            <button
              type="button"
              onClick={() => setRow(null)}
              aria-label="Back to custom settings"
              className="-ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
            <span className="min-w-0 truncate text-sm font-semibold">
              {row === 'rate' && 'Nightly rate'}
              {row === 'promotion' && 'Promotion'}
              {row === 'stay' && 'Minimum stay'}
            </span>
          </div>

          {row === 'rate' && (
            <div className="space-y-2">
              <label htmlFor="night-rate-input" className="block text-[11px] text-white/60">
                Rate per night for these dates
              </label>
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2">
                  <span className="text-xs font-semibold text-white/60">KES</span>
                  <input
                    id="night-rate-input"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="100"
                    value={rateDraft}
                    onChange={(event) => setRateDraft(event.target.value)}
                    className="w-full min-w-0 border-0 bg-transparent p-0 text-sm font-bold tabular-nums text-white outline-none ring-0 focus:ring-0"
                  />
                </div>
                <button
                  type="button"
                  disabled={saving || !rateDraft}
                  onClick={() => submit(onSaveRate, Number(rateDraft))}
                  className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-navy-bg transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <p className="text-[10px] leading-relaxed text-white/50">
                Base rate is KES {Number(baseRate).toLocaleString()}. A rate set here covers only the nights you picked.
              </p>
              {hasDatedRate && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submit(onClearRate)}
                  className="text-[11px] font-semibold text-white underline underline-offset-2 disabled:opacity-50"
                >
                  Use the base rate instead
                </button>
              )}
            </div>
          )}

          {row === 'promotion' && (
            <div className="space-y-2">
              <p className="text-[11px] text-white/60">Take a percentage off these nights. Guests see the lower price.</p>
              <div className="flex flex-wrap gap-1.5">
                {PROMOTION_STEPS.map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    disabled={saving}
                    aria-pressed={promotionPercent === percent}
                    onClick={() => submit(onSavePromotion, percent)}
                    className={`${chipBase}${promotionPercent === percent ? chipActive : chipIdle}`}
                  >
                    {percent}% off
                  </button>
                ))}
              </div>
              {promotionPercent ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submit(onClearPromotion)}
                  className="text-[11px] font-semibold text-white underline underline-offset-2 disabled:opacity-50"
                >
                  Remove the promotion
                </button>
              ) : (
                <p className="text-[10px] leading-relaxed text-white/50">No promotion on these nights.</p>
              )}
            </div>
          )}

          {row === 'stay' && (
            <div className="space-y-2">
              <p className="text-[11px] text-white/60">
                How many nights must a guest book across these dates?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MINIMUM_STAY_STEPS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    disabled={saving}
                    aria-pressed={minNights === count}
                    onClick={() => submit(onSaveMinimumStay, count)}
                    className={`${chipBase}${minNights === count ? chipActive : chipIdle}`}
                  >
                    {count} nights
                  </button>
                ))}
              </div>
              {minNights > 1 ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submit(onSaveMinimumStay, 1)}
                  className="text-[11px] font-semibold text-white underline underline-offset-2 disabled:opacity-50"
                >
                  Remove the minimum ({minNights} {nightWord(minNights)})
                </button>
              ) : (
                <p className="text-[10px] leading-relaxed text-white/50">
                  Anyone can book a single night on these dates.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

NightSettingsPanel.propTypes = {
  nightsLabel: PropTypes.string.isRequired,
  baseRate: PropTypes.number.isRequired,
  nightRate: PropTypes.number.isRequired,
  hasDatedRate: PropTypes.bool.isRequired,
  promotionPercent: PropTypes.number,
  minNights: PropTypes.number.isRequired,
  saving: PropTypes.bool.isRequired,
  onSaveRate: PropTypes.func.isRequired,
  onClearRate: PropTypes.func.isRequired,
  onSavePromotion: PropTypes.func.isRequired,
  onClearPromotion: PropTypes.func.isRequired,
  onSaveMinimumStay: PropTypes.func.isRequired,
};
