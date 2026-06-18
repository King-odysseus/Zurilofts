import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Dropdown from '../components/Dropdown.jsx';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getPeriodDates(period) {
  const now = new Date();
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

  switch (period) {
    case 'this-week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(now.setDate(diff));
      return { from: startOfDay(mon), to: endOfDay(new Date()) };
    }
    case 'this-month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(first), to: endOfDay(new Date()) };
    }
    case 'this-year': {
      const first = new Date(now.getFullYear(), 0, 1);
      return { from: startOfDay(first), to: endOfDay(new Date()) };
    }
    case 'last-week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const mon = new Date(now.setDate(diff));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: startOfDay(mon), to: endOfDay(sun) };
    }
    case 'last-month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: startOfDay(first), to: endOfDay(last) };
    }
    case 'last-year': {
      const first = new Date(now.getFullYear() - 1, 0, 1);
      const last = new Date(now.getFullYear() - 1, 11, 31);
      return { from: startOfDay(first), to: endOfDay(last) };
    }
    default:
      return {};
  }
}

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'this-year', label: 'This Year' },
  { value: 'last-week', label: 'Last Week' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'last-year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

const SORT_OPTIONS = [
  { value: 'earnings-desc', label: 'Earnings (High → Low)' },
  { value: 'earnings-asc', label: 'Earnings (Low → High)' },
  { value: 'bookings-desc', label: 'Bookings (High → Low)' },
  { value: 'bookings-asc', label: 'Bookings (Low → High)' },
  { value: 'name-asc', label: 'Property Name (A → Z)' },
  { value: 'name-desc', label: 'Property Name (Z → A)' },
];

function AdminEarnings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('earnings-desc');

  const dateRange = useMemo(() => {
    if (period === 'custom') {
      const from = customFrom ? new Date(customFrom) : undefined;
      const to = customTo ? new Date(customTo) : undefined;
      return { from, to };
    }
    return getPeriodDates(period);
  }, [period, customFrom, customTo]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = {};
        if (dateRange.from) params.from = dateRange.from.toISOString();
        if (dateRange.to) params.to = dateRange.to.toISOString();
        // Admins see all properties' earnings; hosts only their own.
        const res = await apiClient.get(isAdmin ? '/admin/analytics/properties' : '/bookings/host/earnings', { params });
        setRows(res.data.data?.properties || []);
      } catch (err) {
        console.error('AdminEarnings error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateRange]);

  const filteredRows = useMemo(() => {
    let data = [...rows];

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      switch (sortBy) {
        case 'earnings-desc': return b.earnings - a.earnings;
        case 'earnings-asc': return a.earnings - b.earnings;
        case 'bookings-desc': return b.bookings - a.bookings;
        case 'bookings-asc': return a.bookings - b.bookings;
        case 'name-asc': return a.title.localeCompare(b.title);
        case 'name-desc': return b.title.localeCompare(a.title);
        default: return 0;
      }
    });

    return data;
  }, [rows, search, sortBy]);

  const earningRows = useMemo(() => {
    return filteredRows.filter((r) => r.earnings > 0);
  }, [filteredRows]);

  const filteredTotals = useMemo(() => {
    return earningRows.reduce(
      (acc, r) => {
        acc.bookings += r.bookings;
        acc.confirmedBookings += r.confirmedBookings;
        acc.earnings += r.earnings;
        acc.confirmedEarnings += r.confirmedEarnings;
        acc.bed1Bookings += r.bed1Bookings;
        acc.bed1Earnings += r.bed1Earnings;
        acc.bed2Bookings += r.bed2Bookings;
        acc.bed2Earnings += r.bed2Earnings;
        return acc;
      },
      { bookings: 0, confirmedBookings: 0, earnings: 0, confirmedEarnings: 0, bed1Bookings: 0, bed1Earnings: 0, bed2Bookings: 0, bed2Earnings: 0 }
    );
  }, [earningRows]);

  const chartProperties = useMemo(() => {
    return [...earningRows].sort((a, b) => b.earnings - a.earnings);
  }, [earningRows]);

  const maxChartEarnings = useMemo(() => {
    return chartProperties.length > 0 ? Math.max(chartProperties[0].earnings, 1) : 1;
  }, [chartProperties]);

  const chartBookings = useMemo(() => {
    return [...earningRows].sort((a, b) => b.bookings - a.bookings);
  }, [earningRows]);

  // Derived analytics — computed from the filtered totals so they track the active period/search.
  const metrics = useMemo(() => {
    const t = filteredTotals;
    const avgBookingValue = t.bookings > 0 ? Math.round(t.earnings / t.bookings) : 0;
    const confirmationRate = t.bookings > 0 ? Math.round((t.confirmedBookings / t.bookings) * 100) : 0;
    const pendingBookings = Math.max(t.bookings - t.confirmedBookings, 0);
    const pendingEarnings = Math.max(t.earnings - t.confirmedEarnings, 0);
    const activeProperties = earningRows.length;
    const avgPerProperty = activeProperties > 0 ? Math.round(t.earnings / activeProperties) : 0;
    const bedTotal = t.bed1Earnings + t.bed2Earnings;
    const bed1Share = bedTotal > 0 ? Math.round((t.bed1Earnings / bedTotal) * 100) : 0;
    const bed2Share = bedTotal > 0 ? 100 - bed1Share : 0;
    return {
      avgBookingValue, confirmationRate, pendingBookings, pendingEarnings,
      activeProperties, avgPerProperty, bedTotal, bed1Share, bed2Share,
      topEarner: chartProperties[0] || null,
    };
  }, [filteredTotals, earningRows, chartProperties]);

  const today = formatDate(new Date());
  const rangeLabel = useMemo(() => {
    if (period === 'all') return 'All Time';
    if (period === 'custom') {
      if (!customFrom && !customTo) return 'Custom Range';
      const f = customFrom ? formatDate(customFrom) : 'Start';
      const t = customTo ? formatDate(customTo) : 'End';
      return `${f} – ${t}`;
    }
    const opt = PERIOD_OPTIONS.find((o) => o.value === period);
    return opt?.label || '';
  }, [period, customFrom, customTo]);

  function handleExportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    doc.setFillColor(38, 34, 98);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ZuriLofts Earnings Report', margin, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${today}  |  Period: ${rangeLabel}`, margin, 26);

    doc.setTextColor(38, 34, 98);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const summaryData = [
      ['Active Bookings (ex. cancelled)', String(filteredTotals.bookings.toLocaleString())],
      ['Confirmed Bookings', String(filteredTotals.confirmedBookings.toLocaleString())],
      ['Active Earnings (KES)', filteredTotals.earnings.toLocaleString()],
      ['Confirmed Earnings (KES)', filteredTotals.confirmedEarnings.toLocaleString()],
      ['1-Bed Bookings', String(filteredTotals.bed1Bookings.toLocaleString())],
      ['1-Bed Earnings (KES)', filteredTotals.bed1Earnings.toLocaleString()],
      ['2-Bed Bookings', String(filteredTotals.bed2Bookings.toLocaleString())],
      ['2-Bed Earnings (KES)', filteredTotals.bed2Earnings.toLocaleString()],
    ];

    autoTable(doc, {
      startY: 46,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [196, 154, 108], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [31, 41, 55] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      styles: { fontSize: 10 },
    });

    const tableHead = [['Property', 'Location', 'Active Booked', 'Confirmed', 'Active Earnings', '1-Bed Booked', '1-Bed Earnings', '2-Bed Booked', '2-Bed Earnings']];
    const tableBody = filteredRows.map((r) => [
      r.title,
      r.location,
      String(r.bookings),
      String(r.confirmedBookings),
      `KES ${r.earnings.toLocaleString()}`,
      String(r.bed1Bookings),
      `KES ${r.bed1Earnings.toLocaleString()}`,
      String(r.bed2Bookings),
      `KES ${r.bed2Earnings.toLocaleString()}`,
    ]);
    tableBody.push([
      'TOTAL', '',
      String(filteredTotals.bookings),
      String(filteredTotals.confirmedBookings),
      `KES ${filteredTotals.earnings.toLocaleString()}`,
      String(filteredTotals.bed1Bookings),
      `KES ${filteredTotals.bed1Earnings.toLocaleString()}`,
      String(filteredTotals.bed2Bookings),
      `KES ${filteredTotals.bed2Earnings.toLocaleString()}`,
    ]);

    const summaryEndY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 70;

    autoTable(doc, {
      startY: summaryEndY + 10,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [38, 34, 98], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [31, 41, 55] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      styles: { fontSize: 9, cellPadding: 3 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Page ${i} of ${pageCount}  |  ZuriLofts  |  ${today}`, margin, doc.internal.pageSize.height - 10);
    }

    doc.save(`ZuriLofts_Earnings_${today.replace(/\s/g, '_')}.pdf`);
  }

  function handleExportCSV() {
    let csv = '\uFEFF';
    csv += 'ZuriLofts Earnings Report\n';
    csv += `Generated: ${today}\n`;
    csv += `Period: ${rangeLabel}\n\n`;

    csv += 'Metric,Value\n';
    csv += `"Active Bookings (ex. cancelled)","${filteredTotals.bookings}"\n`;
    csv += `"Confirmed Bookings","${filteredTotals.confirmedBookings}"\n`;
    csv += `"Active Earnings (KES)","${filteredTotals.earnings}"\n`;
    csv += `"Confirmed Earnings (KES)","${filteredTotals.confirmedEarnings}"\n`;
    csv += `"1-Bed Bookings","${filteredTotals.bed1Bookings}"\n`;
    csv += `"1-Bed Earnings (KES)","${filteredTotals.bed1Earnings}"\n`;
    csv += `"2-Bed Bookings","${filteredTotals.bed2Bookings}"\n`;
    csv += `"2-Bed Earnings (KES)","${filteredTotals.bed2Earnings}"\n\n`;

    csv += 'Property,Location,Active Booked,Confirmed,Active Earnings,1-Bed Booked,1-Bed Earnings,2-Bed Booked,2-Bed Earnings\n';
    filteredRows.forEach((r) => {
      csv += `"${r.title}","${r.location}",${r.bookings},${r.confirmedBookings},${r.earnings},${r.bed1Bookings},${r.bed1Earnings},${r.bed2Bookings},${r.bed2Earnings}\n`;
    });
    csv += `"TOTAL","",${filteredTotals.bookings},${filteredTotals.confirmedBookings},${filteredTotals.earnings},${filteredTotals.bed1Bookings},${filteredTotals.bed1Earnings},${filteredTotals.bed2Bookings},${filteredTotals.bed2Earnings}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ZuriLofts_Earnings_${today.replace(/\s/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExport(option) {
    if (option === 'pdf') handleExportPDF();
    else if (option === 'csv') handleExportCSV();
  }

  const cards = [
    { label: 'Active Bookings', value: filteredTotals.bookings.toLocaleString(), color: 'bg-[#0B0B45]', sub: `${metrics.confirmationRate}% confirmed (ex. cancelled)` },
    { label: 'Confirmed Bookings', value: filteredTotals.confirmedBookings.toLocaleString(), color: 'bg-[#C49A6C]', sub: `${metrics.pendingBookings.toLocaleString()} pending confirmation` },
    { label: 'Active Revenue (KES)', value: filteredTotals.earnings.toLocaleString(), color: 'bg-green-600', sub: `KES ${metrics.pendingEarnings.toLocaleString()} still pending` },
    { label: 'Confirmed Revenue (KES)', value: filteredTotals.confirmedEarnings.toLocaleString(), color: 'bg-purple-600', sub: `KES ${metrics.avgBookingValue.toLocaleString()} avg / booking` },
  ];

  const insights = [
    { label: 'Avg Booking Value', value: `KES ${metrics.avgBookingValue.toLocaleString()}` },
    { label: 'Confirmation Rate', value: `${metrics.confirmationRate}%` },
    { label: 'Avg / Property', value: `KES ${metrics.avgPerProperty.toLocaleString()}`, hint: `${metrics.activeProperties} earning` },
    { label: 'Top Earner', value: metrics.topEarner ? metrics.topEarner.title : '—', hint: metrics.topEarner ? `KES ${metrics.topEarner.earnings.toLocaleString()}` : undefined },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B0B45] mb-1">Earnings</h1>
          <p className="text-sm text-[#6b7280]">
            Earnings from active bookings (pending + confirmed). Cancelled bookings are excluded.
          </p>
        </div>
        {!loading && rows.length > 0 && (
          <Dropdown
            value=""
            onChange={handleExport}
            options={[
              { value: 'pdf', label: 'Export as PDF' },
              { value: 'csv', label: 'Export as CSV' },
            ]}
            triggerClassName="px-5 py-2.5 rounded-xl border border-[#D9D9D9] bg-white text-[#1f2937] font-semibold text-sm whitespace-nowrap hover:border-[#C49A6C]"
            placeholder="Export Report"
            ariaLabel="Export earnings report"
            menuClassName="right-0 left-auto"
          />
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#D9D9D9] p-4 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-shrink-0">
            <label className="block text-xs font-semibold text-[#6b7280] mb-1.5 uppercase tracking-wider">Period</label>
            <Dropdown
              value={period}
              onChange={setPeriod}
              options={PERIOD_OPTIONS}
              triggerClassName="px-4 py-2.5 rounded-xl border border-[#D9D9D9] bg-white text-sm min-w-[160px] hover:border-[#C49A6C]"
              placeholder="Select period"
              ariaLabel="Select time period"
            />
          </div>

          {period === 'custom' && (
            <>
              <div className="flex-shrink-0">
                <label className="block text-xs font-semibold text-[#6b7280] mb-1.5 uppercase tracking-wider">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-[#D9D9D9] bg-white text-sm text-[#1f2937] focus:outline-none focus:border-[#C49A6C]"
                />
              </div>
              <div className="flex-shrink-0">
                <label className="block text-xs font-semibold text-[#6b7280] mb-1.5 uppercase tracking-wider">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-[#D9D9D9] bg-white text-sm text-[#1f2937] focus:outline-none focus:border-[#C49A6C]"
                />
              </div>
            </>
          )}

          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-[#6b7280] mb-1.5 uppercase tracking-wider">Search Property</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type property or location name..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D9D9D9] bg-white text-sm text-[#1f2937] focus:outline-none focus:border-[#C49A6C]"
              />
              <svg className="w-4 h-4 text-[#6b7280] absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#0B0B45]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex-shrink-0">
            <label className="block text-xs font-semibold text-[#6b7280] mb-1.5 uppercase tracking-wider">Sort By</label>
            <Dropdown
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
              triggerClassName="px-4 py-2.5 rounded-xl border border-[#D9D9D9] bg-white text-sm min-w-[200px] hover:border-[#C49A6C]"
              placeholder="Sort by"
              ariaLabel="Sort earnings table"
            />
          </div>
        </div>

        {period !== 'all' && (
          <div className="mt-3 pt-3 border-t border-[#D9D9D9]/50 flex items-center gap-2 text-sm text-[#6b7280]">
            <svg className="w-4 h-4 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Showing data for: <span className="font-semibold text-[#0B0B45]">{rangeLabel}</span></span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {cards.map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-[#D9D9D9]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#6b7280]">{label}</span>
              <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
            </div>
            <p className="text-2xl font-bold text-[#0B0B45]">{value}</p>
            {sub && <p className="text-xs text-[#6b7280] mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Insights strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {insights.map(({ label, value, hint }) => (
          <div key={label} className="bg-[#f8f9fa] rounded-xl px-4 py-3 border border-[#D9D9D9]/60">
            <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">{label}</p>
            <p className="text-base font-bold text-[#0B0B45] truncate" title={value}>{value}</p>
            {hint && <p className="text-xs text-[#C49A6C] font-medium mt-0.5">{hint}</p>}
          </div>
        ))}
      </div>

      {/* Charts */}
      {!loading && chartProperties.length > 0 && (
        <div className="space-y-4 mb-8">
          {/* Ranked earnings bars */}
          <div className="bg-white rounded-2xl border border-[#D9D9D9] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#0B0B45]">Top Properties by Active Earnings</h2>
              <span className="text-xs text-[#6b7280]">% of active earnings</span>
            </div>
            <div className="space-y-3">
              {chartProperties.slice(0, 8).map((p) => {
                const pct = (p.earnings / maxChartEarnings) * 100;
                const share = filteredTotals.earnings > 0 ? Math.round((p.earnings / filteredTotals.earnings) * 100) : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-[#1f2937] truncate pr-3" title={p.title}>{p.title}</span>
                      <span className="font-semibold text-[#0B0B45] whitespace-nowrap">
                        KES {p.earnings.toLocaleString()} <span className="text-[#6b7280] font-normal">· {share}%</span>
                      </span>
                    </div>
                    <div className="h-2.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C49A6C] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Mix: 1-Bed vs 2-Bed */}
            <div className="bg-white rounded-2xl border border-[#D9D9D9] p-5 shadow-sm">
              <h2 className="text-sm font-bold text-[#0B0B45] mb-2">Revenue Mix · 1-Bed vs 2-Bed</h2>
              {metrics.bedTotal > 0 ? (
                <div className="flex items-center gap-6">
                  <svg viewBox="0 0 200 200" className="w-44 h-44 flex-shrink-0 -rotate-90">
                    {(() => {
                      const r = 78, cx = 100, cy = 100, sw = 26;
                      const C = 2 * Math.PI * r;
                      const bed1Len = (filteredTotals.bed1Earnings / metrics.bedTotal) * C;
                      return (
                        <>
                          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0B0B45" strokeWidth={sw} />
                          <circle
                            cx={cx} cy={cy} r={r} fill="none" stroke="#C49A6C" strokeWidth={sw}
                            strokeDasharray={`${bed1Len} ${C}`} className="transition-all duration-500"
                          />
                        </>
                      );
                    })()}
                  </svg>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm bg-[#C49A6C]" />
                      <span className="text-[#6b7280]">1-Bed</span>
                      <span className="font-semibold text-[#0B0B45]">{metrics.bed1Share}%</span>
                      <span className="text-[#6b7280] text-xs">KES {filteredTotals.bed1Earnings.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm bg-[#0B0B45]" />
                      <span className="text-[#6b7280]">2-Bed</span>
                      <span className="font-semibold text-[#0B0B45]">{metrics.bed2Share}%</span>
                      <span className="text-[#6b7280] text-xs">KES {filteredTotals.bed2Earnings.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#6b7280] py-8 text-center">No bed-type breakdown for this period.</p>
              )}
            </div>

            {/* Bookings by Property donut */}
            <div className="bg-white rounded-2xl border border-[#D9D9D9] p-5 shadow-sm">
              <h2 className="text-sm font-bold text-[#0B0B45] mb-2">Bookings by Property</h2>
              <div className="flex items-center justify-center">
                <svg viewBox="0 0 360 240" className="w-full max-w-[360px]">
                  {(() => {
                    const cx = 105, cy = 120, r = 72;
                    const total = chartBookings.reduce((s, p) => s + p.bookings, 0);
                    const colors = ['#C49A6C', '#0B0B45', '#6b7280', '#b8895c', '#0B0B45', '#9ca3af'];
                    let angle = -Math.PI / 2;
                    const slices = chartBookings.map((p, i) => {
                      const sliceAngle = total > 0 ? (p.bookings / total) * 2 * Math.PI : 0;
                      const start = angle;
                      const end = angle + sliceAngle;
                      angle = end;
                      const x1 = cx + r * Math.cos(start);
                      const y1 = cy + r * Math.sin(start);
                      const x2 = cx + r * Math.cos(end);
                      const y2 = cy + r * Math.sin(end);
                      const largeArc = sliceAngle > Math.PI ? 1 : 0;
                      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                      const labelAngle = start + sliceAngle / 2;
                      const lr = r * 0.78;
                      const lx = cx + lr * Math.cos(labelAngle);
                      const ly = cy + lr * Math.sin(labelAngle);
                      return { ...p, path, color: colors[i % colors.length], lx, ly, sliceAngle };
                    });
                    return (
                      <>
                        {slices.map((s) => (
                          <path key={s.id} d={s.path} fill={s.color} stroke="white" strokeWidth="2" className="transition-opacity duration-300 hover:opacity-80" />
                        ))}
                        {/* Donut hole + center total */}
                        <circle cx={cx} cy={cy} r="38" fill="white" />
                        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="#0B0B45">{total}</text>
                        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#6b7280">bookings</text>
                        {slices.map((s) => (
                          s.sliceAngle > 0.25 && (
                            <text key={`l-${s.id}`} x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="600" fill="white">
                              {s.bookings}
                            </text>
                          )
                        ))}
                        {/* Legend */}
                        {slices.map((s, i) => (
                          <g key={`leg-${s.id}`} transform={`translate(215, ${24 + i * 22})`}>
                            <rect x="0" y="0" width="12" height="12" rx="2" fill={s.color} />
                            <text x="18" y="9" fontSize="10" fill="#4b5563">
                              {s.title.length > 16 ? s.title.slice(0, 16) + '…' : s.title} ({s.bookings})
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-[#D9D9D9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8f9fa] border-b border-[#D9D9D9]">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45] whitespace-nowrap">Property</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45] whitespace-nowrap">Location</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45] whitespace-nowrap">Active Booked</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45] whitespace-nowrap">Confirmed</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45] whitespace-nowrap">Active Earnings</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45] whitespace-nowrap">1-Bed Booked</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45] whitespace-nowrap">1-Bed Earnings</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45] whitespace-nowrap">2-Bed Booked</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45] whitespace-nowrap">2-Bed Earnings</th>
                </tr>
              </thead>
              <tbody>
                {earningRows.map((r) => (
                  <tr key={r.id} className="border-b border-[#D9D9D9]/50 hover:bg-[#f8f9fa]">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        {r.image ? (
                          <img src={r.image} alt={r.title} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#D9D9D9] flex-shrink-0" />
                        )}
                        <Link to={`/property/${r.id}`} className="font-semibold text-[#0B0B45] hover:text-[#C49A6C]">{r.title}</Link>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#6b7280]">{r.location}</td>
                    <td className="py-3 px-4 text-right font-semibold">{r.bookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{r.confirmedBookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-bold text-[#C49A6C]">KES {r.earnings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{r.bed1Bookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-[#6b7280]">KES {r.bed1Earnings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{r.bed2Bookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-[#6b7280]">KES {r.bed2Earnings.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              {earningRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#D9D9D9] bg-[#f8f9fa] font-bold text-[#0B0B45]">
                    <td className="py-3 px-4" colSpan={2}>Active (ex. cancelled)</td>
                    <td className="py-3 px-4 text-right">{filteredTotals.bookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{filteredTotals.confirmedBookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-[#C49A6C]">KES {filteredTotals.earnings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{filteredTotals.bed1Bookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">KES {filteredTotals.bed1Earnings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{filteredTotals.bed2Bookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">KES {filteredTotals.bed2Earnings.toLocaleString()}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {earningRows.length === 0 && (
            <div className="text-center py-12 text-[#6b7280]">No properties with earnings for the selected period.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminEarnings;
