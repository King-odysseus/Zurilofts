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
import { useLanguage } from '../context/LanguageContext.jsx';
import SelectMenu from './SelectMenu.jsx';

const DOCUMENT_KINDS = [
  { kind: 'ID_FRONT', labelKey: 'trust.docIdFront', required: true },
  { kind: 'ID_BACK', labelKey: 'trust.docIdBack', required: false },
  { kind: 'SELFIE', labelKey: 'trust.docSelfie', required: true },
];

const ID_TYPE_OPTIONS = [
  { value: 'NATIONAL_ID', labelKey: 'trust.idNational' },
  { value: 'PASSPORT', labelKey: 'trust.idPassport' },
  { value: 'ALIEN_ID', labelKey: 'trust.idAlien' },
];

const STATUS_META = {
  UNVERIFIED: { labelKey: 'trust.statusNotVerified', color: 'gray', icon: Clock3 },
  SUBMITTED: { labelKey: 'trust.statusUnderReview', color: 'warning', icon: Clock3 },
  APPROVED: { labelKey: 'trust.statusVerified', color: 'success', icon: BadgeCheck },
  REJECTED: { labelKey: 'admin.verificationChanges', color: 'failure', icon: AlertCircle },
};

const VERIFICATION_STEPS = [
  { number: '1', labelKey: 'common.details', detailKey: 'profile.personalInformation', href: '#verification-details' },
  { number: '2', labelKey: 'trust.documents', detailKey: 'trust.secureUpload', href: '#verification-documents' },
  { number: '3', labelKey: 'trust.review', detailKey: 'trust.submitForReview', href: '#verification-review' },
];

/**
 * Guest identity verification: gates payment on a booking, not account access.
 * Reused on the Profile "Verification" tab and on the standalone /verify-identity
 * page a guest is sent to mid-checkout.
 */
