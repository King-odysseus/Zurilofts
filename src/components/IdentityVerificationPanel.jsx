import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Label, Spinner, TextInput } from 'flowbite-react';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import apiClient from '../api/client.js';
import SelectMenu from './SelectMenu.jsx';

const DOCUMENT_KINDS = [
  { kind: 'ID_FRONT', label: 'ID / Passport (front)', required: true },
  { kind: 'ID_BACK', label: 'ID (back)', required: false },
  { kind: 'SELFIE', label: 'Selfie holding your ID', required: true },
];

const ID_TYPE_OPTIONS = [
  { value: 'NATIONAL_ID', label: 'National ID' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'ALIEN_ID', label: 'Alien ID' },
];

const STATUS_META = {
  UNVERIFIED: { label: 'Not verified', color: 'gray', icon: Clock3 },
  SUBMITTED: { label: 'Under review', color: 'warning', icon: Clock3 },
  APPROVED: { label: 'Verified', color: 'success', icon: BadgeCheck },
  REJECTED: { label: 'Changes needed', color: 'failure', icon: AlertCircle },
};

const VERIFICATION_STEPS = [
  { number: '1', label: 'Details', detail: 'Personal information', href: '#verification-details' },
  { number: '2', label: 'Documents', detail: 'Secure upload', href: '#verification-documents' },
  { number: '3', label: 'Review', detail: 'Submit for review', href: '#verification-review' },
];

/**
 * Guest identity verification: gates payment on a booking, not account access.
 * Reused on the Profile "Verification" tab and on the standalone /verify-identity
 * page a guest is sent to mid-checkout.
 */
