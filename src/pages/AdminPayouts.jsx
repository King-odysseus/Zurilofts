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

  async function loadPayouts(status) {
    setLoading(true);
    try {
      const params = status ? { status } : {};
      const res = await apiClient.get('/admin/payouts', { params });
      setPayouts(res.data.data || []);
    } catch {
      // silent
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-[#0B0B45]">Payouts</h1>
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
            triggerClassName=" px-4 py-2 bg-white text-[#1f2937] rounded-xl text-sm"
            ariaLabel="Filter by status"
          />
          <button
            onClick={runScheduled}
            disabled={scheduledRunning}
            className="bg-[#0B0B45] text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#06062a] transition-colors disabled:opacity-50"
          >
            {scheduledRunning ? 'Running...' : 'Run Scheduled Payouts'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm font-medium ${message.includes('Failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6b7280]">Loading payouts...</p>
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#6b7280]">No payouts found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-[#D9D9D9] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#D9D9D9] text-left">
                <th className="p-4 font-semibold text-[#0B0B45]">Host</th>
                <th className="p-4 font-semibold text-[#0B0B45]">Amount (KES)</th>
                <th className="p-4 font-semibold text-[#0B0B45]">Bookings</th>
                <th className="p-4 font-semibold text-[#0B0B45]">Status</th>
                <th className="p-4 font-semibold text-[#0B0B45]">Initiated</th>
                <th className="p-4 font-semibold text-[#0B0B45]">Completed</th>
                <th className="p-4 font-semibold text-[#0B0B45]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-[#D9D9D9]/50 hover:bg-[#0B0B45]/5">
                  <td className="p-4">
                    <div className="font-medium text-[#1f2937]">
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
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="p-4 text-[#6b7280]">
                    {p.completedAt ? new Date(p.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="p-4">
                    {(p.status === 'FAILED' || p.status === 'PENDING') && (
                      <button
                        onClick={() => triggerPayout(p.hostId)}
                        disabled={triggering === p.hostId}
                        className="text-xs font-semibold text-[#C49A6C] hover:text-[#0B0B45] transition-colors disabled:opacity-50"
                      >
                        {triggering === p.hostId ? '...' : 'Retry'}
                      </button>
                    )}
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
    </div>
  );
}

export default AdminPayouts;
