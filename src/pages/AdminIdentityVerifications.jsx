import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client.js';

const STATUS_STYLES = {
  UNVERIFIED: 'bg-gray-100 text-gray-700', SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700',
};

const DOCUMENT_LABELS = { ID_FRONT: 'ID — front', ID_BACK: 'ID — back', SELFIE: 'Selfie with ID' };

function AdminIdentityVerifications() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('SUBMITTED');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/identity-verifications', { params: status ? { status } : {} });
      setRows(response.data.data || []);
    } catch { setMessage('Could not load identity verifications.'); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function open(id) {
    setBusy(id); setMessage(''); setNote('');
    try {
      const response = await apiClient.get(`/admin/identity-verifications/${id}`);
      setSelected(response.data.data);
    } catch (error) { setMessage(error.response?.data?.error || 'Could not load the verification.'); }
    finally { setBusy(''); }
  }

  async function review(action) {
    if (action === 'reject' && !note.trim()) { setMessage('Enter a reviewer note first.'); return; }
    setBusy(action); setMessage('');
    try {
      await apiClient.post(`/admin/identity-verifications/${selected.id}/${action}`, action === 'approve' ? {} : { reason: note.trim() });
      setMessage(action === 'approve' ? 'Guest verified.' : 'Verification updated.');
      setSelected(null); setNote(''); await load();
    } catch (error) { setMessage(error.response?.data?.error || 'Could not update the verification.'); }
    finally { setBusy(''); }
  }

  async function downloadDocument(document) {
    setBusy(document.id); setMessage('');
    try {
      const response = await apiClient.get(`/admin/identity-verifications/${selected.id}/documents/${document.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement('a');
      anchor.href = url; anchor.download = document.originalName; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setMessage(error.response?.data?.error || 'Could not download the document.'); }
    finally { setBusy(''); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B0B45]">Identity Verifications</h1>
          <p className="text-sm text-[#6b7280] mt-1">Guest identity checks - gates payment on a booking, separate from host account review.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-full bg-white px-5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/30">
          <option value="">All statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="UNVERIFIED">Unverified</option>
        </select>
      </div>
      {message && <div className="rounded-2xl bg-[#0B0B45]/5 px-4 py-3 text-sm text-[#0B0B45]">{message}</div>}
      {loading ? (
        <div className="py-16 text-center text-[#6b7280]">Loading verifications...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center text-[#6b7280] shadow-sm">No verifications in this view.</div>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#D9D9D9] text-left"><th className="p-4">Guest</th><th className="p-4">ID type</th><th className="p-4">Documents</th><th className="p-4">Status</th><th className="p-4"></th></tr></thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className="border-b border-[#D9D9D9]/60 hover:bg-[#0B0B45]/5">
                  <td className="p-4">
                    <p className="font-semibold text-[#1f2937]">{v.fullName || `${v.user?.firstName || ''} ${v.user?.lastName || ''}`}</p>
                    <p className="text-xs text-[#6b7280]">{v.user?.email}</p>
                  </td>
                  <td className="p-4">{v.idType || '—'}</td>
                  <td className="p-4">{v.documents?.length || 0}</td>
                  <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[v.status]}`}>{v.status.replaceAll('_', ' ')}</span></td>
                  <td className="p-4"><button onClick={() => open(v.id)} disabled={busy === v.id} className="rounded-full border border-[#C49A6C] px-4 py-2 text-xs font-semibold text-[#C49A6C] hover:bg-[#C49A6C] hover:text-white disabled:opacity-50">Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setSelected(null)}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D9D9D9] bg-white px-6 py-5">
              <div><h2 className="text-xl font-bold text-[#0B0B45]">{selected.fullName || 'Unnamed'}</h2><p className="text-sm text-[#6b7280]">{selected.user?.email}</p></div>
              <button onClick={() => setSelected(null)} className="rounded-full px-3 py-2 text-xl text-[#6b7280] hover:bg-gray-100">&times;</button>
            </div>
            <div className="space-y-7 p-6">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#f8f9fa] p-3"><p className="text-xs text-[#6b7280]">Date of birth</p><p className="mt-1 text-sm font-semibold text-[#1f2937]">{selected.dateOfBirth || '—'}</p></div>
                <div className="rounded-2xl bg-[#f8f9fa] p-3"><p className="text-xs text-[#6b7280]">ID type</p><p className="mt-1 text-sm font-semibold text-[#1f2937]">{selected.idType || '—'}</p></div>
                <div className="rounded-2xl bg-[#f8f9fa] p-3"><p className="text-xs text-[#6b7280]">ID number</p><p className="mt-1 text-sm font-semibold text-[#1f2937]">{selected.idNumber || '—'}</p></div>
              </div>
              <div>
                <h3 className="font-bold text-[#0B0B45] mb-3">Encrypted documents</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {selected.documents?.map((document) => (
                    <button key={document.id} onClick={() => downloadDocument(document)} disabled={busy === document.id} className="rounded-3xl shadow-sm p-4 text-left hover:shadow-md disabled:opacity-50">
                      <p className="font-semibold text-[#1f2937]">{DOCUMENT_LABELS[document.kind] || document.kind}</p>
                      <p className="mt-1 text-xs text-[#6b7280] break-all">{document.originalName} · {(document.size / 1024 / 1024).toFixed(1)} MB</p>
                    </button>
                  ))}
                </div>
              </div>
              {selected.status === 'SUBMITTED' && (
                <div className="rounded-3xl border border-[#D9D9D9] p-5">
                  <label className="block text-sm font-semibold text-[#1f2937] mb-2">Reviewer note (required for rejection)</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows="3" maxLength="2000" className="w-full rounded-3xl bg-white px-5 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/30" />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button onClick={() => review('approve')} disabled={Boolean(busy)} className="rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Approve</button>
                    <button onClick={() => review('reject')} disabled={Boolean(busy)} className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50">Reject</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminIdentityVerifications;
