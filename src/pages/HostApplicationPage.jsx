import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Checkbox, FileInput, Label, Textarea, TextInput } from 'flowbite-react';
import SelectMenu from '../components/SelectMenu.jsx';
import Spinner from '../components/Spinner.jsx';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useMode } from '../context/ModeContext.jsx';


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
  DRAFT: 'Your draft is ready to complete. Save at any time, then submit it for verification.',
  CHANGES_REQUESTED: 'Update the requested details or documents below, then submit again.',
  SUBMITTED: 'Your application is with Trust and Safety. We will notify you when the review is complete.',
  APPROVED: 'Your host application is approved. You can now create and publish your first listing.',
  REJECTED: 'Your application was not approved. Contact support if you need help with the review outcome.',
};

const STATUS_LABELS = {
  DRAFT: 'Draft',
  CHANGES_REQUESTED: 'Changes requested',
  SUBMITTED: 'Under review',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
};

const STEP_DEFINITIONS = [
  {
    key: 'identity',
    label: 'Identity and contact',
    description: 'Legal name, contact and ID details',
  },
  {
    key: 'business',
    label: 'Hosting business',
    description: 'Host type, trading name and payouts',
  },
  {
    key: 'properties',
    label: 'Property details',
    description: 'Locations, property mix and experience',
  },
  {
    key: 'review',
    label: 'Review and submit',
    description: 'Documents, terms and final checks',
  },
];

const PROPERTY_TYPES = [
  ['apartment', 'Apartment'], ['studio', 'Studio'], ['penthouse', 'Penthouse'],
  ['house', 'House'], ['villa', 'Villa'], ['other', 'Other'],
];

const DOCUMENT_LABELS = {
  IDENTITY_FRONT: 'Identity document - photo/details side',
  IDENTITY_BACK: 'Identity document - reverse side',
  PROPERTY_AUTHORITY: 'Proof of ownership or authority to host',
  BUSINESS_REGISTRATION: 'Business registration certificate',
};

