import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Checkbox, FileInput, Label, Select, Textarea, TextInput } from 'flowbite-react';
import Navbar from '../components/Navbar.jsx';
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

  useEffect(() => {
    async function loadApplication() {
      try {
        let response = await apiClient.get('/host-application');
        let current = response.data.data;
        if (!current && user?.role === 'USER') {
          response = await apiClient.post('/host-application');
          current = response.data.data;
        }
        if (current?.status === 'APPROVED' && user?.role !== 'HOST') {
          const meResponse = await apiClient.get('/auth/me');
          setUser(meResponse.data.data);
        }
        setApplication(current);
        setForm(formFromApplication(current, user));
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load your host application.');
      } finally {
        setLoading(false);
      }
    }
    loadApplication();
  }, [setUser, user]);

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
    const businessComplete = Boolean(form.businessName && form.businessType && form.preferredPayoutMethod)
      && (form.businessType !== 'company' || Boolean(form.companyRegistrationNo));
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
      : 'Draft';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="op-host-application-page">
          <div className="op-host-application-loading"><Spinner /></div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="op-host-application-page">
        <section className="op-host-application-hero">
          <div className="op-host-application-hero-copy">
            <p>Host setup</p>
            <h1>Get your space ready to host</h1>
            <span>Complete your identity, property details and review before you publish.</span>
          </div>
          <div className="op-host-application-hero-stats">
            <div>
              <strong>{completedCount} / {STEP_DEFINITIONS.length}</strong>
              <span>Steps complete</span>
            </div>
            <div>
              <strong>~10 min</strong>
              <span>Estimated time</span>
            </div>
            <div>
              <strong>{statusLabel}</strong>
              <span>{saving ? 'Saving changes' : 'Current status'}</span>
            </div>
          </div>
        </section>

        <div className="op-host-application-layout">
          <aside className="op-host-application-rail">
            <header>
              <strong>Your progress</strong>
              <span>{completedCount} of {STEP_DEFINITIONS.length} steps complete</span>
            </header>
            <div className="op-host-application-progress" aria-hidden="true">
              <i style={{ width: `${completionPercent}%` }} />
            </div>
            <nav aria-label="Host application steps">
              {completionItems.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  className={`${activeStep === step.key ? 'is-active' : ''} ${step.complete ? 'is-complete' : ''}`}
                  onClick={() => goToStep(step.key)}
                  aria-current={activeStep === step.key ? 'step' : undefined}
                >
                  <span>{step.complete ? '\u2713' : index + 1}</span>
                  <span>
                    <strong>{step.label}</strong>
                    <small>{step.detail}</small>
                  </span>
                </button>
              ))}
            </nav>
            <Button type="button" color="light" className="op-host-application-exit" onClick={handleSaveAndLeave} disabled={saving || !editable}>
              Save and exit
            </Button>
          </aside>

          <div className="op-host-application-content">
            {message && <Notice tone="success">{message}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            {editable ? (
              <form onSubmit={handleSave}>
                <section id="host-application-identity" className="op-host-application-card">
                  <ApplicationCardHeader
                    step="1"
                    title="Identity and contact"
                    description="Your legal details must match the identity document you upload."
                  />
                  <div className="op-host-application-fields">
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
                      <Select id="host-identity-type" value={form.identityType} onChange={(e) => update('identityType', e.target.value)}>
                        <option value="NATIONAL_ID">Kenyan national ID</option>
                        <option value="PASSPORT">Passport</option>
                        <option value="ALIEN_ID">Alien ID</option>
                      </Select>
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

                <section id="host-application-business" className="op-host-application-card">
                  <ApplicationCardHeader
                    step="2"
                    title="Hosting business"
                    description="Tell us whether you host as an individual or through a registered company."
                  />
                  <div className="op-host-application-fields">
                    <div>
                      <Label htmlFor="host-business-type">Host type</Label>
                      <Select id="host-business-type" value={form.businessType} onChange={(e) => update('businessType', e.target.value)}>
                        <option value="individual">Individual</option>
                        <option value="company">Registered company</option>
                      </Select>
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
                      <Select id="host-payout-method" value={form.preferredPayoutMethod} onChange={(e) => update('preferredPayoutMethod', e.target.value)}>
                        <option value="mpesa">M-PESA</option>
                        <option value="bank">Bank transfer</option>
                      </Select>
                    </div>
                  </div>
                  <StepActions
                    saving={saving}
                    uploading={Boolean(uploadingKind)}
                    onSave={handleSave}
                    onContinue={() => handleSaveAndContinue('properties')}
                  />
                </section>

                <section id="host-application-properties" className="op-host-application-card">
                  <ApplicationCardHeader
                    step="3"
                    title="Property details"
                    description="These details help Trust and Safety confirm that you can list the accommodation."
                  />
                  <div className="op-host-application-fields">
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
                      <Select id="host-relationship" value={form.propertyRelationship} onChange={(e) => update('propertyRelationship', e.target.value)}>
                        <option value="OWNER">Owner</option>
                        <option value="MANAGER">Property manager</option>
                        <option value="AGENT">Authorised agent</option>
                        <option value="TENANT">Tenant with permission</option>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="host-years">Years of hosting experience</Label>
                      <TextInput id="host-years" type="number" min="0" max="80" value={form.yearsHosting} onChange={(e) => update('yearsHosting', e.target.value)} required />
                    </div>
                  </div>

                  <fieldset className="op-host-application-fieldset">
                    <legend>Property types</legend>
                    <div className="op-host-application-type-grid">
                      {PROPERTY_TYPES.map(([value, label]) => (
                        <label key={value} className={form.propertyTypes.includes(value) ? 'is-selected' : ''}>
                          <Checkbox
                            checked={form.propertyTypes.includes(value)}
                            onChange={() => togglePropertyType(value)}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="op-host-application-textareas">
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

                <section id="host-application-review" className="op-host-application-card">
                  <ApplicationCardHeader
                    step="4"
                    title="Review and submit"
                    description="Upload the required documents and confirm that the information is accurate."
                  />
                  <div className="op-host-application-documents">
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

                  <label className="op-host-application-terms">
                    <Checkbox
                      checked={form.agreedTerms}
                      onChange={(e) => update('agreedTerms', e.target.checked)}
                    />
                    <span>
                      I confirm the information is accurate, I am authorised to list these properties,
                      and I agree to the <Link to="/terms">Terms of Service</Link> and verification checks.
                    </span>
                  </label>

                  <div className="op-host-application-final-actions">
                    <Button type="submit" color="light" disabled={saving || Boolean(uploadingKind)}>
                      {saving ? 'Saving...' : 'Save draft'}
                    </Button>
                    <Button type="button" className="op-host-application-primary" onClick={handleSubmit} disabled={saving || Boolean(uploadingKind)}>
                      {saving ? 'Working...' : 'Submit for review'}
                    </Button>
                    <Button type="button" color="light" onClick={handleSaveAndLeave} disabled={saving || Boolean(uploadingKind)}>
                      Save and travel
                    </Button>
                  </div>
                </section>
              </form>
            ) : (
              <StatusCard
                application={application}
                statusLabel={statusLabel}
                statusMeta={statusMeta}
                user={user}
                onContinueTravelling={() => { setMode('travelling'); navigate('/'); }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ApplicationCardHeader({ step, title, description }) {
  return (
    <header className="op-host-application-card-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <span>STEP {step} OF 4</span>
    </header>
  );
}

function StepActions({ saving, uploading, onSave, onContinue }) {
  return (
    <div className="op-host-application-step-actions">
      <Button type="button" color="light" disabled={saving || uploading} onClick={onSave}>
        {saving ? 'Saving...' : 'Save draft'}
      </Button>
      <Button type="button" className="op-host-application-primary" disabled={saving || uploading} onClick={onContinue}>
        Save and continue
      </Button>
    </div>
  );
}

function DocumentUpload({ kind, document, busy, onUpload, onRemove }) {
  return (
    <div className={`op-host-application-document ${document ? 'is-uploaded' : ''}`}>
      <div className="op-host-application-document-heading">
        <span aria-hidden="true">{document ? '\u2713' : '+'}</span>
        <div>
          <strong>{DOCUMENT_LABELS[kind]}</strong>
          <small>{document ? 'Uploaded and encrypted' : 'JPEG, PNG, WebP or PDF up to 8MB'}</small>
        </div>
      </div>
      {document && (
        <div className="op-host-application-document-file">
          <span>{document.originalName}</span>
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
      {busy && <p>Uploading securely...</p>}
    </div>
  );
}

function Notice({ tone, children }) {
  return <div className={`op-host-application-notice is-${tone}`}>{children}</div>;
}

function StatusCard({ application, statusLabel, statusMeta, user, onContinueTravelling }) {
  const approved = application?.status === 'APPROVED' || user?.role === 'HOST';
  const statusKey = (application?.status || 'draft').toLowerCase();

  return (
    <section className="op-host-application-status-card">
      <span className={`op-host-application-status is-${statusKey}`}>{statusLabel}</span>
      <h2>{approved ? 'You are ready to host' : 'Application status'}</h2>
      <p>{statusMeta}</p>
      {application?.reviewNote && (
        <div className="op-host-application-review-note">
          <strong>Reviewer note</strong>
          <span>{application.reviewNote}</span>
        </div>
      )}
      <div className="op-host-application-status-actions">
        {approved ? (
          <>
            <Link to="/host/properties/new" className="op-host-application-primary-link">Set up your first property</Link>
            <Link to="/host/today" className="op-host-application-secondary-link">Open host dashboard</Link>
          </>
        ) : (
          <Button type="button" color="light" onClick={onContinueTravelling}>
            Continue travelling
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
  onContinueTravelling: PropTypes.func.isRequired,
};

export default HostApplicationPage;
