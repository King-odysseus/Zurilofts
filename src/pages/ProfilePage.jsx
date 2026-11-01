import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SelectMenu from '../components/SelectMenu.jsx';
import { CalendarDays, Camera, ChevronRight, Heart, Star, UserRound } from 'lucide-react';
import StayCard from '../components/StayCard.jsx';
import GuestAccountLayout from '../components/GuestAccountLayout.jsx';
import VerificationNudge from '../components/VerificationNudge.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
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

// The required details, in the order the form asks for them, so the notice
// lists what is missing in the same order the person scrolls to fix it.
const REQUIRED_PROFILE_FIELDS = [
  { field: 'firstName', labelKey: 'profile.fieldFirstName' },
  { field: 'lastName', labelKey: 'profile.fieldLastName' },
  { field: 'email', labelKey: 'profile.fieldEmail' },
  { field: 'phone', labelKey: 'profile.fieldPhone' },
];

// An absent value and an empty string both count as missing: the API returns
// null for a detail never added, and a form submitted blank sends "".
function missingProfileFieldLabels(profile) {
  return REQUIRED_PROFILE_FIELDS
    .filter(({ field }) => !profile?.[field])
    .map(({ labelKey }) => labelKey);
}

// "first name", "first name and phone number", "first name, last name and phone
// number". Built as a plain string because t() only substitutes strings, and the
// joiner comes from the dictionary so Swahili is not forced into English order.
function joinFieldLabels(labelKeys, t) {
  const labels = labelKeys.map((key) => t(key));
  if (labels.length <= 1) return labels[0] || '';
  return `${labels.slice(0, -1).join(', ')} ${t('common.and')} ${labels[labels.length - 1]}`;
}

// A review about this person arrives with its host attached, but the account may
// since have been deleted, in which case the name is empty and the line falls
// back to the date alone instead of showing a stranded comma.
function reviewAuthorName(host) {
  if (!host) return '';
  return [host.firstName, host.lastName].filter(Boolean).join(' ');
}

