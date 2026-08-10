import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import Spinner from '../components/Spinner.jsx';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useMode } from '../context/ModeContext.jsx';

const EMPTY_FORM = {
  businessName: '',
  businessType: 'individual',
  contactPhone: '',
  contactEmail: '',
  city: '',
  propertyCount: '',
  experience: '',
};

const STATUS_COPY = {
  DRAFT: 'Complete the details below and submit your application for review.',
  CHANGES_REQUESTED: 'Please update the requested details and resubmit your application.',
  SUBMITTED: 'Your application is under review. We will notify you when a decision is made.',
  APPROVED: 'Your host application has been approved.',
  REJECTED: 'Your application was not approved. Contact support if you need help.',
};

function formFromApplication(application, user) {
  return {
    businessName: application?.businessName || '',
    businessType: application?.businessType || 'individual',
    contactPhone: application?.contactPhone || user?.phone || '',
    contactEmail: application?.contactEmail || user?.email || '',
    city: application?.city || '',
    propertyCount: application?.propertyCount || '',
    experience: application?.experience || '',
  };
}

function HostApplicationPage() {
  const { user } = useAuth();
  const { setMode } = useMode();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        setApplication(current);
        setForm(formFromApplication(current, user));
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load your host application.');
      } finally {
        setLoading(false);
      }
    }
    loadApplication();
  }, [user]);

  const editable = ['DRAFT', 'CHANGES_REQUESTED'].includes(application?.status);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function applicationPayload() {
    const payload = {};
    for (const field of ['businessName', 'businessType', 'contactPhone', 'contactEmail', 'city', 'experience']) {
      const value = form[field].trim();
      if (value) payload[field] = value;
    }
    const propertyCount = Number(form.propertyCount);
    if (propertyCount > 0) payload.propertyCount = propertyCount;
    return payload;
  }

  async function saveApplication() {
    const response = await apiClient.patch('/host-application', applicationPayload());
    setApplication(response.data.data);
    return response.data.data;
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveApplication();
      setMessage('Your application draft has been saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save your application.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveApplication();
      const response = await apiClient.post('/host-application/submit');
      setApplication(response.data.data);
      setMessage('Your host application has been submitted for review.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit your application.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndLeave() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveApplication();
      setMode('travelling');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save your application.');
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]"><Spinner /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 md:px-6 pt-28 pb-20">
        <div className="bg-white rounded-3xl shadow-sm border border-[#D9D9D9]/70 p-6 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#C49A6C] mb-2">Become a ZuriLofts host</p>
          <h1 className="text-3xl md:text-4xl font-bold text-[#0B0B45]">Host application</h1>
          <p className="text-[#6b7280] mt-3">
            Complete this now or save your draft and return later. Your traveling account remains available while your host application is reviewed.
          </p>

          {application && (
            <div className="mt-6 rounded-2xl bg-[#0B0B45]/5 p-4">
              <p className="font-semibold text-[#0B0B45]">Status: {application.status.replaceAll('_', ' ')}</p>
              <p className="text-sm text-[#6b7280] mt-1">{STATUS_COPY[application.status]}</p>
              {application.reviewNote && <p className="text-sm text-red-700 mt-3">Reviewer note: {application.reviewNote}</p>}
            </div>
          )}

          {message && <div className="mt-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-green-800">{message}</div>}
          {error && <div className="mt-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700">{error}</div>}

          {editable ? (
            <form onSubmit={handleSave} className="mt-8 space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Business or host name" name="businessName" value={form.businessName} onChange={handleChange} required />
                <label className="block">
                  <span className="block text-sm font-semibold text-[#1f2937] mb-2">Host type</span>
                  <select name="businessType" value={form.businessType} onChange={handleChange} className="auth-input w-full px-4 py-3 bg-white" required>
                    <option value="individual">Individual</option>
                    <option value="company">Company</option>
                  </select>
                </label>
                <Field label="Contact email" name="contactEmail" type="email" value={form.contactEmail} onChange={handleChange} required />
                <Field label="Contact phone" name="contactPhone" type="tel" value={form.contactPhone} onChange={handleChange} required />
                <Field label="Primary city or area" name="city" value={form.city} onChange={handleChange} required />
                <Field label="Number of properties" name="propertyCount" type="number" min="1" max="1000" value={form.propertyCount} onChange={handleChange} required />
              </div>
              <label className="block">
                <span className="block text-sm font-semibold text-[#1f2937] mb-2">Hosting experience (optional)</span>
                <textarea name="experience" value={form.experience} onChange={handleChange} rows="5" maxLength="2000" className="auth-input w-full px-4 py-3 bg-white resize-y" placeholder="Tell us about your properties and hosting experience." />
              </label>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button type="submit" disabled={saving} className="rounded-full border-2 border-[#0B0B45] px-6 py-3 font-semibold text-[#0B0B45] disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save draft'}
                </button>
                <button type="button" onClick={handleSubmit} disabled={saving} className="rounded-full bg-[#C49A6C] px-6 py-3 font-semibold text-white hover:bg-[#b8895c] disabled:opacity-50">
                  {saving ? 'Submitting...' : 'Submit for review'}
                </button>
                <button type="button" onClick={handleSaveAndLeave} disabled={saving} className="rounded-full px-6 py-3 font-semibold text-[#6b7280] hover:text-[#0B0B45] disabled:opacity-50">
                  Save &amp; continue traveling
                </button>
              </div>
            </form>
          ) : application?.status === 'APPROVED' || user?.role === 'HOST' ? (
            <Link to="/host/today" className="inline-flex mt-8 rounded-full bg-[#C49A6C] px-6 py-3 font-semibold text-white">Open host dashboard</Link>
          ) : (
            <Link to="/" className="inline-flex mt-8 rounded-full border-2 border-[#0B0B45] px-6 py-3 font-semibold text-[#0B0B45]">Return home</Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', ...inputProps }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-[#1f2937] mb-2">{label}</span>
      <input type={type} name={name} value={value} onChange={onChange} className="auth-input w-full px-4 py-3 bg-white" {...inputProps} />
    </label>
  );
}

export default HostApplicationPage;
