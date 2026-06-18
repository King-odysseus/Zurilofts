import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SUCCESS: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REVERSED: 'bg-orange-100 text-orange-700',
};

function HostPayouts() {
  const [wallet, setWallet] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [whtData, setWhtData] = useState(null);
  const [whtMonth, setWhtMonth] = useState('');
  const [whtModal, setWhtModal] = useState(false);

  const whtRef = useRef(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await apiClient.get('/host/payouts');
      setWallet(res.data.data.wallet);
      setPayouts(res.data.data.payouts || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function downloadWht() {
    const params = {};
    if (whtMonth) {
      const [y, m] = whtMonth.split('-');
      params.year = y;
      params.month = m;
    }
    try {
      const res = await apiClient.get('/host/wht', { params });
      setWhtData(res.data.data);
    } catch {
      // silent
    }
  }

  function printWht() {
    if (!whtRef.current) return;
    const printWindow = window.open('', '_blank', 'width=700,height=600');
    printWindow.document.write(`
      <html><head><title>WHT Statement</title>
      <style>
        body { font-family: Inter, sans-serif; padding: 30px; color: #1f2937; }
        h2 { color: #0B0B45; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { padding: 10px; border-bottom: 1px solid #D9D9D9; text-align: left; }
        th { background: #0B0B45; color: white; }
        .total { font-weight: bold; }
      </style></head><body>
      ${whtRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  function csvWht() {
    if (!whtData?.bookings) return;
    const rows = [['Host', 'Property', 'Earnings (KES)', 'WHT Deducted (KES)']];
    for (const b of whtData.bookings) {
      rows.push(['Host', b.property?.title, b.hostNetAmount, b.withholdingTax]);
    }
    rows.push(['', '', '']);
    rows.push(['', 'TOTAL', whtData.totalEarnings, whtData.totalWht]);

    const bom = '﻿';
    const csv = bom + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WHT-Statement-${whtMonth || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#6b7280]">Loading payout info...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Wallet card */}
      <div className="bg-white rounded-2xl shadow-lg border border-[#D9D9D9] p-6">
        <h2 className="text-lg font-bold text-[#0B0B45] mb-4">My Earnings Wallet</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0B0B45]/5 rounded-xl p-4">
            <p className="text-xs text-[#6b7280] uppercase tracking-wide">Current Balance</p>
            <p className="text-2xl font-bold text-[#0B0B45]">
              KES {wallet?.balance?.toLocaleString() || '0'}
            </p>
          </div>
          <div className="bg-[#C49A6C]/10 rounded-xl p-4">
            <p className="text-xs text-[#6b7280] uppercase tracking-wide">Total Earned</p>
            <p className="text-2xl font-bold text-[#0B0B45]">
              KES {wallet?.totalEarned?.toLocaleString() || '0'}
            </p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-xs text-[#6b7280] uppercase tracking-wide">Total Paid Out</p>
            <p className="text-2xl font-bold text-green-700">
              KES {wallet?.totalPaidOut?.toLocaleString() || '0'}
            </p>
          </div>
        </div>
        {wallet?.nextPayoutAt && (
          <p className="text-sm text-[#6b7280] mt-4">
            Next scheduled payout:{' '}
            <span className="font-semibold text-[#1f2937]">
              {new Date(wallet.nextPayoutAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </p>
        )}
      </div>

      {/* WHT Statement */}
      <div className="bg-white rounded-2xl shadow-lg border border-[#D9D9D9] p-6">
        <h2 className="text-lg font-bold text-[#0B0B45] mb-4">WHT Statement (Tax Certificate)</h2>
        <p className="text-sm text-[#6b7280] mb-4">
          Download your withholding tax statement to claim KRA tax credits. WHT at 5% is automatically deducted and remitted on your behalf.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="month"
            value={whtMonth}
            onChange={(e) => setWhtMonth(e.target.value)}
            className="neu-input px-4 py-2 bg-white text-[#1f2937] rounded-xl text-sm"
          />
          <button
            onClick={downloadWht}
            className="bg-[#C49A6C] text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#b8895c] transition-colors"
          >
            View Statement
          </button>
        </div>

        {whtData && (
          <div className="mt-4">
            <div ref={whtRef}>
              <h2 className="text-lg font-bold text-[#0B0B45] mb-2">ZuriLofts — WHT Statement</h2>
              <p className="text-sm text-[#6b7280] mb-4">
                Period: {whtMonth || 'All time'} | WHT Rate: 5% | Remitted to KRA
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#D9D9D9] text-left">
                    <th className="p-2 font-semibold text-[#0B0B45]">Property</th>
                    <th className="p-2 font-semibold text-[#0B0B45]">Paid Date</th>
                    <th className="p-2 font-semibold text-[#0B0B45] text-right">Earnings (KES)</th>
                    <th className="p-2 font-semibold text-[#0B0B45] text-right">WHT (KES)</th>
                  </tr>
                </thead>
                <tbody>
                  {whtData.bookings.map((b, i) => (
                    <tr key={i} className="border-b border-[#D9D9D9]/50">
                      <td className="p-2 text-[#1f2937]">{b.property?.title}</td>
                      <td className="p-2 text-[#6b7280]">
                        {b.paidAt ? new Date(b.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="p-2 text-right">{b.hostNetAmount?.toLocaleString()}</td>
                      <td className="p-2 text-right">{b.withholdingTax?.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t-2 border-[#0B0B45]/20">
                    <td className="p-2 text-[#0B0B45]" colSpan="2">Total</td>
                    <td className="p-2 text-right text-[#0B0B45]">{whtData.totalEarnings?.toLocaleString()}</td>
                    <td className="p-2 text-right text-[#0B0B45]">{whtData.totalWht?.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-[#6b7280] mt-3">
                This statement confirms that ZuriLofts has deducted and remitted the above withholding tax amounts to KRA on your behalf.
                Use this document to claim tax credits when filing your annual returns.
              </p>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={printWht}
                className="bg-[#0B0B45] text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#06062a] transition-colors"
              >
                Print PDF
              </button>
              <button
                onClick={csvWht}
                className="border-2 border-[#0B0B45] text-[#0B0B45] text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#0B0B45] hover:text-white transition-colors"
              >
                Download CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payout History */}
      <div className="bg-white rounded-2xl shadow-lg border border-[#D9D9D9] p-6">
        <h2 className="text-lg font-bold text-[#0B0B45] mb-4">Payout History</h2>
        {payouts.length === 0 ? (
          <p className="text-[#6b7280] text-sm">No payouts yet. Your first payout will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#D9D9D9] text-left">
                  <th className="p-3 font-semibold text-[#0B0B45]">Amount (KES)</th>
                  <th className="p-3 font-semibold text-[#0B0B45]">Bookings</th>
                  <th className="p-3 font-semibold text-[#0B0B45]">Status</th>
                  <th className="p-3 font-semibold text-[#0B0B45]">Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-[#D9D9D9]/50">
                    <td className="p-3 font-medium">KES {p.amount?.toLocaleString()}</td>
                    <td className="p-3">{p.bookingsCount}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[p.status] || 'bg-gray-100 text-gray-700'}`}>
                        {p.status}
                      </span>
                      {p.failureReason && (
                        <p className="text-xs text-red-500 mt-1">{p.failureReason}</p>
                      )}
                    </td>
                    <td className="p-3 text-[#6b7280]">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default HostPayouts;
