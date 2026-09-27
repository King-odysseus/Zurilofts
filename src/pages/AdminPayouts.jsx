import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import Dropdown from '../components/Dropdown';

const statusColors = {
  PENDING: 'bg-[#FDE8D8] text-[#9A4A1D]',
  PROCESSING: 'bg-[#EAF0F4] text-[#52606F]',
  SUCCESS: 'bg-[#E8F4EC] text-[#287A45]',
  FAILED: 'bg-[#FDECEC] text-[#B42318]',
  REVERSED: 'bg-[#FEF3C7] text-[#B45309]',
};

function AdminPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState('');
  const [triggering, setTriggering] = useState('');
  const [scheduledRunning, setScheduledRunning] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);

  async function loadPayouts(status) {
    setLoading(true);
    try {
      const params = status ? { status } : {};
      const res = await apiClient.get('/admin/payouts', { params });
      setPayouts(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayouts(statusFilter);
  }, [statusFilter]);

  async function triggerPayout(hostId) {
    if (!window.confirm('Trigger payout for this host?')) return;
    setTriggering(hostId);
    setMessage('');
    try {
      const res = await apiClient.post('/admin/payouts/trigger', { hostId });
      setMessage(res.data.message || 'Payout initiated');
      loadPayouts(statusFilter);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Payout failed');
    } finally {
      setTriggering('');
    }
  }

  async function runScheduled() {
    if (!window.confirm('Run all scheduled payouts now?')) return;
    setScheduledRunning(true);
    setMessage('');
    try {
      const res = await apiClient.post('/admin/payouts/run-scheduled');
      const d = res.data.data;
      setMessage(`Processed: ${d.processed.length}, Failed: ${d.failed.length}`);
      loadPayouts(statusFilter);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Batch failed');
    } finally {
      setScheduledRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E3E8EF] bg-white px-5 py-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)] sm:px-6">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#C49A6C]">Workspace / Payments</p><h1 className="text-2xl font-bold text-[#0B1F42]">Payouts</h1></div>
        <div className="flex items-center gap-3">
          <Dropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'PROCESSING', label: 'Processing' },
              { value: 'SUCCESS', label: 'Success' },
              { value: 'FAILED', label: 'Failed' },
              { value: 'REVERSED', label: 'Reversed' },
            ]}
            triggerClassName="h-12 rounded-[10px] border-0 bg-[#F7F4EF] px-4 py-2 text-sm text-[#0B1F42]"
            ariaLabel="Filter by status"
          />
          <button
            onClick={runScheduled}
            disabled={scheduledRunning}
            className="min-h-[44px] rounded-[10px] bg-[#0B1F42] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#07072E] disabled:opacity-50"
          >
            {scheduledRunning ? 'Running...' : 'Run Scheduled Payouts'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Payouts in view', payouts.length],
          ['Pending', payouts.filter((p) => p.status === 'PENDING').length],
          ['Successful', payouts.filter((p) => p.status === 'SUCCESS').length],
          ['Failed', payouts.filter((p) => p.status === 'FAILED').length],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#E3E8EF] bg-white p-4 shadow-[0_4px_16px_rgba(11,31,66,0.04)]"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">{label}</p><p className="mt-2 text-2xl font-bold text-[#0B1F42]">{value}</p></div>)}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Payout status">
        {[['', 'All'], ['PENDING', 'Pending'], ['PROCESSING', 'Processing'], ['SUCCESS', 'Success'], ['FAILED', 'Failed']].map(([value, label]) => (
          <button key={value || 'all'} type="button" role="tab" aria-selected={statusFilter === value} onClick={() => setStatusFilter(value)} className={`rounded-[10px] px-4 py-2 text-xs font-semibold transition-colors ${statusFilter === value ? 'bg-[#0B1F42] text-white' : 'border border-[#E5E7EB] bg-white text-[#52606F] hover:bg-[#F7F4EF]'}`}>{label}</button>
        ))}
      </div>

      {message && (
        <div className={`rounded-2xl p-3 text-sm font-medium ${message.includes('Failed') ? 'bg-[#FDECEC] text-[#B42318]' : 'bg-[#E8F4EC] text-[#287A45]'}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#C49A6C] border-t-transparent"></div>
          <p className="text-[#5B6B82]">Loading payouts...</p>
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#5B6B82]">No payouts found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-left">
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Host</th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Amount (KES)</th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Bookings</th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Status</th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Initiated</th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Completed</th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-[#E5E7EB]/50 hover:bg-[#F7F4EF]">
                  <td className="p-4">
                    <div className="font-medium text-[#0B1F42]">
                      {p.host?.firstName} {p.host?.lastName}
                    </div>
                    <div className="text-xs text-[#6b7280]">{p.host?.email}</div>
                  </td>
                  <td className="p-4 font-medium">
                    {p.amount?.toLocaleString()}
                  </td>
                  <td className="p-4">{p.bookingsCount}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[p.status] || 'bg-gray-100 text-gray-700'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-[#6b7280]">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                  <td className="p-4 text-[#6b7280]">
                    {p.completedAt ? new Date(p.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setSelectedPayout(p)} className="text-xs font-semibold text-[#0B1F42] transition-colors hover:text-[#07072E]">Review</button>
                      {(p.status === 'FAILED' || p.status === 'PENDING') && (
                        <button
                          onClick={() => triggerPayout(p.hostId)}
                          disabled={triggering === p.hostId}
                          className="text-xs font-semibold text-[#B8895C] transition-colors hover:text-[#9A744A] disabled:opacity-50"
                        >
                          {triggering === p.hostId ? '...' : 'Retry'}
                        </button>
                      )}
                    </div>
                    {p.failureReason && (
                      <p className="text-xs text-red-500 mt-1">{p.failureReason}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPayout && (
        <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setSelectedPayout(null)}>
          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-[#E5E7EB] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C49A6C]">Payout review</p><h2 className="mt-1 text-xl font-bold text-[#0B1F42]">{selectedPayout.host?.firstName} {selectedPayout.host?.lastName}</h2></div>
              <button type="button" onClick={() => setSelectedPayout(null)} className="rounded-lg p-2 text-xl leading-none text-[#6b7280] hover:bg-[#F7F7F5]" aria-label="Close payout review">×</button>
            </div>
            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between"><span className="text-[#6b7280]">Amount</span><span className="text-lg font-bold text-[#222222]">KES {selectedPayout.amount?.toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span className="text-[#6b7280]">Bookings</span><span className="font-semibold text-[#222222]">{selectedPayout.bookingsCount}</span></div>
              <div className="flex items-center justify-between"><span className="text-[#6b7280]">Status</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[selectedPayout.status] || 'bg-gray-100 text-gray-700'}`}>{selectedPayout.status}</span></div>
              <div className="flex items-center justify-between"><span className="text-[#6b7280]">Initiated</span><span className="font-semibold text-[#222222]">{selectedPayout.createdAt ? new Date(selectedPayout.createdAt).toLocaleDateString('en-GB') : '-'}</span></div>
              <div className="flex items-center justify-between"><span className="text-[#6b7280]">Completed</span><span className="font-semibold text-[#222222]">{selectedPayout.completedAt ? new Date(selectedPayout.completedAt).toLocaleDateString('en-GB') : '-'}</span></div>
            </div>
            {selectedPayout.failureReason && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{selectedPayout.failureReason}</p>}
            {(selectedPayout.status === 'FAILED' || selectedPayout.status === 'PENDING') && <button type="button" onClick={() => triggerPayout(selectedPayout.hostId)} disabled={triggering === selectedPayout.hostId} className="mt-6 min-h-[44px] w-full rounded-[10px] bg-[#0B1F42] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#07072E] disabled:opacity-50">{triggering === selectedPayout.hostId ? 'Retrying...' : 'Retry payout'}</button>}
          </aside>
        </div>
      )}
    </div>
  );
}

export default AdminPayouts;
