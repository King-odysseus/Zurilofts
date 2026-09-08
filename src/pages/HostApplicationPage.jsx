import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
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
  DRAFT: 'Complete the details and documents below, then submit for verification.',
  CHANGES_REQUESTED: 'Update the requested details or documents and resubmit.',
  SUBMITTED: 'Your application is under review. You can continue traveling while you wait.',
  APPROVED: 'Your host application is approved. You can now create your first property.',
  REJECTED: 'Your application was not approved. Contact support if you need help.',
};

const STATUS_BADGE = {
  DRAFT: 'bg-[#F7F7F5] text-[#6b7280] border border-[#E5E7EB]',
  CHANGES_REQUESTED: 'bg-amber-50 text-amber-700 border border-amber-200',
  SUBMITTED: 'bg-amber-50 text-amber-700 border border-amber-200',
  APPROVED: 'bg-green-50 text-green-700 border border-green-200',
  REJECTED: 'bg-red-50 text-red-600 border border-red-200',
};

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

  function applicationPayload() {
    return {
      legalName: form.legalName.trim(), businessName: form.businessName.trim(),
      businessType: form.businessType, contactPhone: form.contactPhone.trim(),
      contactEmail: form.contactEmail.trim(), dateOfBirth: form.dateOfBirth,
      nationality: form.nationality.trim(), identityType: form.identityType,
      kraPin: form.kraPin.trim().toUpperCase(),
      companyRegistrationNo: form.businessType === 'company' ? form.companyRegistrationNo.trim() : '',
      city: form.city.trim(), propertyCount: Number(form.propertyCount),
      propertyRelationship: form.propertyRelationship, propertyTypes: form.propertyTypes,
      propertyLocations: form.propertyLocations.trim(), yearsHosting: Number(form.yearsHosting),
      preferredPayoutMethod: form.preferredPayoutMethod, experience: form.experience.trim(),
      agreedTerms: form.agreedTerms,
    };
  }

  async function saveApplication() {
    const response = await apiClient.patch('/host-application', applicationPayload());
    setApplication(response.data.data);
    return response.data.data;
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      await saveApplication();
      setMessage('Your application draft has been saved.');
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-canvas"><Spinner /></div>;

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-28 pb-20">
        <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-6 md:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b7280] mb-2">Become a ZuriLofts host</p>
          <h1 className="text-2xl md:text-4xl font-bold text-[#222222]">Host verification</h1>
          <p className="text-[#6b7280] mt-3 max-w-3xl">Tell us who you are, how you manage your properties, and provide the documents needed to protect guests and legitimate hosts. Save at any time and continue later.</p>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Host setup progress">
            {['Your details', 'Business', 'Documents', 'Review'].map((label, index) => (
              <div key={label} className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 shadow-sm">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-[#2563EB] text-white' : 'bg-[#F7F7F5] text-[#6b7280]'}`}>{index + 1}</span>
                <span className="text-xs font-semibold text-[#222222] sm:text-sm">{label}</span>
              </div>
            ))}
          </div>

          {application && (
            <div className="mt-6 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-[#222222]">Status:</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[application.status] || STATUS_BADGE.DRAFT}`}>
                  {application.status.replaceAll('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-[#6b7280] mt-2">{STATUS_COPY[application.status]}</p>
              {application.reviewNote && <p className="text-sm text-red-600 mt-3">Reviewer note: {application.reviewNote}</p>}
            </div>
          )}
          {message && <Notice tone="success">{message}</Notice>}
          {error && <Notice tone="error">{error}</Notice>}

          {editable ? (
            <form onSubmit={handleSave} className="mt-8 space-y-10">
              <Section title="Identity & contact" description="Your legal details must match the identity document you upload.">
                <div className="grid md:grid-cols-2 gap-5">
                  <Field label="Full legal name" value={form.legalName} onChange={(v) => update('legalName', v)} required />
                  <Field label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => update('dateOfBirth', v)} required />
                  <Field label="Nationality" value={form.nationality} onChange={(v) => update('nationality', v)} required />
                  <SelectField label="Identity document" value={form.identityType} onChange={(v) => update('identityType', v)} options={[
                    ['NATIONAL_ID', 'Kenyan national ID'], ['PASSPORT', 'Passport'], ['ALIEN_ID', 'Alien ID'],
                  ]} />
                  <Field label="Contact email" type="email" value={form.contactEmail} onChange={(v) => update('contactEmail', v)} required />
                  <Field label="Contact phone" type="tel" value={form.contactPhone} onChange={(v) => update('contactPhone', v)} required />
                  <Field label="KRA PIN" value={form.kraPin} onChange={(v) => update('kraPin', v.toUpperCase())} placeholder="A123456789B" required />
                </div>
              </Section>

              <Section title="Hosting business" description="Individuals can use their public host or trading name.">
                <div className="grid md:grid-cols-2 gap-5">
                  <SelectField label="Host type" value={form.businessType} onChange={(v) => update('businessType', v)} options={[
                    ['individual', 'Individual'], ['company', 'Registered company'],
                  ]} />
                  <Field label="Host or business name" value={form.businessName} onChange={(v) => update('businessName', v)} required />
                  {form.businessType === 'company' && <Field label="Company registration number" value={form.companyRegistrationNo} onChange={(v) => update('companyRegistrationNo', v)} required />}
                  <SelectField label="Preferred payout" value={form.preferredPayoutMethod} onChange={(v) => update('preferredPayoutMethod', v)} options={[
                    ['mpesa', 'M-PESA'], ['bank', 'Bank transfer'],
                  ]} />
                </div>
              </Section>

              <Section title="Properties & experience" description="These details help our team verify that you are authorised to list the accommodation.">
                <div className="grid md:grid-cols-2 gap-5">
                  <Field label="Primary city or area" value={form.city} onChange={(v) => update('city', v)} required />
                  <Field label="Number of properties" type="number" min="1" max="1000" value={form.propertyCount} onChange={(v) => update('propertyCount', v)} required />
                  <SelectField label="Your relationship to the properties" value={form.propertyRelationship} onChange={(v) => update('propertyRelationship', v)} options={[
                    ['OWNER', 'Owner'], ['MANAGER', 'Property manager'], ['AGENT', 'Authorised agent'], ['TENANT', 'Tenant with permission'],
                  ]} />
                  <Field label="Years of hosting experience" type="number" min="0" max="80" value={form.yearsHosting} onChange={(v) => update('yearsHosting', v)} required />
                </div>
                <div className="mt-5">
                  <p className="text-sm font-medium text-[#222222] mb-2">Property types</p>
                  <div className="flex flex-wrap gap-2">
                    {PROPERTY_TYPES.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => togglePropertyType(value)}
                        className={`min-h-[44px] rounded-full px-4 text-sm font-semibold border transition-all duration-200 ${
                          form.propertyTypes.includes(value)
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'bg-white text-[#222222] border-[#E5E7EB] hover:bg-[#F7F7F5]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-5 grid gap-5">
                  <label className="block">
                    <span className="block text-sm font-medium text-[#222222] mb-2">Property locations</span>
                    <textarea
                      value={form.propertyLocations}
                      onChange={(e) => update('propertyLocations', e.target.value)}
                      rows="3"
                      maxLength="500"
                      className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm text-[#222222] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-colors"
                      placeholder="Neighbourhoods, towns, or addresses you intend to list"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-[#222222] mb-2">Hosting experience</span>
                    <textarea
                      value={form.experience}
                      onChange={(e) => update('experience', e.target.value)}
                      rows="4"
                      maxLength="2000"
                      className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm text-[#222222] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-colors"
                      placeholder="Tell us about your experience, team, and how guests will be supported."
                    />
                  </label>
                </div>
              </Section>

              <Section title="Verification documents" description="JPEG, PNG, WebP, or PDF up to 8MB. Documents are encrypted and only available to authorised administrators.">
                <div className="grid md:grid-cols-2 gap-4">
                  {requiredDocuments.map((kind) => {
                    const document = application?.documents?.find((item) => item.kind === kind);
                    return <DocumentUpload key={kind} kind={kind} document={document} busy={uploadingKind === kind} onUpload={uploadDocument} onRemove={removeDocument} />;
                  })}
                </div>
              </Section>

              <label className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] p-5">
                <input type="checkbox" checked={form.agreedTerms} onChange={(e) => update('agreedTerms', e.target.checked)} className="mt-1 h-5 w-5 accent-[#2563EB]" />
                <span className="text-sm text-[#222222]">I confirm the information is accurate, I am authorised to list these properties, and I agree to the <Link to="/terms" className="font-medium text-[#2563EB] hover:text-[#1D4ED8] hover:underline">Terms of Service</Link> and verification checks.</span>
              </label>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
                <button type="submit" disabled={saving || Boolean(uploadingKind)} className="min-h-[44px] rounded-lg bg-white border border-[#E5E7EB] px-6 font-semibold text-[#222222] disabled:opacity-50 hover:bg-[#F7F7F5] transition-all duration-200">{saving ? 'Saving...' : 'Save draft'}</button>
                <button type="button" onClick={handleSubmit} disabled={saving || Boolean(uploadingKind)} className="min-h-[44px] rounded-lg bg-[#C49A6C] px-6 font-semibold text-white hover:bg-[#B8895C] disabled:opacity-50 transition-all duration-200">{saving ? 'Working...' : 'Submit for review'}</button>
                <button type="button" onClick={handleSaveAndLeave} disabled={saving || Boolean(uploadingKind)} className="min-h-[44px] rounded-lg px-6 font-semibold text-[#6b7280] hover:text-[#222222] disabled:opacity-50 transition-all duration-200">Save &amp; continue traveling</button>
              </div>
            </form>
          ) : application?.status === 'APPROVED' || user?.role === 'HOST' ? (
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/host/properties/new" className="min-h-[44px] inline-flex items-center justify-center rounded-lg bg-[#C49A6C] px-6 font-semibold text-white hover:bg-[#B8895C] transition-all duration-200">Set up your first property</Link>
              <Link to="/host/today" className="min-h-[44px] inline-flex items-center justify-center rounded-lg bg-white border border-[#E5E7EB] px-6 font-semibold text-[#222222] hover:bg-[#F7F7F5] transition-all duration-200">Open host dashboard</Link>
            </div>
          ) : !application && user?.role !== 'USER' ? (
            <div className="mt-8 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] p-5">
              <p className="font-semibold text-[#222222]">No verification needed for this account</p>
              <p className="text-sm text-[#6b7280] mt-1">Your account role ({user?.role?.toLowerCase()}) doesn&apos;t go through host verification.</p>
            </div>
          ) : (
            <button type="button" onClick={() => { setMode('travelling'); navigate('/'); }} className="mt-8 min-h-[44px] rounded-lg bg-white border border-[#E5E7EB] px-6 font-semibold text-[#222222] hover:bg-[#F7F7F5] transition-all duration-200">Continue traveling</button>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-lg font-bold text-[#222222]">{title}</h2>
        <p className="text-sm text-[#6b7280] mt-1">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, type = 'text', ...props }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-[#222222] mb-2">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[44px] rounded-xl border border-[#E5E7EB] px-4 text-sm text-[#222222] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-colors"
        {...props}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-[#222222] mb-2">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[44px] rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#222222] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-colors"
      >
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function DocumentUpload({ kind, document, busy, onUpload, onRemove }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] p-5">
      <p className="font-semibold text-[#222222] text-sm">{DOCUMENT_LABELS[kind]}</p>
      {document ? (
        <>
          <p className="text-xs text-green-700 mt-2 break-all">Uploaded: {document.originalName}</p>
          <button
            type="button"
            onClick={() => onRemove(kind)}
            disabled={busy}
            className="mt-3 min-h-[44px] rounded-lg bg-red-50 px-4 text-xs font-semibold text-red-600 disabled:opacity-50 hover:bg-red-100 transition-colors duration-200"
          >
            {busy ? 'Working...' : 'Remove & replace'}
          </button>
        </>
      ) : (
        <label className="mt-3 inline-flex min-h-[44px] items-center cursor-pointer rounded-lg bg-[#C49A6C] px-4 text-xs font-semibold text-white hover:bg-[#B8895C] transition-all duration-200">
          <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy} onChange={(e) => onUpload(kind, e.target.files?.[0])} />
          {busy ? 'Uploading...' : 'Choose document'}
        </label>
      )}
    </div>
  );
}

function Notice({ tone, children }) {
  return <div className={`mt-6 rounded-xl border px-5 py-4 text-sm ${tone === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>{children}</div>;
}

Section.propTypes = { title: PropTypes.string.isRequired, description: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
Field.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, onChange: PropTypes.func.isRequired, type: PropTypes.string };
SelectField.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired, options: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired };
DocumentUpload.propTypes = { kind: PropTypes.string.isRequired, document: PropTypes.shape({ originalName: PropTypes.string }), busy: PropTypes.bool.isRequired, onUpload: PropTypes.func.isRequired, onRemove: PropTypes.func.isRequired };
Notice.propTypes = { tone: PropTypes.oneOf(['success', 'error']).isRequired, children: PropTypes.node.isRequired };

export default HostApplicationPage;
