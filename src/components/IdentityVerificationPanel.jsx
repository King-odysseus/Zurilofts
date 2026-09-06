import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';

const DOCUMENT_KINDS = [
  { kind: 'ID_FRONT', label: 'ID / Passport (front)', required: true },
  { kind: 'ID_BACK', label: 'ID (back)', required: false },
  { kind: 'SELFIE', label: 'Selfie holding your ID', required: true },
];

const STATUS_STYLES = {
  UNVERIFIED: 'bg-[#D9D9D9]/40 text-[#1f2937]',
  SUBMITTED: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
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
    } catch {
      // silent - the form still renders with UNVERIFIED defaults
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
        <div className="w-8 h-8 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const uploadedKinds = new Set((data?.documents || []).map((d) => d.kind));

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-[#0B0B45]">Identity verification</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[data?.status] || STATUS_STYLES.UNVERIFIED}`}>
          {STATUS_LABELS[data?.status] || STATUS_LABELS.UNVERIFIED}
        </span>
      </div>
      <p className="text-sm text-[#6b7280] mb-6">
        We verify every guest&apos;s identity before confirming payment on a booking. Your documents are encrypted and only visible to the ZuriLofts trust &amp; safety team.
      </p>

      {data?.status === 'REJECTED' && data?.reviewNote && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {data.reviewNote}
        </div>
      )}
      {data?.status === 'SUBMITTED' && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          Your verification is being reviewed. We&apos;ll notify you once it&apos;s complete.
        </div>
      )}
      {data?.status === 'APPROVED' && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          You&apos;re verified. You can complete payment on any pending booking.
        </div>
      )}
      {message && <p className="text-sm text-[#6b7280] mb-4">{message}</p>}

      <form onSubmit={handleSave} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#1f2937] mb-1">Full legal name</label>
            <input
              type="text"
              disabled={!editable}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl shadow-sm disabled:bg-canvas disabled:text-[#6b7280]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1f2937] mb-1">Date of birth</label>
            <input
              type="date"
              disabled={!editable}
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              className="w-full px-3 py-2 rounded-xl shadow-sm disabled:bg-canvas disabled:text-[#6b7280]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1f2937] mb-1">ID type</label>
            <select
              disabled={!editable}
              value={form.idType}
              onChange={(e) => setForm({ ...form, idType: e.target.value })}
              className="w-full px-3 py-2 rounded-xl shadow-sm disabled:bg-canvas disabled:text-[#6b7280]"
            >
              <option value="NATIONAL_ID">National ID</option>
              <option value="PASSPORT">Passport</option>
              <option value="ALIEN_ID">Alien ID</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1f2937] mb-1">ID number</label>
            <input
              type="text"
              disabled={!editable}
              value={form.idNumber}
              onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
              className="w-full px-3 py-2 rounded-xl shadow-sm disabled:bg-canvas disabled:text-[#6b7280]"
            />
          </div>
        </div>
        {editable && (
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-full text-sm font-semibold bg-[#0B0B45] text-white hover:bg-[#0B0B45]/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save details'}
          </button>
        )}
      </form>

      {editable && (
        <div className="space-y-3 mb-6">
          <p className="text-sm font-semibold text-[#1f2937]">Documents</p>
          {DOCUMENT_KINDS.map(({ kind, label, required }) => (
            <div key={kind} className="flex items-center justify-between gap-3 rounded-xl shadow-sm p-3">
              <div>
                <p className="text-sm text-[#1f2937]">{label}{required && <span className="text-red-500"> *</span>}</p>
                {uploadedKinds.has(kind) && <p className="text-xs text-green-700">Uploaded</p>}
              </div>
              <label className="px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm hover:shadow-md text-[#6b7280] hover:text-[#C49A6C] cursor-pointer transition-all">
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

      {editable && (
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-5 py-2.5 rounded-full text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-colors disabled:opacity-50"
        >
          Submit for review
        </button>
      )}
    </div>
  );
}

IdentityVerificationPanel.propTypes = {
  onApproved: PropTypes.func,
};

export default IdentityVerificationPanel;
