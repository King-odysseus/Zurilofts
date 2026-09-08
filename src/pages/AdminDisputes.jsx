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
      <div className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 sm:px-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222222]">Disputes</h1>
          <p className="text-sm text-[#6b7280] mt-1">Booking-linked disputes between guests and hosts.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-[44px] rounded-xl border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20">
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Disputes in view', rows.length],
          ['Open', rows.filter((row) => row.status === 'OPEN').length],
          ['Under review', rows.filter((row) => row.status === 'UNDER_REVIEW').length],
          ['Resolved', rows.filter((row) => row.status === 'RESOLVED').length],
        ].map(([label, value]) => <div key={label} className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">{label}</p><p className="mt-2 text-2xl font-bold text-[#222222]">{value}</p></div>)}
      </div>
      {message && <div className="rounded-[14px] bg-[#222222]/5 px-4 py-3 text-sm text-[#222222]">{message}</div>}
      {loading ? (
        <div className="py-16 text-center text-[#6b7280]">Loading disputes...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-[14px] shadow-sm bg-white p-12 text-center text-[#6b7280]">No disputes in this view.</div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#E5E7EB] text-left"><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Booking</th><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Raised by</th><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Category</th><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Status</th><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]"></th></tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-[#E5E7EB]/60 hover:bg-[#222222]/5">
                  <td className="p-4"><p className="font-semibold text-[#222222]">{d.booking?.property?.title || d.bookingId}</p></td>
                  <td className="p-4">{d.raisedByRole}</td>
                  <td className="p-4">{CATEGORY_LABELS[d.category] || d.category}</td>
                  <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[d.status]}`}>{d.status.replaceAll('_', ' ')}</span></td>
                  <td className="p-4"><button onClick={() => open(d.id)} disabled={busy === d.id} className="rounded-lg shadow-sm hover:shadow-md transition-shadow px-4 py-2 text-xs font-semibold text-[#2563EB] hover:bg-[#2563EB] hover:text-white disabled:opacity-50">Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => !busy && setSelected(null)}>
          <div className="h-full w-full max-w-3xl overflow-y-auto border-l border-[#E5E7EB] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Dispute review</p>
                <h2 className="mt-1 text-xl font-bold text-[#222222]">{CATEGORY_LABELS[selected.category] || selected.category}</h2>
                <p className="text-sm text-[#6b7280]">Booking {selected.bookingId}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-xl leading-none text-[#6b7280] hover:bg-[#F7F7F5]" aria-label="Close dispute review">&times;</button>
            </div>
            <div className="space-y-6 p-6">
              <p className="rounded-[14px] bg-canvas p-4 text-sm text-[#222222] whitespace-pre-wrap">{selected.description}</p>

              <div>
                <h3 className="font-bold text-[#222222] mb-2">Evidence</h3>
                <ul className="text-sm text-[#6b7280] space-y-1">
                  {(selected.evidence || []).map((e) => <li key={e.id}>{e.originalName}</li>)}
                  {selected.evidence?.length === 0 && <li>No evidence uploaded.</li>}
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-[#222222] mb-2">Messages (visible to both parties)</h3>
                <ul className="space-y-2 mb-3 max-h-56 overflow-y-auto">
                  {(selected.messages || []).map((m) => (
                    <li key={m.id} className="rounded-xl bg-canvas p-3">
                      <p className="text-xs font-semibold text-[#222222]">{m.senderRole}</p>
                      <p className="text-sm text-[#222222] whitespace-pre-wrap">{m.body}</p>
                    </li>
                  ))}
                  {selected.messages?.length === 0 && <li className="text-sm text-[#6b7280]">No messages yet.</li>}
                </ul>
                {!closed && (
                  <div className="flex gap-2">
                    <input value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Message both parties..." className="min-h-[44px] flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20" />
                    <button onClick={handleSendMessage} disabled={busy === 'message'} className="min-h-[44px] rounded-lg bg-[#C49A6C] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-[#B8895C]">Send</button>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-[#222222] mb-2">Private notes (admin only)</h3>
                <ul className="space-y-2 mb-3">
                  {(selected.notes || []).map((n) => (
                    <li key={n.id} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 whitespace-pre-wrap">{n.body}</li>
                  ))}
                  {selected.notes?.length === 0 && <li className="text-sm text-[#6b7280]">No private notes yet.</li>}
                </ul>
                <div className="flex gap-2">
                  <input value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add a private note..." className="min-h-[44px] flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20" />
                  <button onClick={handleAddNote} disabled={busy === 'note'} className="min-h-[44px] rounded-lg border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow px-4 py-2 text-xs font-semibold text-[#222222] disabled:opacity-50">Add note</button>
                </div>
              </div>

              {!closed && (
                <div className="rounded-[14px] shadow-sm p-5">
                  <label className="block text-sm font-semibold text-[#222222] mb-2">Resolution summary (required to resolve)</label>
                  <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows="3" className="w-full rounded-[14px] border border-[#E5E7EB] px-5 py-3 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20" />
                  <div className="mt-4 flex flex-wrap gap-3">
                    {selected.status === 'OPEN' && (
                      <button onClick={() => handleStatus('UNDER_REVIEW')} disabled={Boolean(busy)} className="min-h-[44px] rounded-lg bg-[#d97706] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#b45309]">Mark under review</button>
                    )}
                    <button onClick={() => handleStatus('RESOLVED')} disabled={Boolean(busy)} className="min-h-[44px] rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Resolve</button>
                    <button onClick={() => handleStatus('DISMISSED')} disabled={Boolean(busy)} className="min-h-[44px] rounded-lg border border-red-200 shadow-sm hover:shadow-md transition-shadow px-5 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50">Dismiss</button>
                  </div>
                </div>
              )}
              {closed && selected.resolution && (
                <div className="rounded-[14px] bg-green-50 border border-green-200 p-4 text-sm text-green-800">{selected.resolution}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDisputes;
