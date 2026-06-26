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
  const isHost = user?.role === 'HOST';
  const [rows, setRows] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('earnings-desc');
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'mine' — admin-only toggle

  const effectiveEndpoint = useMemo(() => {
    if (!isAdmin) return '/bookings/host/earnings';
    return viewMode === 'mine' ? '/bookings/host/earnings' : '/admin/analytics/properties';
  }, [isAdmin, viewMode]);

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
        const res = await apiClient.get(effectiveEndpoint, { params });
        setRows(res.data.data?.properties || []);
        setHosts(res.data.data?.hosts || []);
      } catch (err) {
        console.error('AdminEarnings error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateRange, effectiveEndpoint]);

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
        // Fee breakdown
        acc.grossRent += (r.grossRent || 0);
        acc.cleaningFees += (r.cleaningFees || 0);
        acc.serviceFees += (r.serviceFees || 0);
        acc.discounts += (r.discounts || 0);
        acc.hostNet += (r.hostNet || 0);
        acc.wht += (r.wht || 0);
        return acc;
      },
      { bookings: 0, confirmedBookings: 0, earnings: 0, confirmedEarnings: 0, bed1Bookings: 0, bed1Earnings: 0, bed2Bookings: 0, bed2Earnings: 0, grossRent: 0, cleaningFees: 0, serviceFees: 0, discounts: 0, hostNet: 0, wht: 0 }
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
    // Fee breakdown percentages
    const serviceFeePct = t.grossRent > 0 ? Math.round((t.serviceFees / t.grossRent) * 100) : 0;
    const hostNetPct = t.grossRent > 0 ? Math.round((t.hostNet / t.grossRent) * 100) : 0;
    const whtPct = t.hostNet > 0 ? Math.round((t.wht / t.hostNet) * 100) : 0;
    return {
      avgBookingValue, confirmationRate, pendingBookings, pendingEarnings,
      activeProperties, avgPerProperty, bedTotal, bed1Share, bed2Share,
      topEarner: chartProperties[0] || null,
      serviceFeePct, hostNetPct, whtPct,
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

    // Header
    doc.setFillColor(38, 34, 98);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ZuriLofts Earnings Report', margin, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${today}  |  Period: ${rangeLabel}`, margin, 26);

    // Summary section
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

    // Fee Breakdown section
    const feeStartY = (doc.lastAutoTable?.finalY || 70) + 6;
    doc.setTextColor(38, 34, 98);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Fee Breakdown', margin, feeStartY);

    const feeData = [
      ['Gross Rent (subtotal)', `KES ${filteredTotals.grossRent.toLocaleString()}`, `100%`],
      ['Service Fees (12% of subtotal)', `KES ${filteredTotals.serviceFees.toLocaleString()}`, `${metrics.serviceFeePct}% of gross`],
      ['Discounts', `-KES ${filteredTotals.discounts.toLocaleString()}`, 'Promo code discounts'],
      ['Host Net Earnings', `KES ${filteredTotals.hostNet.toLocaleString()}`, `${metrics.hostNetPct}% of gross`],
      ['Withholding Tax (WHT 5%)', `KES ${filteredTotals.wht.toLocaleString()}`, `~${metrics.whtPct}% of host net`],
    ];

    autoTable(doc, {
      startY: feeStartY + 4,
      head: [['Fee Component', 'Amount', 'Note']],
      body: feeData,
      theme: 'grid',
      headStyles: { fillColor: [11, 11, 69], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [31, 41, 55] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      styles: { fontSize: 9, cellPadding: 3 },
    });

    // 1-Bed / 2-Bed breakdown
    const bedStartY = (doc.lastAutoTable?.finalY || feeStartY + 50) + 6;
    doc.setTextColor(38, 34, 98);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bed-Type Breakdown', margin, bedStartY);

    const bedData = [
      ['1-Bed Bookings', String(filteredTotals.bed1Bookings.toLocaleString())],
      ['1-Bed Earnings (KES)', filteredTotals.bed1Earnings.toLocaleString()],
      ['2-Bed Bookings', String(filteredTotals.bed2Bookings.toLocaleString())],
      ['2-Bed Earnings (KES)', filteredTotals.bed2Earnings.toLocaleString()],
    ];

    autoTable(doc, {
      startY: bedStartY + 4,
      head: [['Metric', 'Value']],
      body: bedData,
      theme: 'grid',
      headStyles: { fillColor: [196, 154, 108], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [31, 41, 55] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      styles: { fontSize: 9, cellPadding: 3 },
    });

    // Per-Property table
    const propStartY = (doc.lastAutoTable?.finalY || bedStartY + 40) + 8;
    doc.setTextColor(38, 34, 98);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Per-Property Earnings', margin, propStartY);

    const tableHead = [['Property', 'Active Bkd', 'Gross Rent', 'Service Fee', 'Host Net', 'WHT', 'Total']];
    const tableBody = filteredRows.map((r) => [
      r.title,
      String(r.bookings),
      `KES ${(r.grossRent || 0).toLocaleString()}`,
      `KES ${(r.serviceFees || 0).toLocaleString()}`,
      `KES ${(r.hostNet || 0).toLocaleString()}`,
      `KES ${(r.wht || 0).toLocaleString()}`,
      `KES ${r.earnings.toLocaleString()}`,
    ]);
    tableBody.push([
      'TOTAL', String(filteredTotals.bookings),
      `KES ${filteredTotals.grossRent.toLocaleString()}`,
      `KES ${filteredTotals.serviceFees.toLocaleString()}`,
      `KES ${filteredTotals.hostNet.toLocaleString()}`,
      `KES ${filteredTotals.wht.toLocaleString()}`,
      `KES ${filteredTotals.earnings.toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: propStartY + 4,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [38, 34, 98], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [31, 41, 55] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      styles: { fontSize: 8, cellPadding: 2 },
    });

    // Footer — page numbers
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
    let csv = '﻿';
    csv += 'ZuriLofts Earnings Report\n';
    csv += `Generated: ${today}\n`;
    csv += `Period: ${rangeLabel}\n\n`;

    // Summary
    csv += 'Summary\n';
    csv += `"Active Bookings (ex. cancelled)","${filteredTotals.bookings}"\n`;
    csv += `"Confirmed Bookings","${filteredTotals.confirmedBookings}"\n`;
    csv += `"Active Earnings (KES)","${filteredTotals.earnings}"\n`;
    csv += `"Confirmed Earnings (KES)","${filteredTotals.confirmedEarnings}"\n\n`;

    // Fee Breakdown
    csv += 'Fee Breakdown\n';
    csv += 'Component,Amount,Note\n';
    csv += `"Gross Rent (subtotal)",${filteredTotals.grossRent},"100%"\n`;
    csv += `"Service Fees (12%)",${filteredTotals.serviceFees},"${metrics.serviceFeePct}% of gross"\n`;
    csv += `"Discounts",-${filteredTotals.discounts},"Promo code discounts"\n`;
    csv += `"Host Net Earnings",${filteredTotals.hostNet},"${metrics.hostNetPct}% of gross"\n`;
    csv += `"Withholding Tax (WHT 5%)",${filteredTotals.wht},"~${metrics.whtPct}% of host net"\n\n`;

    // Bed breakdown
    csv += 'Bed-Type Breakdown\n';
    csv += `"1-Bed Bookings","${filteredTotals.bed1Bookings}"\n`;
    csv += `"1-Bed Earnings (KES)","${filteredTotals.bed1Earnings}"\n`;
    csv += `"2-Bed Bookings","${filteredTotals.bed2Bookings}"\n`;
    csv += `"2-Bed Earnings (KES)","${filteredTotals.bed2Earnings}"\n\n`;

    // Per-property table
    csv += 'Per-Property Earnings\n';
    csv += 'Property,Active Booked,Gross Rent (KES),Service Fee (KES),Host Net (KES),WHT (KES),Total (KES)\n';
    filteredRows.forEach((r) => {
      csv += `"${r.title}",${r.bookings},${r.grossRent || 0},${r.serviceFees || 0},${r.hostNet || 0},${r.wht || 0},${r.earnings}\n`;
    });
    csv += `"TOTAL",${filteredTotals.bookings},${filteredTotals.grossRent},${filteredTotals.serviceFees},${filteredTotals.hostNet},${filteredTotals.wht},${filteredTotals.earnings}\n`;

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

  // Stat cards — top row: quick overview
  const cards = [
    { label: 'Active Bookings', value: filteredTotals.bookings.toLocaleString(), color: 'bg-[#0B0B45]', sub: `${metrics.confirmationRate}% confirmed (ex. cancelled)` },
    { label: 'Gross Rent (KES)', value: filteredTotals.grossRent.toLocaleString(), color: 'bg-[#C49A6C]', sub: 'Subtotal before fees & discounts' },
    { label: 'Service Fees (KES)', value: filteredTotals.serviceFees.toLocaleString(), color: 'bg-blue-600', sub: `12% of subtotal · ${metrics.serviceFeePct}% of gross` },
    { label: 'Host Net (KES)', value: filteredTotals.hostNet.toLocaleString(), color: 'bg-green-600', sub: `After fees · ${metrics.hostNetPct}% of gross` },
    { label: 'WHT 5% (KES)', value: filteredTotals.wht.toLocaleString(), color: 'bg-purple-600', sub: `Remitted to KRA · ~${metrics.whtPct}% of host net` },
  ];

  // Second row — additional breakdown
  const feeCards = [
    { label: 'Discounts (KES)', value: `${filteredTotals.discounts.toLocaleString()}`, sub: 'Promo code deductions' },
    { label: 'Confirmed Revenue (KES)', value: filteredTotals.confirmedEarnings.toLocaleString(), sub: `KES ${metrics.avgBookingValue.toLocaleString()} avg / booking` },
    { label: 'Avg / Property (KES)', value: metrics.avgPerProperty.toLocaleString(), sub: `${metrics.activeProperties} earning properties` },
    { label: 'Take-Home (KES)', value: Math.max(0, filteredTotals.hostNet - filteredTotals.wht).toLocaleString(), sub: 'Host net after WHT deduction' },
  ];

  const insights = [
    { label: 'Top Earner', value: metrics.topEarner ? metrics.topEarner.title : '—', hint: metrics.topEarner ? `KES ${metrics.topEarner.earnings.toLocaleString()}` : undefined },
    { label: 'Confirmation Rate', value: `${metrics.confirmationRate}%`, hint: `${filteredTotals.confirmedBookings.toLocaleString()} of ${filteredTotals.bookings.toLocaleString()} bookings` },
    { label: '1-Bed Share', value: `${metrics.bed1Share}%`, hint: `KES ${filteredTotals.bed1Earnings.toLocaleString()}` },
    { label: '2-Bed Share', value: `${metrics.bed2Share}%`, hint: `KES ${filteredTotals.bed2Earnings.toLocaleString()}` },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B0B45] mb-1">Earnings</h1>
          <p className="text-sm text-[#6b7280]">
            Earnings from active bookings (pending + confirmed). Cancelled bookings are excluded.
            {!isAdmin && ' View your gross rent, service fees, host net, and WHT breakdown.'}
          </p>
        </div>
        {!loading && rows.length > 0 && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="flex items-center bg-[#f3f4f6] rounded-full p-0.5 border border-[#D9D9D9]">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    viewMode === 'all' ? 'bg-[#C49A6C] text-white shadow-sm' : 'text-[#6b7280] hover:text-[#0B0B45]'
                  }`}
                >
                  All Properties
                </button>
                <button
                  onClick={() => setViewMode('mine')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    viewMode === 'mine' ? 'bg-[#C49A6C] text-white shadow-sm' : 'text-[#6b7280] hover:text-[#0B0B45]'
                  }`}
                >
                  My Properties
                </button>
              </div>
            )}
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
            </div>
        )}
      </div>

      {/* Filters */}
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

      {/* Stats Cards — Top row: core metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
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

      {/* Fee Breakdown Cards — Second row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {feeCards.map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-[#D9D9D9]">
            <span className="text-sm text-[#6b7280]">{label}</span>
            <p className="text-xl font-bold text-[#0B0B45] mt-2">{value}</p>
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

      {/* Earnings Flow visualization (only when we have fee data) */}
      {!loading && filteredTotals.grossRent > 0 && (
        <div className="bg-white rounded-2xl border border-[#D9D9D9] p-5 shadow-sm mb-4">
          <h2 className="text-sm font-bold text-[#0B0B45] mb-4">Earnings Flow — How Your Money Moves</h2>
          <div className="flex flex-col lg:flex-row items-center gap-3 text-sm">
            {/* Gross Rent */}
            <div className="bg-[#0B0B45]/5 rounded-xl p-3 text-center min-w-[120px] flex-1">
              <p className="text-xs text-[#6b7280] uppercase tracking-wide">Gross Rent</p>
              <p className="text-lg font-bold text-[#0B0B45]">KES {filteredTotals.grossRent.toLocaleString()}</p>
            </div>
            <svg className="w-4 h-4 text-[#C49A6C] flex-shrink-0 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-4 h-4 text-[#C49A6C] flex-shrink-0 lg:hidden rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {/* Minus Service Fee */}
            <div className="bg-red-50 rounded-xl p-3 text-center min-w-[120px] flex-1">
              <p className="text-xs text-red-600 uppercase tracking-wide">- Service Fee (12%)</p>
              <p className="text-lg font-bold text-red-600">KES {filteredTotals.serviceFees.toLocaleString()}</p>
            </div>
            <svg className="w-4 h-4 text-[#C49A6C] flex-shrink-0 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-4 h-4 text-[#C49A6C] flex-shrink-0 lg:hidden rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {/* Minus Discounts */}
            <div className="bg-red-50 rounded-xl p-3 text-center min-w-[120px] flex-1">
              <p className="text-xs text-red-600 uppercase tracking-wide">- Discounts</p>
              <p className="text-lg font-bold text-red-600">KES {filteredTotals.discounts.toLocaleString()}</p>
            </div>
            <svg className="w-4 h-4 text-[#C49A6C] flex-shrink-0 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-4 h-4 text-[#C49A6C] flex-shrink-0 lg:hidden rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {/* = Host Net */}
            <div className="bg-green-50 rounded-xl p-3 text-center min-w-[120px] flex-1">
              <p className="text-xs text-green-700 uppercase tracking-wide">= Host Net</p>
              <p className="text-lg font-bold text-green-700">KES {filteredTotals.hostNet.toLocaleString()}</p>
            </div>
            <svg className="w-4 h-4 text-[#C49A6C] flex-shrink-0 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-4 h-4 text-[#C49A6C] flex-shrink-0 lg:hidden rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {/* - WHT */}
            <div className="bg-purple-50 rounded-xl p-3 text-center min-w-[120px] flex-1">
              <p className="text-xs text-purple-700 uppercase tracking-wide">- WHT (5% → KRA)</p>
              <p className="text-lg font-bold text-purple-700">KES {filteredTotals.wht.toLocaleString()}</p>
            </div>
            <svg className="w-4 h-4 text-[#C49A6C] flex-shrink-0 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-4 h-4 text-[#C49A6C] flex-shrink-0 lg:hidden rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {/* Take-Home */}
            <div className="bg-[#C49A6C]/10 rounded-xl p-3 text-center min-w-[120px] flex-1 border-2 border-[#C49A6C]">
              <p className="text-xs text-[#0B0B45] uppercase tracking-wide font-bold">Take-Home</p>
              <p className="text-lg font-bold text-[#0B0B45]">KES {Math.max(0, filteredTotals.hostNet - filteredTotals.wht).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Top Hosts — Admin only */}
      {isAdmin && !loading && hosts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Top Hosts Table */}
          <div className="bg-white rounded-2xl border border-[#D9D9D9] p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[#0B0B45] mb-4">Top Hosts by Earnings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#D9D9D9] text-left">
                    <th className="pb-2 font-semibold text-[#6b7280] text-xs uppercase tracking-wider">#</th>
                    <th className="pb-2 font-semibold text-[#6b7280] text-xs uppercase tracking-wider">Host</th>
                    <th className="pb-2 font-semibold text-[#6b7280] text-xs uppercase tracking-wider text-right">Props</th>
                    <th className="pb-2 font-semibold text-[#6b7280] text-xs uppercase tracking-wider text-right">Bkgs</th>
                    <th className="pb-2 font-semibold text-[#6b7280] text-xs uppercase tracking-wider text-right">Host Net</th>
                    <th className="pb-2 font-semibold text-[#6b7280] text-xs uppercase tracking-wider text-right">WHT</th>
                  </tr>
                </thead>
                <tbody>
                  {hosts.slice(0, 10).map((h, i) => (
                    <tr key={h.hostId} className="border-b border-[#D9D9D9]/50 hover:bg-[#f8f9fa]">
                      <td className="py-2.5">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          i < 3 ? 'bg-[#C49A6C] text-white' : 'bg-[#f3f4f6] text-[#6b7280]'
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <p className="font-semibold text-[#0B0B45]">{h.name}</p>
                        <p className="text-xs text-[#6b7280]">{h.email}</p>
                      </td>
                      <td className="py-2.5 text-right">{h.propertyCount}</td>
                      <td className="py-2.5 text-right font-semibold">{h.bookings.toLocaleString()}</td>
                      <td className="py-2.5 text-right font-bold text-green-700">KES {h.hostNet.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-purple-700">KES {h.wht.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Hosts Bar Chart */}
          <div className="bg-white rounded-2xl border border-[#D9D9D9] p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[#0B0B45] mb-4">Host Net Earnings Comparison</h2>
            {hosts.length > 0 && (
              <div className="space-y-3">
                {hosts.slice(0, 8).map((h, i) => {
                  const maxHostNet = hosts[0]?.hostNet || 1;
                  const pct = (h.hostNet / maxHostNet) * 100;
                  const colors = ['bg-[#C49A6C]', 'bg-[#0B0B45]', 'bg-[#6b7280]', 'bg-[#b8895c]', 'bg-[#1d1a4d]', 'bg-[#9ca3af]', 'bg-[#c49a6c]/70', 'bg-[#0B0B45]/70'];
                  return (
                    <div key={h.hostId}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-[#1f2937] truncate pr-3" title={h.name}>{h.name}</span>
                        <span className="font-semibold text-[#0B0B45] whitespace-nowrap">
                          KES {h.hostNet.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[i] || 'bg-[#C49A6C]'} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45] whitespace-nowrap">Active Bkd</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45] whitespace-nowrap">Gross Rent</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45] whitespace-nowrap">Service Fee</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45] whitespace-nowrap">Host Net</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45] whitespace-nowrap">WHT</th>
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
                    <td className="py-3 px-4 text-right font-semibold">KES {(r.grossRent || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-red-600">KES {(r.serviceFees || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-bold text-green-700">KES {(r.hostNet || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-purple-700">KES {(r.wht || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              {earningRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#D9D9D9] bg-[#f8f9fa] font-bold text-[#0B0B45]">
                    <td className="py-3 px-4" colSpan={2}>Active Totals (ex. cancelled)</td>
                    <td className="py-3 px-4 text-right">{filteredTotals.bookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">KES {filteredTotals.grossRent.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-red-600">KES {filteredTotals.serviceFees.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-green-700">KES {filteredTotals.hostNet.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-purple-700">KES {filteredTotals.wht.toLocaleString()}</td>
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
