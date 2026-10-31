import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'flowbite-react';
import { BarChart3, Info, Table2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import apiClient from '../api/client.js';
import HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';
import SelectMenu from '../components/SelectMenu.jsx';
import EarningsSideNav from '../components/EarningsSideNav.jsx';
import EarningsChart from '../components/EarningsChart.jsx';
import EarningsMonthCard from '../components/EarningsMonthCard.jsx';
import EarningsPropertyList from '../components/EarningsPropertyList.jsx';

// The period only scopes the Reports pane (exports and the money breakdown).
// Everything else reads either the 12-month trend or the confirmed/pending split,
// which the API returns regardless of the window - so the page opens on all time
// and the Upcoming and Paid lists are complete the moment they are opened.
const PERIOD_OPTIONS = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

const VIEW_OPTIONS = [
  { value: 'monthly', label: 'Monthly view' },
  { value: 'quarterly', label: 'Quarterly view' },
];

// Eight months fills the plot without squeezing the labels on a phone. The API
// sends twelve; the extra four stay available to the quarterly view below.
const MONTHS_SHOWN = 8;
const QUARTERS_SHOWN = 4;

// Fixed three-letter labels rather than the API's own: en-GB spells September
// "Sept", which is wider than a month column on a phone and collided with the
// selected-month pill sitting beside it.
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

/**
 * Shown when some bookings never had their money split recorded.
 *
 * Those stays are left out of every total rather than counted as zero, which is
 * the same line the admin revenue report draws. Without this the page simply
 * reads "KES 0" and looks broken, when the truth is that the figure is unknown.
 */
function UnsettledNotice({ unsettled }) {
  if (!unsettled.bookings) return null;
  const count = unsettled.bookings;
  const singular = count === 1;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-300" strokeWidth={1.9} aria-hidden="true" />
      <p className="min-w-0 text-sm leading-relaxed text-charcoal">
        <strong className="font-semibold text-navy">
          {singular
            ? '1 earlier stay has no recorded host share.'
            : `${count} earlier stays have no recorded host share.`}
        </strong>{' '}
        {singular
          ? 'It was confirmed before the platform started recording what the host earns, so its'
          : 'They were confirmed before the platform started recording what the host earns, so their'}{' '}
        {formatMoney(unsettled.guestTotal)} of booking value is left out of these totals rather than counted as zero.
      </p>
    </div>
  );
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

function countLabel(count, word) {
  const value = Number(count) || 0;
  return `${value} ${word}${value === 1 ? '' : 's'}`;
}

// The API sends `paidNetEarnings` and `netEarnings` per month. A bar is the two
// together, so the pale cap is whatever has not been confirmed yet.
function monthBuckets(trend) {
  return trend.slice(-MONTHS_SHOWN).map((item) => {
    const month = Number(String(item.key || '').split('-')[1]);
    const paid = Math.max(item.paidNetEarnings || 0, 0);
    const total = Math.max(item.netEarnings || 0, 0);
    return {
      key: item.key,
      label: Number.isFinite(month) ? MONTH_SHORT[month] : item.label,
      // The card names the whole month; the axis only has room for 'Oct'.
      dateLabel: Number.isFinite(month)
        ? new Date(item.year, month, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })
        : item.label,
      paid,
      upcoming: Math.max(total - paid, 0),
      total,
      bookings: item.bookings || 0,
      paidBookings: item.paidBookings || 0,
    };
  });
}

function quarterBuckets(trend) {
  const groups = new Map();
  for (const item of trend) {
    const month = Number(String(item.key || '').split('-')[1]);
    if (!Number.isFinite(month)) continue;
    const quarter = Math.floor(month / 3) + 1;
    const key = `${item.year}-Q${quarter}`;
    const paid = Math.max(item.paidNetEarnings || 0, 0);
    const total = Math.max(item.netEarnings || 0, 0);
    const group = groups.get(key) || {
      key,
      label: `Q${quarter}`,
      dateLabel: `Q${quarter} ${item.year}`,
      paid: 0,
      upcoming: 0,
      total: 0,
      bookings: 0,
      paidBookings: 0,
    };
    group.paid += paid;
    group.total += total;
    group.upcoming += Math.max(total - paid, 0);
    group.bookings += item.bookings || 0;
    group.paidBookings += item.paidBookings || 0;
    groups.set(key, group);
  }
  return [...groups.values()].slice(-QUARTERS_SHOWN);
}

