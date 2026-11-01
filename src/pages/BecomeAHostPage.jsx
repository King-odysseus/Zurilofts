import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Label, TextInput } from 'flowbite-react';
import apiClient from '../api/client.js';
import Spinner from '../components/Spinner.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

// Published by GET /api/public/fees so the calculator can never quote a rate the
// booking flow does not charge. Percentages arrive as percentages (10 = 10%).

const money = (value) =>
  `KES ${Math.round(Number.isFinite(value) ? value : 0).toLocaleString('en-KE')}`;

/** One row of the result table. */
function ResultRow({ label, value, hint, emphasis }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <div className="min-w-0">
        <dt className={`text-sm ${emphasis ? 'font-semibold text-navy' : 'text-muted'}`}>{label}</dt>
        {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      </div>
      <dd className={`shrink-0 tabular-nums ${emphasis ? 'text-lg font-semibold text-navy' : 'text-sm font-medium text-navy'}`}>
        {value}
      </dd>
    </div>
  );
}

ResultRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  hint: PropTypes.string,
  emphasis: PropTypes.bool,
};

/**
 * The take-home maths, mirroring server/src/utils/hostEarnings.ts: commission and
 * withholding tax apply to the accommodation subtotal only, and the cleaning fee
 * is the guest's to pay unless the host has opted to absorb it.
 *
 * Every figure here is a whole KES per month amount.
 */
function calculate({ nightlyPrice, nights, currentPlatformPercent, fees }) {
  const gross = nightlyPrice * nights;
  const commission = gross * (fees.commissionPercent / 100);
  const withholding = gross * (fees.withholdingTaxPercent / 100);
  const zuriNet = gross - commission - withholding;

  // The comparison keeps the same withholding tax so the two columns differ only
  // by commission, which is the only thing ZuriLofts actually controls.
  const theirCommission = gross * (currentPlatformPercent / 100);
  const theirNet = gross - theirCommission - withholding;

  return {
    gross,
    commission,
    withholding,
    zuriNet,
    theirCommission,
    theirNet,
    difference: zuriNet - theirNet,
    guestPays: gross * (1 + fees.guestServiceFeePercent / 100),
  };
}

