import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Label, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, TextInput } from 'flowbite-react';
import { CircleAlert } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';

// Payout statuses map onto the themed Badge palette instead of hand-rolled
// background/text pairs.
const STATUS_BADGE_COLORS = {
  PENDING: 'warning',
  PROCESSING: 'info',
  SUCCESS: 'success',
  FAILED: 'failure',
  REVERSED: 'warning',
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
    return <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-elevated px-5 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface text-primary-600">
        <CircleAlert strokeWidth={2} aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Access denied</h1>
      <p className="text-sm leading-relaxed text-muted">This page is for hosts and administrators only.</p>
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

  if (loading) return <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Loading payout information">
    <span className="h-24 animate-pulse rounded-xl border border-border bg-surface" />
    <span className="h-24 animate-pulse rounded-xl border border-border bg-surface" />
    <span className="h-24 animate-pulse rounded-xl border border-border bg-surface" />
  </div>;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link to="/host/earnings" className="text-xs font-semibold text-muted transition-colors hover:text-navy">Back to earnings</Link>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">HOST WORKSPACE</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">Payouts</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Manage how you get paid and review your payout history.</p>
      </div>
      <Button as={Link} to="/profile#payouts" size="sm">{destination?.method ? 'Change destination' : 'Set up payouts'}</Button>
    </header>

    {error && <Alert color="failure">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1">{error}</p>
        <Button size="sm" color="light" onClick={loadData}>Try again</Button>
      </div>
    </Alert>}

    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Payout balance summary">
      <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">AVAILABLE BALANCE</span>
        <strong className="mt-1 block text-2xl font-bold text-navy tabular-nums">KES {(wallet?.balance || 0).toLocaleString()}</strong>
        <small className="mt-1 block text-xs text-muted">Ready for the next payout</small>
      </article>
      <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">TOTAL EARNED</span>
        <strong className="mt-1 block text-2xl font-bold text-navy tabular-nums">KES {(wallet?.totalEarned || 0).toLocaleString()}</strong>
        <small className="mt-1 block text-xs text-muted">Recorded host earnings</small>
      </article>
      <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">TOTAL PAID OUT</span>
        <strong className="mt-1 block text-2xl font-bold text-navy tabular-nums">KES {(wallet?.totalPaidOut || 0).toLocaleString()}</strong>
        <small className="mt-1 block text-xs text-muted">Completed host payouts</small>
      </article>
      {/* Earned but not yet withdrawable. Shown so a stay that has not started
          does not look like missing money. */}
      <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">HELD UNTIL CHECK-IN</span>
        <strong className="mt-1 block text-2xl font-bold text-navy tabular-nums">KES {(wallet?.pendingBalance || 0).toLocaleString()}</strong>
        <small className="mt-1 block text-xs text-muted">
          {(wallet?.pendingBookings || 0) === 1
            ? '1 stay releasing after check-in'
            : `${wallet?.pendingBookings || 0} stays releasing after check-in`}
        </small>
      </article>
    </section>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-navy">Payout destination</h2><p className="mt-1 text-xs text-muted">Where your available balance is sent.</p></div><span className="text-xs font-medium text-muted">Schedule</span></header>
        <div className="mt-4 rounded-xl bg-surface px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{destination?.method || 'NOT CONFIGURED'}</span>
          <strong className="mt-1 block text-sm font-semibold text-navy">{destination?.label || 'Add a payout destination'}</strong>
          <small className="mt-1 block text-xs text-muted">{destination?.maskedAccount || 'Bank or mobile money details are required before payout.'}</small>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><dt className="text-muted">Next payout</dt><dd className="font-semibold text-navy">{wallet?.nextPayoutAt ? new Date(wallet.nextPayoutAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not scheduled'}</dd></div>
          <div className="flex flex-wrap items-center justify-between gap-3"><dt className="text-muted">Destination status</dt><dd className="font-semibold text-navy">{destination?.method ? 'Ready' : 'Needs setup'}</dd></div>
        </dl>
        <Button as={Link} to="/profile#payouts" color="light" size="sm" className="mt-4 w-fit">{destination?.method ? 'Update payout details' : 'Add payout details'}</Button>
      </section>

      <section className="rounded-xl border border-border bg-elevated p-5 shadow-sm lg:col-span-2">
        <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-navy">WHT statement</h2><p className="mt-1 text-xs text-muted">Withholding tax certificates for KRA returns.</p></div><span className="text-xs font-medium text-muted">5% rate</span></header>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="wht-month">Statement month</Label>
            <TextInput id="wht-month" type="month" value={whtMonth} onChange={(event) => setWhtMonth(event.target.value)} />
          </div>
          <Button size="sm" onClick={downloadWht}>View statement</Button>
        </div>
        {whtData ? <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-surface px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{whtMonth || 'ALL TIME'}</span>
            <strong className="mt-1 block text-xl font-bold text-navy tabular-nums">KES {(whtData.totalWht || 0).toLocaleString()} WHT</strong>
            <small className="mt-1 block text-xs text-muted">From KES {(whtData.totalEarnings || 0).toLocaleString()} host earnings</small>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Property</TableHeadCell>
                  <TableHeadCell>Paid date</TableHeadCell>
                  <TableHeadCell>Earnings</TableHeadCell>
                  <TableHeadCell>WHT</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {whtData.bookings.map((booking, index) => <TableRow key={booking.id || index}>
                  <TableCell>{booking.property?.title || 'Property'}</TableCell>
                  <TableCell>{booking.paidAt ? new Date(booking.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</TableCell>
                  <TableCell className="tabular-nums text-right">KES {(booking.hostNetAmount || 0).toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums text-right">KES {(booking.withholdingTax || 0).toLocaleString()}</TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button color="light" size="sm" onClick={csvWht}>Download CSV</Button>
            <Button color="light" size="sm" onClick={printWht}>Print PDF</Button>
          </div>
        </div> : <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-elevated px-5 py-12 text-center">
          <strong className="text-sm font-semibold text-navy">Select a month to view your statement</strong>
          <p className="text-xs text-muted">Leave the month empty to view all withholding tax recorded on your account.</p>
        </div>}
      </section>
    </div>

    <section className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-navy">Payout history</h2><p className="mt-1 text-xs text-muted">Completed and in-flight transfers to your destination.</p></div><span className="text-xs font-medium text-muted">{payouts.length} records</span></header>
      {payouts.length === 0 ? <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-elevated px-5 py-12 text-center">
        <strong className="text-sm font-semibold text-navy">No payouts yet</strong>
        <p className="text-xs text-muted">Your first payout will appear here after a transfer is created.</p>
      </div> : <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>Amount</TableHeadCell>
              <TableHeadCell>Bookings</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Date</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>{payouts.map((payout) => <TableRow key={payout.id}>
            <TableCell className="tabular-nums text-right">KES {(payout.amount || 0).toLocaleString()}</TableCell>
            <TableCell className="tabular-nums text-right">{payout.bookingsCount || 0}</TableCell>
            <TableCell>
              <Badge color={STATUS_BADGE_COLORS[payout.status] || 'gray'}>{payout.status}</Badge>
              {payout.failureReason && <small className="mt-1 block text-xs text-muted">{payout.failureReason}</small>}
            </TableCell>
            <TableCell>{payout.createdAt ? new Date(payout.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </div>}
    </section>
  </div>;
}

export default HostPayouts;
