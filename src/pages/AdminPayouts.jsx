import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import Dropdown from '../components/Dropdown';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SUCCESS: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REVERSED: 'bg-orange-100 text-orange-700',
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
      <div className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 sm:px-6 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-[#222222]">Payouts</h1>
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
            triggerClassName=" min-h-[44px] px-4 py-2 bg-white border border-[#E5E7EB] text-[#222222] rounded-xl text-sm"
            ariaLabel="Filter by status"
          />
          <button
            onClick={runScheduled}
            disabled={scheduledRunning}
            className="bg-[#C49A6C] text-white text-sm font-semibold min-h-[44px] px-4 py-2 rounded-lg hover:bg-[#B8895C] transition-colors disabled:opacity-50"
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
        ].map(([label, value]) => <div key={label} className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">{label}</p><p className="mt-2 text-2xl font-bold text-[#222222]">{value}</p></div>)}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Payout status">
        {[['', 'All'], ['PENDING', 'Pending'], ['PROCESSING', 'Processing'], ['SUCCESS', 'Success'], ['FAILED', 'Failed']].map(([value, label]) => (
          <button key={value || 'all'} type="button" role="tab" aria-selected={statusFilter === value} onClick={() => setStatusFilter(value)} className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${statusFilter === value ? 'bg-[#2563EB] text-white' : 'border border-[#E5E7EB] bg-white text-[#222222] hover:bg-[#F7F7F5]'}`}>{label}</button>
        ))}
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm font-medium ${message.includes('Failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6b7280]">Loading payouts...</p>
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#6b7280]">No payouts found</p>
        </div>
      ) : (
        <div className="bg-white rounded-[14px] shadow-lg overflow-x-auto">
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
                <tr key={p.id} className="border-b border-[#E5E7EB]/50 hover:bg-[#222222]/5">
                  <td className="p-4">
                    <div className="font-medium text-[#222222]">
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
                      <button type="button" onClick={() => setSelectedPayout(p)} className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors">Review</button>
                      {(p.status === 'FAILED' || p.status === 'PENDING') && (
                        <button
                          onClick={() => triggerPayout(p.hostId)}
                          disabled={triggering === p.hostId}
                          className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors disabled:opacity-50"
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
              <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Payout review</p><h2 className="mt-1 text-xl font-bold text-[#222222]">{selectedPayout.host?.firstName} {selectedPayout.host?.lastName}</h2></div>
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
            {(selectedPayout.status === 'FAILED' || selectedPayout.status === 'PENDING') && <button type="button" onClick={() => triggerPayout(selectedPayout.hostId)} disabled={triggering === selectedPayout.hostId} className="mt-6 min-h-[44px] w-full rounded-lg bg-[#C49A6C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B8895C] disabled:opacity-50">{triggering === selectedPayout.hostId ? 'Retrying...' : 'Retry payout'}</button>}
          </aside>
        </div>
      )}
    </div>
  );
}

export default AdminPayouts;
