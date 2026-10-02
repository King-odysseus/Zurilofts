import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Label, TextInput } from 'flowbite-react';
import { CircleAlert } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SUCCESS: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REVERSED: 'bg-orange-100 text-orange-700',
};

function HostPayouts() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [destination, setDestination] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [whtData, setWhtData] = useState(null);
  const [whtMonth, setWhtMonth] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/host/payouts');
      setWallet(res.data.data.wallet);
      setDestination(res.data.data.destination || null);
      setPayouts(res.data.data.payouts || []);
    } catch {
      setError('Could not load your payout information. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Guests have no business here; show a clear denial instead of a spinner.
  // Declared after every hook so hook order stays identical across renders.
  if (user?.role === 'USER') {
    return <div className="op-host-payouts-denied">
      <div className="op-host-payouts-denied-icon">
        <CircleAlert strokeWidth={2} aria-hidden="true" />
      </div>
      <h1>Access denied</h1>
      <p>This page is for hosts and administrators only.</p>
    </div>;
  }

  async function downloadWht() {
    const params = {};
    if (whtMonth) {
      const [year, month] = whtMonth.split('-');
      params.year = year;
      params.month = month;
    }
    try {
      const res = await apiClient.get('/host/wht', { params });
      setWhtData(res.data.data);
    } catch {
      setError('Could not load the withholding tax statement.');
    }
  }

  // Build a safe print view from whtData - no innerHTML injection.
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function printWht() {
    if (!whtData?.bookings) return;
    const period = whtMonth || 'All time';
    const rowsHtml = whtData.bookings.map((booking) => {
      const date = booking.paidAt ? new Date(booking.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
      return `<tr><td>${escapeHtml(booking.property?.title)}</td><td>${date}</td><td class="num">${(booking.hostNetAmount ?? 0).toLocaleString()}</td><td class="num">${(booking.withholdingTax ?? 0).toLocaleString()}</td></tr>`;
    }).join('');
    const totalHtml = `<tr class="total"><td colspan="2">Total</td><td class="num">${(whtData.totalEarnings ?? 0).toLocaleString()}</td><td class="num">${(whtData.totalWht ?? 0).toLocaleString()}</td></tr>`;

    const printWindow = window.open('', '_blank', 'width=700,height=600');
    printWindow.document.write(`
      <html><head><title>WHT Statement</title>
      <style>
        body { font-family: Inter, sans-serif; padding: 30px; color: #1f2937; }
        h2 { color: #0B1F42; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { padding: 10px; border-bottom: 1px solid #D9D9D9; text-align: left; }
        th { background: #0B1F42; color: white; }
        .total { font-weight: bold; }
        .num { text-align: right; }
      </style></head><body>
      <h2>ZuriLofts - WHT Statement</h2>
      <p style="color:#6b7280;font-size:14px;margin-bottom:16px">Period: ${escapeHtml(period)} | WHT Rate: 5% | Remitted to KRA</p>
      <table><thead><tr><th>Property</th><th>Paid Date</th><th>Earnings (KES)</th><th>WHT (KES)</th></tr></thead><tbody>
      ${rowsHtml}
      ${totalHtml}
      </tbody></table>
      <p style="color:#6b7280;font-size:11px;margin-top:12px">This statement confirms that ZuriLofts has deducted and remitted the above withholding tax amounts to KRA on your behalf. Use this document to claim tax credits when filing your annual returns.</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  function csvWht() {
    if (!whtData?.bookings) return;
    const rows = [['Host', 'Property', 'Earnings (KES)', 'WHT Deducted (KES)']];
    for (const booking of whtData.bookings) {
      rows.push(['Host', booking.property?.title, booking.hostNetAmount, booking.withholdingTax]);
    }
    rows.push(['', '', '']);
    rows.push(['', 'TOTAL', whtData.totalEarnings, whtData.totalWht]);

    const csv = `\uFEFF${rows.map((row) => row.join(',')).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WHT-Statement-${whtMonth || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="op-host-payouts-loading" aria-label="Loading payout information"><span /><span /><span /></div>;

  return <div className="op-host-payouts">
    <header className="op-host-payouts-heading">
      <div>
        <Link to="/host/earnings">Back to earnings</Link>
        <h1>Payouts</h1>
        <p>Manage how you get paid and review your payout history.</p>
      </div>
      <Link to="/profile#payouts">{destination?.method ? 'Change destination' : 'Set up payouts'}</Link>
    </header>

    {error && <div className="op-host-payouts-error"><p>{error}</p><button type="button" onClick={loadData}>Try again</button></div>}

    <section className="op-host-payouts-wallet" aria-label="Payout balance summary">
      <article className="is-balance">
        <span>AVAILABLE BALANCE</span>
        <strong>KES {(wallet?.balance || 0).toLocaleString()}</strong>
        <small>Ready for the next payout</small>
      </article>
      <article className="is-earned">
        <span>TOTAL EARNED</span>
        <strong>KES {(wallet?.totalEarned || 0).toLocaleString()}</strong>
        <small>Recorded host earnings</small>
      </article>
      <article className="is-paid">
        <span>TOTAL PAID OUT</span>
        <strong>KES {(wallet?.totalPaidOut || 0).toLocaleString()}</strong>
        <small>Completed host payouts</small>
      </article>
    </section>

    <div className="op-host-payouts-grid">
      <section className="op-host-payouts-panel">
        <header><div><h2>Payout destination</h2><p>Where your available balance is sent.</p></div><span>Schedule</span></header>
        <div className="op-host-payouts-destination">
          <span>{destination?.method || 'NOT CONFIGURED'}</span>
          <strong>{destination?.label || 'Add a payout destination'}</strong>
          <small>{destination?.maskedAccount || 'Bank or mobile money details are required before payout.'}</small>
        </div>
        <dl className="op-host-payouts-schedule">
          <div><dt>Next payout</dt><dd>{wallet?.nextPayoutAt ? new Date(wallet.nextPayoutAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not scheduled'}</dd></div>
          <div><dt>Destination status</dt><dd>{destination?.method ? 'Ready' : 'Needs setup'}</dd></div>
        </dl>
        <Link to="/profile#payouts">{destination?.method ? 'Update payout details' : 'Add payout details'}</Link>
      </section>

      <section className="op-host-payouts-panel op-host-payouts-wht">
        <header><div><h2>WHT statement</h2><p>Withholding tax certificates for KRA returns.</p></div><span>5% rate</span></header>
        <div className="op-host-payouts-wht-controls">
          <div>
            <Label htmlFor="wht-month">Statement month</Label>
            <TextInput id="wht-month" type="month" value={whtMonth} onChange={(event) => setWhtMonth(event.target.value)} />
          </div>
          <Button className="op-host-bronze-button" onClick={downloadWht}>View statement</Button>
        </div>
        {whtData ? <div className="op-host-payouts-wht-result">
          <div className="op-host-payouts-wht-total">
            <span>{whtMonth || 'ALL TIME'}</span>
            <strong>KES {(whtData.totalWht || 0).toLocaleString()} WHT</strong>
            <small>From KES {(whtData.totalEarnings || 0).toLocaleString()} host earnings</small>
          </div>
          <div className="op-host-payouts-table-wrap">
            <table className="op-host-payouts-table">
              <thead><tr><th>Property</th><th>Paid date</th><th>Earnings</th><th>WHT</th></tr></thead>
              <tbody>
                {whtData.bookings.map((booking, index) => <tr key={booking.id || index}>
                  <td>{booking.property?.title || 'Property'}</td>
                  <td>{booking.paidAt ? new Date(booking.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                  <td>KES {(booking.hostNetAmount || 0).toLocaleString()}</td>
                  <td>KES {(booking.withholdingTax || 0).toLocaleString()}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="op-host-payouts-wht-actions">
            <Button color="light" onClick={csvWht}>Download CSV</Button>
            <Button color="dark" onClick={printWht}>Print PDF</Button>
          </div>
        </div> : <div className="op-host-payouts-wht-empty">
          <strong>Select a month to view your statement</strong>
          <p>Leave the month empty to view all withholding tax recorded on your account.</p>
        </div>}
      </section>
    </div>

    <section className="op-host-payouts-panel op-host-payouts-history">
      <header><div><h2>Payout history</h2><p>Completed and in-flight transfers to your destination.</p></div><span>{payouts.length} records</span></header>
      {payouts.length === 0 ? <div className="op-host-payouts-history-empty">
        <strong>No payouts yet</strong>
        <p>Your first payout will appear here after a transfer is created.</p>
      </div> : <div className="op-host-payouts-table-wrap">
        <table className="op-host-payouts-table is-history">
          <thead><tr><th>Amount</th><th>Bookings</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>{payouts.map((payout) => <tr key={payout.id}>
            <td>KES {(payout.amount || 0).toLocaleString()}</td>
            <td>{payout.bookingsCount || 0}</td>
            <td><span className={`op-host-payout-status ${statusColors[payout.status] || ''}`}>{payout.status}</span>{payout.failureReason && <small>{payout.failureReason}</small>}</td>
            <td>{payout.createdAt ? new Date(payout.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  </div>;
}

export default HostPayouts;
