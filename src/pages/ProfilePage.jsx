import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import Dropdown from '../components/Dropdown.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import apiClient from '../api/client.js';

import { COUNTRY_CODES, validatePhone, detectCountry } from '../utils/phone.js';

function ProfilePage() {
  const { user, setUser } = useAuth();
  const { favorites } = useFavorites();
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
  const [payoutFrequency, setPayoutFrequency] = useState('monthly');
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);

  // Per-booking review form state, keyed by booking id
  const [reviewForms, setReviewForms] = useState({});

  const isStayCompleted = (booking) =>
    booking.status !== 'CANCELLED' && new Date(booking.checkOut) < new Date();

  const setReviewField = (bookingId, field, value) => {
    setReviewForms((prev) => ({
      ...prev,
      [bookingId]: { rating: 0, privateNote: '', ...prev[bookingId], [field]: value, error: '' },
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
        satisfaction: form.satisfaction || undefined,
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

  async function handleBankSave(e) {
    e.preventDefault();
    if (!bankForm.bankName || !bankForm.bankAccountNo || !bankForm.bankCode) {
      setBankMessage('Please fill in all bank details');
      return;
    }
    setBankSaving(true);
    setBankMessage('');
    try {
      const res = await apiClient.put('/users/profile/bank', bankForm);
      setProfile((prev) => ({ ...prev, ...res.data.data }));
      setBankMessage('Bank details saved!');
    } catch (err) {
      setBankMessage(err.response?.data?.error || 'Failed to save bank details');
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

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <label className="relative cursor-pointer group">
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#D9D9D9]"
                  />
                ) : (
                  <div className="w-16 h-16 bg-[#C49A6C] rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {avatarUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
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
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-[#0B0B45]">
                  {profile?.firstName} {profile?.lastName}
                </h1>
                <p className="text-[#6b7280]">{profile?.email}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#D9D9D9] mb-8">
            {['info', 'bookings', 'favorites'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-[#C49A6C] text-[#0B0B45]'
                    : 'border-transparent text-[#6b7280] hover:text-[#0B0B45]'
                }`}
              >
                {tab === 'info' ? 'My Info' : tab === 'bookings' ? 'Booking History' : `Favourites${favorites.length ? ` (${favorites.length})` : ''}`}
              </button>
            ))}
          </div>

          {/* My Info Tab */}
          {activeTab === 'info' && (
            <div>
              {showCompletionBanner && (
                <div className="mb-6 bg-[#C49A6C]/10 border border-[#C49A6C] rounded-2xl p-5 flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#C49A6C] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-[#0B0B45] text-sm">Complete your profile</p>
                    <p className="text-sm text-[#6b7280] mt-1">Fill in your details below to get the most out of ZuriLofts.</p>
                  </div>
                </div>
              )}
              <div className="neu-card p-6">
                <h2 className="text-lg font-bold text-[#0B0B45] mb-6">Personal Information</h2>
                {message && (
                  <div className={`rounded-xl px-4 py-3 mb-4 text-sm ${
                    message.includes('success')
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {message}
                  </div>
                )}
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-2">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="neu-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-2">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="neu-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setEmailError(''); }}
                      className="neu-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937]"
                    />
                    {emailError && (
                      <p className="text-red-500 text-xs mt-1">{emailError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-2">Phone</label>
                    <div className="flex gap-2">
                      <Dropdown
                        value={countryCode}
                        onChange={(val) => handlePhoneChange(val, phoneNumber)}
                        options={COUNTRY_CODES.map((c) => ({ value: c.code, label: c.dial }))}
                        triggerClassName="neu-input px-3 py-3 bg-white text-[#1f2937] rounded-xl w-[120px] flex-shrink-0"
                        ariaLabel="Select country code"
                      />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(countryCode, e.target.value.replace(/\D/g, ''))}
                        maxLength={15}
                        placeholder={COUNTRY_CODES.find((c) => c.code === countryCode)?.example || ''}
                        className="neu-input flex-1 px-4 py-3 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280] rounded-xl"
                      />
                    </div>
                    {phoneError && (
                      <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#C49A6C] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Payout Settings — HOST only */}
          {activeTab === 'info' && profile?.role === 'HOST' && (
            <div className="mt-10 pt-8 border-t-2 border-[#D9D9D9]">
              <h3 className="text-xl font-bold text-[#0B0B45] mb-1">Payout Settings</h3>
              <p className="text-sm text-[#6b7280] mb-6">
                Your earnings are held in your wallet and paid out on your chosen schedule. WHT (5%) is automatically deducted and remitted to KRA.
              </p>

              {/* Bank Account Section */}
              <form onSubmit={handleBankSave} className="space-y-4 mb-8">
                <h4 className="font-semibold text-[#1f2937]">Bank Account</h4>

                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-2">Bank Name *</label>
                  {banksLoading ? (
                    <p className="text-sm text-[#6b7280]">Loading banks...</p>
                  ) : banks.length > 0 ? (
                    <Dropdown
                      value={bankForm.bankCode}
                      onChange={(code) => {
                        const bank = banks.find((b) => b.code === code);
                        setBankForm((prev) => ({ ...prev, bankCode: code, bankName: bank?.name || '' }));
                      }}
                      options={banks.map((b) => ({ value: b.code, label: b.name }))}
                      triggerClassName="neu-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937] rounded-xl"
                      ariaLabel="Select your bank"
                    />
                  ) : (
                    <input
                      type="text"
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm((prev) => ({ ...prev, bankName: e.target.value }))}
                      placeholder="e.g. KCB Bank"
                      className="neu-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-2">Account Number *</label>
                  <input
                    type="text"
                    value={bankForm.bankAccountNo}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, bankAccountNo: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    maxLength={10}
                    placeholder="10-digit account number"
                    className="neu-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={bankSaving}
                  className="bg-[#C49A6C] text-white font-semibold px-6 py-2.5 rounded-full hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50 text-sm"
                >
                  {bankSaving ? 'Saving...' : 'Save Bank Details'}
                </button>
              </form>

              {/* Payout Frequency */}
              <div className="space-y-3">
                <h4 className="font-semibold text-[#1f2937]">Payout Frequency</h4>
                <p className="text-xs text-[#6b7280]">Your accumulated earnings will be transferred to your bank account on this schedule.</p>
                <div className="flex items-center gap-3">
                  <Dropdown
                    value={payoutFrequency}
                    onChange={setPayoutFrequency}
                    options={[
                      { value: 'weekly', label: 'Weekly (every Monday)' },
                      { value: 'biweekly', label: 'Bi-Weekly (every other Monday)' },
                      { value: 'monthly', label: 'Monthly (1st of month)' },
                    ]}
                    triggerClassName="neu-input px-4 py-3 bg-white text-[#1f2937] rounded-xl w-64"
                    ariaLabel="Select payout frequency"
                  />
                  <button
                    type="button"
                    onClick={handleFrequencySave}
                    disabled={bankSaving}
                    className="bg-[#0B0B45] text-white font-semibold px-4 py-2.5 rounded-full hover:bg-[#06062a] transition-all duration-200 disabled:opacity-50 text-sm"
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
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#D9D9D9] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[#0B0B45] mb-1">No bookings yet</h3>
                  <p className="text-[#6b7280]">Your upcoming stays will appear here.</p>
                </div>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="neu-card p-6">
                    <div className="flex flex-col md:flex-row gap-4">
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
                            <h3 className="font-bold text-[#0B0B45]">{booking.property?.title}</h3>
                            <p className="text-sm text-[#6b7280]">{booking.property?.location}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[booking.status]}`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
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
                            <p className="font-semibold text-[#C49A6C]">KES {booking.total.toLocaleString()}</p>
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
                          <div className="mt-4 pt-4 border-t border-[#D9D9D9]">
                            <p className="text-sm font-semibold text-[#0B0B45] mb-1">Your rating</p>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-5 h-5 ${star <= booking.review.rating ? 'text-[#C49A6C]' : 'text-[#D9D9D9]'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                              <span className="ml-2 text-xs text-green-600 font-medium">Thanks for your feedback!</span>
                            </div>
                          </div>
                        ) : isStayCompleted(booking) ? (
                          <div className="mt-4 pt-4 border-t border-[#D9D9D9]">
                            <p className="text-sm font-semibold text-[#0B0B45] mb-2">Rate your stay</p>
                            <div className="flex items-center gap-1 mb-3">
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
                                    <svg
                                      className={`w-7 h-7 ${star <= current ? 'text-[#C49A6C]' : 'text-[#D9D9D9]'}`}
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  </button>
                                );
                              })}
                            </div>
                            <label className="block text-xs font-semibold text-[#6b7280] mb-2">
                              How satisfied were you with your stay?
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
                                        : 'border-[#D9D9D9] text-[#6b7280] hover:border-[#C49A6C]'
                                    }`}
                                  >
                                    <span className="text-2xl">{emoji}</span>
                                    <span className="text-xs">{label}</span>
                                  </button>
                                );
                              })}
                            </div>
                            <label className="block text-xs font-semibold text-[#6b7280] mb-1">
                              Private note to the host (how can we improve?)
                            </label>
                            <textarea
                              value={reviewForms[booking.id]?.privateNote || ''}
                              onChange={(e) => setReviewField(booking.id, 'privateNote', e.target.value)}
                              placeholder="Only the ZuriLofts team will see this. Tell us what we could do better."
                              className="neu-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280] h-20 resize-none text-sm"
                            />
                            {reviewForms[booking.id]?.error && (
                              <p className="text-red-500 text-xs mt-1">{reviewForms[booking.id].error}</p>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSubmitReview(booking.id)}
                              disabled={reviewForms[booking.id]?.submitting}
                              className="mt-3 bg-[#C49A6C] text-white font-semibold px-5 py-2 rounded-full text-sm hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50"
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
            </div>
          )}

          {/* Favourites Tab */}
          {activeTab === 'favorites' && (
            <div>
              {favorites.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#D9D9D9] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[#0B0B45] mb-1">No favourites yet</h3>
                  <p className="text-[#6b7280] mb-4">Tap the heart on any property to save it here.</p>
                  <Link to="/properties" className="inline-block bg-[#C49A6C] text-white px-6 py-2.5 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200">
                    Browse properties
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favorites.map((property) => (
                    <Link key={property.id} to={`/property/${property.id}`} className="block">
                      <PropertyCard property={{
                        id: property.id,
                        image: property.images?.[0] || null,
                        title: property.title,
                        location: property.location,
                        price: property.price,
                        rating: property.rating,
                        bedrooms: property.bedrooms,
                        bathrooms: property.bathrooms,
                        area: property.area,
                        badge: property.featured ? 'Featured' : undefined,
                      }} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default ProfilePage;
