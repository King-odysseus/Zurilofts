import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

/**
 * Price editor for the dates a host picked on their calendar.
 *
 * Three things change per date range: the nightly rate, a percentage discount
 * and a minimum stay. Each one is its own request against its own endpoint, so
 * there is no single Save here - every control commits on its own and the
 * footer is just a way out. That is why the dialog never closes itself: the
 * page owns the request, the toast and the refreshed calendar behind the sheet.
 *
 * This is the only day editor in the app: the calendar's action bar and the
 * phone sheet both open it, so a host never has to leave the calendar to price
 * a date.
 */

const PROMOTION_STEPS = [10, 15, 20, 25];
const MINIMUM_STAY_STEPS = [2, 3, 4, 5, 7, 14];

const SECTION_TITLE = 'text-sm font-bold text-navy';
const HINT = 'text-xs leading-relaxed text-muted';

const CHIP_BASE =
  'inline-flex min-h-[40px] items-center justify-center rounded-full border px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const CHIP_ACTIVE = 'border-[#143A80] bg-[#143A80] text-white';
const CHIP_IDLE = 'border-border bg-elevated text-navy hover:bg-surface';

const INPUT_SHELL =
  'flex min-w-0 flex-1 items-center gap-1.5 rounded-xl bg-elevated shadow-md px-3 py-2 focus-within:border-[#143A80]';
const INPUT_FIELD =
  'w-full min-w-0 border-0 bg-transparent p-0 text-sm font-bold tabular-nums text-navy outline-none ring-0 focus:ring-0 disabled:opacity-60';

const PRIMARY_BUTTON =
  'inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-[#143A80] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0B2A5E] disabled:cursor-not-allowed disabled:opacity-50';

const TEXT_ACTION =
  'text-xs font-semibold text-[#143A80] underline underline-offset-2 transition-opacity disabled:cursor-not-allowed disabled:opacity-50';

function formatKes(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString('en-GB') : '0';
}

export default function DayRateDialog({
  open,
  title,
  subtitle,
  baseRate,
  nightRate,
  hasDatedRate,
  promotionPercent,
  minNights,
  saving,
  onSaveRate,
  onClearRate,
  onSavePromotion,
  onSaveMinimumStay,
  onClose,
}) {
  const { t } = useLanguage();
  const [rateDraft, setRateDraft] = useState('');
  const [customPercent, setCustomPercent] = useState('');

  // Refill the field each time the sheet opens, and follow the live rate while
  // it is open: a save round-trips through the page, so nightRate is the truth.
  useEffect(() => {
    if (!open) return;
    setRateDraft(nightRate ? String(nightRate) : '');
  }, [open, nightRate]);

  // Escape is bound only while the sheet is mounted, so no listener lingers on
  // the calendar page after it closes.
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const rateValue = Number(rateDraft);
  const rateValid = rateDraft.trim() !== '' && Number.isFinite(rateValue) && rateValue > 0;

  const percentValue = Number(customPercent);
  const percentValid =
    customPercent.trim() !== '' && Number.isFinite(percentValue) && percentValue >= 1 && percentValue <= 90;

  const hasPromotion = typeof promotionPercent === 'number' && promotionPercent > 0;
  // A discount set outside the four presets still needs a chip, otherwise the
  // sheet would show no selection at all for the price guests are paying.
  const percentChips =
    hasPromotion && !PROMOTION_STEPS.includes(promotionPercent)
      ? [...PROMOTION_STEPS, promotionPercent]
      : PROMOTION_STEPS;

  // The page owns the request, the error toast and the refresh, so the promise
  // is deliberately not awaited here.
  function run(action, ...args) {
    action(...args);
  }

  function handleSaveRate() {
    run(onSaveRate, Number(rateDraft));
  }

  function handleApplyCustom() {
    run(onSavePromotion, Number(customPercent));
  }

  // A click on the card bubbles up to the backdrop, so only a click that lands
  // on the backdrop itself closes the sheet.
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-rate-dialog-title"
        className="fixed inset-x-0 bottom-0 max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-elevated shadow-lg sm:relative sm:inset-auto sm:mx-auto sm:my-auto sm:max-w-md sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id="day-rate-dialog-title" className="truncate text-base font-bold text-navy">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label={t('chrome.close')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-navy transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-5 px-5 py-4">
          <section className="space-y-2">
            <h3 className={SECTION_TITLE}>{t('chrome.nightlyRate')}</h3>
            <div className="flex items-center gap-2">
              <div className={INPUT_SHELL}>
                <span className="text-xs font-semibold text-muted">KES</span>
                <input
                  id="day-rate-amount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="100"
                  value={rateDraft}
                  onChange={(event) => setRateDraft(event.target.value)}
                  disabled={saving}
                  aria-label={t('chrome.nightlyRateAria')}
                  className={INPUT_FIELD}
                />
              </div>
              <button
                type="button"
                onClick={handleSaveRate}
                disabled={saving || !rateValid}
                className={PRIMARY_BUTTON}
              >
                {saving ? 'Saving...' : 'Set'}
              </button>
            </div>
            <p className={HINT}>Base rate is KES {formatKes(baseRate)}</p>
          </section>

          <section className="space-y-2">
            <h3 className={SECTION_TITLE}>{t('chrome.discount')}</h3>
            <div className="flex flex-wrap gap-2">
              {percentChips.map((percent) => (
                <button
                  key={percent}
                  type="button"
                  aria-pressed={hasPromotion && promotionPercent === percent}
                  onClick={() => run(onSavePromotion, percent)}
                  disabled={saving}
                  className={`${CHIP_BASE} ${hasPromotion && promotionPercent === percent ? CHIP_ACTIVE : CHIP_IDLE}`}
                >
                  {percent}% off
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className={INPUT_SHELL}>
                <input
                  id="day-rate-discount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="90"
                  step="1"
                  value={customPercent}
                  onChange={(event) => setCustomPercent(event.target.value)}
                  disabled={saving}
                  placeholder={t('chrome.custom')}
                  aria-label={t('chrome.customDiscountAria')}
                  className={INPUT_FIELD}
                />
                <span className="text-xs font-semibold text-muted">%</span>
              </div>
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={saving || !percentValid}
                className={PRIMARY_BUTTON}
              >
                {saving ? 'Saving...' : 'Apply'}
              </button>
            </div>
            {/* A discount is stored as the reduced price itself, so it cannot be
                lifted back off on its own: the original dated rate is gone once a
                percentage replaces it. The footer offers one reset instead of two
                that would do the same thing. */}
            <p className={HINT}>{t('chrome.lowerPriceHint')}</p>
          </section>

          <section className="space-y-2">
            <h3 className={SECTION_TITLE}>{t('chrome.minimumStay')}</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={minNights <= 1}
                onClick={() => run(onSaveMinimumStay, 1)}
                disabled={saving}
                className={`${CHIP_BASE} ${minNights <= 1 ? CHIP_ACTIVE : CHIP_IDLE}`}
              >
                No minimum
              </button>
              {MINIMUM_STAY_STEPS.map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={minNights === count}
                  onClick={() => run(onSaveMinimumStay, count)}
                  disabled={saving}
                  className={`${CHIP_BASE} ${minNights === count ? CHIP_ACTIVE : CHIP_IDLE}`}
                >
                  {t(count === 1 ? 'chrome.nightsCountOne' : 'chrome.nightsCountOther', { count })}
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          {hasDatedRate ? (
            <button type="button" onClick={() => run(onClearRate)} disabled={saving} className={TEXT_ACTION}>
              {t('chrome.removeCustomPrice')}
            </button>
          ) : <span />}
          <button type="button" onClick={onClose} disabled={saving} className={PRIMARY_BUTTON}>
            {saving ? t('chrome.saving') : t('chrome.done')}
          </button>
        </footer>
      </div>
    </div>
  );
}

DayRateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  baseRate: PropTypes.number.isRequired,
  nightRate: PropTypes.number.isRequired,
  hasDatedRate: PropTypes.bool.isRequired,
  // No default: null is a real state here and means "no discount on these
  // dates", which must stay distinguishable from an unset prop.
  promotionPercent: PropTypes.number,
  minNights: PropTypes.number.isRequired,
  saving: PropTypes.bool.isRequired,
  onSaveRate: PropTypes.func.isRequired,
  onClearRate: PropTypes.func.isRequired,
  onSavePromotion: PropTypes.func.isRequired,
  onSaveMinimumStay: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
