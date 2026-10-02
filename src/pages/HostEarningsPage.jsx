import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Dropdown, DropdownItem } from 'flowbite-react';
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

const DROPDOWN_THEME = {
  inlineWrapper: 'op-host-earnings-period',
  floating: {
    style: {
      auto: 'border-0 bg-white text-[#0B1F42] shadow-[0_14px_34px_rgba(15,23,42,0.16)]',
    },
  },
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

  return <div className="op-host-earnings">
    <header className="op-host-earnings-heading">
      <div>
        <h1>Earnings</h1>
        <p>A clear view of stay income, pending amounts, and payouts.</p>
      </div>
      <div className="op-host-earnings-controls">
        <Dropdown
          label={periodLabel}
          theme={DROPDOWN_THEME}
          placement="bottom-end"
          dismissOnClick
        >
          {PERIOD_OPTIONS.map((option) => <DropdownItem key={option.value} onClick={() => setPeriod(option.value)}>{option.label}</DropdownItem>)}
        </Dropdown>
        <Link to="/host/payouts">Payout settings</Link>
      </div>
    </header>

    <nav className="op-host-earnings-tabs" aria-label="Earnings views">
      {[
        ['overview', 'Overview'],
        ['properties', 'Properties'],
        ['breakdown', 'Breakdown'],
        ['reports', 'Reports'],
      ].map(([key, label]) => <button
        key={key}
        type="button"
        className={activeTab === key ? 'is-active' : ''}
        aria-current={activeTab === key ? 'page' : undefined}
        onClick={() => setActiveTab(key)}
      >{label}</button>)}
    </nav>

    {error && <div className="op-host-earnings-error"><p>{error}</p><button type="button" onClick={() => setReloadToken((current) => current + 1)}>Try again</button></div>}

    {loading ? <div className="op-host-earnings-loading" aria-label="Loading earnings"><span /><span /><span /></div> : !error && <>
      {activeTab === 'overview' && <>
        <section className="op-host-earnings-metrics">
          <article className="is-net">
            <span>NET EARNINGS</span>
            <strong>{formatMoney(totals.hostNet)}</strong>
            <small>After withholding tax</small>
          </article>
          <article className="is-processing">
            <span>PROCESSING</span>
            <strong>{formatMoney(processing)}</strong>
            <small>From upcoming stays</small>
          </article>
          <article className="is-available">
            <span>AVAILABLE PAYOUT</span>
            <strong>{formatMoney(availablePayout)}</strong>
            <small>Eligible for payout</small>
          </article>
        </section>

        <div className="op-host-earnings-lower">
          <section className="op-host-earnings-trend">
            <header>
              <h2>Stay income trend</h2>
              {trendChange != null && <span className={trendChange >= 0 ? 'is-up' : 'is-down'}>{trendChange >= 0 ? '+' : ''}{trendChange}% vs previous month</span>}
            </header>
            <div className="op-host-earnings-chart">
              {trendRows.length > 0 ? trendRows.map((item) => <div key={item.key || item.label} className="op-host-earnings-bar">
                <i style={{ height: `${Math.max(((item.earnings || 0) / trendMax) * 100, 7)}%` }} />
                <span>{item.label}</span>
              </div>) : <p>No income trend for this period.</p>}
            </div>
          </section>

          <aside className="op-host-earnings-payouts">
            <h2>Payouts</h2>
            <div className="op-host-earnings-destination">
              <span>Destination</span>
              <strong>{destination?.label || 'Not configured'}</strong>
              <small>{destination?.maskedAccount || 'Add a payout destination in settings'}</small>
            </div>
            {wallet?.nextPayoutAt && <p className="op-host-earnings-next">Next scheduled payout: <strong>{formatDate(wallet.nextPayoutAt)}</strong></p>}
            <p className="op-host-earnings-note">Available payout is separate from net earnings recorded for this period.</p>
            <Link to="/host/payouts">View payout details</Link>
          </aside>
        </div>
      </>}

      {activeTab === 'properties' && <section className="op-host-earnings-panel">
        <header><div><h2>Property earnings</h2><p>{earningRows.length} properties with bookings in this period.</p></div><span>{periodLabel}</span></header>
        {earningRows.length > 0 ? <div className="op-host-earnings-property-list">
          {earningRows.map((row) => <article key={row.id}>
            <div className="op-host-earnings-property-cover">
              {row.image ? <img src={row.image} alt="" /> : <span>{row.title?.slice(0, 2).toUpperCase()}</span>}
            </div>
            <div className="op-host-earnings-property-copy">
              <Link to={`/property/${row.id}`}>{row.title}</Link>
              <span>{row.location || 'Nairobi'}</span>
            </div>
            <div className="op-host-earnings-property-stat"><small>Bookings</small><strong>{row.bookings || 0}</strong></div>
            <div className="op-host-earnings-property-stat"><small>Gross rent</small><strong>{formatMoney(row.grossRent)}</strong></div>
            <div className="op-host-earnings-property-stat is-net"><small>Host net</small><strong>{formatMoney(row.hostNet)}</strong></div>
          </article>)}
        </div> : <div className="op-host-earnings-empty"><strong>No property earnings</strong><p>There are no bookings with income in this period.</p></div>}
      </section>}

      {activeTab === 'breakdown' && <section className="op-host-earnings-panel">
        <header><div><h2>Income breakdown</h2><p>How booking value and deductions contribute to your earnings.</p></div><span>{periodLabel}</span></header>
        <div className="op-host-earnings-breakdown">
          {breakdown.map((item) => <article key={item.label} className={`is-${item.tone}`}>
            <span>{item.label}</span>
            <strong>{item.value < 0 ? '-' : ''}{formatMoney(Math.abs(item.value))}</strong>
            <small>{item.note}</small>
          </article>)}
        </div>
      </section>}

      {activeTab === 'reports' && <section className="op-host-earnings-panel op-host-earnings-reports">
        <header><div><h2>Reports</h2><p>Export a property-level earnings summary for {rangeLabel}.</p></div><span>{earningRows.length} properties</span></header>
        <div className="op-host-earnings-report-grid">
          <article>
            <span>EARNINGS REPORT</span>
            <strong>{formatMoney(totals.hostNet)}</strong>
            <p>Net earnings, gross rent, WHT, and property totals for the selected period.</p>
            <div>
              <Button color="light" onClick={exportCsv}>Download CSV</Button>
              <Button className="op-host-bronze-button" onClick={exportPdf}>Print PDF</Button>
            </div>
          </article>
          <article>
            <span>WHT CERTIFICATE</span>
            <strong>{formatMoney(totals.wht)}</strong>
            <p>Use the payout workspace to view or print withholding tax statements by month.</p>
            <Link to="/host/payouts">Open WHT statement</Link>
          </article>
        </div>
      </section>}
    </>}
  </div>;
}
