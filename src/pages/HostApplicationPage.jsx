import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Checkbox, Label, Textarea, TextInput } from 'flowbite-react';
import { AlertCircle, Building, Check, CheckCircle2, CreditCard, House, IdCard, Upload, X } from 'lucide-react';
import SelectMenu from '../components/SelectMenu.jsx';
import Spinner from '../components/Spinner.jsx';
import apiClient from '../api/client.js';
import { formatPrice } from '../utils/currency.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useMode } from '../context/ModeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';


const EMPTY_FORM = {
  legalName: '', businessName: '', businessType: 'individual',
  contactPhone: '', contactEmail: '', dateOfBirth: '', nationality: 'Kenyan',
  identityType: 'NATIONAL_ID', kraPin: '', companyRegistrationNo: '',
  city: '', propertyCount: '', propertyRelationship: 'OWNER', propertyTypes: [],
  propertyLocations: '', yearsHosting: '0', preferredPayoutMethod: 'mpesa',
  payoutMpesaPhone: '', payoutBankName: '', payoutBankCode: '', payoutBankAccountNo: '',
  experience: '', agreedTerms: false,
};

const STATUS_COPY = {
  DRAFT: 'hostsetup.draftHint',
  CHANGES_REQUESTED: 'hostsetup.changesHint',
  SUBMITTED: 'hostsetup.submittedHint',
  APPROVED: 'hostsetup.approvedHint',
  REJECTED: 'hostsetup.rejectedHint',
};

const STATUS_LABELS = {
  DRAFT: 'hostsetup.draft',
  CHANGES_REQUESTED: 'hostsetup.changesRequested',
  SUBMITTED: 'hostsetup.underReview',
  APPROVED: 'hostsetup.approved',
  REJECTED: 'hostsetup.notApproved',
};

const STEP_DEFINITIONS = [
  {
    key: 'identity',
    label: 'hostsetup.step1Title',
    description: 'hostsetup.step1Short',
  },
  {
    key: 'business',
    label: 'hostsetup.step2Title',
    description: 'hostsetup.step2Short',
  },
  {
    key: 'properties',
    label: 'hostsetup.step3Title',
    description: 'hostsetup.step3Short',
  },
  {
    key: 'review',
    label: 'hostsetup.step4Title',
    description: 'hostsetup.step4Short',
  },
];

const PROPERTY_TYPES = [
  ['apartment', 'Apartment'], ['studio', 'Studio'], ['penthouse', 'Penthouse'],
  ['house', 'House'], ['villa', 'Villa'], ['other', 'Other'],
];

const DOCUMENT_LABELS = {
  IDENTITY_FRONT: 'hostsetup.docFront',
  IDENTITY_BACK: 'hostsetup.docBack',
  PROPERTY_AUTHORITY: 'hostsetup.docAuthority',
  BUSINESS_REGISTRATION: 'hostsetup.docBusiness',
};

// Four tiles sit in one grid with only their captions to tell them apart, and
// the captions begin with the same two words ("Identity document..."). The mark
// on each tile therefore has to say which file goes in it, so it follows the
// document kind instead of being one shared placeholder. It is decorative: the
// caption beside it is the accessible name.
const DOCUMENT_ICONS = {
  IDENTITY_FRONT: IdCard,
  IDENTITY_BACK: CreditCard,
  PROPERTY_AUTHORITY: House,
  BUSINESS_REGISTRATION: Building,
};

// The tile promises "JPEG, PNG, WebP or PDF up to 8MB", so the same limits are
// checked here. A picked file is filtered by the input's accept attribute, but a
// dropped one is not, and the server's rejection arrives far from the tile.
const ALLOWED_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

function describeDocumentProblem(file) {
  if (!file) return 'No file was received. Choose the file again.';
  const type = String(file.type || '').toLowerCase();
  if (!ALLOWED_DOCUMENT_TYPES.includes(type)) {
    return 'ZuriLofts accepts a JPEG, PNG or WebP photo, or a PDF. Convert the file, then add it again.';
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    const megabytes = (file.size / (1024 * 1024)).toFixed(1);
    return `That file is ${megabytes}MB. The limit is 8MB, so compress it or take a lower-resolution photo.`;
  }
  return '';
}

// The API answers an unexpected crash with one flat sentence, "Internal server
// error". It is accurate and useless: it names no cause and suggests no action,
// so every failure is rewritten as a title the applicant can scan plus a body
// that says what is still true and what to do next.
const UNHELPFUL_SERVER_MESSAGES = new Set(['error', 'internal server error', 'server error', 'something went wrong']);

function describeRequestFailure(err, action) {
  const title = `Could not ${action}`;
  if (!err?.response) {
    return { title, text: 'ZuriLofts could not be reached. Check your internet connection, then try again.' };
  }
  const serverMessage = String(err.response.data?.error || '').trim();
  const unhelpful = !serverMessage || UNHELPFUL_SERVER_MESSAGES.has(serverMessage.toLowerCase());
  if (err.response.status >= 500 || unhelpful) {
    return {
      title,
      text: 'Something went wrong at our end, not because of anything you did. Everything you have filled in is still on this page, so try again in a moment. If it keeps failing, contact support and say what you were doing.',
    };
  }
  return { title, text: serverMessage };
}

// Shared with the listing editor so both multi-step host forms read identically.
const CARD_CLASS = 'rounded-xl bg-elevated shadow-md p-5 sm:p-6';
const STEP_BUTTON_BASE = 'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface';
const STEP_CIRCLE_BASE = 'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface dark:bg-primary/15 text-[11px] font-bold';

