import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Label, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, TextInput } from 'flowbite-react';
import { CircleAlert } from 'lucide-react';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';

// Payout statuses map onto the themed Badge palette instead of hand-rolled
// background/text pairs.
const STATUS_BADGE_COLORS = {
  PENDING: 'warning',
  PROCESSING: 'info',
  SUCCESS: 'success',
  FAILED: 'failure',
  REVERSED: 'warning',
};

// Every date on this page reads the same way, and the fallback dash matters:
// an empty cell must not print "Invalid Date".
const SHORT_DATE = { day: 'numeric', month: 'short', year: 'numeric' };

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', SHORT_DATE) : '-';
}

function HostPayouts() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [destination, setDestination] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [whtData, setWhtData] = useState(null);
  const [whtMonth, setWhtMonth] = useState('');

  // useCallback so the load effect can name it as its dependency; the lint gate
  // here fails on any warning, including exhaustive-deps.
  const loadData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Guests have no business here; show a clear denial instead of a spinner.
  // Declared after every hook so hook order stays identical across renders.
  if (user?.role === 'USER') {
    return <HostCard>
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-surface text-muted">
          <CircleAlert strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Access denied</h1>
        <p className="text-sm leading-relaxed text-muted">This page is for hosts and administrators only.</p>
      </div>
    </HostCard>;
  }

  async function loadWht() {
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
    // A blocked popup returns null; without this guard the host sees a blank
    // click with no explanation and a console TypeError.
    if (!printWindow) {
      setError('Your browser blocked the print window. Allow pop-ups for this site and try again.');
      return;
    }
    printWindow.document.write(`
      <html><head><title>WHT Statement</title>
      <style>
        body { font-family: Inter, sans-serif; padding: 30px; color: #1f2937; }
        h2 { color: #203565; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { padding: 10px; border-bottom: 1px solid #D9D9D9; text-align: left; }
        th { background: #16294B; color: white; }
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
    {[0, 1, 2].map((key) => <HostCard key={key} className="h-24 animate-pulse" />)}
  </div>;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link to="/host/earnings" className="text-xs font-semibold text-muted transition-colors hover:text-navy">Back to earnings</Link>
        <p className={HOST_EYEBROW}>Host workspace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">Payouts</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Manage how you get paid and review your payout history.</p>
      </div>
      <Button as={Link} to="/host/settings" size="sm">{destination?.method ? 'Change destination' : 'Set up payouts'}</Button>
    </header>

    {error && <Alert color="failure">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1">{error}</p>
        <Button type="button" size="sm" color="light" onClick={loadData}>Try again</Button>
      </div>
    </Alert>}

    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Payout balance summary">
      <HostCard eyebrow="Available balance">
        <strong className="block text-2xl font-bold text-navy tabular-nums">KES {(wallet?.balance || 0).toLocaleString()}</strong>
        <small className="block text-xs text-muted">Ready for the next payout</small>
      </HostCard>
      <HostCard eyebrow="Total earned">
        <strong className="block text-2xl font-bold text-navy tabular-nums">KES {(wallet?.totalEarned || 0).toLocaleString()}</strong>
        <small className="block text-xs text-muted">Recorded host earnings</small>
      </HostCard>
      <HostCard eyebrow="Total paid out">
        <strong className="block text-2xl font-bold text-navy tabular-nums">KES {(wallet?.totalPaidOut || 0).toLocaleString()}</strong>
        <small className="block text-xs text-muted">Completed host payouts</small>
      </HostCard>
      {/* Earned but not yet withdrawable. Shown so a stay that has not started
          does not look like missing money. */}
      <HostCard eyebrow="Held until check-in">
        <strong className="block text-2xl font-bold text-navy tabular-nums">KES {(wallet?.pendingBalance || 0).toLocaleString()}</strong>
        <small className="block text-xs text-muted">
          {(wallet?.pendingBookings || 0) === 1
            ? '1 stay releasing after check-in'
            : `${wallet?.pendingBookings || 0} stays releasing after check-in`}
        </small>
      </HostCard>
    </section>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <HostCard
        title="Payout destination"
        description="Where your available balance is sent."
        action={<Badge color={destination?.method ? 'success' : 'warning'}>{destination?.method ? 'Ready' : 'Needs setup'}</Badge>}
      >
        <div className="rounded-xl bg-surface px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{destination?.method || 'NOT CONFIGURED'}</span>
          <strong className="mt-1 block text-sm font-semibold text-navy">{destination?.label || 'Add a payout destination'}</strong>
          <small className="mt-1 block text-xs text-muted">{destination?.maskedAccount || 'Bank or mobile money details are required before payout.'}</small>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><dt className="text-muted">Next payout</dt><dd className="font-semibold text-navy">{wallet?.nextPayoutAt ? new Date(wallet.nextPayoutAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not scheduled'}</dd></div>
          <div className="flex flex-wrap items-center justify-between gap-3"><dt className="text-muted">Last payout</dt><dd className="font-semibold text-navy">{formatDate(wallet?.lastPayoutAt)}</dd></div>
        </dl>
        <Button as={Link} to="/host/settings" color="light" size="sm" className="w-fit">{destination?.method ? 'Update payout details' : 'Add payout details'}</Button>
      </HostCard>

      <HostCard
        className="lg:col-span-2"
        title="WHT statement"
        description="Withholding tax certificates for KRA returns."
        action={<span className="text-xs font-medium text-muted">5% rate</span>}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="wht-month" className="mb-1.5 block">Statement month</Label>
            <TextInput id="wht-month" type="month" value={whtMonth} onChange={(event) => setWhtMonth(event.target.value)} />
          </div>
          <Button type="button" size="sm" onClick={loadWht}>View statement</Button>
        </div>
        {whtData ? <div className="space-y-4">
          <div className="rounded-xl bg-surface px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{whtMonth || 'ALL TIME'}</span>
            <strong className="mt-1 block text-xl font-bold text-navy tabular-nums">KES {(whtData.totalWht || 0).toLocaleString()} WHT</strong>
            <small className="mt-1 block text-xs text-muted">From KES {(whtData.totalEarnings || 0).toLocaleString()} host earnings</small>
          </div>

          {/* Four columns cannot fit 390px without sideways scrolling, so narrow
              screens get the same rows stacked instead of a scrolling table. */}
          <ul className="divide-y divide-border text-sm sm:hidden">
            {whtData.bookings.map((booking, index) => <li key={booking.id || index} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2">
              <span className="w-full break-words font-medium text-navy">{booking.property?.title || 'Property'}</span>
              <span className="text-xs text-muted">{formatDate(booking.paidAt)}</span>
              <span className="tabular-nums text-navy">KES {(booking.hostNetAmount || 0).toLocaleString()}</span>
              <span className="tabular-nums text-muted">WHT KES {(booking.withholdingTax || 0).toLocaleString()}</span>
            </li>)}
          </ul>

          <div className="hidden sm:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Property</TableHeadCell>
                  <TableHeadCell>Paid date</TableHeadCell>
                  <TableHeadCell className="text-right">Earnings</TableHeadCell>
                  <TableHeadCell className="text-right">WHT</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {whtData.bookings.map((booking, index) => <TableRow key={booking.id || index}>
                  <TableCell className="max-w-[14rem] truncate">{booking.property?.title || 'Property'}</TableCell>
                  <TableCell>{formatDate(booking.paidAt)}</TableCell>
                  <TableCell className="tabular-nums text-right">KES {(booking.hostNetAmount || 0).toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums text-right">KES {(booking.withholdingTax || 0).toLocaleString()}</TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" color="light" size="sm" onClick={csvWht}>Download CSV</Button>
            <Button type="button" color="light" size="sm" onClick={printWht}>Print PDF</Button>
          </div>
        </div> : <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
          <strong className="text-sm font-semibold text-navy">Choose a month, or leave it empty for all time</strong>
          <p className="text-xs text-muted">An empty month sums every withholding tax entry recorded on your account.</p>
        </div>}
      </HostCard>
    </div>

    <HostCard
      title="Payout history"
      description="Completed and in-flight transfers to your destination."
      action={<span className="text-xs font-medium text-muted">{payouts.length} records</span>}
    >
      {payouts.length === 0 ? <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
        <strong className="text-sm font-semibold text-navy">No payouts yet</strong>
        <p className="text-xs text-muted">Your first payout will appear here after a transfer is created.</p>
      </div> : <>
        <ul className="divide-y divide-border text-sm sm:hidden">
          {payouts.map((payout) => <li key={payout.id} className="space-y-1 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="tabular-nums text-navy">KES {(payout.amount || 0).toLocaleString()}</strong>
              <Badge color={STATUS_BADGE_COLORS[payout.status] || 'gray'}>{payout.status}</Badge>
            </div>
            <p className="text-xs text-muted">{formatDate(payout.createdAt)} · {payout.bookingsCount || 0} bookings</p>
            {payout.failureReason && <p className="break-words text-xs text-muted">{payout.failureReason}</p>}
          </li>)}
        </ul>

        <div className="hidden sm:block">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell className="text-right">Amount</TableHeadCell>
                <TableHeadCell className="text-right">Bookings</TableHeadCell>
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
              <TableCell>{formatDate(payout.createdAt)}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </div>
      </>}
    </HostCard>
  </div>;
}

export default HostPayouts;