function PaneHeading({ title, description, children }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold tracking-tight text-navy">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function HostEarningsPage() {
  const [section, setSection] = useState('performance');
  const [view, setView] = useState('monthly');
  const [chartMode, setChartMode] = useState('chart');
  // An empty key means "the newest bucket". Storing the newest as state instead
  // would go stale the moment a month or a quarter rolled over.
  const [selectedKey, setSelectedKey] = useState('');
  const [period, setPeriod] = useState('all');
  const [reloadToken, setReloadToken] = useState(0);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ ...EMPTY_TOTALS });
  const [unsettled, setUnsettled] = useState({ bookings: 0, guestTotal: 0 });
  const [trend, setTrend] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const dates = useMemo(() => periodDates(period), [period]);
  const periodLabel = PERIOD_OPTIONS.find((option) => option.value === period)?.label || 'All time';

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
        setUnsettled(payload.unsettled || { bookings: 0, guestTotal: 0 });
      } catch (requestError) {
        if (requestError.name !== 'CanceledError' && requestError.code !== 'ERR_CANCELED') {
          setRows([]);
          setTotals({ ...EMPTY_TOTALS });
          setTrend([]);
          setUnsettled({ bookings: 0, guestTotal: 0 });
          setError('Could not load your earnings. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadEarnings();
    return () => controller.abort();
  }, [dates, reloadToken]);

  // A view change makes the old selection meaningless: October's key is not a
  // quarter key, so the card would fall back to the newest bucket and look stuck.
  useEffect(() => {
    setSelectedKey('');
  }, [view]);

  const buckets = useMemo(
    () => (view === 'quarterly' ? quarterBuckets(trend) : monthBuckets(trend)),
    [trend, view]
  );
  // The default period is the newest one that actually holds money, not simply
  // the newest month: opening on an empty current month while a bar sits two
  // columns to the left reads as "your earnings vanished".
  const activeBucket = buckets.find((bucket) => bucket.key === selectedKey)
    || [...buckets].reverse().find((bucket) => bucket.total > 0)
    || buckets[buckets.length - 1]
    || null;

  const confirmedHostNet = useMemo(
    () => rows.reduce((sum, row) => sum + (row.confirmedHostNet || 0), 0),
    [rows]
  );
  const processing = Math.max(totals.hostNet - confirmedHostNet, 0);
  const availablePayout = wallet?.balance ?? 0;

  // Paid is what the platform has confirmed; anything else still owed to the
  // host is upcoming. Both are the host's take-home, not the guest's total.
  const paidRows = rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      location: row.location,
      image: row.image,
      bookings: row.confirmedBookings || 0,
      amount: Math.max(row.confirmedHostNet || 0, 0),
    }))
    .filter((row) => row.amount > 0)
    .sort((left, right) => right.amount - left.amount);

  const upcomingRows = rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      location: row.location,
      image: row.image,
      bookings: Math.max((row.bookings || 0) - (row.confirmedBookings || 0), 0),
      amount: Math.max((row.hostNet || 0) - (row.confirmedHostNet || 0), 0),
    }))
    .filter((row) => row.amount > 0)
    .sort((left, right) => right.amount - left.amount);

  const earningRows = rows.filter((row) => row.bookings > 0 || row.earnings > 0 || row.hostNet > 0);
  const rangeLabel = reportRange(period, dates);

  const figures = activeBucket
    ? [
      { key: 'paid', label: 'Paid', value: activeBucket.paid, dot: 'solid' },
      { key: 'upcoming', label: 'Upcoming', value: activeBucket.upcoming, dot: 'hollow' },
      { key: 'total', label: 'Total (KES)', value: activeBucket.total, dot: 'none' },
    ]
    : [];

  const breakdown = activeBucket
    ? [
      { label: 'Paid stays', value: countLabel(activeBucket.paidBookings, 'stay') },
      {
        label: 'Upcoming stays',
        value: countLabel(Math.max(activeBucket.bookings - activeBucket.paidBookings, 0), 'stay'),
      },
      {
        label: 'Average per paid stay',
        value: activeBucket.paidBookings > 0
          ? formatMoney(activeBucket.paid / activeBucket.paidBookings)
          : 'No paid stays yet',
      },
    ]
    : [];

  // Period-scoped figures for the exports. Kept as its own list so the breakdown
  // in Reports explains the exports rather than the chart's month.
  const incomeBreakdown = [
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
      {/* The menu is its own column on a wide screen, so the earnings figures get
          the whole right-hand side instead of sharing a row with navigation. */}
      <div className="lg:border-r lg:border-border lg:pr-6">
        <EarningsSideNav activeKey={section} onSelect={setSection} />
      </div>

      <div className="min-w-0 lg:pl-8">
        {error && (
          <HostCard
            className="mb-4 border-dashed"
            eyebrow="Earnings unavailable"
            title="We could not load this period"
            description="Your figures are unchanged. Retry the request or pick another period."
          >
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted">{error}</p>
              <Button color="light" onClick={() => setReloadToken((current) => current + 1)}>Try again</Button>
            </div>
          </HostCard>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Loading earnings" aria-busy="true">
            {[0, 1, 2].map((key) => <HostCard key={key} className="h-24 animate-pulse" />)}
          </div>
        ) : !error && (
          <>
            <UnsettledNotice unsettled={unsettled} />
            {section === 'performance' && (
              <div className="flex flex-col gap-6">
                <PaneHeading
                  title="Performance"
                  description="What you have earned each period, split between money confirmed and money still pending."
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-navy">Summary</h3>
                    <SelectMenu
                      value={view}
                      onChange={setView}
                      options={VIEW_OPTIONS}
                      ariaLabel="Chart period"
                      sizing="sm"
                      shape="pill"
                      wrapperClassName="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2" role="group" aria-label="Chart or table">
                    {[['chart', 'Chart view', BarChart3], ['table', 'Table view', Table2]].map(([key, label, Icon]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setChartMode(key)}
                        aria-pressed={chartMode === key}
                        aria-label={label}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                          chartMode === key
                            ? 'border-transparent bg-surface text-navy'
                            : 'border-border text-muted hover:text-navy'
                        }`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>

                {chartMode === 'chart' ? (
                  <EarningsChart
                    buckets={buckets}
                    selectedKey={activeBucket?.key || ''}
                    onSelect={setSelectedKey}
                    emptyMessage={unsettled.bookings
                      ? 'No recorded host earnings to chart. The stays above predate earnings tracking, so their share is unknown rather than zero.'
                      : 'No income recorded in the last eight months, so there is no chart to draw yet.'}
                  />
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-border bg-elevated">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                          <th scope="col" className="px-4 py-3 text-left">Period</th>
                          <th scope="col" className="px-4 py-3 text-right">Paid</th>
                          <th scope="col" className="px-4 py-3 text-right">Upcoming</th>
                          <th scope="col" className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {buckets.map((bucket) => (
                          <tr key={bucket.key} className={bucket.key === activeBucket?.key ? 'bg-surface' : undefined}>
                            <th scope="row" className="px-4 py-3 text-left font-semibold text-navy">{bucket.dateLabel}</th>
                            <td className="px-4 py-3 text-right tabular-nums text-charcoal">{formatMoney(bucket.paid)}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-charcoal">{formatMoney(bucket.upcoming)}</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-navy">{formatMoney(bucket.total)}</td>
                          </tr>
                        ))}
                        {buckets.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                              No income recorded in the last eight months.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeBucket && (
                  <EarningsMonthCard
                    heading={activeBucket.dateLabel}
                    figures={figures}
                    breakdown={breakdown}
                  />
                )}
              </div>
            )}

            {section === 'upcoming' && (
              <div className="flex flex-col gap-6">
                <PaneHeading
                  title="Upcoming"
                  description="Money from stays that are booked but not yet recorded as earned."
                />
                <div className="overflow-hidden rounded-2xl border border-border bg-elevated">
                  <EarningsPropertyList
                    rows={upcomingRows}
                    amountLabel="Upcoming"
                    emptyTitle="Nothing upcoming"
                    emptyBody="When a guest books, the amount waiting to be confirmed appears here, property by property."
                    emptyAction={<Button as={Link} to="/host/reservations" color="light" className="mt-1 w-fit">View reservations</Button>}
                  />
                </div>
              </div>
            )}

            {section === 'paid' && (
              <div className="flex flex-col gap-6">
                <PaneHeading
                  title="Paid"
                  description="Confirmed earnings, property by property, all of which count towards your payouts."
                />
                <div className="overflow-hidden rounded-2xl border border-border bg-elevated">
                  <EarningsPropertyList
                    rows={paidRows}
                    amountLabel="Paid"
                    emptyTitle="Nothing paid yet"
                    emptyBody="Confirmed stays and their amounts land here once a guest has checked in."
                    emptyAction={<Button as={Link} to="/host/listings" color="light" className="mt-1 w-fit">View listings</Button>}
                  />
                </div>
              </div>
            )}

            {section === 'reports' && (
              <div className="flex flex-col gap-6">
                <PaneHeading
                  title="Reports"
                  description="Download the figures for a period, or check what was withheld."
                >
                  <SelectMenu
                    value={period}
                    onChange={setPeriod}
                    options={PERIOD_OPTIONS}
                    ariaLabel="Report period"
                    sizing="sm"
                    shape="pill"
                    wrapperClassName="w-40"
                  />
                </PaneHeading>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <HostCard>
                    <div>
                      <p className={HOST_EYEBROW}>Earnings report</p>
                      <strong className="mt-1 block text-xl font-bold leading-tight tabular-nums text-navy lg:text-2xl">{formatMoney(totals.hostNet)}</strong>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        Net earnings, gross rent, WHT, and property totals for {rangeLabel.toLowerCase()}.
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

                <HostCard
                  flush
                  title="Income breakdown"
                  description="How booking value and deductions add up to your earnings."
                  action={<span className="text-xs font-medium text-muted">{periodLabel}</span>}
                >
                  <dl className="divide-y divide-border">
                    {incomeBreakdown.map((item) => (
                      <div key={item.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-5">
                        <dt className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-navy">{item.label}</span>
                          <span className="block text-xs leading-relaxed text-muted">{item.note}</span>
                        </dt>
                        <dd className={`shrink-0 tabular-nums ${item.emphasis ? 'text-base font-bold' : 'text-sm font-semibold'} ${item.value < 0 ? 'text-red-700' : 'text-navy'}`}>
                          {item.value < 0 ? '-' : ''}{formatMoney(Math.abs(item.value))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </HostCard>

                <HostCard title="Payouts" description="Where the available balance is sent.">
                  <div className="rounded-xl bg-surface px-4 py-3">
                    <span className={HOST_EYEBROW}>Destination</span>
                    <strong className="mt-1 block truncate text-sm font-semibold text-navy">{destination?.label || 'Not configured'}</strong>
                    <small className="mt-1 block text-xs leading-relaxed text-muted">{destination?.maskedAccount || 'Add a payout destination in settings'}</small>
                  </div>
                  {wallet?.nextPayoutAt && (
                    <p className="text-sm text-muted">
                      Next scheduled payout: <strong className="font-semibold text-navy">{formatDate(wallet.nextPayoutAt)}</strong>
                    </p>
                  )}
                  <Button as={Link} to="/host/payouts" color="light" className="w-fit">View payout details</Button>
                </HostCard>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
