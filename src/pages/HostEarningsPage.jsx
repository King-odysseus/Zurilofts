import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Select, TabItem, Tabs } from 'flowbite-react';
import PropTypes from 'prop-types';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import apiClient from '../api/client.js';
import HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';

const PERIOD_OPTIONS = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

const EMPTY_TOTALS = {
  bookings: 0,
  confirmedBookings: 0,
  earnings: 0,
  confirmedEarnings: 0,
  grossRent: 0,
  cleaningFees: 0,
  serviceFees: 0,
  discounts: 0,
  hostNet: 0,
  wht: 0,
};

// One column template for the per-listing header row and every listing row.
// Declared once so the money columns cannot drift apart between the two.
const LISTING_GRID = 'md:grid-cols-[minmax(0,1fr)_4.5rem_7.5rem_7.5rem]';

function periodDates(period) {
  const now = new Date();
  const startOfDay = (value) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const endOfDay = (value) => {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
  };

  if (period === 'last-month') {
    return {
      from: startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (period === 'this-year') {
    return {
      from: startOfDay(new Date(now.getFullYear(), 0, 1)),
      to: endOfDay(now),
    };
  }
  if (period === 'all') return {};

  return {
    from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: endOfDay(now),
  };
}

function totalRows(rows) {
  return rows.reduce((acc, row) => {
    acc.bookings += row.bookings || 0;
    acc.confirmedBookings += row.confirmedBookings || 0;
    acc.earnings += row.earnings || 0;
    acc.confirmedEarnings += row.confirmedEarnings || 0;
    acc.grossRent += row.grossRent || 0;
    acc.cleaningFees += row.cleaningFees || 0;
    acc.serviceFees += row.serviceFees || 0;
    acc.discounts += row.discounts || 0;
    acc.hostNet += row.hostNet || 0;
    acc.wht += row.wht || 0;
    return acc;
  }, { ...EMPTY_TOTALS });
}

function formatMoney(value) {
  return `KES ${Math.round(value || 0).toLocaleString('en-KE')}`;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function reportRange(period, dates) {
  if (period === 'all') return 'All time';
  if (!dates.from) return PERIOD_OPTIONS.find((option) => option.value === period)?.label || '';
  return `${formatDate(dates.from)} - ${formatDate(dates.to)}`;
}

/**
 * One cell of the summary strip. The label sits above the figure so the three
 * figures share a baseline and stay aligned when the strip is stacked on a phone.
 * The hairlines come from the wrapping dl, so they reach the card edge.
 */
function SummaryCell({ label, value, note }) {
  return <div className="px-4 py-4 sm:px-5 sm:py-5">
    <dt className={HOST_EYEBROW}>{label}</dt>
    <dd className="mt-1">
      <span className="block text-xl font-bold leading-tight tabular-nums text-navy lg:text-2xl">{value}</span>
      <span className="mt-1 block text-xs leading-relaxed text-muted">{note}</span>
    </dd>
  </div>;
}

SummaryCell.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  note: PropTypes.string,
};

/**
 * A money or count column in the per-listing list. Below md the column label
 * travels with the figure, because the header row is hidden on phones.
 */
function ListingFigure({ label, value, emphasis = false }) {
  return <div className="min-w-0 md:text-right">
    <span className={`${HOST_EYEBROW} md:hidden`}>{label}</span>
    <strong className={`block text-xs tabular-nums text-navy md:text-sm ${emphasis ? 'font-bold' : 'font-semibold'}`}>{value}</strong>
  </div>;
}

ListingFigure.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  emphasis: PropTypes.bool,
};

export default function HostEarningsPage() {
  const [period, setPeriod] = useState('this-month');
  const [reloadToken, setReloadToken] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ ...EMPTY_TOTALS });
  const [trend, setTrend] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const dates = useMemo(() => periodDates(period), [period]);
  const periodLabel = PERIOD_OPTIONS.find((option) => option.value === period)?.label || 'This month';

  useEffect(() => {
    let active = true;

    async function loadPayoutSummary() {
      try {
        const response = await apiClient.get('/host/payouts');
        if (!active) return;
        setWallet(response.data.data?.wallet || null);
        setDestination(response.data.data?.destination || null);
      } catch {
        if (active) {
          setWallet(null);
          setDestination(null);
        }
      }
    }

    loadPayoutSummary();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    async function loadEarnings() {
      try {
        const params = {};
        if (dates.from) params.from = dates.from.toISOString();
        if (dates.to) params.to = dates.to.toISOString();
        const response = await apiClient.get('/bookings/host/earnings', { params, signal: controller.signal });
        const payload = response.data.data || {};
        const nextRows = payload.properties || [];
        setRows(nextRows);
        setTotals(payload.totals || totalRows(nextRows));
        setTrend(payload.monthlyTrend || []);
      } catch (requestError) {
        if (requestError.name !== 'CanceledError' && requestError.code !== 'ERR_CANCELED') {
          setRows([]);
          setTotals({ ...EMPTY_TOTALS });
          setTrend([]);
          setError('Could not load your earnings. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadEarnings();
    return () => controller.abort();
  }, [dates, reloadToken]);

  const confirmedHostNet = useMemo(
    () => rows.reduce((sum, row) => sum + (row.confirmedHostNet || 0), 0),
    [rows]
  );
  const processing = Math.max(totals.hostNet - confirmedHostNet, 0);
  const availablePayout = wallet?.balance ?? 0;
  const earningRows = rows.filter((row) => row.bookings > 0 || row.earnings > 0 || row.hostNet > 0);
  const trendRows = trend.slice(-6);
  const trendMax = Math.max(...trendRows.map((item) => item.earnings || 0), 1);
  // A row of zero-height bars looks like a rendering fault, so fall back to a
  // plain sentence when every month in the window is empty.
  const hasTrend = trendRows.some((item) => (item.earnings || 0) > 0);
  const latestTrend = trendRows[trendRows.length - 1]?.earnings || 0;
  const previousTrend = trendRows[trendRows.length - 2]?.earnings || 0;
  const trendChange = previousTrend > 0 ? Math.round(((latestTrend - previousTrend) / previousTrend) * 100) : null;
  const rangeLabel = reportRange(period, dates);

  // `emphasis` only lifts the closing row; the amounts themselves are untouched.
  const breakdown = [
    { label: 'Gross rent', value: totals.grossRent, note: 'Stay subtotal before deductions' },
    { label: 'Cleaning fees', value: totals.cleaningFees, note: 'Passed through on paid stays' },
    { label: 'Guest service fees', value: totals.serviceFees, note: 'Platform fee paid by guests' },
    { label: 'Discounts', value: -totals.discounts, note: 'Promotions applied to bookings' },
    { label: 'Host net earnings', value: totals.hostNet, note: 'After withholding tax' },
    { label: 'Withholding tax', value: -totals.wht, note: 'Remitted to KRA at 5%' },
    { label: 'Take-home', value: Math.max(totals.hostNet, 0), note: 'Recorded host earnings for payouts', emphasis: true },
  ];

  function exportCsv() {
    const lines = [
      'ZuriLofts Host Earnings',
      `Period,${rangeLabel}`,
      '',
      'Summary',
      `Net earnings,${totals.hostNet}`,
      `Processing,${processing}`,
      `Available payout,${availablePayout}`,
      '',
      'Property,Gross rent,Host net,WHT,Bookings',
      ...earningRows.map((row) => `${JSON.stringify(row.title)},${row.grossRent || 0},${row.hostNet || 0},${row.wht || 0},${row.bookings || 0}`),
    ];
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ZuriLofts_Earnings_${rangeLabel.replace(/\s/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const doc = new jsPDF({ orientation: 'landscape' });
    const margin = 14;
    doc.setFillColor(11, 47, 107);
    doc.rect(0, 0, doc.internal.pageSize.width, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ZuriLofts Host Earnings', margin, 17);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${rangeLabel}`, margin, 23);

    autoTable(doc, {
      startY: 36,
      head: [['Net earnings', 'Processing', 'Available payout']],
      body: [[formatMoney(totals.hostNet), formatMoney(processing), formatMoney(availablePayout)]],
      theme: 'grid',
      headStyles: { fillColor: [11, 47, 107], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 4 },
      margin: { left: margin, right: margin },
    });

    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY || 54) + 8,
      head: [['Property', 'Bookings', 'Gross rent', 'Host net', 'WHT']],
      body: earningRows.map((row) => [
        row.title,
        row.bookings || 0,
        formatMoney(row.grossRent),
        formatMoney(row.hostNet),
        formatMoney(row.wht),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [11, 47, 107], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8, cellPadding: 3 },
      margin: { left: margin, right: margin },
    });

    doc.save(`ZuriLofts_Earnings_${rangeLabel.replace(/\s/g, '_')}.pdf`);
  }

  return <div className="flex flex-col gap-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className={HOST_EYEBROW}>Host workspace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">Earnings</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">A clear view of stay income, pending amounts, and payouts.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* A Flowbite Select, not a Dropdown: the Dropdown trigger is styled by
            the shared theme and painted a navy block around this label. */}
        <div className="min-h-[44px]">
          <span className="sr-only" id="earnings-period-label">Period</span>
          <Select
            sizing="sm"
            aria-labelledby="earnings-period-label"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="h-11 w-full min-w-[9rem] rounded-full text-sm font-semibold sm:w-auto"
          >
            {PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </div>
        <Button as={Link} to="/host/payouts" color="light">Payout settings</Button>
      </div>
    </header>

    {/* The failure is a panel in the workspace rather than a banner above it,
        so an empty screen still says what it is and offers the retry. */}
    {error && <HostCard
      className="border-dashed"
      eyebrow="Earnings unavailable"
      title="We could not load this period"
      description="Your figures are unchanged. Retry the request or pick another period."
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted">{error}</p>
        <Button color="light" onClick={() => setReloadToken((current) => current + 1)}>Try again</Button>
      </div>
    </HostCard>}

    {loading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Loading earnings" aria-busy="true">
      {[0, 1, 2].map((key) => <HostCard key={key} className="h-24 animate-pulse" />)}
    </div> : !error && <>
      <Tabs
        aria-label="Earnings views"
        variant="pills"
        // Four pills wrap as three plus an orphan on a phone, so they become an
        // even 2x2 block there and a single row from sm up.
        className="[&_[role=tablist]]:!grid [&_[role=tablist]]:!w-full [&_[role=tablist]]:!grid-cols-2 [&_[role=tablist]]:!gap-2 sm:[&_[role=tablist]]:!flex sm:[&_[role=tablist]]:!w-auto"
        onActiveTabChange={(index) => setActiveTab(['overview', 'properties', 'breakdown', 'reports'][index])}
      >
      {/* TabItem owns which panel is visible through its `active` prop, so the
          panels are not gated a second time here. Two sources of truth could
          disagree and leave a clicked tab showing nothing. */}
      <TabItem title="Overview" active={activeTab === 'overview'}>
      <>
        <section aria-label="Earnings summary">
          {/* One strip, not three cards: the figures read as a single headline
              row and the hairlines keep the three columns aligned. */}
          <HostCard flush>
            <dl className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <SummaryCell label="Net earnings" value={formatMoney(totals.hostNet)} note="After withholding tax" />
              <SummaryCell label="Processing" value={formatMoney(processing)} note="From upcoming stays" />
              <SummaryCell label="Available payout" value={formatMoney(availablePayout)} note="Eligible for payout" />
            </dl>
          </HostCard>
        </section>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <HostCard
            className="lg:col-span-2"
            title="Stay income trend"
            description="Recorded earnings for the last six months."
            action={trendChange != null &&
              <span className={`text-xs font-semibold tabular-nums ${trendChange >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {trendChange >= 0 ? '+' : ''}{trendChange}% vs last month
              </span>}
          >
            {hasTrend ? <>
              {/* The bars carry no text for a screen reader, so the same numbers
                  are read out once as a sentence and the bars stay decorative. */}
              <p className="sr-only">
                Monthly earnings: {trendRows.map((item) => `${item.label} ${formatMoney(item.earnings)}`).join(', ')}.
              </p>
              <div className="flex items-end gap-2 sm:gap-3" aria-hidden="true">
                {trendRows.map((item) => <div key={item.key || item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end sm:h-40">
                    <i className="block w-full rounded-t-md bg-navy-bg" style={{ height: `${Math.max(((item.earnings || 0) / trendMax) * 100, 2)}%` }} />
                  </div>
                  <span className="w-full truncate text-center text-[11px] text-muted">{item.label}</span>
                </div>)}
              </div>
            </> : <p className="py-10 text-center text-sm text-muted">No income recorded in the last six months, so there is no trend to draw yet.</p>}
          </HostCard>

          <HostCard title="Payouts" description="Where the available balance is sent.">
            <div className="rounded-xl bg-surface px-4 py-3">
              <span className={HOST_EYEBROW}>Destination</span>
              <strong className="mt-1 block truncate text-sm font-semibold text-navy">{destination?.label || 'Not configured'}</strong>
              <small className="mt-1 block text-xs leading-relaxed text-muted">{destination?.maskedAccount || 'Add a payout destination in settings'}</small>
            </div>
            {wallet?.nextPayoutAt && <p className="text-sm text-muted">
              Next scheduled payout: <strong className="font-semibold text-navy">{formatDate(wallet.nextPayoutAt)}</strong>
            </p>}
            <p className="text-xs leading-relaxed text-muted">Available payout is separate from net earnings recorded for this period.</p>
            <Button as={Link} to="/host/payouts" color="light" className="w-fit">View payout details</Button>
          </HostCard>
        </div>
      </>

      </TabItem>
      <TabItem title="Properties" active={activeTab === 'properties'}>
      <HostCard
        flush
        title="Property earnings"
        description={earningRows.length > 0
          ? `${earningRows.length} ${earningRows.length === 1 ? 'property' : 'properties'} with bookings in this period.`
          : 'Nothing earned in this period yet.'}
        action={<span className="text-xs font-medium text-muted">{periodLabel}</span>}
      >
        {earningRows.length > 0 ? <>
          {/* Column headings only exist once the row is a real grid; on a phone
              each figure carries its own label instead. */}
          <div className={`hidden gap-x-4 border-b border-border px-4 py-2 md:grid md:px-5 ${LISTING_GRID}`} aria-hidden="true">
            <span className={HOST_EYEBROW}>Property</span>
            <span className={`${HOST_EYEBROW} text-right`}>Bookings</span>
            <span className={`${HOST_EYEBROW} text-right`}>Gross rent</span>
            <span className={`${HOST_EYEBROW} text-right`}>Host net</span>
          </div>

          <ul className="divide-y divide-border">
            {earningRows.map((row) => <li
              key={row.id}
              className={`grid grid-cols-3 items-center gap-x-3 gap-y-3 px-4 py-3.5 md:gap-x-4 md:px-5 ${LISTING_GRID}`}
            >
              <div className="col-span-3 flex min-w-0 items-center gap-3 md:col-span-1">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-surface">
                  {row.image
                    ? <img src={row.image} alt="" className="h-full w-full object-cover" />
                    : <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted">{row.title?.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div className="min-w-0">
                  <Link to={`/property/${row.id}`} className="block truncate text-sm font-semibold text-navy hover:underline">{row.title}</Link>
                  <span className="block truncate text-xs text-muted">{row.location || 'Nairobi'}</span>
                </div>
              </div>
              <ListingFigure label="Bookings" value={row.bookings || 0} />
              <ListingFigure label="Gross rent" value={formatMoney(row.grossRent)} />
              <ListingFigure label="Host net" value={formatMoney(row.hostNet)} emphasis />
            </li>)}
          </ul>
        </> : <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <strong className="text-sm font-semibold text-navy">No property earnings</strong>
          <p className="max-w-sm text-xs leading-relaxed text-muted">
            No bookings with income fall inside {periodLabel.toLowerCase()}. Pick another period to see earlier stays.
          </p>
          <Button as={Link} to="/host/listings" color="light" className="mt-1 w-fit">View listings</Button>
        </div>
      }
      </HostCard>

      </TabItem>
      <TabItem title="Breakdown" active={activeTab === 'breakdown'}>
      <HostCard
        flush
        title="Income breakdown"
        description="How booking value and deductions add up to your earnings."
        action={<span className="text-xs font-medium text-muted">{periodLabel}</span>}
      >
        <dl className="divide-y divide-border">
          {breakdown.map((item) => <div key={item.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-5">
            <dt className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-navy">{item.label}</span>
              <span className="block text-xs leading-relaxed text-muted">{item.note}</span>
            </dt>
            <dd className={`shrink-0 tabular-nums ${item.emphasis ? 'text-base font-bold' : 'text-sm font-semibold'} ${item.value < 0 ? 'text-red-700' : 'text-navy'}`}>
              {item.value < 0 ? '-' : ''}{formatMoney(Math.abs(item.value))}
            </dd>
          </div>)}
        </dl>
      </HostCard>

      </TabItem>
      <TabItem title="Reports" active={activeTab === 'reports'}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <HostCard>
          <div>
            <p className={HOST_EYEBROW}>Earnings report</p>
            <strong className="mt-1 block text-xl font-bold leading-tight tabular-nums text-navy lg:text-2xl">{formatMoney(totals.hostNet)}</strong>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Net earnings, gross rent, WHT, and property totals for {rangeLabel}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportCsv}>Download CSV</Button>
            <Button color="light" onClick={exportPdf}>Print PDF</Button>
          </div>
        </HostCard>

        <HostCard>
          <div>
            <p className={HOST_EYEBROW}>WHT certificate</p>
            <strong className="mt-1 block text-xl font-bold leading-tight tabular-nums text-navy lg:text-2xl">{formatMoney(totals.wht)}</strong>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Withholding tax held from this period. Monthly statements live in the payout workspace.
            </p>
          </div>
          <Button as={Link} to="/host/payouts" color="light" className="w-fit">Open WHT statement</Button>
        </HostCard>
      </div>

      </TabItem>
      </Tabs>
    </>}
  </div>;
}
