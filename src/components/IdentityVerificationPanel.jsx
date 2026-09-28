import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Label, Select, Spinner, TextInput } from 'flowbite-react';
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

const DOCUMENT_KINDS = [
  { kind: 'ID_FRONT', label: 'ID / Passport (front)', required: true },
  { kind: 'ID_BACK', label: 'ID (back)', required: false },
  { kind: 'SELFIE', label: 'Selfie holding your ID', required: true },
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
    return <div className="op-verify-loading" role="status"><Spinner size="lg" /><span>Loading verification...</span></div>;
  }

  return <div className="op-verify">
    <header className="op-verify-head">
      <div>
        <h2>Verify your identity</h2>
        <p>Complete the required details securely to continue your booking.</p>
      </div>
      <Badge color={status.color} icon={StatusIcon}>{status.label}</Badge>
    </header>

    <nav className="op-verify-steps" aria-label="Identity verification progress">
      {VERIFICATION_STEPS.map((step, index) => <a key={step.label} href={step.href} className={`op-verify-step${index === 0 ? ' is-active' : ''}`}>
        <span>{step.number}</span>
        <div><strong>{step.label}</strong><small>{step.detail}</small></div>
      </a>)}
    </nav>

    {data?.status === 'REJECTED' && data?.reviewNote && <Alert color="failure" icon={AlertCircle} className="op-verify-alert">{data.reviewNote}</Alert>}
    {data?.status === 'SUBMITTED' && <Alert color="warning" icon={Clock3} className="op-verify-alert">Your verification is being reviewed. We will notify you when it is complete.</Alert>}
    {data?.status === 'APPROVED' && <Alert color="success" icon={CheckCircle2} className="op-verify-alert">You are verified. You can complete payment on any pending booking.</Alert>}
    {error && <Alert color="failure" className="op-verify-alert">{error}</Alert>}
    {notice && <Alert color="success" className="op-verify-alert">{notice}</Alert>}

    <section className="op-verify-section" aria-labelledby="verification-details-title">
      <div className="op-verify-details-grid">
        <div className="op-verify-fields">
          <div className="op-verify-section-head">
            <h3 id="verification-details-title">Tell us about yourself</h3>
            <p>Your information is used only for identity verification.</p>
          </div>
          <form id="verification-details" className="op-verify-form" onSubmit={handleSave}>
            <div className="op-verify-field">
              <Label htmlFor="iv-fullName">Legal name</Label>
              <TextInput id="iv-fullName" type="text" disabled={!editable} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="As shown on your ID" required />
            </div>
            <div className="op-verify-field">
              <Label htmlFor="iv-dateOfBirth">Date of birth</Label>
              <TextInput id="iv-dateOfBirth" type="date" disabled={!editable} value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} required />
            </div>
            <div className="op-verify-field">
              <Label htmlFor="iv-idType">Identity document</Label>
              <Select id="iv-idType" disabled={!editable} value={form.idType} onChange={(event) => setForm({ ...form, idType: event.target.value })} required>
                <option value="NATIONAL_ID">National ID</option>
                <option value="PASSPORT">Passport</option>
                <option value="ALIEN_ID">Alien ID</option>
              </Select>
            </div>
            <div className="op-verify-field">
              <Label htmlFor="iv-idNumber">Document number</Label>
              <TextInput id="iv-idNumber" type="text" disabled={!editable} value={form.idNumber} onChange={(event) => setForm({ ...form, idNumber: event.target.value })} required />
            </div>
            <p className="op-verify-help"><LockKeyhole size={14} strokeWidth={1.8} aria-hidden="true" />Your documents are encrypted and reviewed securely.</p>
            {editable && <div className="op-verify-detail-actions">
              <Button type="submit" disabled={saving} className="op-trust-button-primary">{saving ? <Spinner size="sm" /> : 'Save details'}</Button>
              <Button as="a" href="#verification-documents" color="light">Continue to documents</Button>
            </div>}
          </form>
        </div>
        <aside className="op-verify-callout">
          <span><Clock3 size={18} strokeWidth={1.8} aria-hidden="true" /></span>
          <strong>Your booking is held</strong>
          <p>Return to payment after your identity has been approved.</p>
        </aside>
      </div>
    </section>

    {editable && <section id="verification-documents" className="op-verify-section op-verify-documents" aria-labelledby="verification-documents-title">
      <div className="op-verify-section-head">
        <h3 id="verification-documents-title">Documents</h3>
        <p>Upload clear photos or PDF files. Each file can be up to 10MB.</p>
      </div>
      <div className="op-verify-document-list">
        {DOCUMENT_KINDS.map(({ kind, label, required }) => {
          const uploaded = uploadedKinds.has(kind);
          return <div key={kind} className="op-verify-document">
            <span className="op-verify-document-icon"><FileCheck2 size={19} strokeWidth={1.8} aria-hidden="true" /></span>
            <div>
              <strong>{label}{required && <em>Required</em>}</strong>
              <small>{uploaded ? 'Uploaded and encrypted' : 'Not uploaded yet'}</small>
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

    <section id="verification-review" className="op-verify-section op-verify-review" aria-labelledby="verification-review-title">
      <div className="op-verify-section-head">
        <h3 id="verification-review-title">Review</h3>
        <p>Check your details and required documents before submitting.</p>
      </div>
      {editable ? <div className="op-verify-review-actions">
        <Button onClick={handleSubmit} disabled={saving} className="op-trust-button-primary">{saving ? <Spinner size="sm" /> : <><ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" />Submit for review</>}</Button>
        <Button color="light" disabled={saving} onClick={handleSaveAndExit}>Save and exit</Button>
        <Link to="/trips">Return to trips</Link>
      </div> : <div className="op-verify-submitted"><FileText size={17} strokeWidth={1.8} aria-hidden="true" /><span>Your submitted information is shown above.</span></div>}
    </section>
  </div>;
}

IdentityVerificationPanel.propTypes = {
  onApproved: PropTypes.func,
};

export default IdentityVerificationPanel;