function formFromApplication(application, user) {
  return {
    ...EMPTY_FORM,
    legalName: application?.legalName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    businessName: application?.businessName || '',
    businessType: application?.businessType || 'individual',
    contactPhone: application?.contactPhone || user?.phone || '',
    contactEmail: application?.contactEmail || user?.email || '',
    dateOfBirth: application?.dateOfBirth || '',
    nationality: application?.nationality || 'Kenyan',
    identityType: application?.identityType || 'NATIONAL_ID',
    kraPin: application?.kraPin || '',
    companyRegistrationNo: application?.companyRegistrationNo || '',
    city: application?.city || '',
    propertyCount: application?.propertyCount ?? '',
    propertyRelationship: application?.propertyRelationship || 'OWNER',
    propertyTypes: application?.propertyTypes || [],
    propertyLocations: application?.propertyLocations || '',
    yearsHosting: application?.yearsHosting ?? '0',
    preferredPayoutMethod: application?.preferredPayoutMethod || 'mpesa',
    payoutMpesaPhone: application?.payoutMpesaPhone || user?.phone || '',
    payoutBankName: application?.payoutBankName || '',
    payoutBankCode: application?.payoutBankCode || '',
    payoutBankAccountNo: application?.payoutBankAccountNo || '',
    experience: application?.experience || '',
    agreedTerms: Boolean(application?.agreedTerms),
  };
}

