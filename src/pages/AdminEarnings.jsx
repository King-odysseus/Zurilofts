import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client.js';
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
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({
    bookings: 0, confirmedBookings: 0, earnings: 0, confirmedEarnings: 0,
    bed1Bookings: 0, bed1Earnings: 0, bed2Bookings: 0, bed2Earnings: 0,
  });
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
        const res = await apiClient.get('/admin/analytics/properties', { params });
        setRows(res.data.data?.properties || []);
        setTotals(res.data.data?.totals || {
          bookings: 0, confirmedBookings: 0, earnings: 0, confirmedEarnings: 0,
          bed1Bookings: 0, bed1Earnings: 0, bed2Bookings: 0, bed2Earnings: 0,
        });
      } catch {
        // silent
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
      ['Total Bookings', String(filteredTotals.bookings.toLocaleString())],
      ['Confirmed Bookings', String(filteredTotals.confirmedBookings.toLocaleString())],
      ['Total Earnings (KES)', filteredTotals.earnings.toLocaleString()],
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

    const tableHead = [['Property', 'Location', 'Total Booked', 'Confirmed', 'Total Earnings', '1-Bed Booked', '1-Bed Earnings', '2-Bed Booked', '2-Bed Earnings']];
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
    csv += `"Total Bookings","${filteredTotals.bookings}"\n`;
    csv += `"Confirmed Bookings","${filteredTotals.confirmedBookings}"\n`;
    csv += `"Total Earnings (KES)","${filteredTotals.earnings}"\n`;
    csv += `"Confirmed Earnings (KES)","${filteredTotals.confirmedEarnings}"\n`;
    csv += `"1-Bed Bookings","${filteredTotals.bed1Bookings}"\n`;
    csv += `"1-Bed Earnings (KES)","${filteredTotals.bed1Earnings}"\n`;
    csv += `"2-Bed Bookings","${filteredTotals.bed2Bookings}"\n`;
    csv += `"2-Bed Earnings (KES)","${filteredTotals.bed2Earnings}"\n\n`;

    csv += 'Property,Location,Total Booked,Confirmed,Total Earnings,1-Bed Booked,1-Bed Earnings,2-Bed Booked,2-Bed Earnings\n';
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
    { label: 'Total Bookings', value: filteredTotals.bookings.toLocaleString(), color: 'bg-[#262262]' },
    { label: 'Confirmed Bookings', value: filteredTotals.confirmedBookings.toLocaleString(), color: 'bg-[#C49A6C]' },
    { label: 'Total Earnings (KES)', value: filteredTotals.earnings.toLocaleString(), color: 'bg-green-600' },
    { label: 'Confirmed Earnings (KES)', value: filteredTotals.confirmedEarnings.toLocaleString(), color: 'bg-purple-600' },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#262262] mb-1">Earnings</h1>
          <p className="text-sm text-[#6b7280]">
            Bookings and recorded earnings per property. Earnings include pending and confirmed bookings; cancelled bookings are excluded.
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
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#262262]">
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
            <span>Showing data for: <span className="font-semibold text-[#262262]">{rangeLabel}</span></span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-[#D9D9D9]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#6b7280]">{label}</span>
              <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
            </div>
            <p className="text-2xl font-bold text-[#262262]">{value}</p>
          </div>
        ))}
      </div>

      {/* SVG Bar Chart */}
      {!loading && chartProperties.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#D9D9D9] p-5 mb-8 shadow-sm">
          <h2 className="text-base font-bold text-[#262262] mb-3">Earnings by Property</h2>
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${Math.max(480, chartProperties.length * 56 + 72)} 200`}
              className="w-full min-w-[480px]"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Background grid lines */}
              {[0, 1, 2, 3, 4].map((i) => {
                const y = 155 - i * 30;
                return (
                  <g key={i}>
                    <line x1="48" y1={y} x2={chartProperties.length * 56 + 12} y2={y} stroke="#f0f0f5" strokeWidth="1" />
                    <text x="44" y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
                      {Math.round((maxChartEarnings * i) / 4) >= 1000
                        ? `KES ${(Math.round((maxChartEarnings * i) / 4) / 1000).toFixed(0)}k`
                        : `KES ${Math.round((maxChartEarnings * i) / 4)}`}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {chartProperties.map((p, i) => {
                const barHeight = (p.earnings / maxChartEarnings) * 120;
                const x = 56 + i * 56;
                const y = 155 - barHeight;
                return (
                  <g key={p.id}>
                    <rect
                      x={x}
                      y={y}
                      width="36"
                      height={barHeight}
                      rx="3"
                      fill="#C49A6C"
                      className="transition-all duration-500 hover:fill-[#b8895c]"
                    />
                    {/* Value label */}
                    <text x={x + 18} y={y - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill="#262262">
                      {(p.earnings / 1000).toFixed(0)}k
                    </text>
                    {/* Property name */}
                    <text x={x + 18} y="172" textAnchor="middle" fontSize="9" fill="#4b5563">
                      {p.title.length > 8 ? p.title.slice(0, 8) + '…' : p.title}
                    </text>
                  </g>
                );
              })}

              {/* X axis line */}
              <line x1="48" y1="155" x2={chartProperties.length * 56 + 12} y2="155" stroke="#D9D9D9" strokeWidth="1" />
            </svg>
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
                  <th className="text-left py-3 px-4 font-semibold text-[#262262] whitespace-nowrap">Property</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#262262] whitespace-nowrap">Location</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262] whitespace-nowrap">Total Booked</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262] whitespace-nowrap">Confirmed</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262] whitespace-nowrap">Total Earnings</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262] whitespace-nowrap">1-Bed Booked</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262] whitespace-nowrap">1-Bed Earnings</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262] whitespace-nowrap">2-Bed Booked</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262] whitespace-nowrap">2-Bed Earnings</th>
                </tr>
              </thead>
              <tbody>
                {earningRows.map((r) => (
                  <tr key={r.id} className="border-b border-[#D9D9D9]/50 hover:bg-[#f8f9fa]">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        {r.image ? (
                          <img src={r.image} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#D9D9D9] flex-shrink-0" />
                        )}
                        <Link to={`/property/${r.id}`} className="font-semibold text-[#262262] hover:text-[#C49A6C]">{r.title}</Link>
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
                  <tr className="border-t-2 border-[#D9D9D9] bg-[#f8f9fa] font-bold text-[#262262]">
                    <td className="py-3 px-4" colSpan={2}>Total</td>
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