function IdentityVerificationPanel({ onApproved, afterSavePath = '/profile#verification', showTripsLink = true, context = 'traveller' }) {
  const { t } = useLanguage();
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
      setError(error.response?.data?.error || t('trust.verifyLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
      setNotice(t('trust.detailsSaved'));
      return true;
    } catch (error) {
      setError(error.response?.data?.error || t('trust.detailsSaveFailed'));
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
    if (saved) navigate(afterSavePath);
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
      setNotice(t('trust.documentUploaded'));
    } catch (error) {
      setError(error.response?.data?.error || t('trust.documentUploadFailed'));
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
      setNotice(t('trust.submittedForReview'));
    } catch (error) {
      setError(error.response?.data?.error || t('trust.completeRequiredFirst'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="op-verify-loading" role="status"><Spinner size="lg" /><span>{t('trust.loadingVerification')}</span></div>;
  }

  return <div className="op-verify">
    <header className="op-verify-head">
      <div>
        <h2>{t('trust.verifyYourIdentity')}</h2>
        {context === 'host'
          ? <p>{t('trust.verifyHintStandalone')}</p>
          : <p>{t('trust.verifyHintBooking')}</p>}
      </div>
      <Badge color={status.color} icon={StatusIcon}>{t(status.labelKey)}</Badge>
    </header>

    <nav className="op-verify-steps" aria-label={t('trust.verificationProgress')}>
      {VERIFICATION_STEPS.map((step, index) => <a key={step.labelKey} href={step.href} className={`op-verify-step${index === 0 ? ' is-active' : ''}`}>
        <span>{step.number}</span>
        <div><strong>{t(step.labelKey)}</strong><small>{t(step.detailKey)}</small></div>
      </a>)}
    </nav>

    {data?.status === 'REJECTED' && data?.reviewNote && <Alert color="failure" icon={AlertCircle} className="op-verify-alert">{data.reviewNote}</Alert>}
    {data?.status === 'SUBMITTED' && <Alert color="warning" icon={Clock3} className="op-verify-alert">{t('trust.verificationUnderReview')}</Alert>}
    {data?.status === 'APPROVED' && <Alert color="success" icon={CheckCircle2} className="op-verify-alert">{t('trust.verificationComplete')}</Alert>}
    {error && <Alert color="failure" className="op-verify-alert">{error}</Alert>}
    {notice && <Alert color="success" className="op-verify-alert">{notice}</Alert>}

    <section className="op-verify-section" aria-labelledby="verification-details-title">
      <div className="op-verify-details-grid">
        <div className="op-verify-fields">
          <div className="op-verify-section-head">
            <h3 id="verification-details-title">{t('trust.tellUsAboutYourself')}</h3>
            <p>{t('trust.identityUseOnly')}</p>
          </div>
          <form id="verification-details" className="op-verify-form" onSubmit={handleSave}>
            <div className="op-verify-field">
              <Label htmlFor="iv-fullName">{t('trust.legalName')}</Label>
              <TextInput id="iv-fullName" type="text" disabled={!editable} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder={t('trust.legalNamePlaceholder')} required />
            </div>
            <div className="op-verify-field">
              <Label htmlFor="iv-dateOfBirth">{t('trust.dateOfBirth')}</Label>
              <TextInput id="iv-dateOfBirth" type="date" disabled={!editable} value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} required />
            </div>
            <div className="op-verify-field">
              <Label htmlFor="iv-idType">{t('trust.identityDocument')}</Label>
              <SelectMenu
                id="iv-idType"
                ariaLabel={t('trust.identityDocument')}
                disabled={!editable}
                value={form.idType}
                onChange={(next) => setForm({ ...form, idType: next })}
                options={ID_TYPE_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
              />
            </div>
            <div className="op-verify-field">
              <Label htmlFor="iv-idNumber">{t('trust.documentNumber')}</Label>
              <TextInput id="iv-idNumber" type="text" disabled={!editable} value={form.idNumber} onChange={(event) => setForm({ ...form, idNumber: event.target.value })} required />
            </div>
            <p className="op-verify-help"><LockKeyhole size={14} strokeWidth={1.8} aria-hidden="true" />{t('trust.documentsEncrypted')}</p>
            {editable && <div className="op-verify-detail-actions">
              <Button type="submit" disabled={saving} className="op-trust-button-primary">{saving ? <Spinner size="sm" /> : t('hostaccount.saveDetails')}</Button>
              <Button as="a" href="#verification-documents" color="light">{t('trust.continueToDocuments')}</Button>
            </div>}
          </form>
        </div>
        <aside className="op-verify-callout">
          <span><Clock3 size={18} strokeWidth={1.8} aria-hidden="true" /></span>
          {context === 'host' ? <strong>{t('trust.payoutsNeedVerification')}</strong> : <strong>{t('trust.bookingIsHeld')}</strong>}
          {context === 'host'
            ? <p>{t('trust.payoutHeldHint')}</p>
            : <p>{t('trust.returnToPayment')}</p>}
        </aside>
      </div>
    </section>

    {editable && <section id="verification-documents" className="op-verify-section op-verify-documents" aria-labelledby="verification-documents-title">
      <div className="op-verify-section-head">
        <h3 id="verification-documents-title">{t('trust.documents')}</h3>
        <p>{t('trust.documentsHint')}</p>
      </div>
      <div className="op-verify-document-list">
        {DOCUMENT_KINDS.map(({ kind, labelKey, required }) => {
          const uploaded = uploadedKinds.has(kind);
          return <div key={kind} className="op-verify-document">
            <span className="op-verify-document-icon"><FileCheck2 size={19} strokeWidth={1.8} aria-hidden="true" /></span>
            <div>
              <strong>{t(labelKey)}{required && <em>{t('trust.required')}</em>}</strong>
              <small>{uploaded ? t('trust.uploadedEncrypted') : t('trust.notUploadedYet')}</small>
            </div>
            <Button size="sm" color="light" disabled={uploading === kind} onClick={() => fileInputs.current[kind]?.click()}>
              {uploading === kind ? <Spinner size="sm" /> : <><Upload size={14} strokeWidth={1.8} aria-hidden="true" />{uploaded ? t('hostsetup.replace') : t('hostsetup.upload')}</>}
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
        <h3 id="verification-review-title">{t('trust.review')}</h3>
        <p>{t('trust.reviewHint')}</p>
      </div>
      {editable ? <div className="op-verify-review-actions">
        <Button onClick={handleSubmit} disabled={saving} className="op-trust-button-primary">{saving ? <Spinner size="sm" /> : <><ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" />{t('trust.submitForReview')}</>}</Button>
        <Button color="light" disabled={saving} onClick={handleSaveAndExit}>{t('hostsetup.saveAndExit')}</Button>
        {showTripsLink && <Link to="/trips">{t('trust.returnToTrips')}</Link>}
      </div> : <div className="op-verify-submitted"><FileText size={17} strokeWidth={1.8} aria-hidden="true" /><span>{t('trust.submittedInfoShown')}</span></div>}
    </section>
  </div>;
}

IdentityVerificationPanel.propTypes = {
  onApproved: PropTypes.func,
  // Where "Save and exit" lands. The panel is shared, so each app passes its
  // own home instead of every caller inheriting a traveller route.
  afterSavePath: PropTypes.string,
  // "Return to trips" is traveller language; the host workspace hides it.
  showTripsLink: PropTypes.bool,
  // Which app is showing the panel: the traveller copy talks about a held
  // booking, while a host needs to hear about payouts.
  context: PropTypes.oneOf(['traveller', 'host']),
};

export default IdentityVerificationPanel;