function HostApplicationPage() {
  const { t } = useLanguage();
  const { user, setUser } = useAuth();
  const { setMode } = useMode();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKind, setUploadingKind] = useState('');
  const [loadError, setLoadError] = useState('');
  // One outcome at a time, tagged with where it happened, so it can be drawn
  // beside the button that caused it instead of at the top of the page.
  const [feedback, setFeedback] = useState(null);
  const [activeStep, setActiveStep] = useState('identity');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [banks, setBanks] = useState([]);

  // Paystack needs its own bank code to create a transfer recipient, so the
  // applicant picks from Paystack's list instead of typing a name we cannot map.
  useEffect(() => {
    if (!user) return;
    let ignore = false;
    apiClient.get('/payments/banks')
      .then((response) => {
        if (ignore) return;
        if (Array.isArray(response.data?.data)) setBanks(response.data.data);
      })
      .catch(() => {
        // A failed bank list must not block the rest of the application: an empty
        // list switches the bank fields to manual entry below.
        if (!ignore) setBanks([]);
      });
    return () => { ignore = true; };
  }, [user]);

  // A file dropped a few pixels outside a tile would otherwise make the browser
  // navigate to it and throw away a half-completed application. Nothing else on
  // this page accepts a drop, so cancelling the default everywhere is safe.
  useEffect(() => {
    function blockBrowserHandling(event) {
      event.preventDefault();
    }
    window.addEventListener('dragover', blockBrowserHandling);
    window.addEventListener('drop', blockBrowserHandling);
    return () => {
      window.removeEventListener('dragover', blockBrowserHandling);
      window.removeEventListener('drop', blockBrowserHandling);
    };
  }, []);

  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;
    // AuthContext resolves the logged-in user asynchronously (it refreshes the
    // session on mount), so this effect first runs with user still null and
    // reruns once the real user lands. Without this guard, whichever request
    // happens to resolve last wins - a slow first run (user=null, so it never
    // creates the draft) can overwrite the second run's freshly created DRAFT
    // application with null, leaving the page stuck on the read-only status
    // card with no way to reach the editable form.
    let ignore = false;
    async function loadApplication() {
      setLoading(true);
      setLoadError('');
      try {
        let response = await apiClient.get('/host-application');
        let current = response.data.data;
        if (!current && user?.role === 'USER') {
          response = await apiClient.post('/host-application');
          current = response.data.data;
        }
        if (current?.status === 'APPROVED' && user?.role !== 'HOST') {
          const meResponse = await apiClient.get('/auth/me');
          if (!ignore) setUser(meResponse.data.data);
        }
        if (ignore) return;
        setApplication(current);
        setForm(formFromApplication(current, user));
      } catch (err) {
        if (ignore) return;
        setLoadError(err.response?.data?.error || 'Could not load your host application.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadApplication();
    return () => { ignore = true; };
  }, [setUser, user, loadAttempt]);

  const editable = ['DRAFT', 'CHANGES_REQUESTED'].includes(application?.status);
  const requiredDocuments = useMemo(() => {
    const kinds = ['IDENTITY_FRONT', 'PROPERTY_AUTHORITY'];
    if (form.identityType === 'NATIONAL_ID' || form.identityType === 'ALIEN_ID') kinds.splice(1, 0, 'IDENTITY_BACK');
    if (form.businessType === 'company') kinds.push('BUSINESS_REGISTRATION');
    return kinds;
  }, [form.identityType, form.businessType]);

  const completionItems = useMemo(() => {
    const identityComplete = [
      form.legalName, form.dateOfBirth, form.nationality, form.identityType,
      form.contactEmail, form.contactPhone, form.kraPin,
    ].every((value) => String(value || '').trim());
    const payoutComplete = form.preferredPayoutMethod === 'mpesa'
      ? Boolean(String(form.payoutMpesaPhone || '').trim())
      : Boolean(String(form.payoutBankName || '').trim()
        && String(form.payoutBankCode || '').trim()
        && String(form.payoutBankAccountNo || '').trim());
    const businessComplete = Boolean(form.businessName && form.businessType && form.preferredPayoutMethod)
      && (form.businessType !== 'company' || Boolean(form.companyRegistrationNo))
      && payoutComplete;
    const propertiesComplete = Boolean(
      form.city && form.propertyCount && form.propertyRelationship
      && form.propertyTypes.length > 0 && form.propertyLocations,
    );
    const documentsComplete = requiredDocuments.every((kind) => (
      application?.documents?.some((document) => document.kind === kind)
    ));
    const reviewComplete = documentsComplete && form.agreedTerms;

    return [
      { ...STEP_DEFINITIONS[0], complete: identityComplete, detail: identityComplete ? t('hostsetup.detailed') : t('hostsetup.inProgress') },
      { ...STEP_DEFINITIONS[1], complete: businessComplete, detail: businessComplete ? t('hostsetup.detailed') : t('hostsetup.needsDetails') },
      { ...STEP_DEFINITIONS[2], complete: propertiesComplete, detail: propertiesComplete ? t('hostsetup.detailed') : t('hostsetup.needsDetails') },
      { ...STEP_DEFINITIONS[3], complete: reviewComplete, detail: reviewComplete ? t('hostsetup.readyToSubmit') : t('hostsetup.documentsRequired') },
    ];
  }, [
    application?.documents,
    form.agreedTerms,
    form.businessName,
    form.businessType,
    form.city,
    form.companyRegistrationNo,
    form.contactEmail,
    form.contactPhone,
    form.dateOfBirth,
    form.identityType,
    form.kraPin,
    form.legalName,
    form.nationality,
    form.payoutBankAccountNo,
    form.payoutBankCode,
    form.payoutBankName,
    form.payoutMpesaPhone,
    form.preferredPayoutMethod,
    form.propertyCount,
    form.propertyLocations,
    form.propertyRelationship,
    form.propertyTypes,
    requiredDocuments,
    t,
  ]);

  const completedCount = completionItems.filter((item) => item.complete).length;
  const completionPercent = (completedCount / STEP_DEFINITIONS.length) * 100;
  const statusLabel = saving
    ? 'Saving'
    : application
      ? t(STATUS_LABELS[application.status]) || application.status.replaceAll('_', ' ')
      : user?.role === 'HOST' ? 'Approved' : 'Not started';
  const statusMeta = application ? t(STATUS_COPY[application.status]) : STATUS_COPY.DRAFT;

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function togglePropertyType(type) {
    setForm((current) => ({
      ...current,
      propertyTypes: current.propertyTypes.includes(type)
        ? current.propertyTypes.filter((item) => item !== type)
        : [...current.propertyTypes, type],
    }));
  }

  function goToStep(step) {
    setActiveStep(step);
    const target = document.getElementById(`host-application-${step}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function applicationPayload() {
    const payload = {
      businessType: form.businessType,
      propertyRelationship: form.propertyRelationship,
      yearsHosting: Number(form.yearsHosting),
      preferredPayoutMethod: form.preferredPayoutMethod,
      agreedTerms: form.agreedTerms,
    };

    const optionalText = {
      legalName: form.legalName,
      businessName: form.businessName,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
      dateOfBirth: form.dateOfBirth,
      nationality: form.nationality,
      identityType: form.identityType,
      kraPin: form.kraPin.trim().toUpperCase(),
      companyRegistrationNo: form.businessType === 'company' ? form.companyRegistrationNo : '',
      city: form.city,
      propertyLocations: form.propertyLocations,
      experience: form.experience,
    };

    Object.entries(optionalText).forEach(([key, value]) => {
      const normalized = String(value || '').trim();
      if (normalized) payload[key] = normalized;
    });

    // Only send the destination that matches the chosen method, so a stale value
    // from a previous choice can never be approved as the payout account.
    if (form.preferredPayoutMethod === 'mpesa') {
      const mpesaPhone = String(form.payoutMpesaPhone || '').trim();
      if (mpesaPhone) payload.payoutMpesaPhone = mpesaPhone;
    } else {
      const bankPatch = {
        payoutBankName: String(form.payoutBankName || '').trim(),
        payoutBankCode: String(form.payoutBankCode || '').trim(),
        payoutBankAccountNo: String(form.payoutBankAccountNo || '').trim(),
      };
      Object.entries(bankPatch).forEach(([key, value]) => {
        if (value) payload[key] = value;
      });
    }

    // A code arrives from a share link and is stored on this device until the
    // applicant saves the form. The server resolves it to a host and quietly
    // ignores it when it matches nobody, so a stale typo is harmless.
    const storedReferralCode = window.localStorage.getItem('zurilofts_referral_code');
    if (storedReferralCode) payload.referredByCode = storedReferralCode;

    if (form.propertyCount !== '') payload.propertyCount = Number(form.propertyCount);
    if (form.propertyTypes.length > 0) payload.propertyTypes = form.propertyTypes;

    return payload;
  }

  async function saveApplication() {
    const payload = applicationPayload();
    const response = await apiClient.patch('/host-application', payload);
    // Once the code has been accepted there is nothing left to send; keeping it
    // would re-apply the link on every later save.
    if (payload.referredByCode) window.localStorage.removeItem('zurilofts_referral_code');
    setApplication(response.data.data);
    return response.data.data;
  }

  function reportFailure(where, action, err) {
    setFeedback({ tone: 'error', where, ...describeRequestFailure(err, action) });
  }

  function reportSuccess(where, title, text) {
    setFeedback({ tone: 'success', where, title, text });
  }

  function clearFeedback() {
    setFeedback(null);
  }

  const feedbackFor = (where) => (feedback?.where === where ? feedback : null);

  async function handleSave(event, where = 'review') {
    event?.preventDefault();
    setSaving(true);
    clearFeedback();
    try {
      await saveApplication();
      reportSuccess(where, 'Draft saved', 'Your answers are stored. You can leave this page and pick it up later.');
    } catch (err) {
      reportFailure(where, 'save your application', err);
    } finally { setSaving(false); }
  }

  async function handleSaveAndContinue(nextStep, where) {
    setSaving(true);
    clearFeedback();
    try {
      await saveApplication();
      reportSuccess(where, 'Draft saved', 'Your answers are stored, and the next step is open.');
      if (nextStep) goToStep(nextStep);
    } catch (err) {
      reportFailure(where, 'save your application', err);
    } finally { setSaving(false); }
  }

  /**
   * What the server would reject the submission for, worked out here first so
   * the applicant is told which step or file is missing in plain words, straight
   * away, without a round trip. The server stays the authority: this only
   * decides what to say before asking it.
   */
  function submissionBlockers() {
    const blockers = [];
    completionItems.slice(0, 3).forEach((item) => {
      if (!item.complete) {
        blockers.push({ text: `${t(item.label)} still needs a few details.`, step: item.key });
      }
    });
    const missingDocuments = requiredDocuments.filter((kind) => (
      !application?.documents?.some((doc) => doc.kind === kind)
    ));
    if (missingDocuments.length > 0) {
      blockers.push({
        text: `Upload the remaining documents: ${missingDocuments.map((kind) => t(DOCUMENT_LABELS[kind])).join(', ')}.`,
      });
    }
    if (!form.agreedTerms) {
      blockers.push({ text: 'Tick the confirmation box to confirm the details are accurate.' });
    }
    return blockers;
  }

  async function handleSubmit() {
    clearFeedback();
    const blockers = submissionBlockers();
    if (blockers.length > 0) {
      const firstStep = blockers.find((blocker) => blocker.step)?.step;
      const stepLabel = firstStep && t(STEP_DEFINITIONS.find((step) => step.key === firstStep).label);
      setFeedback({
        tone: 'error',
        where: 'review',
        title: 'Finish these before submitting',
        items: blockers.map((blocker) => blocker.text),
        action: firstStep
          ? { label: `Go to ${stepLabel}`, onClick: () => goToStep(firstStep) }
          : undefined,
      });
      return;
    }
    setSaving(true);
    try {
      await saveApplication();
      const response = await apiClient.post('/host-application/submit');
      setApplication(response.data.data);
      clearFeedback();
    } catch (err) {
      reportFailure('review', 'submit your application', err);
    } finally { setSaving(false); }
  }

  async function handleSaveAndLeave(where = 'sidebar') {
    setSaving(true);
    clearFeedback();
    try {
      await saveApplication();
      setMode('travelling');
      navigate('/');
    } catch (err) {
      reportFailure(where, 'save your application', err);
      setSaving(false);
    }
  }

  async function uploadDocument(kind, file) {
    if (!file) return;
    const problem = describeDocumentProblem(file);
    if (problem) {
      setFeedback({ tone: 'error', where: kind, title: 'That file cannot be uploaded', text: problem });
      return;
    }
    setUploadingKind(kind);
    clearFeedback();
    try {
      const body = new FormData();
      body.append('document', file);
      const response = await apiClient.put(`/host-application/documents/${kind}`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setApplication((current) => ({
        ...current,
        documents: [...(current.documents || []).filter((doc) => doc.kind !== kind), response.data.data],
      }));
      reportSuccess(kind, 'Uploaded', `${t(DOCUMENT_LABELS[kind])} uploaded securely.`);
    } catch (err) {
      reportFailure(kind, 'upload the document', err);
    } finally { setUploadingKind(''); }
  }

  async function removeDocument(kind) {
    setUploadingKind(kind);
    clearFeedback();
    try {
      await apiClient.delete(`/host-application/documents/${kind}`);
      setApplication((current) => ({
        ...current,
        documents: (current.documents || []).filter((doc) => doc.kind !== kind),
      }));
    } catch (err) {
      reportFailure(kind, 'remove the document', err);
    } finally { setUploadingKind(''); }
  }

  // Administrators manage applications; they cannot create a host application.
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t('hostsetup.eyebrow')}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{t('hostsetup.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t('hostsetup.description')}</p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label={t('hostsetup.summaryLabel')}>
        <div className="rounded-xl bg-elevated shadow-md p-4">
          <strong className="block text-lg font-bold text-navy">{completedCount} / {STEP_DEFINITIONS.length}</strong>
          <span className="text-xs text-muted">{t('hostsetup.stepsComplete')}</span>
        </div>
        <div className="rounded-xl bg-elevated shadow-md p-4">
          <strong className="block text-lg font-bold text-navy">{t('hostsetup.tenMinutes')}</strong>
          <span className="text-xs text-muted">{t('hostsetup.estimatedTime')}</span>
        </div>
        <div className="rounded-xl bg-elevated shadow-md p-4">
          <strong className="block text-lg font-bold text-navy">{statusLabel}</strong>
          <span className="text-xs text-muted">{saving ? 'Saving changes' : 'Current status'}</span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-2 rounded-xl bg-elevated shadow-md p-5 lg:sticky lg:top-24">
          <div>
            <strong className="block text-sm font-semibold text-navy">{t('hostsetup.yourProgress')}</strong>
            <span className="text-xs text-muted">{completedCount} of {STEP_DEFINITIONS.length} steps complete</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface" aria-hidden="true">
            <i className="block h-full rounded-full bg-primary" style={{ width: `${completionPercent}%` }} />
          </div>
          <nav className="space-y-2 pt-2" aria-label={t('hostsetup.stepsLabel')}>
            {completionItems.map((step, index) => (
              <button
                key={step.key}
                type="button"
                className={`${STEP_BUTTON_BASE} ${activeStep === step.key ? 'bg-primary/10 font-semibold text-navy' : ''} ${step.complete ? 'text-navy' : 'text-muted'}`}
                onClick={() => goToStep(step.key)}
                aria-current={activeStep === step.key ? 'step' : undefined}
              >
                <span className={`${STEP_CIRCLE_BASE} ${step.complete || activeStep === step.key ? 'text-navy' : 'text-muted'}`}>
                  {step.complete ? '\u2713' : index + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <strong className="text-sm font-semibold text-navy">{t(step.label)}</strong>
                  <small className="truncate text-xs text-muted">{step.detail}</small>
                </span>
              </button>
            ))}
          </nav>
          <Button type="button" color="light" className="w-full" onClick={() => handleSaveAndLeave('sidebar')} disabled={saving || !editable}>
            {t('hostsetup.saveAndExit')}
          </Button>
          <ActionFeedback feedback={feedbackFor('sidebar')} onDismiss={clearFeedback} />
        </aside>

        <div className="space-y-5">
          {loadError && <Notice tone="error">{loadError}</Notice>}

          {/* Sits above the step forms: it is a share-and-leave note, not part of
              the application, so it must not interrupt a host filling one in. */}
          <HostReferralCard />

          {editable ? (
            <form onSubmit={(event) => handleSave(event, activeStep)} className="space-y-5">
              <section id="host-application-identity" className={`${CARD_CLASS} scroll-mt-24`}>
                <ApplicationCardHeader
                  step="1"
                  title={t('hostsetup.step1Title')}
                  description={t('hostsetup.step1Description')}
                />
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="host-legal-name">{t('hostsetup.legalName')}</Label>
                    <TextInput id="host-legal-name" value={form.legalName} onChange={(e) => update('legalName', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="host-dob">{t('hostsetup.dateOfBirth')}</Label>
                    <TextInput id="host-dob" type="date" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="host-nationality">{t('hostsetup.nationality')}</Label>
                    <TextInput id="host-nationality" value={form.nationality} onChange={(e) => update('nationality', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="host-identity-type">{t('hostsetup.identityDocument')}</Label>
                    <SelectMenu id="host-identity-type" value={form.identityType} onChange={(v) => update('identityType', v)} options={[
                      { value: 'NATIONAL_ID', label: 'Kenyan national ID' },
                      { value: 'PASSPORT', label: 'Passport' },
                      { value: 'ALIEN_ID', label: 'Alien ID' },
                    ]} />
                  </div>
                  <div>
                    <Label htmlFor="host-contact-email">{t('hostsetup.contactEmail')}</Label>
                    <TextInput id="host-contact-email" type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="host-contact-phone">{t('hostsetup.contactPhone')}</Label>
                    <TextInput id="host-contact-phone" type="tel" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="host-kra-pin">{t('hostsetup.kraPin')}</Label>
                    <TextInput id="host-kra-pin" value={form.kraPin} onChange={(e) => update('kraPin', e.target.value.toUpperCase())} placeholder="A123456789B" required />
                  </div>
                </div>
                <StepActions
                  saving={saving}
                  uploading={Boolean(uploadingKind)}
                  feedback={feedbackFor('identity')}
                  onDismiss={clearFeedback}
                  onSave={() => handleSave(null, 'identity')}
                  onContinue={() => handleSaveAndContinue('business', 'identity')}
                />
              </section>

              <section id="host-application-business" className={`${CARD_CLASS} scroll-mt-24`}>
                <ApplicationCardHeader
                  step="2"
                  title={t('hostsetup.step2Title')}
                  description={t('hostsetup.step2Description')}
                />
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="host-business-type">{t('hostsetup.hostType')}</Label>
                    <SelectMenu id="host-business-type" value={form.businessType} onChange={(v) => update('businessType', v)} options={[
                      { value: 'individual', label: 'Individual' },
                      { value: 'company', label: 'Registered company' },
                    ]} />
                  </div>
                  <div>
                    <Label htmlFor="host-business-name">{t('hostsetup.hostOrBusinessName')}</Label>
                    <TextInput id="host-business-name" value={form.businessName} onChange={(e) => update('businessName', e.target.value)} required />
                  </div>
                  {form.businessType === 'company' && (
                    <div>
                      <Label htmlFor="host-company-number">{t('hostsetup.companyNumber')}</Label>
                      <TextInput id="host-company-number" value={form.companyRegistrationNo} onChange={(e) => update('companyRegistrationNo', e.target.value)} required />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="host-payout-method">{t('hostsetup.preferredPayout')}</Label>
                    <SelectMenu id="host-payout-method" value={form.preferredPayoutMethod} onChange={(v) => update('preferredPayoutMethod', v)} options={[
                      { value: 'mpesa', label: 'M-PESA' },
                      { value: 'bank', label: 'Bank transfer' },
                    ]} />
                    <p className="mt-2 text-xs text-muted">{t('hostsetup.payoutExplainer')}</p>
                  </div>
                  {form.preferredPayoutMethod === 'mpesa' ? (
                    <div>
                      <Label htmlFor="host-payout-mpesa">{t('hostsetup.mpesaNumber')}</Label>
                      <TextInput id="host-payout-mpesa" type="tel" value={form.payoutMpesaPhone} onChange={(e) => update('payoutMpesaPhone', e.target.value)} placeholder="0712345678" required />
                      <p className="mt-2 text-xs text-muted">{t('hostsetup.mpesaExplainer')}</p>
                    </div>
                  ) : banks.length > 0 ? (
                    <div>
                      <Label htmlFor="host-payout-bank">{t('hostsetup.bank')}</Label>
                      <SelectMenu id="host-payout-bank" value={form.payoutBankCode} onChange={(code) => {
                        const bank = banks.find((item) => item.code === code);
                        update('payoutBankName', bank?.name || '');
                        update('payoutBankCode', code);
                      }} options={banks.map((bank) => ({ value: bank.code, label: bank.name }))} searchable searchPlaceholder={t('hostsetup.bankSearch')} noMatchLabel={t('hostsetup.bankNoMatch')} />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="host-payout-bank-name">{t('hostsetup.bankName')}</Label>
                        <TextInput id="host-payout-bank-name" value={form.payoutBankName} onChange={(e) => update('payoutBankName', e.target.value)} placeholder={t('hostsetup.bankPlaceholder')} required />
                      </div>
                      <div>
                        <Label htmlFor="host-payout-bank-code">{t('hostsetup.bankCode')}</Label>
                        <TextInput id="host-payout-bank-code" value={form.payoutBankCode} onChange={(e) => update('payoutBankCode', e.target.value)} placeholder="068" required />
                      </div>
                      <p className="mt-2 text-xs text-muted">{t('hostsetup.bankCodeExplainer')}</p>
                    </div>
                  )}
                  {form.preferredPayoutMethod === 'bank' && (
                    <div>
                      <Label htmlFor="host-payout-account">{t('hostsetup.bankAccount')}</Label>
                      <TextInput id="host-payout-account" value={form.payoutBankAccountNo} onChange={(e) => update('payoutBankAccountNo', e.target.value.replace(/\D/g, ''))} placeholder="0123456789" inputMode="numeric" required />
                    </div>
                  )}
                </div>
                <StepActions
                  saving={saving}
                  uploading={Boolean(uploadingKind)}
                  feedback={feedbackFor('business')}
                  onDismiss={clearFeedback}
                  onSave={() => handleSave(null, 'business')}
                  onContinue={() => handleSaveAndContinue('properties', 'business')}
                />
              </section>

              <section id="host-application-properties" className={`${CARD_CLASS} scroll-mt-24`}>
                <ApplicationCardHeader
                  step="3"
                  title={t('hostsetup.step3Title')}
                  description={t('hostsetup.step3Description')}
                />
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="host-city">{t('hostsetup.primaryCity')}</Label>
                    <TextInput id="host-city" value={form.city} onChange={(e) => update('city', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="host-property-count">{t('hostsetup.numberOfProperties')}</Label>
                    <TextInput id="host-property-count" type="number" min="1" max="1000" value={form.propertyCount} onChange={(e) => update('propertyCount', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="host-relationship">{t('hostsetup.relationship')}</Label>
                    <SelectMenu id="host-relationship" value={form.propertyRelationship} onChange={(v) => update('propertyRelationship', v)} options={[
                      { value: 'OWNER', label: 'Owner' },
                      { value: 'MANAGER', label: 'Property manager' },
                      { value: 'AGENT', label: 'Authorised agent' },
                      { value: 'TENANT', label: 'Tenant with permission' },
                    ]} />
                  </div>
                  <div>
                    <Label htmlFor="host-years">{t('hostsetup.yearsHosting')}</Label>
                    <TextInput id="host-years" type="number" min="0" max="80" value={form.yearsHosting} onChange={(e) => update('yearsHosting', e.target.value)} required />
                  </div>
                </div>

                <fieldset className="mt-5">
                  <legend className="mb-2 block text-sm font-medium text-navy">{t('hostsetup.propertyTypes')}</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {PROPERTY_TYPES.map(([value, label]) => {
                      const selected = form.propertyTypes.includes(value);
                      return (
                        <label
                          key={value}
                          className={`flex min-h-[46px] cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-navy shadow-sm ${selected ? 'bg-primary/10 dark:bg-primary/15' : 'bg-surface'}`}
                        >
                          <Checkbox
                            checked={selected}
                            onChange={() => togglePropertyType(value)}
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="host-property-locations">{t('hostsetup.propertyLocations')}</Label>
                    <Textarea
                      id="host-property-locations"
                      value={form.propertyLocations}
                      onChange={(e) => update('propertyLocations', e.target.value)}
                      rows={4}
                      maxLength={500}
                      placeholder={t('hostsetup.locationsPlaceholder')}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="host-experience">{t('hostsetup.hostingExperience')}</Label>
                    <Textarea
                      id="host-experience"
                      value={form.experience}
                      onChange={(e) => update('experience', e.target.value)}
                      rows={4}
                      maxLength={2000}
                      placeholder={t('hostsetup.experiencePlaceholder')}
                    />
                  </div>
                </div>
                <StepActions
                  saving={saving}
                  uploading={Boolean(uploadingKind)}
                  feedback={feedbackFor('properties')}
                  onDismiss={clearFeedback}
                  onSave={() => handleSave(null, 'properties')}
                  onContinue={() => handleSaveAndContinue('review', 'properties')}
                />
              </section>

              <section id="host-application-review" className={`${CARD_CLASS} scroll-mt-24`}>
                <ApplicationCardHeader
                  step="4"
                  title={t('hostsetup.step4Title')}
                  description={t('hostsetup.step4Description')}
                />
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {requiredDocuments.map((kind) => {
                    const document = application?.documents?.find((item) => item.kind === kind);
                    return (
                      <DocumentUpload
                        key={kind}
                        kind={kind}
                        document={document}
                        busy={uploadingKind === kind}
                        feedback={feedbackFor(kind)}
                        onUpload={uploadDocument}
                        onRemove={removeDocument}
                        onDismiss={clearFeedback}
                      />
                    );
                  })}
                </div>

                <label className="mt-5 flex items-start gap-3 rounded-xl bg-surface p-4 text-sm leading-relaxed text-muted">
                  <Checkbox
                    checked={form.agreedTerms}
                    onChange={(e) => update('agreedTerms', e.target.checked)}
                  />
                  <span>
                    I confirm the information is accurate, I am authorised to list these properties,
                    and I agree to the <Link to="/terms" className="font-semibold text-muted hover:underline">{t('hostsetup.termsOfService')}</Link> and verification checks.
                  </span>
                </label>

                <div className="mt-5 space-y-3 border-t border-border pt-5">
                  <ActionFeedback feedback={feedbackFor('review')} onDismiss={clearFeedback} />
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <Button type="button" color="light" onClick={() => handleSave(null, 'review')} disabled={saving || Boolean(uploadingKind)}>
                      {saving ? 'Saving...' : 'Save draft'}
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={saving || Boolean(uploadingKind)}>
                      {saving ? 'Working...' : 'Submit for review'}
                    </Button>
                    <Button type="button" color="light" onClick={() => handleSaveAndLeave('review')} disabled={saving || Boolean(uploadingKind)}>
                      Save and travel
                    </Button>
                  </div>
                </div>
              </section>
            </form>
          ) : !application && user.role !== 'HOST' ? (
            <section className="rounded-xl bg-elevated shadow-md p-6 sm:p-8">
              <h2 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">{t('hostsetup.startApplication')}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t('hostsetup.startApplicationHint')}</p>
              <div className="mt-5">
                <Button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
                  {loadError ? 'Retry application' : 'Start application'}
                </Button>
              </div>
            </section>
          ) : (
            <StatusCard
              application={application}
              statusLabel={statusLabel}
              statusMeta={statusMeta}
              user={user}
              onBackToTravelling={() => { setMode('travelling'); navigate('/'); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function referredHostsLabel(total) {
  const count = Number(total) || 0;
  return `${count.toLocaleString('en-KE')} host${count === 1 ? '' : 's'} referred`;
}

/**
 * The host's shareable referral code.
 *
 * This is a bonus on the application page, not a step in it, so the card owns
 * its own request and renders nothing at all when the code is unavailable: a
 * 404 while the endpoint is not deployed yet, a slow network, or a host who has
 * no code yet must not put an error banner in front of someone trying to finish
 * their application.
 */
function HostReferralCard() {
  const { t } = useLanguage();
  const [referral, setReferral] = useState(null);
  // 'idle' is the resting label, the other two are the transient confirmations.
  const [copyStatus, setCopyStatus] = useState('idle');
  const codeRef = useRef(null);
  const copyTimer = useRef(null);

  useEffect(() => {
    let ignore = false;
    apiClient.get('/host-application/referral')
      .then((response) => {
        if (ignore) return;
        if (response.data?.success === false) {
          setReferral(null);
          return;
        }
        const data = response.data?.data;
        const code = String(data?.code ?? '').trim();
        // Without a code there is nothing to share, so nothing is rendered.
        setReferral(code ? { ...data, code } : null);
      })
      .catch(() => {
        // Deliberately silent: the host cannot act on this failure and the rest
        // of the page is unaffected.
        if (!ignore) setReferral(null);
      });
    return () => { ignore = true; };
  }, []);

  // The card unmounts whenever the page swaps between the form and the status
  // card, so a pending confirmation timeout is cleared rather than firing on a
  // component that is gone.
  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  if (!referral) return null;

  const rewardKes = Number(referral.rewardKes) || 0;
  const earnedKes = Number(referral.earnedKes) || 0;
  const rewardLabel = rewardKes > 0 ? formatPrice(rewardKes) : null;
  const earnedLabel = earnedKes > 0 ? formatPrice(earnedKes) : null;

  /** Fallback for browsers without the async clipboard (old Safari, plain http). */
  function selectCode() {
    const node = codeRef.current;
    const selection = window.getSelection?.();
    if (!node || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  async function copyCode() {
    const code = referral.code;
    if (!code) return;
    if (copyTimer.current) clearTimeout(copyTimer.current);

    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        copied = true;
      }
    } catch {
      // writeText rejects in an insecure context or when permission is denied.
      // That is expected on older browsers, so it falls through to the
      // selection below instead of being reported to the host.
      copied = false;
    }

    if (!copied) selectCode();
    // "Copied" only appears when the clipboard write succeeded; otherwise the
    // text is selected and the host is told to finish the copy themselves.
    setCopyStatus(copied ? 'copied' : 'manual');
    // Both labels revert on their own, so the button can never stay stuck on a
    // confirmation that no longer describes its action.
    copyTimer.current = setTimeout(() => setCopyStatus('idle'), copied ? 2000 : 4000);
  }

  const copyLabel = copyStatus === 'copied'
    ? 'Copied'
    : copyStatus === 'manual' ? 'Press Ctrl+C to copy' : 'Copy code';

  return (
    <section className="op-referral" aria-labelledby="host-referral-heading">
      <h2 id="host-referral-heading" className="op-referral-heading">{t('hostsetup.inviteHost')}</h2>
      <p className="op-referral-lede">
        {rewardLabel
          ? `${rewardLabel} is credited to your wallet when a host you refer completes their first stay.`
          : 'Share your code to help another host get started on ZuriLofts.'}
      </p>
      <div className="op-referral-code-row">
        <code className="op-referral-code" ref={codeRef}>{referral.code}</code>
        <button type="button" className="op-referral-copy" onClick={copyCode}>
          <span aria-live="polite">{copyLabel}</span>
        </button>
      </div>
      <p className="op-referral-stats">
        <span>{referredHostsLabel(referral.referrals?.total)}</span>
        {earnedLabel && <span>{earnedLabel} earned</span>}
      </p>
    </section>
  );
}

function ApplicationCardHeader({ step, title, description }) {
  return (
    <header className="flex items-start gap-3 border-b border-border pb-4">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface dark:bg-primary/15 text-xs font-bold text-navy">{step}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">STEP {step} OF 4</span>
    </header>
  );
}

function StepActions({ saving, uploading, feedback, onSave, onContinue, onDismiss }) {
  return (
    <div className="mt-5 space-y-3 border-t border-border pt-5">
      <ActionFeedback feedback={feedback} onDismiss={onDismiss} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" color="light" disabled={saving || uploading} onClick={onSave}>
          {saving ? 'Saving...' : 'Save draft'}
        </Button>
        <Button type="button" disabled={saving || uploading} onClick={onContinue}>
          Save and continue
        </Button>
      </div>
    </div>
  );
}

/**
 * One required document upload tile.
 *
 * The native file control is kept off screen and driven by a Flowbite Button.
 * Rendered visibly it is a near-black button on a grey field that matches no
 * other control on this form, so every upload in the app (identity
 * verification, dispute evidence, listing photos) hides it this way instead.
 */
function DocumentUpload({ kind, document, busy, feedback, onUpload, onRemove, onDismiss }) {
  const { t } = useLanguage();
  const fileInput = useRef(null);
  const DocumentIcon = DOCUMENT_ICONS[kind] || Upload;
  const [dragging, setDragging] = useState(false);
  // Every child the pointer crosses fires its own dragenter and dragleave, so a
  // single boolean flickers off the moment the pointer passes over the caption
  // or the button. Counting the enters against the leaves keeps the tile in its
  // dragged-over state until the pointer truly leaves the tile.
  const dragDepth = useRef(0);
  const inputLabel = `${document ? t('hostsetup.replace') : t('hostsetup.upload')} ${t(DOCUMENT_LABELS[kind])}`;

  function handleDragEnter(event) {
    if (busy) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragOver(event) {
    if (busy) return;
    // Without this the browser treats the tile as a non-target, never fires drop,
    // and opens the dropped file instead, losing a half-filled application.
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  function handleDragLeave(event) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (busy) return;
    const dropped = event.dataTransfer?.files?.[0];
    if (dropped) onUpload(kind, dropped);
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col gap-3 rounded-xl p-4 shadow-sm ${document ? 'bg-surface dark:bg-primary/15' : 'bg-surface'} ${dragging ? 'ring-2 ring-inset ring-[#143A80]' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* The disc does both jobs: it names the document, and it turns navy once
            a file is in, so a completed tile is still obvious at a glance without
            a second check mark competing with the icon. */}
        <span
          aria-hidden="true"
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${document ? 'bg-navy-bg text-white' : 'bg-elevated text-navy'}`}
        >
          <DocumentIcon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <strong className="block text-sm font-semibold text-navy">{t(DOCUMENT_LABELS[kind])}</strong>
          {dragging ? (
            <small className="block text-xs font-semibold text-navy">Drop the file to upload it</small>
          ) : document ? (
            <small className="flex items-center gap-1 text-xs text-muted">
              <Check className="h-3.5 w-3.5 shrink-0 text-primary-600 dark:text-primary-300" strokeWidth={2.5} aria-hidden="true" />
              Uploaded and encrypted
            </small>
          ) : (
            <small className="block text-xs text-muted">JPEG, PNG, WebP or PDF up to 8MB, or drag and drop</small>
          )}
        </div>
      </div>
      {document && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-elevated px-3 py-2">
          <span className="min-w-0 truncate text-xs text-muted">{document.originalName}</span>
          <Button type="button" size="xs" color="light" disabled={busy} onClick={() => onRemove(kind)}>
            {busy ? 'Working...' : 'Remove'}
          </Button>
        </div>
      )}
      <Button
        type="button"
        size="sm"
        color="light"
        className="self-start"
        disabled={busy}
        onClick={() => fileInput.current?.click()}
      >
        <Upload className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        {busy ? 'Uploading...' : document ? 'Replace file' : 'Choose file'}
      </Button>
      <input
        ref={fileInput}
        type="file"
        className="sr-only"
        aria-label={inputLabel}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        disabled={busy}
        onChange={(event) => {
          const picked = event.target.files?.[0];
          // Cleared so re-picking the same file after a failed or removed upload
          // still fires onChange; the browser otherwise reports no change.
          event.target.value = '';
          if (picked) onUpload(kind, picked);
        }}
      />
      <ActionFeedback feedback={feedback} onDismiss={onDismiss} />
    </div>
  );
}

