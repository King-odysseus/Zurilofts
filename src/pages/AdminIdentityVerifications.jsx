import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client.js';

const STATUS_STYLES = {
  UNVERIFIED: 'bg-gray-100 text-gray-700', SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700',
};

const DOCUMENT_LABELS = { ID_FRONT: 'ID - front', ID_BACK: 'ID - back', SELFIE: 'Selfie with ID' };

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

  const reviewMetrics = [
    { label: 'In view', value: rows.length },
    { label: 'Submitted', value: rows.filter((row) => row.status === 'SUBMITTED').length },
    { label: 'Approved', value: rows.filter((row) => row.status === 'APPROVED').length },
    { label: 'Rejected', value: rows.filter((row) => row.status === 'REJECTED').length },
  ];
  const statusOptions = [
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'UNVERIFIED', label: 'Unverified' },
    { value: '', label: 'All statuses' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 sm:px-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222222]">Identity Verifications</h1>
          <p className="text-sm text-[#6b7280] mt-1">Guest identity checks - gates payment on a booking, separate from host account review.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-[44px] rounded-xl border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20">
          {statusOptions.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {reviewMetrics.map((metric) => (
          <div key={metric.label} className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#222222]">{metric.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Verification status">
        {statusOptions.map((option) => (
          <button key={option.value || 'all'} type="button" role="tab" aria-selected={status === option.value} onClick={() => setStatus(option.value)} className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${status === option.value ? 'bg-[#2563EB] text-white' : 'border border-[#E5E7EB] bg-white text-[#222222] hover:bg-[#F7F7F5]'}`}>
            {option.label}
          </button>
        ))}
      </div>
      {message && <div className="rounded-[14px] bg-[#222222]/5 px-4 py-3 text-sm text-[#222222]">{message}</div>}
      {loading ? (
        <div className="py-16 text-center text-[#6b7280]">Loading verifications...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-[14px] bg-white p-12 text-center text-[#6b7280] shadow-sm">No verifications in this view.</div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#E5E7EB] text-left"><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Guest</th><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">ID type</th><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Documents</th><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Status</th><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]"></th></tr></thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className="border-b border-[#E5E7EB]/60 hover:bg-[#222222]/5">
                  <td className="p-4">
                    <p className="font-semibold text-[#222222]">{v.fullName || `${v.user?.firstName || ''} ${v.user?.lastName || ''}`}</p>
                    <p className="text-xs text-[#6b7280]">{v.user?.email}</p>
                  </td>
                  <td className="p-4">{v.idType || '-'}</td>
                  <td className="p-4">{v.documents?.length || 0}</td>
                  <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[v.status]}`}>{v.status.replaceAll('_', ' ')}</span></td>
                  <td className="p-4"><button onClick={() => open(v.id)} disabled={busy === v.id} className="rounded-lg bg-[#C49A6C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B8895C] disabled:opacity-50">Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setSelected(null)}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[14px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-5">
              <div><h2 className="text-xl font-bold text-[#222222]">{selected.fullName || 'Unnamed'}</h2><p className="text-sm text-[#6b7280]">{selected.user?.email}</p></div>
              <button onClick={() => setSelected(null)} className="rounded-full px-3 py-2 text-xl text-[#6b7280] hover:bg-gray-100">&times;</button>
            </div>
            <div className="space-y-7 p-6">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-[14px] bg-canvas p-3"><p className="text-xs text-[#6b7280]">Date of birth</p><p className="mt-1 text-sm font-semibold text-[#222222]">{selected.dateOfBirth || '-'}</p></div>
                <div className="rounded-[14px] bg-canvas p-3"><p className="text-xs text-[#6b7280]">ID type</p><p className="mt-1 text-sm font-semibold text-[#222222]">{selected.idType || '-'}</p></div>
                <div className="rounded-[14px] bg-canvas p-3"><p className="text-xs text-[#6b7280]">ID number</p><p className="mt-1 text-sm font-semibold text-[#222222]">{selected.idNumber || '-'}</p></div>
              </div>
              <div>
                <h3 className="font-bold text-[#222222] mb-3">Encrypted documents</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {selected.documents?.map((document) => (
                    <button key={document.id} onClick={() => downloadDocument(document)} disabled={busy === document.id} className="rounded-[14px] shadow-sm p-4 text-left hover:shadow-md disabled:opacity-50">
                      <p className="font-semibold text-[#222222]">{DOCUMENT_LABELS[document.kind] || document.kind}</p>
                      <p className="mt-1 text-xs text-[#6b7280] break-all">{document.originalName} · {(document.size / 1024 / 1024).toFixed(1)} MB</p>
                    </button>
                  ))}
                </div>
              </div>
              {selected.status === 'SUBMITTED' && (
                <div className="rounded-[14px] border border-[#E5E7EB] p-5">
                  <label className="block text-sm font-semibold text-[#222222] mb-2">Reviewer note (required for rejection)</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows="3" maxLength="2000" className="w-full rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-3 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20" />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button onClick={() => review('approve')} disabled={Boolean(busy)} className="min-h-[44px] rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Approve</button>
                    <button onClick={() => review('reject')} disabled={Boolean(busy)} className="min-h-[44px] rounded-lg border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50">Reject</button>
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
