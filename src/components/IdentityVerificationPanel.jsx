import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';

const DOCUMENT_KINDS = [
  { kind: 'ID_FRONT', label: 'ID / Passport (front)', required: true },
  { kind: 'ID_BACK', label: 'ID (back)', required: false },
  { kind: 'SELFIE', label: 'Selfie holding your ID', required: true },
];

const STATUS_STYLES = {
  UNVERIFIED: 'bg-[#EAF0F4] text-[#52606F]',
  SUBMITTED: 'bg-[#FDE8D8] text-[#9A4A1D]',
  APPROVED: 'bg-[#E8F4EC] text-[#287A45]',
  REJECTED: 'bg-[#FDECEC] text-[#B42318]',
};

const STATUS_LABELS = {
  UNVERIFIED: 'Not verified',
  SUBMITTED: 'Under review',
  APPROVED: 'Verified',
  REJECTED: 'Changes needed',
};

/**
 * Guest identity verification: gates payment on a booking, not account access.
 * Reused on the Profile "Verification" tab and on the standalone /verify-identity
 * page a guest is sent to mid-checkout (see BookingPage's
 * requiresIdentityVerification handling).
 */
function IdentityVerificationPanel({ onApproved }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fullName: '', dateOfBirth: '', idType: 'NATIONAL_ID', idNumber: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get('/identity-verification');
      const v = res.data.data;
      setData(v);
      setForm({
        fullName: v.fullName || '',
        dateOfBirth: v.dateOfBirth || '',
        idType: v.idType || 'NATIONAL_ID',
        idNumber: v.idNumber || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (data?.status === 'APPROVED' && onApproved) onApproved(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status]);

  const editable = !data || data.status === 'UNVERIFIED' || data.status === 'REJECTED';

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await apiClient.patch('/identity-verification', form);
      setData(res.data.data);
      setMessage('Details saved.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not save your details');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(kind, file) {
    setUploading(kind);
    setMessage('');
    try {
      const body = new FormData();
      body.append('document', file);
      await apiClient.put(`/identity-verification/documents/${kind}`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not upload document');
    } finally {
      setUploading(null);
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setMessage('');
    try {
      const res = await apiClient.post('/identity-verification/submit');
      setData(res.data.data);
      setMessage('Submitted for review. This usually takes less than a day.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Please complete all required fields and documents first');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C49A6C] border-t-transparent"></div>
      </div>
    );
  }

  const uploadedKinds = new Set((data?.documents || []).map((d) => d.kind));

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-xl font-bold text-[#0B1F42]">Identity verification</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[data?.status] || STATUS_STYLES.UNVERIFIED}`}>
          {STATUS_LABELS[data?.status] || STATUS_LABELS.UNVERIFIED}
        </span>
      </div>
      <p className="mb-6 text-sm text-[#52606F]">
        We verify every guest&apos;s identity before confirming payment on a booking. Your documents are encrypted and only visible to the ZuriLofts trust &amp; safety team.
      </p>

      <nav className="mb-6 grid grid-cols-3 gap-2" aria-label="Identity verification sections">
        {[
          ['Details', '#verification-details', '1'],
          ['Documents', '#verification-documents', '2'],
          ['Review', '#verification-review', '3'],
        ].map(([label, href, number]) => (
          <a key={label} href={href} className="flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border border-[#E3E8EF] bg-white px-2 text-xs font-semibold text-[#0B1F42] hover:border-[#C49A6C] sm:text-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FDE8D8] text-xs text-[#9A4A1D]">{number}</span>{label}
          </a>
        ))}
      </nav>

      {data?.status === 'REJECTED' && data?.reviewNote && (
        <div className="mb-6 rounded-2xl border border-[#F1C9C9] bg-[#FDECEC] px-4 py-3 text-sm text-[#B42318]">
          {data.reviewNote}
        </div>
      )}
      {data?.status === 'SUBMITTED' && (
        <div className="mb-6 rounded-2xl border border-[#F2D5B8] bg-[#FFF4E8] px-4 py-3 text-sm text-[#9A4A1D]">
          Your verification is being reviewed. We&apos;ll notify you once it&apos;s complete.
        </div>
      )}
      {data?.status === 'APPROVED' && (
        <div className="mb-6 rounded-2xl border border-[#BFE3C9] bg-[#E8F4EC] px-4 py-3 text-sm text-[#287A45]">
          You&apos;re verified. You can complete payment on any pending booking.
        </div>
      )}
      {message && <p className="mb-4 text-sm text-[#5B6B82]">{message}</p>}

      <form id="verification-details" onSubmit={handleSave} className="scroll-mt-24 space-y-4 mb-6">
        <h4 className="text-sm font-semibold text-[#0B1F42]">Details</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="iv-fullName" className="mb-1 block text-sm font-medium text-[#0B1F42]">Full legal name</label>
            <input
              id="iv-fullName"
              type="text"
              disabled={!editable}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="h-12 w-full rounded-[10px] border-0 bg-[#F7F4EF] px-3 text-sm text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40 disabled:bg-[#EAF0F4] disabled:text-[#52606F]"
            />
          </div>
          <div>
            <label htmlFor="iv-dateOfBirth" className="mb-1 block text-sm font-medium text-[#0B1F42]">Date of birth</label>
            <input
              id="iv-dateOfBirth"
              type="date"
              disabled={!editable}
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              className="h-12 w-full rounded-[10px] border-0 bg-[#F7F4EF] px-3 text-sm text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40 disabled:bg-[#EAF0F4] disabled:text-[#52606F]"
            />
          </div>
          <div>
            <label htmlFor="iv-idType" className="mb-1 block text-sm font-medium text-[#0B1F42]">ID type</label>
            <select
              id="iv-idType"
              disabled={!editable}
              value={form.idType}
              onChange={(e) => setForm({ ...form, idType: e.target.value })}
              className="h-12 w-full rounded-[10px] border-0 bg-[#F7F4EF] px-3 text-sm text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40 disabled:bg-[#EAF0F4] disabled:text-[#52606F]"
            >
              <option value="NATIONAL_ID">National ID</option>
              <option value="PASSPORT">Passport</option>
              <option value="ALIEN_ID">Alien ID</option>
            </select>
          </div>
          <div>
            <label htmlFor="iv-idNumber" className="mb-1 block text-sm font-medium text-[#0B1F42]">ID number</label>
            <input
              id="iv-idNumber"
              type="text"
              disabled={!editable}
              value={form.idNumber}
              onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
              className="h-12 w-full rounded-[10px] border-0 bg-[#F7F4EF] px-3 text-sm text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40 disabled:bg-[#EAF0F4] disabled:text-[#52606F]"
            />
          </div>
        </div>
        {editable && (
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] rounded-[10px] border border-[#E3E8EF] bg-white px-5 py-2 text-sm font-semibold text-[#0B1F42] transition-colors hover:bg-[#F7F4EF] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save details'}
          </button>
        )}
      </form>

      {editable && (
        <div id="verification-documents" className="scroll-mt-24 space-y-3 mb-6">
          <p className="text-sm font-semibold text-[#0B1F42]">Documents</p>
          {DOCUMENT_KINDS.map(({ kind, label, required }) => (
            <div key={kind} className="flex items-center justify-between gap-3 rounded-2xl border border-[#E3E8EF] bg-white p-3 shadow-[0_8px_28px_rgba(11,31,66,0.05)]">
              <div>
                <p className="text-sm text-[#0B1F42]">{label}{required && <span className="text-[#B42318]"> *</span>}</p>
                {uploadedKinds.has(kind) && <p className="text-xs text-[#287A45]">Uploaded</p>}
              </div>
              <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-[10px] border border-[#E3E8EF] px-3 py-1.5 text-xs font-semibold text-[#0B1F42] transition-all hover:bg-[#F7F4EF] hover:text-[#9A744A]">
                {uploading === kind ? 'Uploading...' : uploadedKinds.has(kind) ? 'Replace' : 'Upload'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  disabled={uploading === kind}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(kind, file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      )}

      <div id="verification-review" className="scroll-mt-24 border-t border-[#E3E8EF] pt-5">
        <p className="mb-1 text-sm font-semibold text-[#0B1F42]">Review</p>
        <p className="mb-4 text-xs text-[#5B6B82]">Check your details and required documents before submitting.</p>
      {editable && (
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="min-h-[44px] rounded-[10px] bg-[#C49A6C] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B8895C] disabled:opacity-50"
        >
          Submit for review
        </button>
      )}
      {!editable && <p className="text-sm text-[#5B6B82]">Your submitted information is shown above.</p>}
      </div>
    </div>
  );
}

IdentityVerificationPanel.propTypes = {
  onApproved: PropTypes.func,
};

export default IdentityVerificationPanel;