function IdentityVerificationPanel({ onApproved }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fullName: '', dateOfBirth: '', idType: 'NATIONAL_ID', idNumber: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(null);
  const fileInputs = useRef({});

  const load = useCallback(async () => {
    try {
      const response = await apiClient.get('/identity-verification');
      const verification = response.data.data;
      setData(verification);
      setForm({
        fullName: verification.fullName || '',
        dateOfBirth: verification.dateOfBirth || '',
        idType: verification.idType || 'NATIONAL_ID',
        idNumber: verification.idNumber || '',
      });
    } catch (error) {
      setError(error.response?.data?.error || 'Could not load your verification details.');
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
  const status = STATUS_META[data?.status] || STATUS_META.UNVERIFIED;
  const StatusIcon = status.icon;
  const uploadedKinds = new Set((data?.documents || []).map((document) => document.kind));

  async function saveDetails() {
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const response = await apiClient.patch('/identity-verification', form);
      setData(response.data.data);
      setNotice('Details saved.');
      return true;
    } catch (error) {
      setError(error.response?.data?.error || 'Could not save your details.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    await saveDetails();
  }

  async function handleSaveAndExit() {
    const saved = await saveDetails();
    if (saved) navigate('/profile#verification');
  }

  async function handleUpload(kind, file) {
    setUploading(kind);
    setNotice('');
    setError('');
    try {
      const body = new FormData();
      body.append('document', file);
      await apiClient.put(`/identity-verification/documents/${kind}`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
      setNotice('Document uploaded.');
    } catch (error) {
      setError(error.response?.data?.error || 'Could not upload this document.');
    } finally {
      setUploading(null);
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const response = await apiClient.post('/identity-verification/submit');
      setData(response.data.data);
      setNotice('Submitted for review. This usually takes less than a day.');
    } catch (error) {
      setError(error.response?.data?.error || 'Complete the required fields and documents before submitting.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[180px] items-center justify-center gap-3 text-sm text-muted" role="status"><Spinner size="lg" /><span>Loading verification...</span></div>;
  }

  return <div className="space-y-4">
    <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-navy">Verify your identity</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">Complete the required details securely to continue your booking.</p>
      </div>
      <Badge color={status.color} icon={StatusIcon}>{status.label}</Badge>
    </header>

    <nav className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Identity verification progress">
      {VERIFICATION_STEPS.map((step, index) => <a key={step.label} href={step.href} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${index === 0 ? 'border-primary bg-primary-50 text-navy' : 'border-border text-muted hover:bg-surface hover:text-navy'}`}>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-bold text-navy">{step.number}</span>
        <div><strong className="block text-sm font-semibold text-navy">{step.label}</strong><small className="mt-0.5 block text-[11px] text-muted">{step.detail}</small></div>
      </a>)}
    </nav>

    {data?.status === 'REJECTED' && data?.reviewNote && <Alert color="failure" icon={AlertCircle}>{data.reviewNote}</Alert>}
    {data?.status === 'SUBMITTED' && <Alert color="warning" icon={Clock3}>Your verification is being reviewed. We will notify you when it is complete.</Alert>}
    {data?.status === 'APPROVED' && <Alert color="success" icon={CheckCircle2}>You are verified. You can complete payment on any pending booking.</Alert>}
    {error && <Alert color="failure">{error}</Alert>}
    {notice && <Alert color="success">{notice}</Alert>}

    <section className="border-t border-border pt-5" aria-labelledby="verification-details-title">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <div>
            <h3 id="verification-details-title" className="text-sm font-semibold text-navy">Tell us about yourself</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">Your information is used only for identity verification.</p>
          </div>
          <form id="verification-details" className="mt-4 space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="iv-fullName">Legal name</Label>
              <TextInput id="iv-fullName" type="text" disabled={!editable} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="As shown on your ID" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iv-dateOfBirth">Date of birth</Label>
              <TextInput id="iv-dateOfBirth" type="date" disabled={!editable} value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iv-idType">Identity document</Label>
              <SelectMenu
                id="iv-idType"
                ariaLabel="Identity document"
                disabled={!editable}
                value={form.idType}
                onChange={(next) => setForm({ ...form, idType: next })}
                options={ID_TYPE_OPTIONS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iv-idNumber">Document number</Label>
              <TextInput id="iv-idNumber" type="text" disabled={!editable} value={form.idNumber} onChange={(event) => setForm({ ...form, idNumber: event.target.value })} required />
            </div>
            <p className="flex items-center gap-2 text-xs leading-relaxed text-muted"><LockKeyhole size={14} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />Your documents are encrypted and reviewed securely.</p>
            {editable && <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={saving}>{saving ? <Spinner size="sm" /> : 'Save details'}</Button>
              <Button as="a" href="#verification-documents" color="light">Continue to documents</Button>
            </div>}
          </form>
        </div>
        <aside className="rounded-xl bg-surface p-5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary-700"><Clock3 size={18} strokeWidth={1.8} aria-hidden="true" /></span>
          <strong className="mt-3 block text-sm font-semibold text-navy">Your booking is held</strong>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">Return to payment after your identity has been approved.</p>
        </aside>
      </div>
    </section>

    {editable && <section id="verification-documents" className="border-t border-border pt-5" aria-labelledby="verification-documents-title">
      <div>
        <h3 id="verification-documents-title" className="text-sm font-semibold text-navy">Documents</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">Upload clear photos or PDF files. Each file can be up to 10MB.</p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3">
        {DOCUMENT_KINDS.map(({ kind, label, required }) => {
          const uploaded = uploadedKinds.has(kind);
          return <div key={kind} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-navy"><FileCheck2 size={19} strokeWidth={1.8} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <strong className="block text-xs font-semibold text-navy">{label}{required && <em className="ml-2 text-[10px] font-semibold uppercase not-italic text-primary-700">Required</em>}</strong>
              <small className="mt-1 block text-[11px] text-muted">{uploaded ? 'Uploaded and encrypted' : 'Not uploaded yet'}</small>
            </div>
            <Button size="sm" color="light" disabled={uploading === kind} onClick={() => fileInputs.current[kind]?.click()}>
              {uploading === kind ? <Spinner size="sm" /> : <><Upload size={14} strokeWidth={1.8} aria-hidden="true" />{uploaded ? 'Replace' : 'Upload'}</>}
            </Button>
            <input
              ref={(element) => { fileInputs.current[kind] = element; }}
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleUpload(kind, file);
                event.target.value = '';
              }}
            />
          </div>;
        })}
      </div>
    </section>}

    <section id="verification-review" className="border-t border-border pt-5" aria-labelledby="verification-review-title">
      <div>
        <h3 id="verification-review-title" className="text-sm font-semibold text-navy">Review</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">Check your details and required documents before submitting.</p>
      </div>
      {editable ? <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={handleSubmit} disabled={saving}>{saving ? <Spinner size="sm" /> : <><ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" />Submit for review</>}</Button>
        <Button color="light" disabled={saving} onClick={handleSaveAndExit}>Save and exit</Button>
        <Link to="/trips" className="text-sm font-semibold text-navy underline-offset-2 hover:underline">Return to trips</Link>
      </div> : <div className="mt-4 flex items-center gap-2 rounded-lg bg-surface p-3 text-xs text-muted"><FileText size={17} strokeWidth={1.8} aria-hidden="true" className="shrink-0" /><span>Your submitted information is shown above.</span></div>}
    </section>
  </div>;
}

IdentityVerificationPanel.propTypes = {
  onApproved: PropTypes.func,
};

export default IdentityVerificationPanel;
