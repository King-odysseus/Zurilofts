import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';
import TableActionsMenu from '../components/TableActionsMenu.jsx';

const STATUS_STYLES = {
  DRAFT: 'bg-[#EAF0F4] text-[#52606F]', SUBMITTED: 'bg-[#FDE8D8] text-[#9A4A1D]',
  CHANGES_REQUESTED: 'bg-[#FDE8D8] text-[#9A4A1D]', APPROVED: 'bg-[#E8F4EC] text-[#287A45]',
  REJECTED: 'bg-[#FDECEC] text-[#B42318]',
};

const DOCUMENT_LABELS = {
  IDENTITY_FRONT: 'Identity - front/details', IDENTITY_BACK: 'Identity - reverse',
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

  const applicationMetrics = [
    { label: 'In view', value: applications.length },
    { label: 'Submitted', value: applications.filter((app) => app.status === 'SUBMITTED').length },
    { label: 'Approved', value: applications.filter((app) => app.status === 'APPROVED').length },
    { label: 'Changes requested', value: applications.filter((app) => app.status === 'CHANGES_REQUESTED').length },
  ];
  const statusOptions = [
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'CHANGES_REQUESTED', label: 'Changes requested' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'DRAFT', label: 'Draft' },
    { value: '', label: 'All statuses' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E3E8EF] bg-white px-5 py-5 shadow-[0_8px_28px_rgba(11,31,66,0.08)] sm:px-6">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#C49A6C]">People &amp; trust</p><h1 className="mt-1 text-2xl font-bold text-[#0B1F42]">Host Applications</h1><p className="mt-1 text-sm text-[#52606F]">Verify identity, authority, and hosting details before granting access.</p></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-12 rounded-[10px] border-0 bg-[#F7F4EF] px-3 text-sm text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40">
          {statusOptions.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {applicationMetrics.map((metric) => <div key={metric.label} className="rounded-2xl border border-[#E3E8EF] bg-white p-4 shadow-[0_8px_28px_rgba(11,31,66,0.08)]"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52606F]">{metric.label}</p><p className="mt-2 text-2xl font-bold text-[#0B1F42]">{metric.value}</p></div>)}
      </div>
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Host application status">
        {statusOptions.map((option) => <button key={option.value || 'all'} type="button" role="tab" aria-selected={status === option.value} onClick={() => setStatus(option.value)} className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${status === option.value ? 'bg-[#0B1F42] text-white' : 'border border-[#E3E8EF] bg-white text-[#0B1F42] hover:bg-[#F7F4EF]'}`}>{option.label}</button>)}
      </div>
      {message && <div className="rounded-2xl bg-[#F7F4EF] px-4 py-3 text-sm text-[#0B1F42]">{message}</div>}
      {loading ? <div className="py-16 text-center text-[#5B6B82]">Loading applications...</div> : applications.length === 0 ? <div className="rounded-2xl border border-[#E3E8EF] bg-white p-12 text-center text-[#5B6B82] shadow-[0_4px_16px_rgba(11,31,66,0.04)]">No applications in this view.</div> : (
        <div className="overflow-x-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-[0_8px_28px_rgba(11,31,66,0.08)]">
          <table className="w-full text-sm"><thead><tr className="border-b border-[#E5E7EB] text-left"><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Applicant</th><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Business</th><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Properties</th><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Documents</th><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Status</th><th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]"></th></tr></thead>
            <tbody>{applications.map((app) => <tr key={app.id} className="border-b border-[#E3E8EF]/60 hover:bg-[#F7F4EF]"><td className="p-4"><p className="font-semibold text-[#0B1F42]">{app.legalName || `${app.user?.firstName || ''} ${app.user?.lastName || ''}`}</p><p className="text-xs text-[#5B6B82]">{app.contactEmail || app.user?.email}</p></td><td className="p-4">{app.businessName || '-'}</td><td className="p-4">{app.propertyCount || '-'}</td><td className="p-4">{app.documents?.length || 0}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[app.status]}`}>{app.status.replaceAll('_', ' ')}</span></td><td className="p-4"><TableActionsMenu actions={[{ label: 'Review application', icon: '⌕', onClick: () => openApplication(app.id), disabled: busy === app.id }]} /></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {selected && <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => !busy && setSelected(null)}><div className="h-full w-full max-w-4xl overflow-y-auto border-l border-[#E3E8EF] bg-white shadow-[0_8px_28px_rgba(11,31,66,0.14)]" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E3E8EF] bg-white px-6 py-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C49A6C]">Host application review</p><h2 className="mt-1 text-xl font-bold text-[#0B1F42]">{selected.legalName}</h2><p className="text-sm text-[#5B6B82]">{selected.contactEmail}</p></div><button onClick={() => setSelected(null)} className="rounded-[10px] p-2 text-xl leading-none text-[#5B6B82] hover:bg-[#F7F4EF]" aria-label="Close host application review">&times;</button></div>
        <div className="space-y-7 p-6">
          <DetailSection title="Identity & business"><Detail label="Date of birth" value={selected.dateOfBirth} /><Detail label="Nationality" value={selected.nationality} /><Detail label="Identity type" value={selected.identityType} /><Detail label="KRA PIN" value={selected.kraPin} /><Detail label="Business" value={`${selected.businessName || '-'} (${selected.businessType || '-'})`} /><Detail label="Company registration" value={selected.companyRegistrationNo} /><Detail label="Phone" value={selected.contactPhone} /><Detail label="Preferred payout" value={selected.preferredPayoutMethod} /></DetailSection>
          <DetailSection title="Properties"><Detail label="Primary area" value={selected.city} /><Detail label="Locations" value={selected.propertyLocations} /><Detail label="Count" value={selected.propertyCount} /><Detail label="Relationship" value={selected.propertyRelationship} /><Detail label="Types" value={selected.propertyTypes?.join(', ')} /><Detail label="Years hosting" value={selected.yearsHosting} /></DetailSection>
          <div><h3 className="font-bold text-[#0B1F42]">Experience</h3><p className="mt-2 rounded-2xl bg-[#F7F4EF] p-4 text-sm text-[#0B1F42] whitespace-pre-wrap">{selected.experience || 'No additional notes.'}</p></div>
          <div><h3 className="mb-3 font-bold text-[#0B1F42]">Encrypted documents</h3><div className="grid gap-3 sm:grid-cols-2">{selected.documents?.map((document) => <button key={document.id} onClick={() => downloadDocument(document)} disabled={busy === document.id} className="rounded-2xl border border-[#E3E8EF] bg-[#F7F4EF] p-4 text-left transition-shadow hover:shadow-md disabled:opacity-50"><p className="font-semibold text-[#0B1F42]">{DOCUMENT_LABELS[document.kind] || document.kind}</p><p className="mt-1 break-all text-xs text-[#5B6B82]">{document.originalName} · {(document.size / 1024 / 1024).toFixed(1)} MB</p></button>)}</div></div>
          {selected.status === 'SUBMITTED' && <div className="rounded-2xl border border-[#E5E7EB] bg-[#F7F4EF] p-5"><label className="mb-2 block text-sm font-semibold text-[#0B1F42]">Reviewer note (required for changes or rejection)</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows="3" maxLength="2000" className="h-28 w-full rounded-[10px] border-0 bg-white px-3 py-3 text-sm text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40" /><div className="mt-4 flex flex-wrap gap-3"><button onClick={() => review('approve')} disabled={Boolean(busy)} className="min-h-[44px] rounded-lg bg-[#0B1F42] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Approve host</button><button onClick={() => review('request-changes')} disabled={Boolean(busy)} className="min-h-[44px] rounded-lg bg-[#C49A6C] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Request changes</button><button onClick={() => review('reject')} disabled={Boolean(busy)} className="min-h-[44px] rounded-lg border border-[#F4C7C3] px-5 py-2.5 text-sm font-semibold text-[#B42318] disabled:opacity-50">Reject</button></div></div>}
          {selected.auditLogs?.length > 0 && <div><h3 className="font-bold text-[#0B1F42] mb-2">Review history</h3>{selected.auditLogs.map((entry) => <div key={entry.id} className="border-l-2 border-[#C49A6C] py-1 pl-3 text-sm"><span className="font-semibold">{entry.action.replaceAll('_', ' ')}</span><span className="text-[#5B6B82]"> · {new Date(entry.createdAt).toLocaleString()}</span>{entry.note && <p className="text-[#5B6B82]">{entry.note}</p>}</div>)}</div>}
        </div>
      </div></div>}
    </div>
  );
}

function DetailSection({ title, children }) { return <section><h3 className="mb-3 font-bold text-[#0B1F42]">{title}</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div></section>; }
function Detail({ label, value }) { return <div className="rounded-2xl bg-[#F7F4EF] p-3"><p className="text-xs text-[#5B6B82]">{label}</p><p className="mt-1 break-words text-sm font-semibold text-[#0B1F42]">{value === null || value === undefined || value === '' ? '-' : String(value)}</p></div>; }

DetailSection.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
Detail.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.array]) };

export default AdminHostApplications;