function Notice({ tone, children }) {
  return <Alert color={tone === 'success' ? 'success' : 'failure'}>{children}</Alert>;
}

const FEEDBACK_TONES = {
  error: { Icon: AlertCircle, frame: 'bg-[#FDECEC] text-[#B42318]' },
  success: { Icon: CheckCircle2, frame: 'bg-[#E7F6EE] text-[#157347]' },
};

/**
 * The single place an action's outcome is shown.
 *
 * It is rendered inside the card holding the button that was pressed, because a
 * banner at the top of this page sits above four screens of form: the applicant
 * presses "Submit for review" at the bottom and the only reply appears where
 * they are not looking. The tone hexes are the theme's own alert colours and
 * have dark-mode equivalents in styles.css, so both themes stay readable.
 */
function ActionFeedback({ feedback: current, onDismiss }) {
  const banner = useRef(null);

  useEffect(() => {
    if (!current) return;
    // 'nearest' does nothing when the banner is already on screen, so this only
    // moves the page when the button that failed sat at the very edge of it.
    banner.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [current]);

  if (!current) return null;

  const { Icon, frame } = FEEDBACK_TONES[current.tone] || FEEDBACK_TONES.error;

  return (
    <div ref={banner} role="alert" className={`flex items-start gap-3 rounded-xl p-4 ${frame}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        <strong className="block text-sm font-semibold">{current.title}</strong>
        {current.text && <p className="text-sm leading-relaxed">{current.text}</p>}
        {current.items?.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {current.items.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
        )}
        {current.action && (
          <Button type="button" size="xs" color="light" className="mt-2" onClick={current.action.onClick}>
            {current.action.label}
          </Button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss this message"
        className="shrink-0 rounded p-1 opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

function StatusCard({ application, statusLabel, statusMeta, user, onBackToTravelling }) {
  const { t } = useLanguage();
  const approved = application?.status === 'APPROVED' || user?.role === 'HOST';
  const statusColor = approved
    ? 'success'
    : application?.status === 'REJECTED'
      ? 'failure'
      : application?.status === 'SUBMITTED' || application?.status === 'CHANGES_REQUESTED'
        ? 'warning'
        : 'gray';

  return (
    <section className="rounded-xl bg-elevated shadow-md p-6 sm:p-8">
      <Badge color={statusColor}>{statusLabel}</Badge>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{approved ? 'You are ready to host' : 'Application status'}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{statusMeta}</p>
      {application?.reviewNote && (
        <div className="mt-5 rounded-lg bg-surface p-4">
          <strong className="block text-sm font-semibold text-navy">{t('hostsetup.reviewerNote')}</strong>
          <span className="text-sm text-muted">{application.reviewNote}</span>
        </div>
      )}
      <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
        {approved ? (
          <>
            <Button as={Link} to="/host/properties/new">{t('hostsetup.setUpProperty')}</Button>
            <Button as={Link} to="/host/today" color="light">{t('hostsetup.openDashboard')}</Button>
          </>
        ) : (
          <Button type="button" color="light" onClick={onBackToTravelling}>
            Back to travelling
          </Button>
        )}
      </div>
    </section>
  );
}

ApplicationCardHeader.propTypes = {
  step: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};

StepActions.propTypes = {
  saving: PropTypes.bool.isRequired,
  uploading: PropTypes.bool.isRequired,
  feedback: PropTypes.shape({ tone: PropTypes.string, title: PropTypes.string }),
  onSave: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

DocumentUpload.propTypes = {
  kind: PropTypes.string.isRequired,
  document: PropTypes.shape({ originalName: PropTypes.string }),
  busy: PropTypes.bool.isRequired,
  feedback: PropTypes.shape({ tone: PropTypes.string, title: PropTypes.string }),
  onUpload: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

ActionFeedback.propTypes = {
  feedback: PropTypes.shape({
    tone: PropTypes.oneOf(['error', 'success']),
    title: PropTypes.string,
    text: PropTypes.string,
    items: PropTypes.arrayOf(PropTypes.string),
    action: PropTypes.shape({ label: PropTypes.string, onClick: PropTypes.func }),
  }),
  onDismiss: PropTypes.func.isRequired,
};

Notice.propTypes = {
  tone: PropTypes.oneOf(['success', 'error']).isRequired,
  children: PropTypes.node.isRequired,
};

StatusCard.propTypes = {
  application: PropTypes.shape({
    status: PropTypes.string,
    reviewNote: PropTypes.string,
  }),
  statusLabel: PropTypes.string.isRequired,
  statusMeta: PropTypes.string.isRequired,
  user: PropTypes.shape({ role: PropTypes.string }),
  onBackToTravelling: PropTypes.func.isRequired,
};

export default HostApplicationPage;
