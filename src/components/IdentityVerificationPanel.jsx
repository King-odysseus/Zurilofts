import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Label, Spinner, TextInput } from 'flowbite-react';
import {
  AlertCircle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  IdCard,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import SelectMenu from './SelectMenu.jsx';
import CameraCapture from './CameraCapture.jsx';

// Each row carries a mark for the document it asks for, so the three requests
// are told apart before the caption is read. All three can also be photographed:
// a phone camera is the only camera many people have, and a card is quicker to
// shoot than to scan. The ID sides look through the rear camera, which is the
// one that can focus on a card held at arm's length, while the selfie uses the
// front one because the person has to see themselves to frame it.
const DOCUMENT_KINDS = [
  { kind: 'ID_FRONT', labelKey: 'trust.docIdFront', required: true, Icon: IdCard, facingMode: 'environment' },
  { kind: 'ID_BACK', labelKey: 'trust.docIdBack', required: false, Icon: CreditCard, facingMode: 'environment' },
  { kind: 'SELFIE', labelKey: 'trust.docSelfie', required: true, Icon: Camera, facingMode: 'user' },
];

// The picker offers these four types and the server sniffs for the same ones,
// and it refuses anything over 8MB (multer in
// server/src/routes/identity-verification.routes.ts). Repeating both here lets a
// dropped file be answered inside its own row instead of after a round trip, so
// keep them in step with the server.
const ACCEPTED_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

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
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fullName: '', dateOfBirth: '', idType: 'NATIONAL_ID', idNumber: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(null);
  // Which document the camera is photographing, or null while it is closed. A
  // kind rather than a flag, so a capture lands on the row that asked for it
  // instead of always on the selfie.
  const [cameraKind, setCameraKind] = useState(null);
  // The row a file is hovering over. One value rather than a flag per row,
  // because a drag can only be over one row at a time.
  const [draggingKind, setDraggingKind] = useState(null);
  // A refused or failed upload belongs beside the row it concerns, not at the
  // top of a page that is three screens tall.
  const [rowError, setRowError] = useState({ kind: null, message: '' });
  const fileInputs = useRef({});
  // Every child the pointer crosses fires its own dragenter and dragleave, so one
  // boolean flickers off the moment the pointer passes over the caption or a
  // button. Counting enters against leaves, per row, holds the drop state until
  // the pointer truly leaves that row.
  const dragDepth = useRef({});

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
    setRowError({ kind: null, message: '' });
    // A file with no reported type is sent on rather than refused: some browsers
    // leave it blank for a file they do not recognise, and the server reads the
    // bytes anyway, so refusing here would block a real document.
    if (file.type && !ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
      setRowError({ kind, message: t('trust.fileWrongType') });
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setRowError({ kind, message: t('trust.fileTooLarge') });
      return;
    }
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
      setRowError({ kind, message: error.response?.data?.error || t('trust.documentUploadFailed') });
    } finally {
      setUploading(null);
    }
  }

  // A dropped file and a chosen one end in the same place; only the source of
  // the File differs, so these handlers stay separate from the upload itself.
  function handleDragEnter(kind, event) {
    if (uploading) return;
    event.preventDefault();
    dragDepth.current[kind] = (dragDepth.current[kind] || 0) + 1;
    setDraggingKind(kind);
  }

  function handleDragOver(event) {
    if (uploading) return;
    // Without this the row counts as a non-target, drop never fires, and the
    // browser opens the file instead, losing a half-filled form.
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  function handleDragLeave(kind, event) {
    event.preventDefault();
    dragDepth.current[kind] = Math.max(0, (dragDepth.current[kind] || 0) - 1);
    if (dragDepth.current[kind] === 0) {
      setDraggingKind((current) => (current === kind ? null : current));
    }
  }

  function handleDrop(kind, event) {
    event.preventDefault();
    dragDepth.current[kind] = 0;
    setDraggingKind(null);
    if (uploading) return;
    const dropped = event.dataTransfer?.files?.[0];
    if (dropped) handleUpload(kind, dropped);
  }

  async function handleSubmit() {
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const response = await apiClient.post('/identity-verification/submit');
      setData(response.data.data);
      setNotice(t('trust.submittedForReview'));
      // The account shell decides whether to show the "verify your identity"
      // reminder from the session copy of this status. Without refreshing it
      // here, a guest who had just handed over their documents would be asked
      // to verify again on the very next page they opened, until a reload.
      apiClient.get('/auth/me')
        .then((me) => setUser(me.data.data))
        .catch((refreshError) => console.warn('Could not refresh the session after submitting verification', refreshError));
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
        {DOCUMENT_KINDS.map(({ kind, labelKey, required, Icon }) => {
          const uploaded = uploadedKinds.has(kind);
          const busy = uploading === kind;
          const dragging = draggingKind === kind;
          const rowMessage = rowError.kind === kind ? rowError.message : '';
          return <div
            key={kind}
            onDragEnter={(event) => handleDragEnter(kind, event)}
            onDragOver={handleDragOver}
            onDragLeave={(event) => handleDragLeave(kind, event)}
            onDrop={(event) => handleDrop(kind, event)}
            className={`op-verify-document${dragging ? ' ring-2 ring-navy' : ''}`}
          >
            <span className="op-verify-document-icon"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>
            <div>
              <strong>{t(labelKey)}{required && <em>{t('trust.required')}</em>}</strong>
              {/* A span, not the small the stylesheet styles, so the drop wording
                  keeps its own weight and colour above a caption it replaces. */}
              {dragging
                ? <span className="mt-1 block text-[10px] font-semibold text-navy">{t('trust.dropToUpload')}</span>
                : <small>{uploaded ? t('trust.uploadedEncrypted') : t('trust.notUploadedYet')}</small>}
              {rowMessage && <span role="alert" className="mt-1 block text-[10px] font-semibold text-red-600 dark:text-red-300">{rowMessage}</span>}
            </div>
            {/* Every document can be shot or chosen, so the camera leads and the
                picker stays beside it for a machine without one. The picker is
                also where the dialog points when access is blocked. */}
            <Button size="sm" color="light" disabled={busy} onClick={() => setCameraKind(kind)}>
              {busy ? <Spinner size="sm" /> : <><Camera size={14} strokeWidth={1.8} aria-hidden="true" />{t(uploaded ? 'trust.retakePhoto' : 'trust.takePhoto')}</>}
            </Button>
            <button type="button" className="op-verify-document-alt" disabled={busy} onClick={() => fileInputs.current[kind]?.click()}>{t('trust.uploadInstead')}</button>
            <input
              ref={(element) => { fileInputs.current[kind] = element; }}
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              // On a phone the fallback still opens a camera, so it goes where
              // the photo is taken rather than to a camera roll that may hold
              // nothing usable. The ID sides match the dialog's rear lens.
              capture={kind === 'SELFIE' ? 'user' : 'environment'}
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

    {/* A captured photo goes through the same upload path as a chosen one, so
        there is one place that knows how a document is stored. It sits outside
        the editable block because closing the dialog must not depend on the
        form still being editable. */}
    <CameraCapture
      open={cameraKind !== null}
      facingMode={DOCUMENT_KINDS.find((entry) => entry.kind === cameraKind)?.facingMode || 'user'}
      onCapture={(file) => { if (cameraKind) handleUpload(cameraKind, file); }}
      onClose={() => setCameraKind(null)}
      labels={{
        title: t(cameraKind === 'SELFIE' ? 'trust.cameraTitle' : 'trust.cameraTitleId'),
        hint: t(cameraKind === 'SELFIE' ? 'trust.cameraHint' : 'trust.cameraHintId'),
        starting: t('trust.cameraStarting'),
        capture: t('trust.cameraCapture'),
        cancel: t('common.cancel'),
        denied: t('trust.cameraDenied'),
        unsupported: t('trust.cameraUnsupported'),
        retry: t('common.retry'),
      }}
    />
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
