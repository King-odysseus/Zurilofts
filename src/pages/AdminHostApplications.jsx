import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';

const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-700', SUBMITTED: 'bg-blue-100 text-blue-700',
  CHANGES_REQUESTED: 'bg-amber-100 text-amber-800', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const DOCUMENT_LABELS = {
  IDENTITY_FRONT: 'Identity — front/details', IDENTITY_BACK: 'Identity — reverse',
  PROPERTY_AUTHORITY: 'Property authority', BUSINESS_REGISTRATION: 'Business registration',
};

function AdminHostApplications() {
  const [applications, setApplications] = useState([]);
  const [status, setStatus] = useState('SUBMITTED');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/host-applications', { params: status ? { status } : {} });
      setApplications(response.data.data || []);
    } catch { setMessage('Could not load host applications.'); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function openApplication(id) {
    setBusy(id); setMessage(''); setNote('');
    try {
      const response = await apiClient.get(`/admin/host-applications/${id}`);
      setSelected(response.data.data);
    } catch (error) { setMessage(error.response?.data?.error || 'Could not load the application.'); }
    finally { setBusy(''); }
  }

  async function review(action) {
    if ((action === 'request-changes' || action === 'reject') && !note.trim()) {
      setMessage('Enter a reviewer note first.'); return;
    }
    setBusy(action); setMessage('');
    try {
      await apiClient.post(`/admin/host-applications/${selected.id}/${action}`,
        action === 'approve' ? {} : { reason: note.trim() });
      setMessage(action === 'approve' ? 'Host approved. They can now create properties.' : 'Application updated.');
      setSelected(null); setNote(''); await load();
    } catch (error) { setMessage(error.response?.data?.error || 'Could not update the application.'); }
    finally { setBusy(''); }
  }

  async function downloadDocument(document) {
    setBusy(document.id); setMessage('');
    try {
      const response = await apiClient.get(`/admin/host-applications/${selected.id}/documents/${document.id}`, { responseType: 'blob' });
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
        <div><h1 className="text-2xl font-bold text-[#0B0B45]">Host Applications</h1><p className="text-sm text-[#6b7280] mt-1">Verify identity, authority, and hosting details before granting access.</p></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-full border border-[#D9D9D9] bg-white px-5 py-2.5 text-sm focus:outline-none focus:border-[#C49A6C]">
          <option value="">All statuses</option><option value="SUBMITTED">Submitted</option><option value="CHANGES_REQUESTED">Changes requested</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="DRAFT">Draft</option>
        </select>
      </div>
      {message && <div className="rounded-2xl bg-[#0B0B45]/5 px-4 py-3 text-sm text-[#0B0B45]">{message}</div>}
      {loading ? <div className="py-16 text-center text-[#6b7280]">Loading applications...</div> : applications.length === 0 ? <div className="rounded-3xl border border-[#D9D9D9] bg-white p-12 text-center text-[#6b7280]">No applications in this view.</div> : (
        <div className="overflow-x-auto rounded-3xl border border-[#D9D9D9] bg-white shadow-sm">
          <table className="w-full text-sm"><thead><tr className="border-b border-[#D9D9D9] text-left"><th className="p-4">Applicant</th><th className="p-4">Business</th><th className="p-4">Properties</th><th className="p-4">Documents</th><th className="p-4">Status</th><th className="p-4"></th></tr></thead>
            <tbody>{applications.map((app) => <tr key={app.id} className="border-b border-[#D9D9D9]/60 hover:bg-[#0B0B45]/5"><td className="p-4"><p className="font-semibold text-[#1f2937]">{app.legalName || `${app.user?.firstName || ''} ${app.user?.lastName || ''}`}</p><p className="text-xs text-[#6b7280]">{app.contactEmail || app.user?.email}</p></td><td className="p-4">{app.businessName || '—'}</td><td className="p-4">{app.propertyCount || '—'}</td><td className="p-4">{app.documents?.length || 0}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[app.status]}`}>{app.status.replaceAll('_', ' ')}</span></td><td className="p-4"><button onClick={() => openApplication(app.id)} disabled={busy === app.id} className="rounded-full border border-[#C49A6C] px-4 py-2 text-xs font-semibold text-[#C49A6C] hover:bg-[#C49A6C] hover:text-white disabled:opacity-50">Review</button></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setSelected(null)}><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D9D9D9] bg-white px-6 py-5"><div><h2 className="text-xl font-bold text-[#0B0B45]">{selected.legalName}</h2><p className="text-sm text-[#6b7280]">{selected.contactEmail}</p></div><button onClick={() => setSelected(null)} className="rounded-full px-3 py-2 text-xl text-[#6b7280] hover:bg-gray-100">&times;</button></div>
        <div className="space-y-7 p-6">
          <DetailSection title="Identity & business"><Detail label="Date of birth" value={selected.dateOfBirth} /><Detail label="Nationality" value={selected.nationality} /><Detail label="Identity type" value={selected.identityType} /><Detail label="KRA PIN" value={selected.kraPin} /><Detail label="Business" value={`${selected.businessName || '—'} (${selected.businessType || '—'})`} /><Detail label="Company registration" value={selected.companyRegistrationNo} /><Detail label="Phone" value={selected.contactPhone} /><Detail label="Preferred payout" value={selected.preferredPayoutMethod} /></DetailSection>
          <DetailSection title="Properties"><Detail label="Primary area" value={selected.city} /><Detail label="Locations" value={selected.propertyLocations} /><Detail label="Count" value={selected.propertyCount} /><Detail label="Relationship" value={selected.propertyRelationship} /><Detail label="Types" value={selected.propertyTypes?.join(', ')} /><Detail label="Years hosting" value={selected.yearsHosting} /></DetailSection>
          <div><h3 className="font-bold text-[#0B0B45]">Experience</h3><p className="mt-2 rounded-3xl bg-[#f8f9fa] p-4 text-sm text-[#1f2937] whitespace-pre-wrap">{selected.experience || 'No additional notes.'}</p></div>
          <div><h3 className="font-bold text-[#0B0B45] mb-3">Encrypted documents</h3><div className="grid sm:grid-cols-2 gap-3">{selected.documents?.map((document) => <button key={document.id} onClick={() => downloadDocument(document)} disabled={busy === document.id} className="rounded-3xl border border-[#D9D9D9] p-4 text-left hover:border-[#C49A6C] disabled:opacity-50"><p className="font-semibold text-[#1f2937]">{DOCUMENT_LABELS[document.kind] || document.kind}</p><p className="mt-1 text-xs text-[#6b7280] break-all">{document.originalName} · {(document.size / 1024 / 1024).toFixed(1)} MB</p></button>)}</div></div>
          {selected.status === 'SUBMITTED' && <div className="rounded-3xl border border-[#D9D9D9] p-5"><label className="block text-sm font-semibold text-[#1f2937] mb-2">Reviewer note (required for changes or rejection)</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows="3" maxLength="2000" className="w-full rounded-3xl border border-[#D9D9D9] px-5 py-3 focus:outline-none focus:border-[#C49A6C]" /><div className="mt-4 flex flex-wrap gap-3"><button onClick={() => review('approve')} disabled={Boolean(busy)} className="rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Approve host</button><button onClick={() => review('request-changes')} disabled={Boolean(busy)} className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Request changes</button><button onClick={() => review('reject')} disabled={Boolean(busy)} className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50">Reject</button></div></div>}
          {selected.auditLogs?.length > 0 && <div><h3 className="font-bold text-[#0B0B45] mb-2">Review history</h3>{selected.auditLogs.map((entry) => <div key={entry.id} className="border-l-2 border-[#C49A6C] py-1 pl-3 text-sm"><span className="font-semibold">{entry.action.replaceAll('_', ' ')}</span><span className="text-[#6b7280]"> · {new Date(entry.createdAt).toLocaleString()}</span>{entry.note && <p className="text-[#6b7280]">{entry.note}</p>}</div>)}</div>}
        </div>
      </div></div>}
    </div>
  );
}

function DetailSection({ title, children }) { return <section><h3 className="font-bold text-[#0B0B45] mb-3">{title}</h3><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{children}</div></section>; }
function Detail({ label, value }) { return <div className="rounded-2xl bg-[#f8f9fa] p-3"><p className="text-xs text-[#6b7280]">{label}</p><p className="mt-1 text-sm font-semibold text-[#1f2937] break-words">{value === null || value === undefined || value === '' ? '—' : String(value)}</p></div>; }

DetailSection.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
Detail.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.array]) };

export default AdminHostApplications;