function ProfilePage() {
  const { t } = useLanguage();
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
  // Translation keys of the required details that are still empty, in the order
  // the form asks for them. An empty list is what keeps the notice off the page.
  const [missingProfileFields, setMissingProfileFields] = useState([]);

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

  // Reviews hosts have left about this person. Null means the request is still in
  // flight, which is deliberately not the empty state: showing "no reviews yet"
  // before the answer arrives would be a lie for a moment. A failure gets its own
  // flag so "could not load" never reads as "nobody reviewed you".
  const [guestReviews, setGuestReviews] = useState(null);
  const [guestReviewsFailed, setGuestReviewsFailed] = useState(false);

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
      // Started before the await below and never awaited: the profile and bookings
      // are what the page is for, so this request must not delay them, and its
      // rejection must not reach the shared catch that decides the page loaded.
      apiClient
        .get('/guest-reviews/mine')
        .then((res) => {
          const data = res.data?.data;
          setGuestReviews({ summary: data?.summary ?? null, reviews: data?.reviews ?? [] });
        })
        .catch(() => setGuestReviewsFailed(true));

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
        // The notice names what is missing, so it needs the keys, not a flag.
        // If this load fails the list stays empty and no notice is shown.
        setMissingProfileFields(missingProfileFieldLabels(prof));
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
      // Recompute rather than hide: the saved payload is what the form now holds,
      // so adding the last missing detail clears the notice without a reload.
      setMissingProfileFields(missingProfileFieldLabels(res.data.data));
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

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  // The auth payload already carries the identity status, so the badge needs no
  // request of its own. Only APPROVED counts: every other value is a review still
  // in progress or already rejected, and both are the nudge's job, not a mark
  // beside the name.
  const identityApproved = user?.identityVerificationStatus === 'APPROVED';
  const receivedReviews = guestReviews?.reviews ?? [];
  // The summary is authoritative when it arrives; falling back to the list length
  // means a payload without one still renders its reviews instead of claiming
  // there are none.
  const receivedReviewCount = guestReviews?.summary?.totalReviews ?? receivedReviews.length;
  const receivedAverage = Number(guestReviews?.summary?.averageRating) || 0;

  if (loading) {
    return <GuestAccountLayout active="profile" eyebrow="Account" title={t('profile.title')} description={t('profile.description')}>
      <div className="opg-profile-loading" aria-label={t('profile.loadingProfile')}><span /><span /><span /></div>
    </GuestAccountLayout>;
  }

  return <GuestAccountLayout
    active="profile"
    eyebrow="Account"
    title={t('profile.title')}
    description={t('profile.description')}
  >
    <div className="opg-profile">
          <div className="opg-profile-summary">
            <div className="opg-profile-avatar-wrap">
              <label className="relative cursor-pointer group">
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={t('profile.photoAlt')}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#D9D9D9]"
                  />
                ) : (
                  <div className="w-16 h-16 bg-[#16294B] rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {avatarUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Camera className="w-5 h-5 text-white" strokeWidth={2} aria-hidden="true" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={avatarUploading}
                />
              </label>
              <div className="opg-profile-identity">
                <h2>
                  {profile?.firstName} {profile?.lastName}
                </h2>
                <p className="text-[#6b7280]">{profile?.email}</p>
                <span>{t('profile.guestAccount')}</span>
              </div>
              {/* Rendered beside the name rather than inside the identity block:
                  that block repaints every span it contains as a small uppercase
                  bronze label, which would strip the badge's own colours. */}
              {identityApproved && (
                <VerifiedBadge
                  label={t('profile.verifiedBadge')}
                  className="shrink-0 self-start"
                />
              )}
            </div>
            <Link to="/verify-identity" className="opg-profile-verify">{t('profile.viewVerification')}</Link>
          </div>

          {/* Tabs */}
          {/* The account grid in the stylesheet spaces its children by 18px. A 6px
              margin on the surface below lifts every stacked block in this page to
              24px, the same rhythm the rest of the app uses, without touching CSS. */}
          <div className="opg-profile-tabs mt-1.5" role="tablist" aria-label={t('profile.sections')}>
            {['info', 'bookings', 'favorites'].map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={activeTab === tab ? 'is-active' : ''}
              >
                {tab === 'info' ? t('profile.tabInfo') : tab === 'bookings' ? t('profile.tabBookings') : `${t('profile.tabFavourites')}${favorites.length ? ` (${favorites.length})` : ''}`}
              </button>
            ))}
          </div>

          {/* My Info Tab */}
          {activeTab === 'info' && (
            <div className="mt-1.5">
              {missingProfileFields.length > 0 && (
                <VerificationNudge
                  tone="attention"
                  icon={UserRound}
                  title={t('profile.completeProfileTitle')}
                  description={t('profile.completeProfileBody', { fields: joinFieldLabels(missingProfileFields, t) })}
                  className="mb-5"
                />
              )}
              <div className="neu-card p-6">
                <h2 className="text-lg font-bold text-[#203565] mb-6">{t('profile.personalInformation')}</h2>
                {message && (
                  <div className={`rounded-xl px-4 py-3 mb-4 text-sm ${
                    message.includes('success')
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {message}
                  </div>
                )}
                <form onSubmit={handleProfileUpdate} className="opg-profile-form">
                  <div>
                    <label htmlFor="profile-firstName" className="block text-sm font-semibold text-[#1f2937] mb-2">{t('profile.firstName')}</label>
                    <input
                      id="profile-firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="neu-input w-full px-4 py-3 focus:outline-none bg-elevated text-[#1f2937]"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-lastName" className="block text-sm font-semibold text-[#1f2937] mb-2">{t('profile.lastName')}</label>
                    <input
                      id="profile-lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="neu-input w-full px-4 py-3 focus:outline-none bg-elevated text-[#1f2937]"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-email" className="block text-sm font-semibold text-[#1f2937] mb-2">{t('profile.email')}</label>
                    <input
                      id="profile-email"
                      type="email"
                      aria-describedby={emailError ? 'profile-email-error' : undefined}
                      value={formData.email}
                      onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setEmailError(''); }}
                      className="neu-input w-full px-4 py-3 focus:outline-none bg-elevated text-[#1f2937]"
                    />
                    {emailError && (
                      <p id="profile-email-error" className="text-red-500 text-xs mt-1">{emailError}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="profile-phone" className="block text-sm font-semibold text-[#1f2937] mb-2">{t('profile.phone')}</label>
                    <div className="flex gap-2">
                      <SelectMenu
                        value={countryCode}
                        onChange={(next) => handlePhoneChange(next, phoneNumber)}
                        ariaLabel={t('a11y2.selectCountryCode')}
                        wrapperClassName="opg-profile-country"
                        options={COUNTRY_OPTIONS}
                      />
                      <input
                        id="profile-phone"
                        type="tel"
                        aria-describedby={phoneError ? 'profile-phone-error' : undefined}
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(countryCode, e.target.value.replace(/\D/g, ''))}
                        maxLength={15}
                        placeholder={COUNTRY_CODES.find((c) => c.code === countryCode)?.example || ''}
                        className="neu-input flex-1 px-4 py-3 focus:outline-none bg-elevated text-[#1f2937] placeholder-[#6b7280] rounded-xl"
                      />
                    </div>
                    {phoneError && (
                      <p id="profile-phone-error" className="text-red-500 text-xs mt-1">{phoneError}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#143A80] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#0B2A5E] transition-all duration-200 disabled:opacity-50"
                  >
                    {saving ? t('common.saving') : t('profile.saveChanges')}
                  </button>
                </form>
              </div>

              {/* Privacy and data */}
              <div id="privacy" className="scroll-mt-28 mt-10 pt-8 border-t-2 border-[#D9D9D9]">
                <h3 className="text-xl font-bold text-[#203565] mb-1">{t('profile.privacyAndData')}</h3>
                <p className="text-sm text-[#6b7280] mb-6">
                  Manage your personal data and consent choices. See our{' '}
                  <Link to="/privacy" className="text-[#8A6B52] hover:underline font-medium">{t('profile.privacyPolicy')}</Link>{' '}
                  for full details.
                </p>

                <div className="space-y-6">
                  {/* Download my data */}
                  <div className="neu-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div>
                      <h4 className="font-semibold text-[#1f2937]">{t('profile.downloadMyData')}</h4>
                      <p className="text-sm text-[#6b7280] mt-2">
                        {t('profile.dataCopyHint')}
                      </p>
                      {exportMessage && (
                        <p className={`text-sm mt-2 font-medium ${exportMessage.includes('Could') ? 'text-red-500' : 'text-green-600'}`}>
                          {exportMessage}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      disabled={exporting}
                      className="flex-shrink-0 inline-flex items-center gap-2 bg-[#16294B] text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-[#06062a] transition-all duration-200 disabled:opacity-50"
                    >
                      {exporting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Exporting...
                        </>
                      ) : (
                        'Download my data'
                      )}
                    </button>
                  </div>

                  {/* Cookie preferences */}
                  <div className="neu-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div>
                      <h4 className="font-semibold text-[#1f2937]">{t('profile.cookiePreferences')}</h4>
                      <p className="text-sm text-[#6b7280] mt-2">
                        {t('profile.cookieHint')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openConsentManager}
                      className="flex-shrink-0 bg-[#16294B] text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-[#06062a] transition-all duration-200"
                    >
                      {t('profile.managePreferences')}
                    </button>
                  </div>

                  {/* Delete my account */}
                  <div className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                      <div>
                        <h4 className="font-semibold text-red-700">{t('profile.deleteMyAccount')}</h4>
                        <p className="text-sm text-[#6b7280] mt-2">
                          Permanently erase your account and personal data. Bookings and payment records are
                          retained for legal and tax reasons but are anonymised so they no longer identify you.
                          This action cannot be undone.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setShowDeleteDialog(true); setDeleteConfirm(''); setDeleteError(''); }}
                        className="flex-shrink-0 bg-red-600 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-red-700 transition-all duration-200"
                      >
                        {t('profile.deleteMyAccount')}
                      </button>
                    </div>

                    {showDeleteDialog && (
                      <div className="mt-5 pt-5 border-t border-red-200">
                        <p className="text-sm font-semibold text-[#1f2937] mb-2">
                          {t('profile.confirmDelete')}
                        </p>
                        <input
                          type="text"
                          value={deleteConfirm}
                          onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(''); }}
                          placeholder={t('profile.typeDelete')}
                          className="neu-input w-full sm:w-72 px-4 py-3 focus:outline-none bg-elevated text-[#1f2937] placeholder-[#6b7280] rounded-xl"
                        />
                        {deleteError && <p className="text-red-500 text-xs mt-2">{deleteError}</p>}
                        <div className="flex gap-3 mt-4">
                          <button
                            type="button"
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirm !== 'DELETE' || deleting}
                            className="bg-red-600 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-red-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {deleting ? 'Deleting...' : 'Permanently delete my account'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={deleting}
                            className="px-5 py-2.5 rounded-full border border-[#D9D9D9] text-[#1f2937] text-sm font-semibold hover:bg-[#f8f9fa] transition-colors duration-200 disabled:opacity-50"
                          >
                            Cancel
                          </button>
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
            <div className="mt-10 pt-8 border-t-2 border-[#D9D9D9]">
              <h3 className="text-xl font-bold text-[#203565] mb-1">{t('profile.payoutSettings')}</h3>
              <p className="text-sm text-[#6b7280] mb-6">
                Your earnings are held in your wallet and paid out on your chosen schedule. WHT (5%) is automatically deducted and remitted to KRA.
              </p>

              {/* Payout destination */}
              <form onSubmit={handlePayoutDestinationSave} className="space-y-5 mb-8">
                <h4 className="font-semibold text-[#1f2937]">{t('profile.payoutDestination')}</h4>

                <div className="grid grid-cols-2 gap-2 rounded-full bg-[#16294B]/5 p-1">
                  {[
                    { value: 'bank', label: 'Bank account' },
                    { value: 'mpesa', label: 'M-PESA' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPayoutMethod(option.value)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        payoutMethod === option.value
                          ? 'bg-[#16294B] text-white shadow-sm'
                          : 'text-[#6b7280] hover:text-[#203565]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {payoutMethod === 'bank' ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-[#1f2937] mb-2">{t('profile.bankName')}</label>
                      {banksLoading ? (
                        <p className="text-sm text-[#6b7280]">{t('profile.loadingBanks')}</p>
                      ) : banks.length > 0 ? (
                        <SelectMenu
                          value={bankForm.bankCode}
                          ariaLabel={t('a11y2.selectYourBank')}
                          onChange={(next) => {
                            const bank = banks.find((item) => item.code === next);
                            setBankForm((prev) => ({ ...prev, bankCode: next, bankName: bank?.name || '' }));
                          }}
                          wrapperClassName="opg-profile-select"
                          options={banks.map((bank) => ({ value: bank.code, label: bank.name }))}
                        />
                      ) : (
                        <input
                          type="text"
                          value={bankForm.bankName}
                          onChange={(e) => setBankForm((prev) => ({ ...prev, bankName: e.target.value }))}
                          placeholder={t('profile.bankPlaceholder')}
                          className="neu-input w-full px-4 py-3 focus:outline-none bg-elevated text-[#1f2937] placeholder-[#6b7280]"
                          required
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#1f2937] mb-2">{t('profile.accountNumber')}</label>
                      <input
                        type="text"
                        value={bankForm.bankAccountNo}
                        onChange={(e) => setBankForm((prev) => ({ ...prev, bankAccountNo: e.target.value.replace(/\D/g, '').slice(0, 20) }))}
                        maxLength={20}
                        placeholder={t('profile.accountNumberPlaceholder')}
                        className="neu-input w-full px-4 py-3 focus:outline-none bg-elevated text-[#1f2937] placeholder-[#6b7280]"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-2">{t('profile.mpesaNumber')}</label>
                    <input
                      type="tel"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      placeholder="0712 345 678"
                      autoComplete="tel"
                      className="neu-input w-full px-4 py-3 focus:outline-none bg-elevated text-[#1f2937] placeholder-[#6b7280]"
                      required
                    />
                    <p className="text-xs text-[#6b7280] mt-2">{t('profile.mpesaHint')}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={bankSaving}
                  className="bg-[#143A80] text-white font-semibold px-6 py-2.5 rounded-full hover:bg-[#0B2A5E] transition-all duration-200 disabled:opacity-50 text-sm"
                >
                  {bankSaving ? 'Saving...' : 'Save Payout Destination'}
                </button>
              </form>

              {/* Payout Frequency */}
              <div className="space-y-4">
                <h4 className="font-semibold text-[#1f2937]">{t('profile.payoutFrequency')}</h4>
                <p className="text-xs text-[#6b7280]">{t('profile.payoutFrequencyHint')}</p>
                {/* The select is pinned to 280px by the shared stylesheet and forced
                    to full width below 768px, so a Save button beside it was pushed
                    off the right edge at 390px. Stacking until md keeps both visible
                    and matches the breakpoint the stylesheet itself switches on. */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-3">
                  <SelectMenu
                    value={payoutFrequency}
                    onChange={(next) => setPayoutFrequency(next)}
                    ariaLabel={t('a11y2.selectPayoutFrequency')}
                    wrapperClassName="opg-profile-frequency"
                    options={PAYOUT_FREQUENCY_OPTIONS}
                  />
                  <button
                    type="button"
                    onClick={handleFrequencySave}
                    disabled={bankSaving}
                    className="bg-[#16294B] text-white font-semibold px-4 py-2.5 rounded-full hover:bg-[#06062a] transition-all duration-200 disabled:opacity-50 text-sm md:flex-shrink-0"
                  >
                    Save
                  </button>
                </div>
              </div>

              {bankMessage && (
                <p className={`text-sm mt-4 font-medium ${bankMessage.includes('failed') || bankMessage.includes('Failed') || bankMessage.includes('Please') ? 'text-red-500' : 'text-green-600'}`}>
                  {bankMessage}
                </p>
              )}
            </div>
          )}

          {/* My Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="space-y-6">
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#D9D9D9] rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarDays className="w-8 h-8 text-[#6b7280]" strokeWidth={2} aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-bold text-[#203565] mb-1">{t('profile.noBookings')}</h3>
                  <p className="text-[#6b7280]">{t('profile.noBookingsHint')}</p>
                </div>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="shadow-sm p-6">
                    <div className="flex flex-col md:flex-row gap-5">
                      {booking.property?.images?.[0] && (
                        <img
                          src={booking.property.images[0]}
                          alt={booking.property.title}
                          className="w-full md:w-48 h-32 object-cover rounded-xl"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-[#203565]">{booking.property?.title}</h3>
                            <p className="text-sm text-[#6b7280]">{booking.property?.location}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[booking.status]}`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-5 text-sm">
                          <div>
                            <span className="text-[#6b7280]">Check-in</span>
                            <p className="font-semibold">{new Date(booking.checkIn).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-[#6b7280]">Check-out</span>
                            <p className="font-semibold">{new Date(booking.checkOut).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-[#6b7280]">Total</span>
                            <p className="font-semibold text-[#8A6B52]">KES {booking.total.toLocaleString()}</p>
                          </div>
                        </div>
                        {booking.promoCode && (
                          <div className="mt-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              Promo: {booking.promoCode.code}
                            </span>
                          </div>
                        )}

                        {/* Post-stay review */}
                        {booking.review ? (
                          <div className="mt-5 pt-5 border-t border-[#D9D9D9]">
                            <p className="text-sm font-semibold text-[#203565] mb-1">{t('profile.yourRating')}</p>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className={`w-5 h-5 ${star <= booking.review.rating ? 'text-[#8A6B52]' : 'text-[#D9D9D9]'}`} fill="currentColor" aria-hidden="true" />
                              ))}
                              <span className="ml-2 text-xs text-green-600 font-medium">{t('profile.thanksFeedback')}</span>
                            </div>
                          </div>
                        ) : isStayCompleted(booking) ? (
                          <div className="mt-5 pt-5 border-t border-[#D9D9D9]">
                            <p className="text-sm font-semibold text-[#203565] mb-2">{t('profile.rateYourStay')}</p>
                            <div className="flex items-center gap-1 mb-3">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const current = reviewForms[booking.id]?.rating || 0;
                                return (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setReviewField(booking.id, 'rating', star)}
                                    className="p-0.5 transition-transform hover:scale-110"
                                    aria-label={t(star > 1 ? 'a11y2.starOther' : 'a11y2.starOne', { count: star })}
                                  >
                                    <Star className={`w-7 h-7 ${star <= current ? 'text-[#8A6B52]' : 'text-[#D9D9D9]'}`} fill="currentColor" aria-hidden="true" />
                                  </button>
                                );
                              })}
                            </div>
                            <div className="mb-3 grid gap-2 sm:grid-cols-3">
                              {[['cleanlinessRating', 'Cleanliness'], ['locationRating', 'Location'], ['valueRating', 'Value']].map(([field, label]) => (
                                <label key={field} className="text-xs font-semibold text-[#6b7280]">
                                  {label} (optional)
                                  <SelectMenu
                                    value={String(reviewForms[booking.id]?.[field] || '')}
                                    onChange={(next) => setReviewField(booking.id, field, Number(next) || 0)}
                                    options={SUB_SCORE_OPTIONS}
                                    ariaLabel={t('a11y2.ratingOptional', { label })}
                                  />
                                </label>
                              ))}
                            </div>
                            <label className="block text-xs font-semibold text-[#6b7280] mb-2">
                              {t('profile.howSatisfied')}
                            </label>
                            <div className="flex items-center gap-3 mb-4">
                              {[
                                { key: 'happy', emoji: '😊', label: 'Happy', color: 'bg-green-100 border-green-300 text-green-700' },
                                { key: 'neutral', emoji: '😐', label: 'Neutral', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
                                { key: 'unhappy', emoji: '😞', label: 'Unhappy', color: 'bg-red-100 border-red-300 text-red-700' },
                              ].map(({ key, emoji, label, color }) => {
                                const current = reviewForms[booking.id]?.satisfaction;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => setReviewField(booking.id, 'satisfaction', key)}
                                    className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                                      current === key
                                        ? color
                                        : 'border-[#D9D9D9] text-[#6b7280] hover:border-[#C5A28C]'
                                    }`}
                                  >
                                    <span className="text-2xl">{emoji}</span>
                                    <span className="text-xs">{label}</span>
                                  </button>
                                );
                              })}
                            </div>
                            <label className="block text-xs font-semibold text-[#6b7280] mb-1">
                              {t('profile.publicReview')} <span className="font-normal">(shown on the property page)</span>
                            </label>
                            <textarea
                              value={reviewForms[booking.id]?.publicComment || ''}
                              onChange={(e) => setReviewField(booking.id, 'publicComment', e.target.value)}
                              placeholder={t('a11y2.publicReviewPlaceholder')}
                              maxLength={1000}
                              className="neu-input w-full px-4 py-3 focus:outline-none bg-elevated text-[#1f2937] placeholder-[#6b7280] h-20 resize-none text-sm mb-4"
                            />
                            <label className="block text-xs font-semibold text-[#6b7280] mb-1">
                              {t('profile.privateNoteToZuri')} <span className="font-normal">(only our team sees this)</span>
                            </label>
                            <textarea
                              value={reviewForms[booking.id]?.privateNote || ''}
                              onChange={(e) => setReviewField(booking.id, 'privateNote', e.target.value)}
                              placeholder={t('a11y2.privateNotePlaceholder')}
                              maxLength={2000}
                              className="neu-input w-full px-4 py-3 focus:outline-none bg-elevated text-[#1f2937] placeholder-[#6b7280] h-20 resize-none text-sm"
                            />
                            {reviewForms[booking.id]?.error && (
                              <p className="text-red-500 text-xs mt-1">{reviewForms[booking.id].error}</p>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSubmitReview(booking.id)}
                              disabled={reviewForms[booking.id]?.submitting}
                              className="mt-3 bg-[#143A80] text-white font-semibold px-5 py-2 rounded-full text-sm hover:bg-[#0B2A5E] transition-all duration-200 disabled:opacity-50"
                            >
                              {reviewForms[booking.id]?.submitting ? 'Submitting...' : 'Submit Review'}
                            </button>
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
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#8A6B52] hover:text-[#203565] transition-colors"
                  >
                    {t('profile.viewAllBookings')}
                    <ChevronRight className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                  </Link>
                </div>
              )}

              {/* The other half of a two-way review: what hosts said about this
                  person. Read only, and public only - the payload carries no
                  private note, so nothing here can show one. Stars are icons with
                  the rating beside them as text, so a screen reader reads a
                  number instead of "star star star". */}
              <section className="pt-8 border-t-2 border-[#D9D9D9]" aria-labelledby="profile-reviews-about-you">
                <h3 id="profile-reviews-about-you" className="text-lg font-bold text-[#203565] mb-1">
                  {t('profile.reviewsAboutYou')}
                </h3>
                <p className="text-sm text-[#6b7280] mb-5">{t('profile.reviewsAboutYouHint')}</p>

                {guestReviewsFailed && (
                  <p className="text-sm text-[#6b7280]">{t('profile.reviewsAboutYouFailed')}</p>
                )}

                {!guestReviewsFailed && guestReviews && receivedReviewCount === 0 && (
                  <p className="text-sm text-[#6b7280]">{t('profile.noReviewsAboutYou')}</p>
                )}

                {!guestReviewsFailed && receivedReviewCount > 0 && (
                  <>
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= Math.round(receivedAverage) ? 'text-[#8A6B52]' : 'text-[#D9D9D9]'}`}
                            fill="currentColor"
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                      <span className="text-lg font-bold text-[#203565]">{receivedAverage.toFixed(1)}</span>
                      <span className="text-sm text-[#6b7280]">
                        {t(receivedReviewCount === 1
                          ? 'profile.reviewsAboutYouCount_one'
                          : 'profile.reviewsAboutYouCount_other', { count: receivedReviewCount })}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {receivedReviews.map((review) => {
                        const rating = Number(review.rating) || 0;
                        const author = reviewAuthorName(review.host);
                        const date = new Date(review.createdAt).toLocaleDateString();
                        return (
                          <article key={review.id} className="neu-card p-5">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${star <= rating ? 'text-[#8A6B52]' : 'text-[#D9D9D9]'}`}
                                  fill="currentColor"
                                  aria-hidden="true"
                                />
                              ))}
                              <span className="ml-2 text-sm font-semibold text-[#1f2937]">{rating.toFixed(1)}</span>
                            </div>
                            {review.publicComment && (
                              <p className="mt-2 text-sm leading-relaxed text-[#1f2937]">{review.publicComment}</p>
                            )}
                            <p className="mt-3 text-xs text-[#6b7280]">
                              {author ? `${author}, ${date}` : date}
                            </p>
                          </article>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            </div>
          )}

          {/* Favourites Tab */}
          {activeTab === 'favorites' && (
            <div className="mt-1.5">
              {favorites.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#D9D9D9] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-[#6b7280]" strokeWidth={2} aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-bold text-[#203565] mb-1">{t('profile.noFavouritesYet')}</h3>
                  <p className="text-[#6b7280] mb-4">{t('profile.tapHeartHint')}</p>
                  <Link to="/stays" className="inline-block bg-[#143A80] text-white px-6 py-2.5 rounded-full font-semibold hover:bg-[#0B2A5E] transition-all duration-200">
                    {t('profile.browseProperties')}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
