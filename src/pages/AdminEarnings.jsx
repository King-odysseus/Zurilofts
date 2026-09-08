import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
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
  { value: 'earnings-desc', label: 'Earnings (High -> Low)' },
  { value: 'earnings-asc', label: 'Earnings (Low -> High)' },
  { value: 'bookings-desc', label: 'Bookings (High -> Low)' },
  { value: 'bookings-asc', label: 'Bookings (Low -> High)' },
  { value: 'name-asc', label: 'Property Name (A -> Z)' },
  { value: 'name-desc', label: 'Property Name (Z -> A)' },
];

function EarningsLineChart({ points }) {
  const width = 760;
  const height = 300;
  const padding = { top: 24, right: 20, bottom: 42, left: 20 };
  const max = Math.max(...points.map((point) => point.earnings), 1);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: padding.left + (chartWidth * index) / Math.max(points.length - 1, 1),
    y: padding.top + chartHeight - (point.earnings / max) * chartHeight,
  }));
  const path = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${path} L ${coordinates.at(-1)?.x ?? padding.left} ${padding.top + chartHeight} L ${coordinates[0]?.x ?? padding.left} ${padding.top + chartHeight} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px] w-full" role="img" aria-label="Monthly active earnings line chart">
        <defs>
          <linearGradient id="earnings-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((step) => {
          const y = padding.top + chartHeight - step * chartHeight;
          return <line key={step} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#E5E7EB" strokeWidth="1" />;
        })}
        <path d={areaPath} fill="url(#earnings-area)" />
        <path d={path} fill="none" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map((point) => (
          <g key={point.key}>
            <circle cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke="#2563EB" strokeWidth="3">
              <title>{`${point.label}: KES ${point.earnings.toLocaleString()}`}</title>
            </circle>
            <text x={point.x} y={height - 12} textAnchor="middle" fontSize="12" fill="#6b7280">{point.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

EarningsLineChart.propTypes = {
  points: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    earnings: PropTypes.number.isRequired,
  })).isRequired,
};

