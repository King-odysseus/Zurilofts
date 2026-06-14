import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client.js';
import Dropdown from '../components/Dropdown.jsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Register autoTable plugin — the auto-registration in the module only
// checks window.jsPDF which isn't set in Vite's ESM bundler.
jsPDF.autoTable = autoTable;

function formatDate() {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function AdminEarnings() {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ bookings: 0, confirmedBookings: 0, earnings: 0, confirmedEarnings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get('/admin/analytics/properties');
        setRows(res.data.data?.properties || []);
        setTotals(res.data.data?.totals || { bookings: 0, confirmedBookings: 0, earnings: 0, confirmedEarnings: 0 });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const today = formatDate();

  function handleExportPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    // ---- Header bar ----
    doc.setFillColor(38, 34, 98); // #262262 brand indigo
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ZuriLofts Earnings Report', margin, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${today}`, margin, 26);

    // ---- Summary Metrics ----
    doc.setTextColor(38, 34, 98);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const summaryData = [
      ['Total Bookings', String(totals.bookings.toLocaleString())],
      ['Confirmed Bookings', String(totals.confirmedBookings.toLocaleString())],
      ['Total Earnings (KES)', totals.earnings.toLocaleString()],
      ['Confirmed Earnings (KES)', totals.confirmedEarnings.toLocaleString()],
    ];

    doc.autoTable({
      startY: 46,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [196, 154, 108], // #C49A6C bronze
        textColor: [38, 34, 98],
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: [31, 41, 55],
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      styles: { fontSize: 10 },
    });

    // ---- Property Earnings Table ----
    const tableHead = [['Property', 'Location', 'Times Booked', 'Confirmed', 'Earnings (KES)']];
    const tableBody = rows.map((r) => [
      r.title,
      r.location,
      String(r.bookings),
      String(r.confirmedBookings),
      `KES ${r.earnings.toLocaleString()}`,
    ]);
    tableBody.push([
      'TOTAL',
      '',
      String(totals.bookings),
      String(totals.confirmedBookings),
      `KES ${totals.earnings.toLocaleString()}`,
    ]);

    const summaryEndY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 70;

    doc.autoTable({
      startY: summaryEndY + 10,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [38, 34, 98], // #262262
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: [31, 41, 55],
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 50 },       // Property
        1: { cellWidth: 35 },       // Location
        2: { halign: 'right', cellWidth: 30 },  // Times Booked
        3: { halign: 'right', cellWidth: 25 },  // Confirmed
        4: { halign: 'right', cellWidth: 40 },  // Earnings
      },
    });

    // ---- Footer on every page ----
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Page ${i} of ${pageCount}  |  ZuriLofts  |  ${today}`,
        margin,
        doc.internal.pageSize.height - 10
      );
    }

    doc.save(`ZuriLofts_Earnings_${today.replace(/\s/g, '_')}.pdf`);
  }

  function handleExportCSV() {
    // BOM prefix for Excel UTF-8 compatibility
    let csv = '﻿';
    csv += 'ZuriLofts Earnings Report\n';
    csv += `Generated: ${today}\n\n`;

    // Summary section
    csv += 'Metric,Value\n';
    csv += `"Total Bookings","${totals.bookings}"\n`;
    csv += `"Confirmed Bookings","${totals.confirmedBookings}"\n`;
    csv += `"Total Earnings (KES)","${totals.earnings}"\n`;
    csv += `"Confirmed Earnings (KES)","${totals.confirmedEarnings}"\n\n`;

    // Property table
    csv += 'Property,Location,Times Booked,Confirmed,Earnings (KES)\n';
    rows.forEach((r) => {
      csv += `"${r.title}","${r.location}",${r.bookings},${r.confirmedBookings},${r.earnings}\n`;
    });
    csv += `"TOTAL","",${totals.bookings},${totals.confirmedBookings},${totals.earnings}\n`;

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
    { label: 'Total Bookings', value: totals.bookings.toLocaleString(), color: 'bg-[#262262]' },
    { label: 'Confirmed Bookings', value: totals.confirmedBookings.toLocaleString(), color: 'bg-[#C49A6C]' },
    { label: 'Total Earnings (KES)', value: totals.earnings.toLocaleString(), color: 'bg-green-600' },
    { label: 'Confirmed Earnings (KES)', value: totals.confirmedEarnings.toLocaleString(), color: 'bg-purple-600' },
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
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Property</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Location</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262]">Times Booked</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262]">Confirmed</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262]">Earnings (KES)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
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
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#D9D9D9] bg-[#f8f9fa] font-bold text-[#262262]">
                    <td className="py-3 px-4" colSpan={2}>Total</td>
                    <td className="py-3 px-4 text-right">{totals.bookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{totals.confirmedBookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-[#C49A6C]">KES {totals.earnings.toLocaleString()}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {rows.length === 0 && (
            <div className="text-center py-12 text-[#6b7280]">No properties yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminEarnings;