// Shared with the listing editor so both multi-step host forms read identically.
const CARD_CLASS = 'rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6';
const STEP_BUTTON_BASE = 'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface';
const STEP_CIRCLE_BASE = 'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-bold';

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
  const { user, setUser } = useAuth();
  const { setMode } = useMode();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKind, setUploadingKind] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
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
      setError('');
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
        setError(err.response?.data?.error || 'Could not load your host application.');
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
      { ...STEP_DEFINITIONS[0], complete: identityComplete, detail: identityComplete ? 'Complete' : 'In progress' },
      { ...STEP_DEFINITIONS[1], complete: businessComplete, detail: businessComplete ? 'Complete' : 'Needs details' },
      { ...STEP_DEFINITIONS[2], complete: propertiesComplete, detail: propertiesComplete ? 'Complete' : 'Needs details' },
      { ...STEP_DEFINITIONS[3], complete: reviewComplete, detail: reviewComplete ? 'Ready to submit' : 'Documents required' },
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
  ]);

  const completedCount = completionItems.filter((item) => item.complete).length;
  const completionPercent = (completedCount / STEP_DEFINITIONS.length) * 100;
  const statusLabel = saving
    ? 'Saving'
    : application
      ? STATUS_LABELS[application.status] || application.status.replaceAll('_', ' ')
      : user?.role === 'HOST' ? 'Approved' : 'Not started';
  const statusMeta = application ? STATUS_COPY[application.status] : STATUS_COPY.DRAFT;

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

    if (form.propertyCount !== '') payload.propertyCount = Number(form.propertyCount);
    if (form.propertyTypes.length > 0) payload.propertyTypes = form.propertyTypes;

    return payload;
  }

  async function saveApplication() {
    const response = await apiClient.patch('/host-application', applicationPayload());
    setApplication(response.data.data);
    return response.data.data;
  }

  async function handleSave(event) {
    event?.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      await saveApplication();
      setMessage('Your application draft has been saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save your application.');
    } finally { setSaving(false); }
  }

  async function handleSaveAndContinue(nextStep) {
    setSaving(true); setError(''); setMessage('');
    try {
      await saveApplication();
      setMessage('Your application draft has been saved.');
      if (nextStep) goToStep(nextStep);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save your application.');
    } finally { setSaving(false); }
  }

  async function handleSubmit() {
    setSaving(true); setError(''); setMessage('');
    try {
      await saveApplication();
      const response = await apiClient.post('/host-application/submit');
      setApplication(response.data.data);
      setMessage('Your host application has been submitted for review.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit your application.');
    } finally { setSaving(false); }
  }

  async function handleSaveAndLeave() {
    setSaving(true); setError(''); setMessage('');
    try {
      await saveApplication();
      setMode('travelling');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save your application.');
      setSaving(false);
    }
  }

  async function uploadDocument(kind, file) {
    if (!file) return;
    setUploadingKind(kind); setError(''); setMessage('');
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
      setMessage(`${DOCUMENT_LABELS[kind]} uploaded securely.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not upload the document.');
    } finally { setUploadingKind(''); }
  }

  async function removeDocument(kind) {
    setUploadingKind(kind); setError('');
    try {
      await apiClient.delete(`/host-application/documents/${kind}`);
      setApplication((current) => ({
        ...current,
        documents: (current.documents || []).filter((doc) => doc.kind !== kind),
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not remove the document.');
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">Host setup</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">Get your space ready to host</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Complete your identity, property details and review before you publish.</p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Application summary">
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <strong className="block text-lg font-bold text-navy">{completedCount} / {STEP_DEFINITIONS.length}</strong>
          <span className="text-xs text-muted">Steps complete</span>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <strong className="block text-lg font-bold text-navy">~10 min</strong>
          <span className="text-xs text-muted">Estimated time</span>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <strong className="block text-lg font-bold text-navy">{statusLabel}</strong>
          <span className="text-xs text-muted">{saving ? 'Saving changes' : 'Current status'}</span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-2 rounded-xl border border-border bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div>
            <strong className="block text-sm font-semibold text-navy">Your progress</strong>
            <span className="text-xs text-muted">{completedCount} of {STEP_DEFINITIONS.length} steps complete</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface" aria-hidden="true">
            <i className="block h-full rounded-full bg-primary" style={{ width: `${completionPercent}%` }} />
          </div>
          <nav className="space-y-2 pt-2" aria-label="Host application steps">
            {completionItems.map((step, index) => (
              <button
                key={step.key}
                type="button"
                className={`${STEP_BUTTON_BASE} ${activeStep === step.key ? 'bg-primary/10 font-semibold text-navy' : ''} ${step.complete ? 'text-navy' : 'text-muted'}`}
                onClick={() => goToStep(step.key)}
                aria-current={activeStep === step.key ? 'step' : undefined}
              >
                <span className={`${STEP_CIRCLE_BASE} ${step.complete || activeStep === step.key ? 'bg-primary-50 text-navy' : 'text-muted'}`}>
                  {step.complete ? '\u2713' : index + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <strong className="text-sm font-semibold text-navy">{step.label}</strong>
                  <small className="truncate text-xs text-muted">{step.detail}</small>
                </span>
              </button>
            ))}
          </nav>
          <Button type="button" color="light" className="w-full" onClick={handleSaveAndLeave} disabled={saving || !editable}>
            Save and exit
          </Button>
        </aside>

        <div className="space-y-5">
          {message && <Notice tone="success">{message}</Notice>}
          {error && <Notice tone="error">{error}</Notice>}

          {editable ? (
            <form onSubmit={handleSave} className="space-y-5">
              <section id="host-application-identity" className={`${CARD_CLASS} scroll-mt-24`}>
                <ApplicationCardHeader
                  step="1"
                  title="Identity and contact"
                  description="Your legal details must match the identity document you upload."
                />
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="host-legal-name">Full legal name</Label>
                    <TextInput id="host-legal-name" value={form.legalName} onChange={(e) => update('legalName', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="host-dob">Date of birth</Label>
                    <TextInput id="host-dob" type="date" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="host-nationality">Nationality</Label>
                    <TextInput id="host-nationality" value={form.nationality} onChange={(e) => update('nationality', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="host-identity-type">Identity document</Label>
                    <SelectMenu id="host-identity-type" value={form.identityType} onChange={(v) => update('identityType', v)} options={[
                      { value: 'NATIONAL_ID', label: 'Kenyan national ID' },
                      { value: 'PASSPORT', label: 'Passport' },
                      { value: 'ALIEN_ID', label: 'Alien ID' },
                    ]} />
                  </div>
                  <div>
                    <Label htmlFor="host-contact-email">Contact email</Label>
                    <TextInput id="host-contact-email" type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="host-contact-phone">Contact phone</Label>
                    <TextInput id="host-contact-phone" type="tel" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="host-kra-pin">KRA PIN</Label>
                    <TextInput id="host-kra-pin" value={form.kraPin} onChange={(e) => update('kraPin', e.target.value.toUpperCase())} placeholder="A123456789B" required />
                  </div>
                </div>
                <StepActions
                  saving={saving}
                  uploading={Boolean(uploadingKind)}
                  onSave={handleSave}
                  onContinue={() => handleSaveAndContinue('business')}
                />
              </section>

              <section id="host-application-business" className={`${CARD_CLASS} scroll-mt-24`}>
                <ApplicationCardHeader
                  step="2"
                  title="Hosting business"
                  description="Tell us whether you host as an individual or through a registered company."
                />
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="host-business-type">Host type</Label>
                    <SelectMenu id="host-business-type" value={form.businessType} onChange={(v) => update('businessType', v)} options={[
                      { value: 'individual', label: 'Individual' },
                      { value: 'company', label: 'Registered company' },
                    ]} />
                  </div>
                  <div>
                    <Label htmlFor="host-business-name">Host or business name</Label>
                    <TextInput id="host-business-name" value={form.businessName} onChange={(e) => update('businessName', e.target.value)} required />
                  </div>
                  {form.businessType === 'company' && (
                    <div>
                      <Label htmlFor="host-company-number">Company registration number</Label>
                      <TextInput id="host-company-number" value={form.companyRegistrationNo} onChange={(e) => update('companyRegistrationNo', e.target.value)} required />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="host-payout-method">Preferred payout</Label>
                    <SelectMenu id="host-payout-method" value={form.preferredPayoutMethod} onChange={(v) => update('preferredPayoutMethod', v)} options={[
                      { value: 'mpesa', label: 'M-PESA' },
                      { value: 'bank', label: 'Bank transfer' },
                    ]} />
                    <p className="mt-1 text-xs text-muted">Earnings are paid out by Paystack to the account below. M-PESA goes straight to your phone number; bank transfer goes to your account number using your bank code.</p>
                  </div>
                  {form.preferredPayoutMethod === 'mpesa' ? (
                    <div>
                      <Label htmlFor="host-payout-mpesa">M-PESA number for payouts</Label>
                      <TextInput id="host-payout-mpesa" type="tel" value={form.payoutMpesaPhone} onChange={(e) => update('payoutMpesaPhone', e.target.value)} placeholder="0712345678" required />
                      <p className="mt-1 text-xs text-muted">Use the Safaricom number registered in your own name, for example 0712345678 or 254712345678.</p>
                    </div>
                  ) : banks.length > 0 ? (
                    <div>
                      <Label htmlFor="host-payout-bank">Bank</Label>
                      <SelectMenu id="host-payout-bank" value={form.payoutBankCode} onChange={(code) => {
                        const bank = banks.find((item) => item.code === code);
                        update('payoutBankName', bank?.name || '');
                        update('payoutBankCode', code);
                      }} options={banks.map((bank) => ({ value: bank.code, label: bank.name }))} />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="host-payout-bank-name">Bank name</Label>
                        <TextInput id="host-payout-bank-name" value={form.payoutBankName} onChange={(e) => update('payoutBankName', e.target.value)} placeholder="Equity Bank" required />
                      </div>
                      <div>
                        <Label htmlFor="host-payout-bank-code">Bank code</Label>
                        <TextInput id="host-payout-bank-code" value={form.payoutBankCode} onChange={(e) => update('payoutBankCode', e.target.value)} placeholder="068" required />
                      </div>
                      <p className="mt-1 text-xs text-muted">Enter the Paystack bank code, for example 068 for Equity Bank. We could not load the bank list automatically.</p>
                    </div>
                  )}
                  {form.preferredPayoutMethod === 'bank' && (
                    <div>
                      <Label htmlFor="host-payout-account">Bank account number</Label>
                      <TextInput id="host-payout-account" value={form.payoutBankAccountNo} onChange={(e) => update('payoutBankAccountNo', e.target.value.replace(/\D/g, ''))} placeholder="0123456789" inputMode="numeric" required />
                    </div>
                  )}
                </div>
                <StepActions
                  saving={saving}
                  uploading={Boolean(uploadingKind)}
                  onSave={handleSave}
                  onContinue={() => handleSaveAndContinue('properties')}
                />
              </section>

              <section id="host-application-properties" className={`${CARD_CLASS} scroll-mt-24`}>
                <ApplicationCardHeader
                  step="3"
                  title="Property details"
                  description="These details help Trust and Safety confirm that you can list the accommodation."
                />
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="host-city">Primary city or area</Label>
                    <TextInput id="host-city" value={form.city} onChange={(e) => update('city', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="host-property-count">Number of properties</Label>
                    <TextInput id="host-property-count" type="number" min="1" max="1000" value={form.propertyCount} onChange={(e) => update('propertyCount', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="host-relationship">Relationship to the properties</Label>
                    <SelectMenu id="host-relationship" value={form.propertyRelationship} onChange={(v) => update('propertyRelationship', v)} options={[
                      { value: 'OWNER', label: 'Owner' },
                      { value: 'MANAGER', label: 'Property manager' },
                      { value: 'AGENT', label: 'Authorised agent' },
                      { value: 'TENANT', label: 'Tenant with permission' },
                    ]} />
                  </div>
                  <div>
                    <Label htmlFor="host-years">Years of hosting experience</Label>
                    <TextInput id="host-years" type="number" min="0" max="80" value={form.yearsHosting} onChange={(e) => update('yearsHosting', e.target.value)} required />
                  </div>
                </div>

                <fieldset className="mt-5">
                  <legend className="mb-2 block text-sm font-medium text-navy">Property types</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {PROPERTY_TYPES.map(([value, label]) => {
                      const selected = form.propertyTypes.includes(value);
                      return (
                        <label
                          key={value}
                          className={`flex min-h-[46px] cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-navy ${selected ? 'border-primary bg-primary-50' : 'border-border bg-surface'}`}
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
                    <Label htmlFor="host-property-locations">Property locations</Label>
                    <Textarea
                      id="host-property-locations"
                      value={form.propertyLocations}
                      onChange={(e) => update('propertyLocations', e.target.value)}
                      rows={4}
                      maxLength={500}
                      placeholder="Neighbourhoods, towns or addresses you intend to list"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="host-experience">Hosting experience</Label>
                    <Textarea
                      id="host-experience"
                      value={form.experience}
                      onChange={(e) => update('experience', e.target.value)}
                      rows={4}
                      maxLength={2000}
                      placeholder="Tell us about your experience, team and guest support."
                    />
                  </div>
                </div>
                <StepActions
                  saving={saving}
                  uploading={Boolean(uploadingKind)}
                  onSave={handleSave}
                  onContinue={() => handleSaveAndContinue('review')}
                />
              </section>

              <section id="host-application-review" className={`${CARD_CLASS} scroll-mt-24`}>
                <ApplicationCardHeader
                  step="4"
                  title="Review and submit"
                  description="Upload the required documents and confirm that the information is accurate."
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
                        onUpload={uploadDocument}
                        onRemove={removeDocument}
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
                    and I agree to the <Link to="/terms" className="font-semibold text-primary-600 hover:underline">Terms of Service</Link> and verification checks.
                  </span>
                </label>

                <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                  <Button type="submit" color="light" disabled={saving || Boolean(uploadingKind)}>
                    {saving ? 'Saving...' : 'Save draft'}
                  </Button>
                  <Button type="button" onClick={handleSubmit} disabled={saving || Boolean(uploadingKind)}>
                    {saving ? 'Working...' : 'Submit for review'}
                  </Button>
                  <Button type="button" color="light" onClick={handleSaveAndLeave} disabled={saving || Boolean(uploadingKind)}>
                    Save and travel
                  </Button>
                </div>
              </section>
            </form>
          ) : !application && user.role !== 'HOST' ? (
            <section className="rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">Start your host application</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Open your application to add your identity, business and property details.</p>
              <div className="mt-5">
                <Button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
                  {error ? 'Retry application' : 'Start application'}
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

function ApplicationCardHeader({ step, title, description }) {
  return (
    <header className="flex items-start gap-3 border-b border-border pb-4">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-navy">{step}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">STEP {step} OF 4</span>
    </header>
  );
}

function StepActions({ saving, uploading, onSave, onContinue }) {
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
      <Button type="button" color="light" disabled={saving || uploading} onClick={onSave}>
        {saving ? 'Saving...' : 'Save draft'}
      </Button>
      <Button type="button" disabled={saving || uploading} onClick={onContinue}>
        Save and continue
      </Button>
    </div>
  );
}

function DocumentUpload({ kind, document, busy, onUpload, onRemove }) {
  return (
    <div className={`flex flex-col gap-3 rounded-xl border p-4 ${document ? 'border-primary bg-primary-50' : 'border-border bg-surface'}`}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${document ? 'bg-navy-bg text-white' : 'bg-white text-primary-600'}`}
        >
          {document ? '\u2713' : '+'}
        </span>
        <div className="min-w-0">
          <strong className="block text-sm font-semibold text-navy">{DOCUMENT_LABELS[kind]}</strong>
          <small className="block text-xs text-muted">{document ? 'Uploaded and encrypted' : 'JPEG, PNG, WebP or PDF up to 8MB'}</small>
        </div>
      </div>
      {document && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
          <span className="min-w-0 truncate text-xs text-muted">{document.originalName}</span>
          <Button type="button" size="xs" color="light" disabled={busy} onClick={() => onRemove(kind)}>
            {busy ? 'Working...' : 'Remove'}
          </Button>
        </div>
      )}
      <FileInput
        aria-label={`${document ? 'Replace' : 'Upload'} ${DOCUMENT_LABELS[kind]}`}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        disabled={busy}
        onChange={(e) => onUpload(kind, e.target.files?.[0])}
        sizing="sm"
      />
      {busy && <p className="text-xs text-muted">Uploading securely...</p>}
    </div>
  );
}

