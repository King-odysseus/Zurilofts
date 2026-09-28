import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Select, TextInput } from 'flowbite-react';
import apiClient from '../api/client.js';
import { FlowbiteGauge } from '../components/FlowbiteChart.jsx';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REVERSED', label: 'Reversed' },
];

function formatKes(value) {
  const amount = Number(value);
  return `KES ${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-KE')}`;
}

function formatDate(value) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusTone(status) {
  if (status === 'SUCCESS') return 'is-success';
  if (status === 'FAILED') return 'is-danger';
  if (status === 'PROCESSING') return 'is-info';
  if (status === 'REVERSED') return 'is-warning';
  return 'is-neutral';
}

function payoutLabel(payout) {
  return `${payout.host?.firstName || ''} ${payout.host?.lastName || ''}`.trim() || payout.host?.email || 'Host account';
}

function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState('');
  const [scheduledRunning, setScheduledRunning] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await apiClient.get('/admin/payouts', { params });
      setPayouts(response.data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Payouts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const visiblePayouts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return payouts;
    return payouts.filter((payout) => {
      const haystack = [
        payoutLabel(payout),
        payout.host?.email,
        payout.status,
        payout.amount,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [payouts, search]);

  const totals = useMemo(() => payouts.reduce((result, payout) => {
    const amount = Number(payout.amount) || 0;
    if (payout.status === 'PENDING') result.pending += 1;
    if (payout.status === 'PROCESSING') result.processing += 1;
    if (payout.status === 'SUCCESS') {
      result.success += 1;
      result.paid += amount;
    }
    if (payout.status === 'FAILED') result.failed += 1;
    if (payout.status === 'REVERSED') result.reversed += 1;
    return result;
  }, { pending: 0, processing: 0, paid: 0, success: 0, failed: 0, reversed: 0 }), [payouts]);

  const payoutStatusTotal = totals.pending + totals.processing + totals.success + totals.failed + totals.reversed;
  const payoutGaugeItems = [
    {
      label: 'Settlement success',
      value: payoutStatusTotal > 0 ? (totals.success / payoutStatusTotal) * 100 : 0,
      note: `${totals.success} successful payouts`,
      color: '#3F8F62',
    },
    {
      label: 'In flight',
      value: payoutStatusTotal > 0 ? ((totals.pending + totals.processing) / payoutStatusTotal) * 100 : 0,
      note: `${totals.pending} pending and ${totals.processing} processing`,
      color: '#C49A6C',
    },
    {
      label: 'Needs attention',
      value: payoutStatusTotal > 0 ? ((totals.failed + totals.reversed) / payoutStatusTotal) * 100 : 0,
      note: `${totals.failed} failed and ${totals.reversed} reversed`,
      color: '#C85C52',
    },
  ];

  const kpis = [
    { label: 'PENDING PAYOUTS', value: totals.pending.toLocaleString(), note: 'Waiting for processing' },
    { label: 'PROCESSING', value: totals.processing.toLocaleString(), note: 'Currently with the payment rail' },
    { label: 'PAID OUT', value: formatKes(totals.paid), note: 'Successful payout volume' },
    { label: 'FAILED', value: totals.failed.toLocaleString(), note: 'Requires review or retry' },
  ];

  async function triggerPayout(hostId) {
    setBusyId(hostId);
    setMessage('');
    try {
      const response = await apiClient.post('/admin/payouts/trigger', { hostId });
      setMessage(response.data.message || 'Payout initiated.');
      await loadPayouts();
    } catch (requestError) {
      setMessage(requestError.response?.data?.error || 'Payout failed.');
    } finally {
      setBusyId('');
      setConfirmAction(null);
    }
  }

  async function runScheduled() {
    setScheduledRunning(true);
    setMessage('');
    try {
      const response = await apiClient.post('/admin/payouts/run-scheduled');
      const data = response.data.data || {};
      setMessage(`Processed: ${(data.processed || []).length}, failed: ${(data.failed || []).length}`);
      await loadPayouts();
    } catch (requestError) {
      setMessage(requestError.response?.data?.error || 'Scheduled payout run failed.');
    } finally {
      setScheduledRunning(false);
      setConfirmAction(null);
    }
  }

  function openRetry(payout) {
    setConfirmAction({
      title: 'Retry payout',
      message: `Retry ${formatKes(payout.amount)} for ${payoutLabel(payout)}?`,
      confirmLabel: 'Retry payout',
      action: () => triggerPayout(payout.hostId),
    });
  }

  function openScheduled() {
    setConfirmAction({
      title: 'Run scheduled payouts',
      message: 'Process every payout that is currently due. Failed transfers will be reported in the result.',
      confirmLabel: 'Run payouts',
      action: runScheduled,
    });
  }

  return (
    <div className="op-admin-overview op-admin-payouts" data-openpencil-frame="0:7116">
      <div className="op-admin-heading op-admin-finance-heading">
        <div>
          <p className="op-admin-eyebrow">ZURILOFTS · ADMIN · FINANCE</p>
          <h1>Payouts</h1>
          <p>Monitor host settlements, retry failed transfers, and run scheduled payment batches.</p>
        </div>
        <Button className="op-admin-bronze-button" onClick={openScheduled} disabled={scheduledRunning}>
          {scheduledRunning ? 'Running...' : 'Run scheduled'}
        </Button>
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

      <section className="op-admin-finance-toolbar op-admin-payout-toolbar" aria-label="Payout filters">
        <label className="op-admin-finance-field op-admin-finance-search">
          <span>Search</span>
          <TextInput
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search host, email, or amount"
            aria-label="Search payouts"
          />
        </label>
        <label className="op-admin-finance-field">
          <span>Status</span>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter payouts by status">
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </label>
      </section>

      {error && <div className="op-admin-error" role="alert">{error}</div>}
      {message && (
        <div className={`op-admin-people-message ${message.toLowerCase().includes('fail') ? 'is-error' : 'is-success'}`} role="status">
          {message}
        </div>
      )}

      <section className="op-admin-finance-panel op-admin-finance-gauge-panel">
        <div className="op-admin-finance-panel-head">
          <div>
            <h2>Settlement health</h2>
            <p>Current payout status mix across the visible ledger.</p>
          </div>
          <span>{payoutStatusTotal} payouts</span>
        </div>
        <div className="op-flowbite-gauge-grid op-admin-payout-gauge-grid">
          {payoutGaugeItems.map((item) => (
            <FlowbiteGauge
              key={item.label}
              label={item.label}
              value={item.value}
              note={item.note}
              color={item.color}
              height={122}
            />
          ))}
        </div>
      </section>

      <section className="op-admin-finance-board">
        <div className="op-admin-finance-board-head">
          <div>
            <h2>Payout ledger</h2>
            <p>Host settlement requests and payment rail status.</p>
          </div>
          <span>{visiblePayouts.length} records</span>
        </div>
        <div className="op-admin-finance-scroll">
          <div className="op-admin-finance-table op-admin-payout-columns" role="table" aria-label="Host payouts">
            <div className="op-admin-finance-columns" role="row">
              <span role="columnheader">HOST</span>
              <span role="columnheader">AMOUNT</span>
              <span role="columnheader">BOOKINGS</span>
              <span role="columnheader">STATUS</span>
              <span role="columnheader">INITIATED</span>
              <span role="columnheader">COMPLETED</span>
              <span role="columnheader">ACTION</span>
            </div>
            {loading ? (
              <div className="op-admin-finance-loading" role="row">
                <span className="op-admin-booking-spinner" aria-hidden="true" />
                <strong>Loading payouts</strong>
                <p>Fetching the latest settlement ledger.</p>
              </div>
            ) : visiblePayouts.length === 0 ? (
              <div className="op-admin-finance-empty" role="row">No payouts match the current view.</div>
            ) : visiblePayouts.map((payout) => (
              <div className="op-admin-finance-row" role="row" key={payout.id || `${payout.hostId}-${payout.createdAt}`}>
                <div className="op-admin-finance-cell" role="cell">
                  <small>Host</small>
                  <strong>{payoutLabel(payout)}</strong>
                  <span>{payout.host?.email || 'Email unavailable'}</span>
                </div>
                <div className="op-admin-finance-cell" role="cell">
                  <small>Amount</small>
                  <strong>{formatKes(payout.amount)}</strong>
                </div>
                <div className="op-admin-finance-cell" role="cell">
                  <small>Bookings</small>
                  <strong>{Number(payout.bookingsCount || 0).toLocaleString()}</strong>
                </div>
                <div className="op-admin-finance-cell" role="cell">
                  <small>Status</small>
                  <span className={`op-admin-finance-status ${statusTone(payout.status)}`}>{payout.status || 'PENDING'}</span>
                  {payout.failureReason && <span className="op-admin-finance-failure">{payout.failureReason}</span>}
                </div>
                <div className="op-admin-finance-cell" role="cell">
                  <small>Initiated</small>
                  <strong>{formatDate(payout.createdAt)}</strong>
                </div>
                <div className="op-admin-finance-cell" role="cell">
                  <small>Completed</small>
                  <strong>{formatDate(payout.completedAt)}</strong>
                </div>
                <div className="op-admin-finance-cell op-admin-finance-actions" role="cell">
                  <small>Action</small>
                  {(payout.status === 'FAILED' || payout.status === 'PENDING') ? (
                    <button type="button" onClick={() => openRetry(payout)} disabled={busyId === payout.hostId}>
                      {busyId === payout.hostId ? 'Working...' : 'Retry'}
                    </button>
                  ) : (
                    <span>No action</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {confirmAction && (
        <div className="op-admin-dialog-backdrop" role="presentation" onMouseDown={() => !scheduledRunning && !busyId && setConfirmAction(null)}>
          <div
            className="op-admin-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payout-confirm-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 id="payout-confirm-title">{confirmAction.title}</h3>
            <p>{confirmAction.message}</p>
            <div className="op-admin-dialog-actions">
              <Button color="light" onClick={() => setConfirmAction(null)} disabled={scheduledRunning || Boolean(busyId)}>Cancel</Button>
              <Button className="op-admin-bronze-button" onClick={confirmAction.action} disabled={scheduledRunning || Boolean(busyId)}>
                {scheduledRunning || busyId ? 'Working...' : confirmAction.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPayoutsPage;
