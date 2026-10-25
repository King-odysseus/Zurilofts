import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Dropdown, DropdownItem, TabItem, Tabs } from 'flowbite-react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import apiClient from '../api/client.js';

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

// Tone -> classes for the income-breakdown cards. Kept as a lookup so the
// neutral/positive/deduction variants stay readable in the JSX below.
const BREAKDOWN_TONE = {
  neutral: { card: 'border-border bg-white', value: 'text-navy' },
  positive: { card: 'border-primary-200 bg-primary-50', value: 'text-navy' },
  deduction: { card: 'border-red-200 bg-red-50', value: 'text-red-700' },
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

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function reportRange(period, dates) {
  if (period === 'all') return 'All time';
  if (!dates.from) return PERIOD_OPTIONS.find((option) => option.value === period)?.label || '';
  return `${formatDate(dates.from)} - ${formatDate(dates.to)}`;
}

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
    document.title = 'Earnings | ZuriLofts Host';
  }, []);

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
  const latestTrend = trendRows[trendRows.length - 1]?.earnings || 0;
  const previousTrend = trendRows[trendRows.length - 2]?.earnings || 0;
  const trendChange = previousTrend > 0 ? Math.round(((latestTrend - previousTrend) / previousTrend) * 100) : null;
  const rangeLabel = reportRange(period, dates);

  const breakdown = [
    { label: 'Gross rent', value: totals.grossRent, note: 'Stay subtotal before deductions', tone: 'neutral' },
    { label: 'Cleaning fees', value: totals.cleaningFees, note: 'Passed through on paid stays', tone: 'neutral' },
    { label: 'Guest service fees', value: totals.serviceFees, note: 'Platform fee paid by guests', tone: 'neutral' },
    { label: 'Discounts', value: -totals.discounts, note: 'Promotions applied to bookings', tone: 'deduction' },
    { label: 'Host net earnings', value: totals.hostNet, note: 'After withholding tax', tone: 'positive' },
    { label: 'Withholding tax', value: -totals.wht, note: 'Remitted to KRA at 5%', tone: 'deduction' },
    { label: 'Take-home', value: Math.max(totals.hostNet, 0), note: 'Recorded host earnings for payouts', tone: 'positive' },
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
    doc.setFillColor(11, 11, 69);
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
      headStyles: { fillColor: [196, 154, 108], textColor: [255, 255, 255] },
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
      headStyles: { fillColor: [11, 11, 69], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8, cellPadding: 3 },
      margin: { left: margin, right: margin },
    });

    doc.save(`ZuriLofts_Earnings_${rangeLabel.replace(/\s/g, '_')}.pdf`);
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Earnings</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">A clear view of stay income, pending amounts, and payouts.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Dropdown
          placement="bottom-end"
          dismissOnClick
          label={<span className="inline-flex min-h-[40px] items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface">{periodLabel}</span>}
        >
          {PERIOD_OPTIONS.map((option) => <DropdownItem key={option.value} onClick={() => setPeriod(option.value)}>{option.label}</DropdownItem>)}
        </Dropdown>
        <Link to="/host/payouts" className="text-sm font-medium text-primary-600 hover:underline">Payout settings</Link>
      </div>
    </header>


    {error && <Alert color="failure">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1">{error}</p>
        <Button size="xs" color="light" onClick={() => setReloadToken((current) => current + 1)}>Try again</Button>
      </div>
    </Alert>}

    {loading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Loading earnings">
      <span className="h-24 animate-pulse rounded-xl border border-border bg-surface" />
      <span className="h-24 animate-pulse rounded-xl border border-border bg-surface" />
      <span className="h-24 animate-pulse rounded-xl border border-border bg-surface" />
    </div> : !error && <>
      <Tabs
        aria-label="Earnings views"
        variant="pills"
        onActiveTabChange={(index) => setActiveTab(['overview', 'properties', 'breakdown', 'reports'][index])}
      >
      <TabItem title="Overview" active={activeTab === 'overview'}>
      {activeTab === 'overview' && <>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">NET EARNINGS</span>
            <strong className="mt-1 block text-2xl font-bold text-navy tabular-nums">{formatMoney(totals.hostNet)}</strong>
            <small className="mt-1 block text-xs text-muted">After withholding tax</small>
          </article>
          <article className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">PROCESSING</span>
            <strong className="mt-1 block text-2xl font-bold text-navy tabular-nums">{formatMoney(processing)}</strong>
            <small className="mt-1 block text-xs text-muted">From upcoming stays</small>
          </article>
          <article className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">AVAILABLE PAYOUT</span>
            <strong className="mt-1 block text-2xl font-bold text-navy tabular-nums">{formatMoney(availablePayout)}</strong>
            <small className="mt-1 block text-xs text-muted">Eligible for payout</small>
          </article>
        </section>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-border bg-white p-5 shadow-sm lg:col-span-2">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-navy">Stay income trend</h2>
              {trendChange != null && <span className={`text-xs font-semibold ${trendChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>{trendChange >= 0 ? '+' : ''}{trendChange}% vs previous month</span>}
            </header>
            {trendRows.length > 0 ? <div className="mt-5 flex items-end gap-2 sm:gap-3">
              {trendRows.map((item) => <div key={item.key || item.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end">
                  <i className="block w-full rounded-t-md bg-primary" style={{ height: `${Math.max(((item.earnings || 0) / trendMax) * 100, 7)}%` }} />
                </div>
                <span className="w-full truncate text-center text-[11px] text-muted">{item.label}</span>
              </div>)}
            </div> : <p className="mt-5 text-sm text-muted">No income trend for this period.</p>}
          </section>

          <aside className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-navy">Payouts</h2>
            <div className="mt-4 rounded-lg bg-surface px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Destination</span>
              <strong className="mt-1 block text-sm font-semibold text-navy">{destination?.label || 'Not configured'}</strong>
              <small className="mt-1 block text-xs text-muted">{destination?.maskedAccount || 'Add a payout destination in settings'}</small>
            </div>
            {wallet?.nextPayoutAt && <p className="mt-4 text-sm text-muted">Next scheduled payout: <strong className="font-semibold text-navy">{formatDate(wallet.nextPayoutAt)}</strong></p>}
            <p className="mt-3 text-xs leading-relaxed text-muted">Available payout is separate from net earnings recorded for this period.</p>
            <Link to="/host/payouts" className="mt-4 inline-flex text-sm font-medium text-primary-600 hover:underline">View payout details</Link>
          </aside>
        </div>
      </>}

      </TabItem>
      <TabItem title="Properties" active={activeTab === 'properties'}>
      {activeTab === 'properties' && <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-navy">Property earnings</h2><p className="mt-1 text-xs text-muted">{earningRows.length} properties with bookings in this period.</p></div><span className="text-xs font-medium text-muted">{periodLabel}</span></header>
        {earningRows.length > 0 ? <div className="mt-4 divide-y divide-border">
          {earningRows.map((row) => <article key={row.id} className="flex flex-wrap items-center gap-4 py-4">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface">
              {row.image ? <img src={row.image} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted">{row.title?.slice(0, 2).toUpperCase()}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <Link to={`/property/${row.id}`} className="text-sm font-semibold text-navy hover:underline">{row.title}</Link>
              <span className="block text-xs text-muted">{row.location || 'Nairobi'}</span>
            </div>
            <div className="text-right"><small className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Bookings</small><strong className="mt-1 block text-sm font-semibold text-navy tabular-nums">{row.bookings || 0}</strong></div>
            <div className="text-right"><small className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Gross rent</small><strong className="mt-1 block text-sm font-semibold text-navy tabular-nums">{formatMoney(row.grossRent)}</strong></div>
            <div className="text-right"><small className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Host net</small><strong className="mt-1 block text-sm font-bold text-navy tabular-nums">{formatMoney(row.hostNet)}</strong></div>
          </article>)}
        </div> : <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-white px-5 py-12 text-center"><strong className="text-sm font-semibold text-navy">No property earnings</strong><p className="text-xs text-muted">There are no bookings with income in this period.</p></div>}
      </section>}

      </TabItem>
      <TabItem title="Breakdown" active={activeTab === 'breakdown'}>
      {activeTab === 'breakdown' && <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-navy">Income breakdown</h2><p className="mt-1 text-xs text-muted">How booking value and deductions contribute to your earnings.</p></div><span className="text-xs font-medium text-muted">{periodLabel}</span></header>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {breakdown.map((item) => {
            const tone = BREAKDOWN_TONE[item.tone] || BREAKDOWN_TONE.neutral;
            return <article key={item.label} className={`rounded-lg border px-4 py-3 ${tone.card}`}>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{item.label}</span>
              <strong className={`mt-1 block text-xl font-bold tabular-nums ${tone.value}`}>{item.value < 0 ? '-' : ''}{formatMoney(Math.abs(item.value))}</strong>
              <small className="mt-1 block text-xs text-muted">{item.note}</small>
            </article>;
          })}
        </div>
      </section>}

      </TabItem>
      <TabItem title="Reports" active={activeTab === 'reports'}>
      {activeTab === 'reports' && <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-navy">Reports</h2><p className="mt-1 text-xs text-muted">Export a property-level earnings summary for {rangeLabel}.</p></div><span className="text-xs font-medium text-muted">{earningRows.length} properties</span></header>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <article className="rounded-lg border border-border bg-surface p-5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">EARNINGS REPORT</span>
            <strong className="mt-1 block text-xl font-bold text-navy tabular-nums">{formatMoney(totals.hostNet)}</strong>
            <p className="mt-2 text-xs leading-relaxed text-muted">Net earnings, gross rent, WHT, and property totals for the selected period.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button color="light" onClick={exportCsv}>Download CSV</Button>
              <Button onClick={exportPdf}>Print PDF</Button>
            </div>
          </article>
          <article className="rounded-lg border border-border bg-surface p-5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">WHT CERTIFICATE</span>
            <strong className="mt-1 block text-xl font-bold text-navy tabular-nums">{formatMoney(totals.wht)}</strong>
            <p className="mt-2 text-xs leading-relaxed text-muted">Use the payout workspace to view or print withholding tax statements by month.</p>
            <Link to="/host/payouts" className="mt-4 inline-flex text-sm font-medium text-primary-600 hover:underline">Open WHT statement</Link>
          </article>
        </div>
      </section>}
      </TabItem>
      </Tabs>
    </>}
  </div>;
}
