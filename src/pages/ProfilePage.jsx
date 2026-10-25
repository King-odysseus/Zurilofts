import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SelectMenu from '../components/SelectMenu.jsx';
import { CalendarDays, Camera, ChevronRight, Heart, Info, Star } from 'lucide-react';
import { Alert, Badge, Button, Label, Spinner, Textarea, TextInput } from 'flowbite-react';
import StayCard from '../components/StayCard.jsx';
import GuestAccountLayout from '../components/GuestAccountLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import apiClient from '../api/client.js';
import { openConsentManager } from '../utils/consent.js';

import { COUNTRY_CODES, validatePhone, detectCountry } from '../utils/phone.js';

// SelectMenu option lists. Module scope keeps them out of every render of the
// phone, payout and review forms.
const COUNTRY_OPTIONS = COUNTRY_CODES.map((country) => ({ value: country.code, label: country.dial }));

// Review sub-scores are optional, so a blank "Skip" leads the list. Scores are
// stored as numbers but options compare by string, so the trigger passes
// String(value) - otherwise a saved 5 would not match the "5" option and the
// menu would fall back to the placeholder.
const SUB_SCORE_OPTIONS = [
  { value: '', label: 'Skip' },
  ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` })),
];

const PAYOUT_FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly (every Monday)' },
  { value: 'biweekly', label: 'Bi-Weekly (every other Monday)' },
  { value: 'monthly', label: 'Monthly (1st of month)' },
];

// Badge palettes for a booking status, so the same status reads the same colour
// everywhere on this page.
const STATUS_BADGES = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'failure',
};

const SECTION_TITLE = 'text-xl font-bold text-navy';
const SECTION_SUBTITLE = 'mt-1 mb-6 text-sm text-muted';
const CARD = 'rounded-xl border border-border bg-white p-5 shadow-sm';
const TAB_BASE = 'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors';
const TAB_ACTIVE = 'bg-navy-bg text-white';
const TAB_IDLE = 'text-muted hover:text-navy';

function tabClass(isActive) {
  return `${TAB_BASE} ${isActive ? TAB_ACTIVE : TAB_IDLE}`;
}

function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const { favorites } = useFavorites();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['info', 'bookings', 'favorites'].includes(hash) ? hash : 'info';
  });
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [countryCode, setCountryCode] = useState('KE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);

  // Bank / Payout state (HOST only)
  const [bankSaving, setBankSaving] = useState(false);
  const [bankMessage, setBankMessage] = useState('');
  const [bankForm, setBankForm] = useState({ bankName: '', bankAccountNo: '', bankCode: '' });
  const [payoutMethod, setPayoutMethod] = useState('bank');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [payoutFrequency, setPayoutFrequency] = useState('monthly');
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);

  // Per-booking review form state, keyed by booking id
  const [reviewForms, setReviewForms] = useState({});

  // Privacy and data controls
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Mirrors the backend eligibility rules (createReview): a stay is reviewable
  // only once it is CONFIRMED, paid, and has already ended. The backend remains
  // authoritative; this just avoids showing a form that would be rejected.
  const isStayCompleted = (booking) =>
    booking.status === 'CONFIRMED' &&
    Boolean(booking.paidAt) &&
    new Date(booking.checkOut) < new Date();

  const setReviewField = (bookingId, field, value) => {
    setReviewForms((prev) => ({
      ...prev,
      [bookingId]: { rating: 0, publicComment: '', privateNote: '', ...prev[bookingId], [field]: value, error: '' },
    }));
  };

  async function handleSubmitReview(bookingId) {
    const form = reviewForms[bookingId] || {};
    if (!form.rating) {
      setReviewField(bookingId, 'error', 'Please select a star rating');
      return;
    }
    setReviewForms((prev) => ({ ...prev, [bookingId]: { ...prev[bookingId], submitting: true, error: '' } }));
    try {
      const res = await apiClient.post('/reviews', {
        bookingId,
        rating: form.rating,
        cleanlinessRating: form.cleanlinessRating || undefined,
        locationRating: form.locationRating || undefined,
        valueRating: form.valueRating || undefined,
        satisfaction: form.satisfaction || undefined,
        publicComment: form.publicComment?.trim() || undefined,
        privateNote: form.privateNote?.trim() || undefined,
      });
      // Attach the new review to its booking so the form is replaced by a summary
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, review: res.data.data } : b))
      );
    } catch (err) {
      setReviewForms((prev) => ({
        ...prev,
        [bookingId]: {
          ...prev[bookingId],
          submitting: false,
          error: err.response?.data?.error || 'Could not submit review',
        },
      }));
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, bookingsRes] = await Promise.all([
          apiClient.get('/users/profile'),
          apiClient.get('/bookings', { params: { limit: 100 } }),
        ]);
        const prof = profileRes.data.data;
        setProfile(prof);
        setBookings(bookingsRes.data.data || []);
        setFormData({
          firstName: prof.firstName || '',
          lastName: prof.lastName || '',
          email: prof.email || '',
          phone: prof.phone || '',
        });
        // Parse out country code from stored phone
        const { countryCode: cc, phoneNumber: pn } = detectCountry(prof.phone || '');
        setCountryCode(cc);
        setPhoneNumber(pn);
        // Show completion banner if any required field is missing
        const missing = !prof.firstName || !prof.lastName || !prof.email || !prof.phone;
        setShowCompletionBanner(missing);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Populate bank form when profile loads (HOST only)
  useEffect(() => {
    if (!profile || profile.role !== 'HOST') return;
    setBankForm({
      bankName: profile.bankName || '',
      bankAccountNo: profile.bankAccountNo || '',
      bankCode: profile.bankCode || '',
    });
    setPayoutMethod(profile.payoutMethod || (profile.mpesaPhone ? 'mpesa' : 'bank'));
    setMpesaPhone(profile.mpesaPhone || profile.phone || '');
    setPayoutFrequency(profile.payoutFrequency || 'monthly');
  }, [profile]);

  const hostRole = profile?.role;
  // Fetch bank list for dropdown
  useEffect(() => {
    if (hostRole !== 'HOST') return;
    setBanksLoading(true);
    apiClient.get('/payments/banks')
      .then((res) => {
        if (res.data?.data) setBanks(res.data.data);
      })
      .catch(() => {})
      .finally(() => setBanksLoading(false));
  }, [hostRole]);

  async function handlePayoutDestinationSave(e) {
    e.preventDefault();
    if (payoutMethod === 'bank' && (!bankForm.bankName || !bankForm.bankAccountNo || !bankForm.bankCode)) {
      setBankMessage('Please fill in all bank details');
      return;
    }
    if (payoutMethod === 'mpesa' && !mpesaPhone.trim()) {
      setBankMessage('Please enter your M-PESA number');
      return;
    }
    setBankSaving(true);
    setBankMessage('');
    try {
      const payload = payoutMethod === 'mpesa'
        ? { payoutMethod, mpesaPhone: mpesaPhone.trim() }
        : { payoutMethod, ...bankForm };
      const res = await apiClient.put('/users/profile/payout-destination', payload);
      setProfile((prev) => ({ ...prev, ...res.data.data }));
      if (res.data.data.mpesaPhone) setMpesaPhone(res.data.data.mpesaPhone);
      setBankMessage(payoutMethod === 'mpesa' ? 'M-PESA payout number saved!' : 'Bank details saved!');
    } catch (err) {
      setBankMessage(err.response?.data?.error || 'Failed to save payout destination');
    } finally {
      setBankSaving(false);
    }
  }

  async function handleFrequencySave() {
    setBankSaving(true);
    setBankMessage('');
    try {
      const res = await apiClient.put('/users/profile/payout-frequency', { frequency: payoutFrequency });
      setProfile((prev) => ({ ...prev, payoutFrequency: res.data.data.payoutFrequency }));
      setBankMessage('Payout frequency updated!');
    } catch (err) {
      setBankMessage(err.response?.data?.error || 'Failed to update frequency');
    } finally {
      setBankSaving(false);
    }
  }

  function handlePhoneChange(newCountryCode, newPhoneNumber) {
    setCountryCode(newCountryCode);
    setPhoneNumber(newPhoneNumber);
    const country = COUNTRY_CODES.find((c) => c.code === newCountryCode);
    const v = validatePhone(newPhoneNumber, country);
    if (!newPhoneNumber) {
      setPhoneError('');
    } else if (!v.valid) {
      setPhoneError(`Enter ${country.length} digits for ${country.name} (e.g. ${country.example})`);
    } else {
      setPhoneError('');
    }
  }

  async function handleProfileUpdate(e) {
    e.preventDefault();
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    // Validate phone
    const country = COUNTRY_CODES.find((c) => c.code === countryCode);
    const v = validatePhone(phoneNumber, country);
    if (phoneNumber && !v.valid) {
      setPhoneError(`Enter ${country.length} digits for ${country.name}`);
      return;
    }
    setPhoneError('');
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        ...formData,
        phone: phoneNumber ? country.dial + phoneNumber : '',
      };
      const res = await apiClient.put('/users/profile', payload);
      setProfile(res.data.data);
      // Sync to auth context so navbar shows updated name/avatar
      setUser({ ...user, ...res.data.data });
      setMessage('Profile updated successfully!');
      setShowCompletionBanner(false);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setMessage('');
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await apiClient.post('/users/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(res.data.data);
      // Sync avatar to auth context so navbar updates
      setUser({ ...user, avatar: res.data.data.avatar });
      setMessage('Profile photo updated!');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Upload failed');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleExportData() {
    setExporting(true);
    setExportMessage('');
    try {
      const res = await apiClient.get('/me/export', { responseType: 'blob' });
      const disposition = res.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] || `zurilofts-data-${new Date().toISOString().slice(0, 10)}.json`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportMessage('Your data has been downloaded.');
    } catch (err) {
      setExportMessage(err.response?.data?.error || 'Could not export your data. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiClient.delete('/me', { data: { confirm: 'DELETE' } });
      await logout();
      navigate('/');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Could not delete your account. Please try again.');
      setDeleting(false);
    }
  }

  if (loading) {
    return <GuestAccountLayout active="profile" eyebrow="Account" title="Personal details" description="Keep your details current for stays and host communication.">
      <div className="flex flex-col gap-3" aria-label="Loading profile"><span className="block h-24 animate-pulse rounded-xl bg-white" /><span className="block h-24 animate-pulse rounded-xl bg-white" /><span className="block h-24 animate-pulse rounded-xl bg-white" /></div>
    </GuestAccountLayout>;
  }

  return <GuestAccountLayout
    active="profile"
    eyebrow="Account"
    title="Personal details"
    description="Keep your details current for stays and host communication."
  >
    <div>
      {/* Identity summary */}
      <div className={`${CARD} flex flex-col justify-between gap-4 sm:flex-row sm:items-center`}>
        <div className="flex items-center gap-4">
          <label className="group relative cursor-pointer">
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt="Profile"
                className="h-16 w-16 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-2xl font-bold text-white">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            )}
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {avatarUploading ? (
                <Spinner size="sm" />
              ) : (
                <Camera className="h-5 w-5 text-white" strokeWidth={2} aria-hidden="true" />
              )}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={avatarUploading}
            />
          </label>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-navy">
              {profile?.firstName} {profile?.lastName}
            </h2>
            <p className="truncate text-sm text-muted">{profile?.email}</p>
            <span className="mt-1 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600">Guest account</span>
          </div>
        </div>
        <Button as={Link} to="/verify-identity" color="light" size="sm" className="shrink-0">View verification status</Button>
      </div>

      {/* Tabs */}
      <div className="my-5 inline-flex flex-wrap gap-1 rounded-full border border-border bg-white p-1" role="tablist" aria-label="Profile sections">
        {['info', 'bookings', 'favorites'].map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={tabClass(activeTab === tab)}
          >
            {tab === 'info' ? 'My Info' : tab === 'bookings' ? 'Booking History' : `Favourites${favorites.length ? ` (${favorites.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* My Info Tab */}
      {activeTab === 'info' && (
        <div>
          {showCompletionBanner && (
            <Alert color="warning" className="mb-6">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Complete your profile</p>
                  <p className="mt-1 text-sm">Fill in your details below to get the most out of ZuriLofts.</p>
                </div>
              </div>
            </Alert>
          )}
          <div className={CARD}>
            <h2 className="mb-6 text-lg font-bold text-navy">Personal Information</h2>
            {message && <Alert color={message.includes('success') ? 'success' : 'failure'} className="mb-4">{message}</Alert>}
            <form onSubmit={handleProfileUpdate} className="grid gap-4">
              <div>
                <Label htmlFor="profile-first-name" className="mb-2 block text-sm font-semibold text-navy">First Name</Label>
                <TextInput
                  id="profile-first-name"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="profile-last-name" className="mb-2 block text-sm font-semibold text-navy">Last Name</Label>
                <TextInput
                  id="profile-last-name"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="profile-email" className="mb-2 block text-sm font-semibold text-navy">Email</Label>
                <TextInput
                  id="profile-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setEmailError(''); }}
                />
                {emailError && (
                  <p className="mt-1 text-xs font-medium text-red-600">{emailError}</p>
                )}
              </div>
              <div>
                <Label htmlFor="profile-phone" className="mb-2 block text-sm font-semibold text-navy">Phone</Label>
                <div className="flex gap-2">
                  <SelectMenu
                    value={countryCode}
                    onChange={(next) => handlePhoneChange(next, phoneNumber)}
                    ariaLabel="Select country code"
                    wrapperClassName="w-28 shrink-0"
                    options={COUNTRY_OPTIONS}
                  />
                  <TextInput
                    id="profile-phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneChange(countryCode, e.target.value.replace(/\D/g, ''))}
                    maxLength={15}
                    placeholder={COUNTRY_CODES.find((c) => c.code === countryCode)?.example || ''}
                    className="flex-1"
                  />
                </div>
                {phoneError && (
                  <p className="mt-1 text-xs font-medium text-red-600">{phoneError}</p>
                )}
              </div>
              <div>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>

          {/* Privacy and data */}
          <div id="privacy" className="mt-10 scroll-mt-28 border-t border-border pt-8">
            <h3 className={SECTION_TITLE}>Privacy and data</h3>
            <p className={SECTION_SUBTITLE}>
              Manage your personal data and consent choices. See our{' '}
              <Link to="/privacy" className="font-medium text-primary-600 hover:underline">Privacy Policy</Link>{' '}
              for full details.
            </p>

            <div className="space-y-4">
              {/* Download my data */}
              <div className={`${CARD} flex flex-col justify-between gap-4 sm:flex-row sm:items-center`}>
                <div>
                  <h4 className="font-semibold text-navy">Download my data</h4>
                  <p className="mt-1 text-sm text-muted">
                    Get a copy of the personal data we hold about you in a portable format.
                  </p>
                  {exportMessage && (
                    <p className={`mt-2 text-sm font-medium ${exportMessage.includes('Could') ? 'text-red-600' : 'text-green-700'}`}>
                      {exportMessage}
                    </p>
                  )}
                </div>
                <Button type="button" onClick={handleExportData} disabled={exporting} className="shrink-0">
                  {exporting ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Exporting...
                    </>
                  ) : (
                    'Download my data'
                  )}
                </Button>
              </div>

              {/* Cookie preferences */}
              <div className={`${CARD} flex flex-col justify-between gap-4 sm:flex-row sm:items-center`}>
                <div>
                  <h4 className="font-semibold text-navy">Cookie preferences</h4>
                  <p className="mt-1 text-sm text-muted">
                    Review or change which optional cookies we may use. You can withdraw consent at any time.
                  </p>
                </div>
                <Button type="button" onClick={openConsentManager} className="shrink-0">Manage preferences</Button>
              </div>

              {/* Delete my account */}
              <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h4 className="font-semibold text-red-700">Delete my account</h4>
                    <p className="mt-1 text-sm text-muted">
                      Permanently erase your account and personal data. Bookings and payment records are
                      retained for legal and tax reasons but are anonymised so they no longer identify you.
                      This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    type="button"
                    color="failure"
                    onClick={() => { setShowDeleteDialog(true); setDeleteConfirm(''); setDeleteError(''); }}
                    className="shrink-0"
                  >
                    Delete my account
                  </Button>
                </div>

                {showDeleteDialog && (
                  <div className="mt-5 border-t border-border pt-5">
                    <p className="mb-2 text-sm font-semibold text-navy">
                      To confirm, type <span className="font-mono font-bold text-red-700">DELETE</span> below.
                    </p>
                    <TextInput
                      type="text"
                      value={deleteConfirm}
                      onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(''); }}
                      placeholder="Type DELETE to confirm"
                      className="w-full sm:max-w-[18rem]"
                    />
                    {deleteError && <p className="mt-2 text-xs font-medium text-red-600">{deleteError}</p>}
                    <div className="mt-4 flex gap-3">
                      <Button
                        type="button"
                        color="failure"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirm !== 'DELETE' || deleting}
                      >
                        {deleting ? 'Deleting...' : 'Permanently delete my account'}
                      </Button>
                      <Button
                        type="button"
                        color="light"
                        onClick={() => setShowDeleteDialog(false)}
                        disabled={deleting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Settings - HOST only */}
      {activeTab === 'info' && profile?.role === 'HOST' && (
        <div className="mt-10 border-t border-border pt-8">
          <h3 className={SECTION_TITLE}>Payout Settings</h3>
          <p className={SECTION_SUBTITLE}>
            Your earnings are held in your wallet and paid out on your chosen schedule. WHT (5%) is automatically deducted and remitted to KRA.
          </p>

          {/* Payout destination */}
          <form onSubmit={handlePayoutDestinationSave} className="mb-8 space-y-4">
            <h4 className="font-semibold text-navy">Payout Destination</h4>

            <div className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1">
              {[
                { value: 'bank', label: 'Bank account' },
                { value: 'mpesa', label: 'M-PESA' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPayoutMethod(option.value)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${payoutMethod === option.value ? 'bg-navy-bg text-white' : 'text-muted hover:text-navy'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {payoutMethod === 'bank' ? (
              <>
                <div>
                  <Label htmlFor="payout-bank" className="mb-2 block text-sm font-semibold text-navy">Bank Name *</Label>
                  {banksLoading ? (
                    <p className="text-sm text-muted">Loading banks...</p>
                  ) : banks.length > 0 ? (
                    <SelectMenu
                      id="payout-bank"
                      value={bankForm.bankCode}
                      ariaLabel="Select your bank"
                      onChange={(next) => {
                        const bank = banks.find((item) => item.code === next);
                        setBankForm((prev) => ({ ...prev, bankCode: next, bankName: bank?.name || '' }));
                      }}
                      wrapperClassName="w-full"
                      options={banks.map((bank) => ({ value: bank.code, label: bank.name }))}
                    />
                  ) : (
                    <TextInput
                      type="text"
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm((prev) => ({ ...prev, bankName: e.target.value }))}
                      placeholder="e.g. KCB Bank"
                      required
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="payout-account" className="mb-2 block text-sm font-semibold text-navy">Account Number *</Label>
                  <TextInput
                    id="payout-account"
                    type="text"
                    value={bankForm.bankAccountNo}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, bankAccountNo: e.target.value.replace(/\D/g, '').slice(0, 20) }))}
                    maxLength={20}
                    placeholder="Bank account number"
                    required
                  />
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="payout-mpesa" className="mb-2 block text-sm font-semibold text-navy">Safaricom M-PESA Number *</Label>
                <TextInput
                  id="payout-mpesa"
                  type="tel"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="0712 345 678"
                  autoComplete="tel"
                  required
                />
                <p className="mt-2 text-xs text-muted">Use the Safaricom number registered to receive your host payouts.</p>
              </div>
            )}

            <div>
              <Button type="submit" size="sm" disabled={bankSaving}>
                {bankSaving ? 'Saving...' : 'Save Payout Destination'}
              </Button>
            </div>
          </form>

          {/* Payout Frequency */}
          <div className="space-y-3">
            <h4 className="font-semibold text-navy">Payout Frequency</h4>
            <p className="text-xs text-muted">Your accumulated earnings will be sent to your selected payout destination on this schedule.</p>
            <div className="flex items-center gap-3">
              <SelectMenu
                value={payoutFrequency}
                onChange={(next) => setPayoutFrequency(next)}
                ariaLabel="Select payout frequency"
                wrapperClassName="w-full sm:max-w-xs"
                options={PAYOUT_FREQUENCY_OPTIONS}
              />
              <Button type="button" size="sm" onClick={handleFrequencySave} disabled={bankSaving} className="shrink-0">
                Save
              </Button>
            </div>
          </div>

          {bankMessage && (
            <Alert color={bankMessage.includes('failed') || bankMessage.includes('Failed') || bankMessage.includes('Please') ? 'failure' : 'success'} className="mt-4">
              {bankMessage}
            </Alert>
          )}
        </div>
      )}

      {/* My Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-surface">
                <CalendarDays className="h-8 w-8 text-muted" strokeWidth={2} aria-hidden="true" />
              </span>
              <h3 className="text-lg font-bold text-navy">No bookings yet</h3>
              <p className="text-sm text-muted">Your upcoming stays will appear here.</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className={CARD}>
                <div className="flex flex-col gap-4 md:flex-row">
                  {booking.property?.images?.[0] && (
                    <img
                      src={booking.property.images[0]}
                      alt={booking.property.title}
                      className="h-32 w-full rounded-xl object-cover md:w-48"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-navy">{booking.property?.title}</h3>
                        <p className="text-sm text-muted">{booking.property?.location}</p>
                      </div>
                      <Badge color={STATUS_BADGES[booking.status] || 'gray'}>
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted">Check-in</span>
                        <p className="font-semibold text-navy">{new Date(booking.checkIn).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-muted">Check-out</span>
                        <p className="font-semibold text-navy">{new Date(booking.checkOut).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-muted">Total</span>
                        <p className="font-semibold tabular-nums text-navy">KES {booking.total.toLocaleString()}</p>
                      </div>
                    </div>
                    {booking.promoCode && (
                      <div className="mt-3">
                        <Badge color="success">
                          Promo: {booking.promoCode.code}
                        </Badge>
                      </div>
                    )}

                    {/* Post-stay review */}
                    {booking.review ? (
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="mb-1 text-sm font-semibold text-navy">Your rating</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`h-5 w-5 ${star <= booking.review.rating ? 'text-primary-600' : 'text-border'}`} fill="currentColor" aria-hidden="true" />
                          ))}
                          <span className="ml-2 text-xs font-medium text-green-600">Thanks for your feedback!</span>
                        </div>
                      </div>
                    ) : isStayCompleted(booking) ? (
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="mb-2 text-sm font-semibold text-navy">Rate your stay</p>
                        <div className="mb-3 flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const current = reviewForms[booking.id]?.rating || 0;
                            return (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewField(booking.id, 'rating', star)}
                                className="p-0.5 transition-transform hover:scale-110"
                                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                              >
                                <Star className={`h-7 w-7 ${star <= current ? 'text-primary-600' : 'text-border'}`} fill="currentColor" aria-hidden="true" />
                              </button>
                            );
                          })}
                        </div>
                        <div className="mb-3 grid gap-2 sm:grid-cols-3">
                          {[['cleanlinessRating', 'Cleanliness'], ['locationRating', 'Location'], ['valueRating', 'Value']].map(([field, label]) => (
                            <label key={field} className="text-xs font-semibold text-muted">
                              {label} (optional)
                              <SelectMenu
                                value={String(reviewForms[booking.id]?.[field] || '')}
                                onChange={(next) => setReviewField(booking.id, field, Number(next) || 0)}
                                options={SUB_SCORE_OPTIONS}
                                ariaLabel={`${label} rating (optional)`}
                              />
                            </label>
                          ))}
                        </div>
                        <label className="mb-2 block text-xs font-semibold text-muted">
                          How satisfied were you with your stay?
                        </label>
                        <div className="mb-4 flex items-center gap-3">
                          {[
                            { key: 'happy', emoji: '😊', label: 'Happy', color: 'border-green-300 bg-green-100 text-green-700' },
                            { key: 'neutral', emoji: '😐', label: 'Neutral', color: 'border-yellow-300 bg-yellow-100 text-yellow-700' },
                            { key: 'unhappy', emoji: '😞', label: 'Unhappy', color: 'border-red-300 bg-red-100 text-red-700' },
                          ].map(({ key, emoji, label, color }) => {
                            const current = reviewForms[booking.id]?.satisfaction;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setReviewField(booking.id, 'satisfaction', key)}
                                className={`flex flex-col items-center gap-1 rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors ${current === key ? color : 'border-border text-muted hover:border-primary'}`}
                              >
                                <span className="text-2xl">{emoji}</span>
                                <span className="text-xs">{label}</span>
                              </button>
                            );
                          })}
                        </div>
                        <label className="mb-1 block text-xs font-semibold text-muted">
                          Public review <span className="font-normal">(shown on the property page)</span>
                        </label>
                        <Textarea
                          value={reviewForms[booking.id]?.publicComment || ''}
                          onChange={(e) => setReviewField(booking.id, 'publicComment', e.target.value)}
                          placeholder="Share what other guests should know about this stay. This appears publicly with your first name."
                          maxLength={1000}
                          rows={3}
                          className="mb-4"
                        />
                        <label className="mb-1 block text-xs font-semibold text-muted">
                          Private note to ZuriLofts <span className="font-normal">(only our team sees this)</span>
                        </label>
                        <Textarea
                          value={reviewForms[booking.id]?.privateNote || ''}
                          onChange={(e) => setReviewField(booking.id, 'privateNote', e.target.value)}
                          placeholder="Only the ZuriLofts team will see this. Tell us what we could do better."
                          maxLength={2000}
                          rows={3}
                        />
                        {reviewForms[booking.id]?.error && (
                          <p className="mt-1 text-xs font-medium text-red-600">{reviewForms[booking.id].error}</p>
                        )}
                        <div className="mt-3">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSubmitReview(booking.id)}
                            disabled={reviewForms[booking.id]?.submitting}
                          >
                            {reviewForms[booking.id]?.submitting ? 'Submitting...' : 'Submit Review'}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
          {bookings.length > 0 && (
            <div className="mt-6 text-center">
              <Link
                to="/bookings"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700"
              >
                View all bookings
                <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Favourites Tab */}
      {activeTab === 'favorites' && (
        <div>
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-surface">
                <Heart className="h-8 w-8 text-muted" strokeWidth={2} aria-hidden="true" />
              </span>
              <h3 className="text-lg font-bold text-navy">No favourites yet</h3>
              <p className="text-sm text-muted">Tap the heart on any property to save it here.</p>
              <Button as={Link} to="/properties">Browse properties</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((property) => (
                <StayCard key={property.id} stay={property} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  </GuestAccountLayout>;
}

export default ProfilePage;