export default function BecomeAHostPage() {
  const { t } = useLanguage();
  const [fees, setFees] = useState(null);
  const [error, setError] = useState('');
  const [nightlyPrice, setNightlyPrice] = useState(6500);
  const [nights, setNights] = useState(20);
  const [currentPlatformPercent, setCurrentPlatformPercent] = useState(15);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get('/public/fees')
      .then((res) => {
        if (!cancelled) setFees(res.data?.data ?? null);
      })
      .catch(() => {
        // Without the real schedule the calculator would quote invented numbers,
        // so it stays hidden and the page falls back to "see what you'd earn".
        if (!cancelled) setError(t('discovery.hostFeeError'));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const result = useMemo(
    () => (fees ? calculate({ nightlyPrice, nights, currentPlatformPercent, fees }) : null),
    [fees, nightlyPrice, nights, currentPlatformPercent]
  );

  return (
    <div className="bg-canvas">
      {/* Hero */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700 dark:text-primary-300">
            {t('discovery.hostEyebrow')}
          </p>
          <h1 className="mt-3 max-w-3xl font-montserrat text-3xl font-bold leading-tight text-navy sm:text-4xl lg:text-5xl">
            {t('discovery.hostTitle')}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">
            {t('discovery.hostBody')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {/* Explicit brand classes rather than the Button component: its dark
                override paints the fill navy, which hides the label. */}
            <Link
              to="/register?role=HOST"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#143A80] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0B2A5E]"
            >
              {t('discovery.hostStart')}
            </Link>
            <Link
              to="/host/application"
              className="rounded-lg border border-line px-5 py-3 text-sm font-semibold text-navy hover:border-primary-500"
            >
              {t('discovery.hostAlreadyApplied')}
            </Link>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="rounded-xl bg-elevated p-5 shadow-sm sm:p-6">
            <h2 className="font-montserrat text-xl font-bold text-navy">{t('discovery.calcTitle')}</h2>
            <p className="mt-2 text-sm text-muted">{t('discovery.calcHint')}</p>

            <div className="mt-6 space-y-5">
              <div>
                <Label htmlFor="nightly-price" className="text-navy">{t('discovery.calcNightlyPrice')}</Label>
                <TextInput
                  id="nightly-price"
                  type="number"
                  min={500}
                  step={100}
                  value={nightlyPrice}
                  onChange={(e) => setNightlyPrice(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="nights" className="text-navy">{t('discovery.calcNights')}</Label>
                <TextInput
                  id="nights"
                  type="number"
                  min={0}
                  max={31}
                  value={nights}
                  onChange={(e) => setNights(Math.min(31, Math.max(0, Number(e.target.value) || 0)))}
                  className="mt-1"
                />
                <p className="mt-2 text-xs text-muted">{t('discovery.calcNightsHint')}</p>
              </div>
              <div>
                <Label htmlFor="other-platform" className="text-navy">
                  {t('discovery.calcOtherPercent')}
                </Label>
                <TextInput
                  id="other-platform"
                  type="number"
                  min={0}
                  max={100}
                  value={currentPlatformPercent}
                  onChange={(e) =>
                    setCurrentPlatformPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                  }
                  className="mt-1"
                />
                {/* Left to the host rather than guessed: quoting a rival's rate
                    we have not verified would be misleading. */}
                <p className="mt-2 text-xs text-muted">
                  {t('discovery.calcOtherHint')}
                </p>
              </div>
            </div>

            {fees && (
              <dl className="mt-6 space-y-2.5 border-t border-line pt-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('discovery.feeCommission')}</dt>
                  <dd className="font-medium text-navy">{fees.commissionPercent}%</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('discovery.feeWithholding')}</dt>
                  <dd className="font-medium text-navy">{fees.withholdingTaxPercent}%</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('discovery.feeGuestService')}</dt>
                  <dd className="font-medium text-navy">{fees.guestServiceFeePercent}%</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('discovery.feePayoutReleased')}</dt>
                  <dd className="font-medium text-navy">
                    {fees.fundsHoldHours === 0
                      ? t('discovery.feeAtCheckIn')
                      : t('discovery.feeHoursAfterCheckIn', { hours: fees.fundsHoldHours })}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('discovery.feePromoCodes')}</dt>
                  <dd className="text-right font-medium text-navy">
                    {fees.promoFunding === 'platform'
                      ? t('discovery.feePromoPlatform')
                      : t('discovery.feePromoHost')}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          <div className="rounded-xl bg-elevated p-5 shadow-sm sm:p-6">
            <h2 className="font-montserrat text-xl font-bold text-navy">{t('discovery.resultTitle')}</h2>

            {error && (
              <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </p>
            )}

            {!fees && !error && (
              <div className="mt-8 flex items-center gap-3 text-sm text-muted">
                <Spinner />
                {t('discovery.resultLoading')}
              </div>
            )}

            {result && (
              <>
                <dl className="mt-4">
                  <ResultRow label={t('discovery.rowRevenue')} value={money(result.gross)} />
                  <ResultRow
                    label={t('discovery.feeCommission')}
                    value={`- ${money(result.commission)}`}
                    hint={t('discovery.rowCommissionHint', { percent: fees.commissionPercent })}
                  />
                  <ResultRow
                    label={t('discovery.feeWithholding')}
                    value={`- ${money(result.withholding)}`}
                    hint={t('discovery.rowWithholdingHint', { percent: fees.withholdingTaxPercent })}
                  />
                  <ResultRow label={t('discovery.rowTakeHome')} value={money(result.zuriNet)} emphasis />
                </dl>

                <div className="mt-6 rounded-lg border border-line bg-surface p-4">
                  <h3 className="text-sm font-semibold text-navy">
                    {t('discovery.againstTitle', { percent: currentPlatformPercent })}
                  </h3>
                  <dl className="mt-2">
                    <ResultRow label={t('discovery.rowTheirCommission')} value={`- ${money(result.theirCommission)}`} />
                    <ResultRow label={t('discovery.rowTakeHomeThere')} value={money(result.theirNet)} />
                  </dl>
                  <p className="mt-3 text-sm text-navy">
                    {result.difference >= 0 ? (
                      <>
                        {t('discovery.diffIs')} <strong>{money(result.difference)}</strong>{' '}
                        {t('discovery.diffMoreAfter')}
                      </>
                    ) : (
                      <>
                        {t('discovery.diffIs')} <strong>{money(Math.abs(result.difference))}</strong>{' '}
                        {t('discovery.diffLessAfter')}
                      </>
                    )}
                  </p>
                </div>

                <p className="mt-5 text-xs text-muted">
                  {/* With the guest fee at zero the sentence has to say the price
                      IS the price; "0% fee is added" reads like a mistake. */}
                  {fees.guestServiceFeePercent > 0 ? (
                    <>
                      {t('discovery.guestPaysWithFee', { amount: money(result.guestPays), percent: fees.guestServiceFeePercent })}
                    </>
                  ) : (
                    <>
                      {t('discovery.guestPaysNoFee', { amount: money(result.guestPays) })}
                    </>
                  )}{' '}
                  {fees.payCleaningFee
                    ? t('discovery.cleaningToHost', { amount: money(fees.cleaningFee) })
                    : t('discovery.cleaningToPlatform', { amount: money(fees.cleaningFee) })}{' '}
                  {t('discovery.estimateNote')}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Founding hosts */}
        {fees && fees.foundingPlaceLimit > 0 && (
          <div className="mt-6 rounded-xl border border-primary-500 bg-primary-50 p-5 dark:bg-primary/15 sm:p-6">
            <h2 className="font-montserrat text-lg font-bold text-navy">
              {t('discovery.foundingTitle', { founding: fees.foundingCommissionPercent, commission: fees.commissionPercent })}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-navy">
              {t('discovery.foundingBody', { limit: fees.foundingPlaceLimit })}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
