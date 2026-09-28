import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dropdown as FlowbiteDropdown,
  DropdownItem,
  Select,
  TextInput,
} from 'flowbite-react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import apiClient from '../api/client.js';

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'this-week', label: 'This week' },
  { value: 'this-month', label: 'This month' },
  { value: 'this-year', label: 'This year' },
  { value: 'last-week', label: 'Last week' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-year', label: 'Last year' },
  { value: 'custom', label: 'Custom range' },
];

const SORT_OPTIONS = [
  { value: 'earnings-desc', label: 'Earnings: high to low' },
  { value: 'earnings-asc', label: 'Earnings: low to high' },
  { value: 'bookings-desc', label: 'Bookings: high to low' },
  { value: 'bookings-asc', label: 'Bookings: low to high' },
  { value: 'name-asc', label: 'Property: A to Z' },
  { value: 'name-desc', label: 'Property: Z to A' },
];

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatKes(value) {
  return `KES ${safeNumber(value).toLocaleString('en-KE')}`;
}

function formatDate(value) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getPeriodDates(period) {
  const now = new Date();
  const startOfDay = (date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  };
  const endOfDay = (date) => {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  };

  if (period === 'this-week') {
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    return { from: startOfDay(monday), to: endOfDay(now) };
  }
  if (period === 'this-month') {
    return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) };
  }
  if (period === 'this-year') {
    return { from: startOfDay(new Date(now.getFullYear(), 0, 1)), to: endOfDay(now) };
  }
  if (period === 'last-week') {
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day - 6);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: startOfDay(monday), to: endOfDay(sunday) };
  }
  if (period === 'last-month') {
    return {
      from: startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (period === 'last-year') {
    return {
      from: startOfDay(new Date(now.getFullYear() - 1, 0, 1)),
      to: endOfDay(new Date(now.getFullYear() - 1, 11, 31)),
    };
  }
  return {};
}

function emptyTotals() {
  return {
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
    bed1Bookings: 0,
    bed1Earnings: 0,
    bed2Bookings: 0,
    bed2Earnings: 0,
  };
}

function sumTotals(rows) {
  return rows.reduce((totals, row) => {
    totals.bookings += safeNumber(row.bookings);
    totals.confirmedBookings += safeNumber(row.confirmedBookings);
    totals.earnings += safeNumber(row.earnings);
    totals.confirmedEarnings += safeNumber(row.confirmedEarnings);
    totals.grossRent += safeNumber(row.grossRent);
    totals.cleaningFees += safeNumber(row.cleaningFees);
    totals.serviceFees += safeNumber(row.serviceFees);
    totals.discounts += safeNumber(row.discounts);
    totals.hostNet += safeNumber(row.hostNet);
    totals.wht += safeNumber(row.wht);
    totals.bed1Bookings += safeNumber(row.bed1Bookings);
    totals.bed1Earnings += safeNumber(row.bed1Earnings);
    totals.bed2Bookings += safeNumber(row.bed2Bookings);
    totals.bed2Earnings += safeNumber(row.bed2Earnings);
    return totals;
  }, emptyTotals());
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function AdminEarningsPage() {
  const [rows, setRows] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('earnings-desc');

  const dateRange = useMemo(() => {
    if (period !== 'custom') return getPeriodDates(period);
    return {
      from: customFrom ? new Date(`${customFrom}T00:00:00`) : undefined,
      to: customTo ? new Date(`${customTo}T23:59:59`) : undefined,
    };
  }, [period, customFrom, customTo]);

  useEffect(() => {
    let active = true;
    const params = {};
    if (dateRange.from) params.from = dateRange.from.toISOString();
    if (dateRange.to) params.to = dateRange.to.toISOString();

    setLoading(true);
    setError('');
    apiClient.get('/admin/analytics/properties', { params })
      .then((response) => {
        if (!active) return;
        const data = response.data.data || {};
        setRows(data.properties || []);
        setHosts(data.hosts || []);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.response?.data?.error || 'Earnings could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dateRange]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const data = rows.filter((row) => {
      if (!query) return true;
      return `${row.title || ''} ${row.location || ''}`.toLowerCase().includes(query);
    });

    return data.sort((left, right) => {
      if (sortBy === 'earnings-desc') return safeNumber(right.earnings) - safeNumber(left.earnings);
      if (sortBy === 'earnings-asc') return safeNumber(left.earnings) - safeNumber(right.earnings);
      if (sortBy === 'bookings-desc') return safeNumber(right.bookings) - safeNumber(left.bookings);
      if (sortBy === 'bookings-asc') return safeNumber(left.bookings) - safeNumber(right.bookings);
      if (sortBy === 'name-desc') return String(right.title || '').localeCompare(String(left.title || ''));
      return String(left.title || '').localeCompare(String(right.title || ''));
    });
  }, [rows, search, sortBy]);

  const earningRows = useMemo(
    () => visibleRows.filter((row) => safeNumber(row.earnings) > 0 || safeNumber(row.bookings) > 0),
    [visibleRows],
  );
  const totals = useMemo(() => sumTotals(earningRows), [earningRows]);
  const maxEarnings = Math.max(...earningRows.map((row) => safeNumber(row.earnings)), 1);
  const topEarner = [...earningRows].sort((left, right) => safeNumber(right.earnings) - safeNumber(left.earnings))[0] || null;
  const activeProperties = earningRows.length;
  const averageBooking = totals.bookings > 0 ? Math.round(totals.earnings / totals.bookings) : 0;
  const confirmationRate = totals.bookings > 0 ? Math.round((totals.confirmedBookings / totals.bookings) * 100) : 0;
  const serviceFeePct = totals.grossRent > 0 ? Math.round((totals.serviceFees / totals.grossRent) * 100) : 0;
  const hostNetPct = totals.grossRent > 0 ? Math.round((totals.hostNet / totals.grossRent) * 100) : 0;
  const bedTotal = totals.bed1Earnings + totals.bed2Earnings;
  const bed1Share = bedTotal > 0 ? Math.round((totals.bed1Earnings / bedTotal) * 100) : 0;
  const bed2Share = bedTotal > 0 ? 100 - bed1Share : 0;

  const rangeLabel = useMemo(() => {
    if (period === 'all') return 'All time';
    if (period === 'custom') return `${customFrom ? formatDate(customFrom) : 'Start'} to ${customTo ? formatDate(customTo) : 'End'}`;
    return PERIOD_OPTIONS.find((option) => option.value === period)?.label || 'Selected period';
  }, [period, customFrom, customTo]);

  const kpis = [
    { label: 'GROSS BOOKING VALUE', value: formatKes(totals.grossRent), note: `${activeProperties} earning properties` },
    { label: 'HOST NET REVENUE', value: formatKes(totals.hostNet), note: `${hostNetPct}% of gross rent` },
    { label: 'SERVICE FEES', value: formatKes(totals.serviceFees), note: `${serviceFeePct}% of gross rent` },
    { label: 'WHT 5%', value: formatKes(totals.wht), note: 'Remitted to KRA' },
  ];

  const feeRows = [
    { label: 'Gross rent', value: formatKes(totals.grossRent) },
    { label: 'Service fees', value: `-${formatKes(totals.serviceFees)}` },
    { label: 'Discounts', value: `-${formatKes(totals.discounts)}` },
    { label: 'Host net', value: formatKes(totals.hostNet), strong: true },
    { label: 'WHT 5%', value: `-${formatKes(totals.wht)}` },
    { label: 'Take-home', value: formatKes(Math.max(0, totals.hostNet - totals.wht)), strong: true },
  ];

  function handleExportCsv() {
    const header = ['Property', 'Location', 'Active bookings', 'Gross rent', 'Service fees', 'Host net', 'WHT', 'Total'];
    const body = visibleRows.map((row) => [
      row.title || 'Untitled property',
      row.location || '',
      safeNumber(row.bookings),
      safeNumber(row.grossRent),
      safeNumber(row.serviceFees),
      safeNumber(row.hostNet),
      safeNumber(row.wht),
      safeNumber(row.earnings),
    ]);
    const csv = [header, ...body].map((line) => line.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ZuriLofts_earnings_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18);
    doc.setTextColor(11, 31, 66);
    doc.text('ZuriLofts platform earnings', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Period: ${rangeLabel} | Generated: ${formatDate(new Date())}`, 14, 26);
    autoTable(doc, {
      startY: 34,
      head: [['Property', 'Location', 'Bookings', 'Gross rent', 'Service fees', 'Host net', 'WHT', 'Total']],
      body: visibleRows.map((row) => [
        row.title || 'Untitled property',
        row.location || '',
        safeNumber(row.bookings).toLocaleString(),
        formatKes(row.grossRent),
        formatKes(row.serviceFees),
        formatKes(row.hostNet),
        formatKes(row.wht),
        formatKes(row.earnings),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [11, 31, 66], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [31, 41, 55] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8, cellPadding: 2 },
    });
    doc.save(`ZuriLofts_earnings_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="op-admin-overview op-admin-earnings" data-openpencil-frame="0:7570">
      <div className="op-admin-heading op-admin-finance-heading">
        <div>
          <p className="op-admin-eyebrow">ZURILOFTS · ADMIN · INSIGHT</p>
          <h1>Earnings</h1>
          <p>Revenue, host net, withholding tax, and property performance across the platform.</p>
        </div>
        {!loading && rows.length > 0 && (
          <div className="op-admin-finance-export">
            <FlowbiteDropdown inline label="Export report">
              <DropdownItem onClick={handleExportPdf}>Export PDF</DropdownItem>
              <DropdownItem onClick={handleExportCsv}>Export CSV</DropdownItem>
            </FlowbiteDropdown>
          </div>
        )}
      </div>

      <div className="op-admin-metrics op-admin-finance-metrics">
        {kpis.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </article>
        ))}
      </div>

      <section className="op-admin-finance-toolbar" aria-label="Earnings filters">
        <label className="op-admin-finance-field">
          <span>Period</span>
          <Select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Select earning period">
            {PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </label>
        {period === 'custom' && (
          <>
            <label className="op-admin-finance-field">
              <span>From</span>
              <TextInput type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} aria-label="Custom range start" />
            </label>
            <label className="op-admin-finance-field">
              <span>To</span>
              <TextInput type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} aria-label="Custom range end" />
            </label>
          </>
        )}
        <label className="op-admin-finance-field op-admin-finance-search">
          <span>Property</span>
          <TextInput
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search property or location"
            aria-label="Search earnings by property or location"
          />
        </label>
        <label className="op-admin-finance-field">
          <span>Sort by</span>
          <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort earnings">
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </label>
      </section>

      {error && <div className="op-admin-error" role="alert">{error}</div>}

      {loading ? (
        <div className="op-admin-finance-loading">
          <span className="op-admin-booking-spinner" aria-hidden="true" />
          <strong>Loading performance</strong>
          <p>Fetching revenue and property performance.</p>
        </div>
      ) : (
        <>
          <div className="op-admin-finance-grid">
            <section className="op-admin-finance-panel">
              <div className="op-admin-finance-panel-head">
                <div>
                  <h2>Revenue by property</h2>
                  <p>{rangeLabel} against the strongest performing stay.</p>
                </div>
                <span>{earningRows.length} active</span>
              </div>
              {earningRows.length === 0 ? (
                <div className="op-admin-finance-empty">No property earnings match the current view.</div>
              ) : (
                <div className="op-admin-finance-bars">
                  {earningRows.slice(0, 7).map((row) => {
                    const share = totals.earnings > 0 ? Math.round((safeNumber(row.earnings) / totals.earnings) * 100) : 0;
                    return (
                      <div className="op-admin-finance-bar-row" key={row.id || row.title}>
                        <div>
                          <strong>{row.title || 'Untitled property'}</strong>
                          <span>{row.location || 'Location not set'}</span>
                        </div>
                        <div className="op-admin-finance-bar-track" aria-hidden="true">
                          <span style={{ width: `${Math.max(3, Math.round((safeNumber(row.earnings) / maxEarnings) * 100))}%` }} />
                        </div>
                        <p>{formatKes(row.earnings)} <small>{share}%</small></p>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="op-admin-finance-insights">
                <span className="is-success">{topEarner ? `Top property: ${topEarner.title || 'Untitled property'}` : 'No top property yet'}</span>
                <span className="is-warning">{totals.bookings - totals.confirmedBookings} bookings still pending confirmation</span>
              </div>
            </section>

            <aside className="op-admin-finance-panel">
              <div className="op-admin-finance-panel-head">
                <div>
                  <h2>Fee breakdown</h2>
                  <p>Revenue and deductions for the current view.</p>
                </div>
              </div>
              <div className="op-admin-finance-summary">
                {feeRows.map((item) => (
                  <p key={item.label} className={item.strong ? 'is-strong' : ''}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </p>
                ))}
              </div>
              <div className="op-admin-finance-note">
                <span>AVERAGE BOOKING</span>
                <strong>{formatKes(averageBooking)}</strong>
                <small>{confirmationRate}% confirmed | {bed1Share}% 1-bed | {bed2Share}% 2-bed</small>
              </div>
            </aside>
          </div>

          <section className="op-admin-finance-board">
            <div className="op-admin-finance-board-head">
              <div>
                <h2>Property performance</h2>
                <p>Gross rent, platform fees, host net, and WHT by stay.</p>
              </div>
              <span>{visibleRows.length} properties</span>
            </div>
            <div className="op-admin-finance-scroll">
              <div className="op-admin-finance-table op-admin-earnings-columns" role="table" aria-label="Property earnings">
                <div className="op-admin-finance-columns" role="row">
                  <span role="columnheader">PROPERTY</span>
                  <span role="columnheader">BOOKINGS</span>
                  <span role="columnheader">GROSS RENT</span>
                  <span role="columnheader">SERVICE FEES</span>
                  <span role="columnheader">HOST NET</span>
                  <span role="columnheader">WHT</span>
                  <span role="columnheader">TOTAL</span>
                </div>
                {visibleRows.length === 0 ? (
                  <div className="op-admin-finance-empty" role="row">No property performance is available for this view.</div>
                ) : visibleRows.map((row) => (
                  <div className="op-admin-finance-row" role="row" key={row.id || row.title}>
                    <div className="op-admin-finance-cell" role="cell">
                      <small>Property</small>
                      <Link to={`/property/${row.id}`}>{row.title || 'Untitled property'}</Link>
                      <span>{row.location || 'Location not set'}</span>
                    </div>
                    <div className="op-admin-finance-cell" role="cell">
                      <small>Bookings</small>
                      <strong>{safeNumber(row.bookings).toLocaleString()}</strong>
                    </div>
                    <div className="op-admin-finance-cell" role="cell">
                      <small>Gross rent</small>
                      <strong>{formatKes(row.grossRent)}</strong>
                    </div>
                    <div className="op-admin-finance-cell" role="cell">
                      <small>Service fees</small>
                      <strong className="is-negative">{formatKes(row.serviceFees)}</strong>
                    </div>
                    <div className="op-admin-finance-cell" role="cell">
                      <small>Host net</small>
                      <strong className="is-positive">{formatKes(row.hostNet)}</strong>
                    </div>
                    <div className="op-admin-finance-cell" role="cell">
                      <small>WHT</small>
                      <strong>{formatKes(row.wht)}</strong>
                    </div>
                    <div className="op-admin-finance-cell" role="cell">
                      <small>Total</small>
                      <strong>{formatKes(row.earnings)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {hosts.length > 0 && (
            <section className="op-admin-finance-board op-admin-finance-hosts">
              <div className="op-admin-finance-board-head">
                <div>
                  <h2>Top hosts</h2>
                  <p>Host net and withholding across the highest-performing accounts.</p>
                </div>
                <span>{hosts.length} hosts</span>
              </div>
              <div className="op-admin-finance-summary op-admin-finance-host-list">
                {hosts.slice(0, 8).map((host, index) => (
                  <p key={host.hostId || host.email || host.name}>
                    <span><strong>{index + 1}. {host.name || 'Host'}</strong><small>{host.email || ''}</small></span>
                    <strong>{formatKes(host.hostNet)}</strong>
                  </p>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default AdminEarningsPage;