function AdminEarnings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [rows, setRows] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('earnings-desc');
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'mine' - admin-only toggle
  const [activeTab, setActiveTab] = useState('performance');
  const [monthlyTrend, setMonthlyTrend] = useState([]);

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
        setMonthlyTrend(res.data.data?.monthlyTrend || []);
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

  // Derived analytics - computed from the filtered totals so they track the active period/search.
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
      topEarner: [...earningRows].sort((a, b) => b.earnings - a.earnings)[0] || null,
      serviceFeePct, hostNetPct, whtPct,
    };
  }, [filteredTotals, earningRows]);

  const today = formatDate(new Date());
  const rangeLabel = useMemo(() => {
    if (period === 'all') return 'All Time';
    if (period === 'custom') {
      if (!customFrom && !customTo) return 'Custom Range';
      const f = customFrom ? formatDate(customFrom) : 'Start';
      const t = customTo ? formatDate(customTo) : 'End';
      return `${f} - ${t}`;
    }
    const opt = PERIOD_OPTIONS.find((o) => o.value === period);
    return opt?.label || '';
  }, [period, customFrom, customTo]);

  function handleExportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ZuriLofts Earnings Report', margin, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${today}  |  Period: ${rangeLabel}`, margin, 26);

    // Summary section
    doc.setTextColor(34, 34, 34);
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
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [34, 34, 34] },
      alternateRowStyles: { fillColor: [247, 247, 245] },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      styles: { fontSize: 10 },
    });

    // Fee Breakdown section
    const feeStartY = (doc.lastAutoTable?.finalY || 70) + 6;
    doc.setTextColor(34, 34, 34);
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
      headStyles: { fillColor: [34, 34, 34], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [34, 34, 34] },
      alternateRowStyles: { fillColor: [247, 247, 245] },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      styles: { fontSize: 9, cellPadding: 3 },
    });

    // 1-Bed / 2-Bed breakdown
    const bedStartY = (doc.lastAutoTable?.finalY || feeStartY + 50) + 6;
    doc.setTextColor(34, 34, 34);
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
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [34, 34, 34] },
      alternateRowStyles: { fillColor: [247, 247, 245] },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      styles: { fontSize: 9, cellPadding: 3 },
    });

    // Per-Property table
    const propStartY = (doc.lastAutoTable?.finalY || bedStartY + 40) + 8;
    doc.setTextColor(34, 34, 34);
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
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [34, 34, 34] },
      alternateRowStyles: { fillColor: [247, 247, 245] },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      styles: { fontSize: 8, cellPadding: 2 },
    });

    // Footer - page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
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

  // Stat cards - top row: quick overview
  const cards = [
    { label: 'Active Bookings', value: filteredTotals.bookings.toLocaleString(), color: 'bg-[#2563EB]', sub: `${metrics.confirmationRate}% confirmed (ex. cancelled)` },
    { label: 'Gross Rent (KES)', value: filteredTotals.grossRent.toLocaleString(), color: 'bg-[#6b7280]', sub: 'Subtotal before fees & discounts' },
    { label: 'Service Fees (KES)', value: filteredTotals.serviceFees.toLocaleString(), color: 'bg-amber-500', sub: `12% of subtotal · ${metrics.serviceFeePct}% of gross` },
    { label: 'Host Net (KES)', value: filteredTotals.hostNet.toLocaleString(), color: 'bg-green-600', sub: `After fees · ${metrics.hostNetPct}% of gross` },
    { label: 'WHT 5% (KES)', value: filteredTotals.wht.toLocaleString(), color: 'bg-purple-600', sub: `Remitted to KRA · ~${metrics.whtPct}% of host net` },
  ];

  // Second row - additional breakdown
  const feeCards = [
    { label: 'Discounts (KES)', value: `${filteredTotals.discounts.toLocaleString()}`, sub: 'Promo code deductions' },
    { label: 'Confirmed Revenue (KES)', value: filteredTotals.confirmedEarnings.toLocaleString(), sub: `KES ${metrics.avgBookingValue.toLocaleString()} avg / booking` },
    { label: 'Avg / Property (KES)', value: metrics.avgPerProperty.toLocaleString(), sub: `${metrics.activeProperties} earning properties` },
    { label: 'Take-Home (KES)', value: Math.max(0, filteredTotals.hostNet - filteredTotals.wht).toLocaleString(), sub: 'Host net after WHT deduction' },
  ];

  const insights = [
    { label: 'Top Earner', value: metrics.topEarner ? metrics.topEarner.title : '-', hint: metrics.topEarner ? `KES ${metrics.topEarner.earnings.toLocaleString()}` : undefined },
    { label: 'Confirmation Rate', value: `${metrics.confirmationRate}%`, hint: `${filteredTotals.confirmedBookings.toLocaleString()} of ${filteredTotals.bookings.toLocaleString()} bookings` },
    { label: '1-Bed Share', value: `${metrics.bed1Share}%`, hint: `KES ${filteredTotals.bed1Earnings.toLocaleString()}` },
    { label: '2-Bed Share', value: `${metrics.bed2Share}%`, hint: `KES ${filteredTotals.bed2Earnings.toLocaleString()}` },
  ];

  const earningsTabs = [
    { value: 'performance', label: 'Performance' },
    { value: 'overview', label: 'Summary' },
    { value: 'properties', label: 'Properties' },
  ];

  return (
    <div className="w-full">
      <div className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 sm:px-6 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222222] mb-1">Earnings</h1>
          <p className="text-sm text-[#6b7280]">
            Earnings from active bookings (pending + confirmed). Cancelled bookings are excluded.
            {!isAdmin && ' View your gross rent, service fees, host net, and WHT breakdown.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex items-center bg-[#F7F7F5] rounded-full p-0.5 border border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setViewMode('all')}
                aria-pressed={viewMode === 'all'}
                className={`min-h-[44px] px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  viewMode === 'all' ? 'bg-[#2563EB] text-white' : 'text-[#6b7280] hover:text-[#222222]'
                }`}
              >
                All Properties
              </button>
              <button
                type="button"
                onClick={() => setViewMode('mine')}
                aria-pressed={viewMode === 'mine'}
                className={`min-h-[44px] px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  viewMode === 'mine' ? 'bg-[#2563EB] text-white' : 'text-[#6b7280] hover:text-[#222222]'
                }`}
              >
                My Properties
              </button>
            </div>
          )}
          {!loading && rows.length > 0 && (
          <div className="flex items-center gap-2">
            <Dropdown
            value=""
            onChange={handleExport}
            options={[
              { value: 'pdf', label: 'Export as PDF' },
              { value: 'csv', label: 'Export as CSV' },
            ]}
            triggerClassName="min-h-[44px] px-5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#222222] font-semibold text-sm whitespace-nowrap hover:border-[#2563EB]"
            placeholder="Export Report"
            ariaLabel="Export earnings report"
            menuClassName="right-0 left-auto"
          />
          </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-shrink-0">
            <label className="block text-xs font-semibold text-[#6b7280] mb-1.5 uppercase tracking-wider">Period</label>
            <Dropdown
              value={period}
              onChange={setPeriod}
              options={PERIOD_OPTIONS}
              triggerClassName="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-sm min-w-[160px] hover:border-[#2563EB]"
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
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#222222] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div className="flex-shrink-0">
                <label className="block text-xs font-semibold text-[#6b7280] mb-1.5 uppercase tracking-wider">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#222222] focus:outline-none focus:border-[#2563EB]"
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
                className="min-h-[44px] w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#222222] focus:outline-none focus:border-[#2563EB]"
              />
              <svg className="w-4 h-4 text-[#6b7280] absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#222222]">
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
              triggerClassName="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-sm min-w-[200px] hover:border-[#2563EB]"
              placeholder="Sort by"
              ariaLabel="Sort earnings table"
            />
          </div>
        </div>

        {period !== 'all' && (
          <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex items-center gap-2 text-sm text-[#6b7280]">
            <svg className="w-4 h-4 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Showing data for: <span className="font-semibold text-[#222222]">{rangeLabel}</span></span>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-[#E5E7EB] mb-6" role="tablist" aria-label="Earnings views">
        {earningsTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`min-h-[44px] px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-[#2563EB] text-[#222222]'
                : 'border-transparent text-[#6b7280] hover:text-[#222222]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <>
      {/* Stats Cards - Top row: core metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        {cards.map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-[14px] border border-[#E5E7EB] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#6b7280]">{label}</span>
              <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
            </div>
            <p className="text-2xl font-bold text-[#222222]">{value}</p>
            {sub && <p className="text-xs text-[#6b7280] mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Fee Breakdown Cards - Second row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {feeCards.map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-[14px] border border-[#E5E7EB] p-5 shadow-sm">
            <span className="text-sm text-[#6b7280]">{label}</span>
            <p className="text-xl font-bold text-[#222222] mt-2">{value}</p>
            {sub && <p className="text-xs text-[#6b7280] mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Insights strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {insights.map(({ label, value, hint }) => (
          <div key={label} className="bg-[#F7F7F5] rounded-xl border border-[#E5E7EB] px-4 py-3">
            <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">{label}</p>
            <p className="text-base font-bold text-[#222222] truncate" title={value}>{value}</p>
            {hint && <p className="text-xs text-[#2563EB] font-medium mt-0.5">{hint}</p>}
          </div>
        ))}
      </div>

      {/* Earnings Flow visualization (only when we have fee data) */}
      {!loading && filteredTotals.grossRent > 0 && (
        <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-[#222222] mb-4">Earnings Flow - How Your Money Moves</h2>
          <div className="flex flex-col lg:flex-row items-center gap-3 text-sm">
            {/* Gross Rent */}
            <div className="bg-[#F7F7F5] rounded-xl p-3 text-center min-w-[120px] flex-1">
              <p className="text-xs text-[#6b7280] uppercase tracking-wide">Gross Rent</p>
              <p className="text-lg font-bold text-[#222222]">KES {filteredTotals.grossRent.toLocaleString()}</p>
            </div>
            <svg className="w-4 h-4 text-[#2563EB] flex-shrink-0 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-4 h-4 text-[#2563EB] flex-shrink-0 lg:hidden rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {/* Minus Service Fee */}
            <div className="bg-red-50 rounded-xl p-3 text-center min-w-[120px] flex-1">
              <p className="text-xs text-red-600 uppercase tracking-wide">- Service Fee (12%)</p>
              <p className="text-lg font-bold text-red-600">KES {filteredTotals.serviceFees.toLocaleString()}</p>
            </div>
            <svg className="w-4 h-4 text-[#2563EB] flex-shrink-0 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-4 h-4 text-[#2563EB] flex-shrink-0 lg:hidden rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {/* Minus Discounts */}
            <div className="bg-red-50 rounded-xl p-3 text-center min-w-[120px] flex-1">
              <p className="text-xs text-red-600 uppercase tracking-wide">- Discounts</p>
              <p className="text-lg font-bold text-red-600">KES {filteredTotals.discounts.toLocaleString()}</p>
            </div>
            <svg className="w-4 h-4 text-[#2563EB] flex-shrink-0 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-4 h-4 text-[#2563EB] flex-shrink-0 lg:hidden rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {/* = Host Net */}
            <div className="bg-green-50 rounded-xl p-3 text-center min-w-[120px] flex-1">
              <p className="text-xs text-green-700 uppercase tracking-wide">= Host Net</p>
              <p className="text-lg font-bold text-green-700">KES {filteredTotals.hostNet.toLocaleString()}</p>
            </div>
            <svg className="w-4 h-4 text-[#2563EB] flex-shrink-0 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-4 h-4 text-[#2563EB] flex-shrink-0 lg:hidden rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {/* - WHT */}
            <div className="bg-purple-50 rounded-xl p-3 text-center min-w-[120px] flex-1">
              <p className="text-xs text-purple-700 uppercase tracking-wide">- WHT (5% {'->'} KRA)</p>
              <p className="text-lg font-bold text-purple-700">KES {filteredTotals.wht.toLocaleString()}</p>
            </div>
            <svg className="w-4 h-4 text-[#2563EB] flex-shrink-0 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-4 h-4 text-[#2563EB] flex-shrink-0 lg:hidden rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {/* Take-Home */}
            <div className="bg-blue-50 rounded-xl p-3 text-center min-w-[120px] flex-1 border-2 border-[#2563EB]">
              <p className="text-xs text-[#222222] uppercase tracking-wide font-bold">Take-Home</p>
              <p className="text-lg font-bold text-[#222222]">KES {Math.max(0, filteredTotals.hostNet - filteredTotals.wht).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
      </>}

      {activeTab === 'performance' && !loading && (
        <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-5 sm:p-7 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2563EB]">Monthly view</p>
              <h2 className="text-xl font-bold text-[#222222] mt-1">Earnings performance</h2>
            </div>
            <p className="text-sm text-[#6b7280]">Active booking value · last 12 months</p>
          </div>
          {monthlyTrend.length > 0 ? <EarningsLineChart points={monthlyTrend} /> : (
            <p className="text-sm text-[#6b7280] py-12 text-center">No earnings data is available for this period.</p>
          )}
        </div>
      )}

      {activeTab === 'performance' && isAdmin && !loading && hosts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Top Hosts Table */}
          <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#222222] mb-4">Top Hosts by Earnings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left">
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
                    <tr key={h.hostId} className="border-b border-[#E5E7EB] hover:bg-[#F7F7F5]">
                      <td className="py-2.5">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          i < 3 ? 'bg-[#2563EB] text-white' : 'bg-[#F7F7F5] text-[#6b7280]'
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <p className="font-semibold text-[#222222]">{h.name}</p>
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
          <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#222222] mb-4">Host Net Earnings Comparison</h2>
            {hosts.length > 0 && (
              <div className="space-y-3">
                {hosts.slice(0, 8).map((h, i) => {
                  const maxHostNet = hosts[0]?.hostNet || 1;
                  const pct = (h.hostNet / maxHostNet) * 100;
                  const colors = ['bg-[#2563EB]', 'bg-[#1D4ED8]', 'bg-[#6b7280]', 'bg-blue-400', 'bg-[#222222]', 'bg-[#9ca3af]', 'bg-blue-300', 'bg-[#1D4ED8]/70'];
                  return (
                    <div key={h.hostId}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-[#222222] truncate pr-3" title={h.name}>{h.name}</span>
                        <span className="font-semibold text-[#222222] whitespace-nowrap">
                          KES {h.hostNet.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2.5 bg-[#F7F7F5] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[i] || 'bg-[#2563EB]'} rounded-full transition-all duration-500`}
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

      {activeTab === 'properties' && (loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F7F7F5] border-b border-[#E5E7EB]">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-[#222222] whitespace-nowrap">Property</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#222222] whitespace-nowrap">Location</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#222222] whitespace-nowrap">Active Bkd</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#222222] whitespace-nowrap">Gross Rent</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#222222] whitespace-nowrap">Service Fee</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#222222] whitespace-nowrap">Host Net</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#222222] whitespace-nowrap">WHT</th>
                </tr>
              </thead>
              <tbody>
                {earningRows.map((r) => (
                  <tr key={r.id} className="border-b border-[#E5E7EB] hover:bg-[#F7F7F5]">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        {r.image ? (
                          <img src={r.image} alt={r.title} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#E5E7EB] flex-shrink-0" />
                        )}
                        <Link to={`/property/${r.id}`} className="font-semibold text-[#222222] hover:text-[#2563EB]">{r.title}</Link>
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
                  <tr className="border-t-2 border-[#E5E7EB] bg-[#F7F7F5] font-bold text-[#222222]">
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
      ))}
    </div>
  );
}

export default AdminEarnings;