function Notice({ tone, children }) {
  return <Alert color={tone === 'success' ? 'success' : 'failure'}>{children}</Alert>;
}

function StatusCard({ application, statusLabel, statusMeta, user, onBackToTravelling }) {
  const approved = application?.status === 'APPROVED' || user?.role === 'HOST';
  const statusColor = approved
    ? 'success'
    : application?.status === 'REJECTED'
      ? 'failure'
      : application?.status === 'SUBMITTED' || application?.status === 'CHANGES_REQUESTED'
        ? 'warning'
        : 'gray';

  return (
    <section className="rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8">
      <Badge color={statusColor}>{statusLabel}</Badge>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{approved ? 'You are ready to host' : 'Application status'}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{statusMeta}</p>
      {application?.reviewNote && (
        <div className="mt-5 rounded-lg bg-surface p-4">
          <strong className="block text-sm font-semibold text-navy">Reviewer note</strong>
          <span className="text-sm text-muted">{application.reviewNote}</span>
        </div>
      )}
      <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
        {approved ? (
          <>
            <Button as={Link} to="/host/properties/new">Set up your first property</Button>
            <Button as={Link} to="/host/today" color="light">Open host dashboard</Button>
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
  onSave: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
};

DocumentUpload.propTypes = {
  kind: PropTypes.string.isRequired,
  document: PropTypes.shape({ originalName: PropTypes.string }),
  busy: PropTypes.bool.isRequired,
  onUpload: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
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
