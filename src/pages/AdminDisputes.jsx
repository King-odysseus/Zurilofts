import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client.js';

const STATUS_STYLES = {
  OPEN: 'bg-amber-100 text-amber-800', UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-700', DISMISSED: 'bg-gray-100 text-gray-700',
};

const CATEGORY_LABELS = {
  PROPERTY_CONDITION: 'Property condition', PAYMENT: 'Payment issue',
  CONDUCT: 'Conduct', CANCELLATION: 'Cancellation', OTHER: 'Other',
};

function AdminDisputes() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('OPEN');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [resolution, setResolution] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/disputes', { params: status ? { status } : {} });
      setRows(response.data.data || []);
    } catch { setMessage('Could not load disputes.'); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function open(id) {
    setBusy(id); setMessage(''); setNoteBody(''); setMessageBody(''); setResolution('');
    try {
      const response = await apiClient.get(`/admin/disputes/${id}`);
      setSelected(response.data.data);
    } catch (error) { setMessage(error.response?.data?.error || 'Could not load the dispute.'); }
    finally { setBusy(''); }
  }

  async function refreshSelected() {
    const response = await apiClient.get(`/admin/disputes/${selected.id}`);
    setSelected(response.data.data);
  }

  async function handleAddNote() {
    if (!noteBody.trim()) return;
    setBusy('note');
    try {
      await apiClient.post(`/admin/disputes/${selected.id}/notes`, { body: noteBody.trim() });
      setNoteBody('');
      await refreshSelected();
    } catch (error) { setMessage(error.response?.data?.error || 'Could not add note.'); }
    finally { setBusy(''); }
  }

  async function handleSendMessage() {
    if (!messageBody.trim()) return;
    setBusy('message');
    try {
      await apiClient.post(`/admin/disputes/${selected.id}/messages`, { body: messageBody.trim() });
      setMessageBody('');
      await refreshSelected();
    } catch (error) { setMessage(error.response?.data?.error || 'Could not send message.'); }
    finally { setBusy(''); }
  }

  async function handleStatus(newStatus) {
    if (newStatus === 'RESOLVED' && !resolution.trim()) { setMessage('Enter a resolution summary first.'); return; }
    setBusy(newStatus);
    try {
      await apiClient.patch(`/admin/disputes/${selected.id}/status`, { status: newStatus, resolution: resolution.trim() || undefined });
      setMessage('Dispute updated.');
      setSelected(null);
      await load();
    } catch (error) { setMessage(error.response?.data?.error || 'Could not update dispute.'); }
    finally { setBusy(''); }
  }

  const closed = selected && (selected.status === 'RESOLVED' || selected.status === 'DISMISSED');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B0B45]">Disputes</h1>
          <p className="text-sm text-[#6b7280] mt-1">Booking-linked disputes between guests and hosts.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-full border border-[#D9D9D9] bg-white px-5 py-2.5 text-sm focus:outline-none focus:border-[#C49A6C]">
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>
      {message && <div className="rounded-2xl bg-[#0B0B45]/5 px-4 py-3 text-sm text-[#0B0B45]">{message}</div>}
      {loading ? (
        <div className="py-16 text-center text-[#6b7280]">Loading disputes...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl shadow-sm bg-white p-12 text-center text-[#6b7280]">No disputes in this view.</div>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#D9D9D9] text-left"><th className="p-4">Booking</th><th className="p-4">Raised by</th><th className="p-4">Category</th><th className="p-4">Status</th><th className="p-4"></th></tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-[#D9D9D9]/60 hover:bg-[#0B0B45]/5">
                  <td className="p-4"><p className="font-semibold text-[#1f2937]">{d.booking?.property?.title || d.bookingId}</p></td>
                  <td className="p-4">{d.raisedByRole}</td>
                  <td className="p-4">{CATEGORY_LABELS[d.category] || d.category}</td>
                  <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[d.status]}`}>{d.status.replaceAll('_', ' ')}</span></td>
                  <td className="p-4"><button onClick={() => open(d.id)} disabled={busy === d.id} className="rounded-full shadow-sm hover:shadow-md transition-shadow px-4 py-2 text-xs font-semibold text-[#C49A6C] hover:bg-[#C49A6C] hover:text-white disabled:opacity-50">Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setSelected(null)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D9D9D9] bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-[#0B0B45]">{CATEGORY_LABELS[selected.category] || selected.category}</h2>
                <p className="text-sm text-[#6b7280]">Booking {selected.bookingId}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-full px-3 py-2 text-xl text-[#6b7280] hover:bg-gray-100">&times;</button>
            </div>
            <div className="space-y-6 p-6">
              <p className="rounded-2xl bg-[#F3F4F6] p-4 text-sm text-[#1f2937] whitespace-pre-wrap">{selected.description}</p>

              <div>
                <h3 className="font-bold text-[#0B0B45] mb-2">Evidence</h3>
                <ul className="text-sm text-[#6b7280] space-y-1">
                  {(selected.evidence || []).map((e) => <li key={e.id}>{e.originalName}</li>)}
                  {selected.evidence?.length === 0 && <li>No evidence uploaded.</li>}
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-[#0B0B45] mb-2">Messages (visible to both parties)</h3>
                <ul className="space-y-2 mb-3 max-h-56 overflow-y-auto">
                  {(selected.messages || []).map((m) => (
                    <li key={m.id} className="rounded-xl bg-[#F3F4F6] p-3">
                      <p className="text-xs font-semibold text-[#0B0B45]">{m.senderRole}</p>
                      <p className="text-sm text-[#1f2937] whitespace-pre-wrap">{m.body}</p>
                    </li>
                  ))}
                  {selected.messages?.length === 0 && <li className="text-sm text-[#6b7280]">No messages yet.</li>}
                </ul>
                {!closed && (
                  <div className="flex gap-2">
                    <input value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Message both parties..." className="flex-1 rounded-xl border border-[#D9D9D9] px-3 py-2 text-sm" />
                    <button onClick={handleSendMessage} disabled={busy === 'message'} className="rounded-full bg-[#0B0B45] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Send</button>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-[#0B0B45] mb-2">Private notes (admin only)</h3>
                <ul className="space-y-2 mb-3">
                  {(selected.notes || []).map((n) => (
                    <li key={n.id} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 whitespace-pre-wrap">{n.body}</li>
                  ))}
                  {selected.notes?.length === 0 && <li className="text-sm text-[#6b7280]">No private notes yet.</li>}
                </ul>
                <div className="flex gap-2">
                  <input value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add a private note..." className="flex-1 rounded-xl border border-[#D9D9D9] px-3 py-2 text-sm" />
                  <button onClick={handleAddNote} disabled={busy === 'note'} className="rounded-full shadow-sm hover:shadow-md transition-shadow px-4 py-2 text-xs font-semibold text-[#1f2937] disabled:opacity-50">Add note</button>
                </div>
              </div>

              {!closed && (
                <div className="rounded-3xl shadow-sm p-5">
                  <label className="block text-sm font-semibold text-[#1f2937] mb-2">Resolution summary (required to resolve)</label>
                  <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows="3" className="w-full rounded-3xl border border-[#D9D9D9] px-5 py-3 focus:outline-none focus:border-[#C49A6C]" />
                  <div className="mt-4 flex flex-wrap gap-3">
                    {selected.status === 'OPEN' && (
                      <button onClick={() => handleStatus('UNDER_REVIEW')} disabled={Boolean(busy)} className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Mark under review</button>
                    )}
                    <button onClick={() => handleStatus('RESOLVED')} disabled={Boolean(busy)} className="rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Resolve</button>
                    <button onClick={() => handleStatus('DISMISSED')} disabled={Boolean(busy)} className="rounded-full shadow-sm hover:shadow-md transition-shadow px-5 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50">Dismiss</button>
                  </div>
                </div>
              )}
              {closed && selected.resolution && (
                <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">{selected.resolution}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDisputes;
