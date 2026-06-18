import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AvailabilityCalendar from '../components/AvailabilityCalendar.jsx';
import Dropdown from '../components/Dropdown.jsx';
import apiClient from '../api/client.js';

const COUNTRY_CODES = [
  { code: 'KE', name: 'Kenya', dial: '+254', length: 9, example: '712 345 678' },
  { code: 'UG', name: 'Uganda', dial: '+256', length: 9, example: '712 345 678' },
  { code: 'TZ', name: 'Tanzania', dial: '+255', length: 9, example: '712 345 678' },
  { code: 'RW', name: 'Rwanda', dial: '+250', length: 9, example: '712 345 678' },
  { code: 'US', name: 'United States', dial: '+1', length: 10, example: '212 555 1234' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', length: 10, example: '7123 456 789' },
  { code: 'ZA', name: 'South Africa', dial: '+27', length: 9, example: '71 234 5678' },
  { code: 'NG', name: 'Nigeria', dial: '+234', length: 10, example: '712 345 6789' },
  { code: 'AE', name: 'UAE', dial: '+971', length: 9, example: '50 123 4567' },
  { code: 'IN', name: 'India', dial: '+91', length: 10, example: '71234 56789' },
  { code: 'DE', name: 'Germany', dial: '+49', length: 11, example: '151 234 56789' },
  { code: 'FR', name: 'France', dial: '+33', length: 9, example: '6 12 34 56 78' },
  { code: 'CN', name: 'China', dial: '+86', length: 11, example: '131 2345 6789' },
  { code: 'CA', name: 'Canada', dial: '+1', length: 10, example: '416 555 1234' },
];

function validatePhone(raw, country) {
  if (!raw || !country) return { clean: '', valid: false };
  let digits = raw.replace(/\D/g, '');
  const dialDigits = country.dial.replace(/\D/g, '');
  if (digits.startsWith(dialDigits)) {
    digits = digits.slice(dialDigits.length);
  } else if (digits.startsWith('00')) {
    const without00 = digits.slice(2);
    if (without00.startsWith(dialDigits)) {
      digits = without00.slice(dialDigits.length);
    }
  }
  return { clean: digits, valid: digits.length === country.length };
}

function detectCountry(storedPhone) {
  if (!storedPhone) return { countryCode: 'KE', phoneNumber: '' };
  const digits = storedPhone.replace(/\D/g, '');
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    const dialDigits = c.dial.replace(/\D/g, '');
    if (digits.startsWith(dialDigits)) {
      return { countryCode: c.code, phoneNumber: digits.slice(dialDigits.length) };
    }
  }
  return { countryCode: 'KE', phoneNumber: digits };
}

function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlVariant = searchParams.get('variant'); // '1bed' | '2bed' | null
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Property from API
  const [property, setProperty] = useState(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [unavailableRanges, setUnavailableRanges] = useState([]);

  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);

  // Bed option driven by URL variant (from property card click)
  // Properties define their own 1-bed / 2-bed prices via price1Bed / price2Bed
  const [bedOption, setBedOption] = useState(urlVariant);
  const EXTRA_GUEST_FEE = 800;

  // Standard stay times. Check-in from 3:00 PM, check-out by 10:00 AM.
  // A later check-out doubles each hour past 10:00 AM, reaching one full
  // night's price at 5 hours late and capping there.
  const STANDARD_CHECK_IN = '15:00';
  const STANDARD_CHECK_OUT = '10:00';
  const LATE_CHECKOUT_FULL_NIGHT_HOURS = 5;
  // Selectable check-out times: 10 AM (standard) through 6 PM.
  const CHECK_OUT_OPTIONS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  // Calibrated doubling: 1h = night/16, 2h = night/8 ... 5h+ = full night.
  const calcLateCheckoutFee = (time, nightlyPrice) => {
    if (!time || !nightlyPrice) return 0;
    const [h, m] = time.split(':').map(Number);
    const minutes = h * 60 + (m || 0);
    const standard = 10 * 60; // 10:00 AM
    if (minutes <= standard) return 0;
    const hoursLate = Math.ceil((minutes - standard) / 60);
    const capped = Math.min(hoursLate, LATE_CHECKOUT_FULL_NIGHT_HOURS);
    return Math.round(nightlyPrice * Math.pow(2, capped - LATE_CHECKOUT_FULL_NIGHT_HOURS));
  };

  const formatTime12h = (time) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
  };

  // Form states
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 2,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: '',
    checkInTime: STANDARD_CHECK_IN,
    checkOutTime: STANDARD_CHECK_OUT,
    paymentMethod: 'card',
  });
  const [phoneCountryCode, setPhoneCountryCode] = useState('KE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Extra guests beyond the account holder; length is kept at (guests - 1)
  const [additionalGuests, setAdditionalGuests] = useState([{ firstName: '', lastName: '' }]);

  // Set the headcount and resize the additional-guest forms to match (guests - 1)
  const setGuestCount = (count) => {
    const n = Math.max(1, Math.min(6, count)); // 6 is the global hard cap
    setBookingData((prev) => ({ ...prev, guests: n }));
    setAdditionalGuests((prev) => {
      const next = prev.slice(0, n - 1);
      while (next.length < n - 1) next.push({ firstName: '', lastName: '' });
      return next;
    });
  };

  const updateAdditionalGuest = (index, field, value) => {
    setAdditionalGuests((prev) => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)));
  };

  const addGuest = () => {
    setBookingData((prev) => {
      const next = Math.min(maxGuests, prev.guests + 1);
      return { ...prev, guests: next };
    });
    setAdditionalGuests((prev) => {
      if (prev.length >= maxGuests - 1) return prev;
      return [...prev, { firstName: '', lastName: '' }];
    });
  };

  const removeGuest = (index) => {
    setAdditionalGuests((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setBookingData((bd) => ({ ...bd, guests: next.length + 1 }));
      return next;
    });
  };

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await apiClient.get('/users/profile');
        const p = res.data.data || {};
        // Auto-fill the primary guest from the account, but only fields the
        // user hasn't already typed into (so their edits are never clobbered).
        const storedPhone = p.phone || '';
        const { countryCode: cc, phoneNumber: pn } = detectCountry(storedPhone);
        setBookingData((prev) => ({
          ...prev,
          firstName: prev.firstName || p.firstName || '',
          lastName: prev.lastName || p.lastName || '',
          email: prev.email || p.email || '',
          phone: storedPhone,
        }));
        if (!prev.phone) {
          setPhoneCountryCode(cc);
          setPhoneNumber(pn);
        }
      } catch {
        // not fatal — user can fill the fields manually
      }
    }
    fetchProfile();

    async function fetchProperty() {
      try {
        const res = await apiClient.get(`/properties/${id}`);
        const prop = res.data.data;
        setProperty(prop);
        // Only auto-set bed option if no URL variant was provided
        if (!urlVariant) {
          if (prop.price1Bed != null) {
            setBedOption('1bed');
          } else if (prop.price2Bed != null) {
            setBedOption('2bed');
          } else {
            setBedOption('1bed');
          }
        }
      } catch {
        // fallback
      } finally {
        setLoadingProperty(false);
      }
    }
    fetchProperty();

    apiClient
      .get(`/properties/${id}/availability`)
      .then((r) => setUnavailableRanges(r.data.data || []))
      .catch(() => { /* calendar still works, just nothing disabled */ });
  }, [id]);

  // Calculate nights and total
  const calculateNights = () => {
    if (!bookingData.checkIn || !bookingData.checkOut) return 0;
    const checkIn = new Date(bookingData.checkIn);
    const checkOut = new Date(bookingData.checkOut);
    const diffTime = checkOut - checkIn;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const nights = calculateNights();
  // Derive price and guest limits from the property's bed-specific pricing
  const propertyPrice = bedOption === '2bed'
    ? (property?.price2Bed ?? property?.price ?? 0)
    : (property?.price1Bed ?? property?.price ?? 0);
  const baseGuests = bedOption === '2bed' ? 4 : 2;   // guests included in base price
  const maxGuests  = bedOption === '2bed' ? 6 : 4;   // hard cap for this variant
  const subtotal = nights * propertyPrice;
  const extraGuests = Math.max(0, bookingData.guests - baseGuests);
  const extraGuestFee = extraGuests * EXTRA_GUEST_FEE * nights;
  const cleaningFee = 1500;
  const serviceFee = Math.round(subtotal * 0.12);
  const lateCheckoutFee = calcLateCheckoutFee(bookingData.checkOutTime, propertyPrice);
  const discountAmount = promoResult?.discountAmount || 0;
  const total = subtotal + cleaningFee + serviceFee + extraGuestFee + lateCheckoutFee - discountAmount;
  const exceedingMax = bookingData.guests > maxGuests;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingData({ ...bookingData, [name]: value });
  };

  function handlePhoneChange(newCountryCode, newPhoneNumber) {
    setPhoneCountryCode(newCountryCode);
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
    // Also update bookingData so the combined value is available on submit
    const dial = country.dial;
    setBookingData((prev) => ({ ...prev, phone: newPhoneNumber ? dial + newPhoneNumber : '' }));
  }

  async function handleApplyPromo() {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    setPromoError('');
    setPromoResult(null);

    try {
      const res = await apiClient.post('/promo/validate', { code: promoCode.toUpperCase(), subtotal });
      setPromoResult(res.data.data);
    } catch (err) {
      setPromoError(err.response?.data?.error || 'Invalid promo code');
    } finally {
      setValidatingPromo(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setSubmitError('');

    try {
      const res = await apiClient.post('/bookings', {
        propertyId: id,
        bedOption,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        guests: bookingData.guests,
        checkInTime: bookingData.checkInTime || undefined,
        checkOutTime: bookingData.checkOutTime || undefined,
        specialRequests: bookingData.specialRequests || undefined,
        paymentMethod: bookingData.paymentMethod,
        promoCode: promoResult?.code || undefined,
        additionalGuests: additionalGuests.filter((g) => g.firstName.trim() || g.lastName.trim()),
      });

      const { paymentUrl } = res.data.data;

      if (paymentUrl) {
        // Redirect to Paystack checkout
        window.location.href = paymentUrl;
      } else {
        setSubmitError('Payment gateway unavailable. Please try again.');
        setIsProcessing(false);
      }
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Booking failed. Please try again.');
      setIsProcessing(false);
    }
  };

  // Step 1: Dates & Guests
  const renderStep1 = () => (
    <div className="space-y-6">
      <button
        onClick={() => navigate(`/property/${id}${urlVariant ? `?variant=${urlVariant}` : ''}`)}
        className="text-[#C49A6C] hover:text-[#0B0B45] font-medium flex items-center transition-colors"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to property
      </button>
      <h2 className="text-2xl font-bold text-[#0B0B45]">Select Dates & Guests</h2>
      
      <div>
        <label className="block text-sm font-semibold text-[#1f2937] mb-2">Select your dates *</label>
        <AvailabilityCalendar
          value={{ checkIn: bookingData.checkIn, checkOut: bookingData.checkOut }}
          onChange={({ checkIn, checkOut }) => setBookingData((prev) => ({ ...prev, checkIn, checkOut }))}
          unavailableRanges={unavailableRanges}
        />
        {(bookingData.checkIn || bookingData.checkOut) && (
          <div className="flex gap-4 mt-3">
            <div className="flex-1 neu-input px-4 py-2 bg-white">
              <span className="text-xs text-[#6b7280] block">Check-in</span>
              <span className="font-semibold text-[#0B0B45]">{bookingData.checkIn || '—'}</span>
            </div>
            <div className="flex-1 neu-input px-4 py-2 bg-white">
              <span className="text-xs text-[#6b7280] block">Check-out</span>
              <span className="font-semibold text-[#0B0B45]">{bookingData.checkOut || '—'}</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1f2937] mb-2">Number of Guests *</label>
        <Dropdown
          value={bookingData.guests}
          onChange={(v) => setGuestCount(Number(v))}
          options={Array.from({ length: maxGuests }, (_, i) => i + 1).map((num) => ({
            value: num,
            label: `${num} ${num === 1 ? 'guest' : 'guests'}`,
          }))}
          triggerClassName="neu-input w-full px-4 py-3 focus:outline-none transition-all bg-white text-[#1f2937] rounded-xl"
          ariaLabel="Number of guests"
        />
        {bedOption && (
          <p className="text-xs text-[#6b7280] mt-1">
            This apartment fits up to {maxGuests} guests ({baseGuests} included in the {bedOption === '2bed' ? '2-bed' : '1-bed'} rate). Each additional guest is KES {EXTRA_GUEST_FEE.toLocaleString()}/night.
            {bookingData.guests > baseGuests && (
              <span className="text-amber-600 font-medium"> {extraGuests} extra guest{extraGuests > 1 ? 's' : ''} &middot; +KES {(extraGuestFee).toLocaleString()}</span>
            )}
          </p>
        )}
        {bookingData.guests > maxGuests && (
          <p className="text-red-500 text-xs mt-1 font-semibold">Maximum {maxGuests} guests for this room type. Exceeding this is grounds for removal.</p>
        )}
        {!bedOption && (
          <p className="text-xs text-[#6b7280] mt-1">Select a bed option above to see guest limits.</p>
        )}
      </div>

      {/* Bed Option — shown as read-only since it was selected on the property card */}
      {bedOption && (
        <div className="bg-[#C49A6C]/10 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0B0B45]">
              {bedOption === '2bed' ? '2-Bed Configuration' : '1-Bed Configuration'}
            </p>
            <p className="text-xs text-[#6b7280]">
              Apartment fits up to {maxGuests} guests &middot; KES {propertyPrice.toLocaleString()}/night
            </p>
          </div>
          <span className="bg-[#C49A6C] text-white text-xs font-bold px-3 py-1 rounded-full">
            {bedOption === '2bed' ? '2 Bed' : '1 Bed'}
          </span>
        </div>
      )}

      {/* Standard times note */}
      <div className="bg-[#0B0B45]/5 rounded-xl p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-[#C49A6C] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-[#1f2937]">
          Standard <span className="font-semibold">check-in from 3:00 PM</span> and{' '}
          <span className="font-semibold">check-out by 10:00 AM</span>. A later check-out is available. The fee{' '}
          <span className="font-semibold">doubles each hour</span> past 10:00 AM, up to a{' '}
          <span className="font-semibold">full night after 5 hours</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#1f2937] mb-2">Estimated Check-in Time</label>
          <input
            type="time"
            name="checkInTime"
            value={bookingData.checkInTime}
            onChange={handleInputChange}
            className="date-input neu-input w-full px-4 py-3 focus:outline-none transition-all bg-white text-[#1f2937]"
          />
          <p className="text-xs text-[#6b7280] mt-1">From 3:00 PM</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#1f2937] mb-2">Check-out Time</label>
          <Dropdown
            value={bookingData.checkOutTime}
            onChange={(v) => setBookingData((prev) => ({ ...prev, checkOutTime: v }))}
            options={CHECK_OUT_OPTIONS.map((time) => {
              const fee = calcLateCheckoutFee(time, propertyPrice);
              return {
                value: time,
                label: `${formatTime12h(time)}${fee > 0 ? ` (+KES ${fee.toLocaleString()})` : ' (Standard)'}`,
              };
            })}
            triggerClassName="neu-input w-full px-4 py-3 focus:outline-none transition-all bg-white text-[#1f2937] rounded-xl"
            ariaLabel="Check-out time"
          />
          {lateCheckoutFee > 0 && (
            <p className="text-xs text-[#C49A6C] font-medium mt-1">
              Late check-out fee: KES {lateCheckoutFee.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {nights > 0 && (
        <div className="bg-[#C49A6C]/10 rounded-xl p-4">
          <p className="text-[#0B0B45] font-medium">
            {nights} {nights === 1 ? 'night' : 'nights'} selected
          </p>
          <p className="text-[#6b7280] text-sm">
            KES {propertyPrice.toLocaleString()} per night
          </p>
        </div>
      )}

      <button
        onClick={() => setStep(2)}
        disabled={!bookingData.checkIn || !bookingData.checkOut || nights <= 0 || !bedOption}
        className="w-full bg-[#0B0B45] text-white py-3 rounded-full font-semibold hover:bg-[#0B0B45]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );

  // Step 2: Guest Details
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <button
          onClick={() => setStep(1)}
          className="text-[#C49A6C] hover:text-[#0B0B45] font-medium flex items-center transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[#0B0B45]">Guest Information</h2>
        <p className="text-sm text-[#6b7280] mt-1">Pre-filled from your account. Edit anything that's changed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#1f2937] mb-2">First Name *</label>
          <input
            type="text"
            name="firstName"
            value={bookingData.firstName}
            onChange={handleInputChange}
            placeholder="John"
            className="neu-input w-full px-4 py-3 focus:outline-none transition-all bg-white text-[#1f2937] placeholder-[#6b7280]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#1f2937] mb-2">Last Name *</label>
          <input
            type="text"
            name="lastName"
            value={bookingData.lastName}
            onChange={handleInputChange}
            placeholder="Doe"
            className="neu-input w-full px-4 py-3 focus:outline-none transition-all bg-white text-[#1f2937] placeholder-[#6b7280]"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1f2937] mb-2">Email *</label>
        <input
          type="email"
          name="email"
          value={bookingData.email}
          onChange={handleInputChange}
          placeholder="john@example.com"
          className="neu-input w-full px-4 py-3 focus:outline-none transition-all bg-white text-[#1f2937] placeholder-[#6b7280]"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1f2937] mb-2">Phone Number *</label>
        <div className="flex gap-2">
          <Dropdown
            value={phoneCountryCode}
            onChange={(val) => handlePhoneChange(val, phoneNumber)}
            options={COUNTRY_CODES.map((c) => ({ value: c.code, label: c.dial }))}
            triggerClassName="neu-input px-3 py-3 bg-white text-[#1f2937] rounded-xl w-[120px] flex-shrink-0"
            ariaLabel="Select country code"
          />
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(phoneCountryCode, e.target.value.replace(/\D/g, ''))}
            maxLength={15}
            placeholder={COUNTRY_CODES.find((c) => c.code === phoneCountryCode)?.example || ''}
            className="neu-input flex-1 px-4 py-3 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280] rounded-xl"
            required
          />
        </div>
        {phoneError && (
          <p className="text-red-500 text-xs mt-1">{phoneError}</p>
        )}
      </div>

      {/* Additional guests — one form per extra person in the party */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-semibold text-[#1f2937]">
            Additional Guests {additionalGuests.length > 0 && `(${additionalGuests.length})`}
          </label>
          <button
            type="button"
            onClick={addGuest}
            disabled={bookingData.guests >= maxGuests}
            className="text-sm font-semibold text-[#C49A6C] hover:text-[#0B0B45] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add guest
          </button>
        </div>
        <p className="text-xs text-[#6b7280] mb-3">
          You're booking for {bookingData.guests} {bookingData.guests === 1 ? 'guest' : 'guests'}. Add the names of anyone staying with you.
        </p>

        {additionalGuests.length === 0 ? (
          <p className="text-sm text-[#6b7280] italic">Just you — add a guest if others are staying.</p>
        ) : (
          <div className="space-y-3">
            {additionalGuests.map((g, i) => (
              <div key={i} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#6b7280] mb-1">Guest {i + 2} first name</label>
                  <input
                    type="text"
                    value={g.firstName}
                    onChange={(e) => updateAdditionalGuest(i, 'firstName', e.target.value)}
                    placeholder="First name"
                    className="neu-input w-full px-4 py-2.5 focus:outline-none transition-all bg-white text-[#1f2937] placeholder-[#6b7280]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#6b7280] mb-1">Last name</label>
                  <input
                    type="text"
                    value={g.lastName}
                    onChange={(e) => updateAdditionalGuest(i, 'lastName', e.target.value)}
                    placeholder="Last name"
                    className="neu-input w-full px-4 py-2.5 focus:outline-none transition-all bg-white text-[#1f2937] placeholder-[#6b7280]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeGuest(i)}
                  className="mb-1 w-10 h-10 flex items-center justify-center rounded-xl text-[#6b7280] hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                  aria-label="Remove guest"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1f2937] mb-2">Special Requests</label>
        <textarea
          name="specialRequests"
          value={bookingData.specialRequests}
          onChange={handleInputChange}
          placeholder="Any special requirements or requests..."
          className="neu-input w-full px-4 py-3 focus:outline-none transition-all bg-white text-[#1f2937] placeholder-[#6b7280] h-24 resize-none"
        />
      </div>

      <button
        onClick={() => setStep(3)}
        disabled={!bookingData.firstName || !bookingData.lastName || !bookingData.email || !bookingData.phone}
        className="w-full bg-[#0B0B45] text-white py-3 rounded-full font-semibold hover:bg-[#0B0B45]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue to Payment
      </button>
    </div>
  );

  // Step 3: Payment
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <button
          onClick={() => setStep(2)}
          className="text-[#C49A6C] hover:text-[#0B0B45] font-medium flex items-center transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <h2 className="text-2xl font-bold text-[#0B0B45]">Payment</h2>

      <div className="space-y-3">
        <label className={`flex items-center p-4 cursor-pointer transition-all ${
          bookingData.paymentMethod === 'card' ? 'neu-radio-selected' : 'neu-radio-card'
        }`}>
          <input
            type="radio"
            name="paymentMethod"
            value="card"
            checked={bookingData.paymentMethod === 'card'}
            onChange={handleInputChange}
            className="w-5 h-5 text-[#C49A6C] focus:ring-[#C49A6C]"
          />
          <div className="ml-4 flex items-center flex-1">
            <svg className="w-8 h-8 text-[#0B0B45] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <div>
              <p className="font-semibold text-[#1f2937]">Credit/Debit Card</p>
              <p className="text-sm text-[#6b7280]">Pay securely with your card</p>
            </div>
          </div>
        </label>

        <label className={`flex items-center p-4 cursor-pointer transition-all ${
          bookingData.paymentMethod === 'mpesa' ? 'neu-radio-selected' : 'neu-radio-card'
        }`}>
          <input
            type="radio"
            name="paymentMethod"
            value="mpesa"
            checked={bookingData.paymentMethod === 'mpesa'}
            onChange={handleInputChange}
            className="w-5 h-5 text-[#C49A6C] focus:ring-[#C49A6C]"
          />
          <div className="ml-4 flex items-center flex-1">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <div>
              <p className="font-semibold text-[#1f2937]">M-Pesa</p>
              <p className="text-sm text-[#6b7280]">Pay with M-Pesa mobile money</p>
            </div>
          </div>
        </label>

        <label className={`flex items-center p-4 cursor-pointer transition-all ${
          bookingData.paymentMethod === 'bank' ? 'neu-radio-selected' : 'neu-radio-card'
        }`}>
          <input
            type="radio"
            name="paymentMethod"
            value="bank"
            checked={bookingData.paymentMethod === 'bank'}
            onChange={handleInputChange}
            className="w-5 h-5 text-[#C49A6C] focus:ring-[#C49A6C]"
          />
          <div className="ml-4 flex items-center flex-1">
            <svg className="w-8 h-8 text-[#0B0B45] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            <div>
              <p className="font-semibold text-[#1f2937]">Bank Transfer</p>
              <p className="text-sm text-[#6b7280]">Pay via bank transfer</p>
            </div>
          </div>
        </label>
      </div>

      {/* Promo Code */}
      <div className="mt-6">
        <label className="block text-sm font-semibold text-[#1f2937] mb-2">Promo Code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
            placeholder="Enter code"
            className="neu-input flex-1 px-4 py-3 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280] uppercase"
            disabled={!!promoResult}
          />
          {promoResult ? (
            <button
              type="button"
              onClick={() => { setPromoCode(''); setPromoResult(null); setPromoError(''); }}
              className="px-4 py-3 rounded-xl text-sm font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            >
              Applied ✓
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={validatingPromo || !promoCode.trim()}
              className="px-4 py-3 rounded-xl text-sm font-semibold bg-[#0B0B45] text-white hover:bg-[#06062a] transition-all duration-200 disabled:opacity-50"
            >
              {validatingPromo ? '...' : 'Apply'}
            </button>
          )}
        </div>
        {promoError && (
          <p className="text-red-500 text-xs mt-1">{promoError}</p>
        )}
        {promoResult && (
          <p className="text-green-600 text-xs mt-1">
            {promoResult.discountPercent}% off. KES {promoResult.discountAmount.toLocaleString()} saved!
          </p>
        )}
      </div>

      <div className="bg-[#D9D9D9] rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-[#1f2937]">
          <span>KES {propertyPrice.toLocaleString()} x {nights} nights</span>
          <span>KES {subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[#1f2937]">
          <span>Cleaning fee</span>
          <span>KES {cleaningFee.toLocaleString()}</span>
        </div>
        {extraGuestFee > 0 && (
          <div className="flex justify-between text-[#1f2937]">
            <span>Extra guest fee ({extraGuests} guest{extraGuests > 1 ? 's' : ''} x KES {EXTRA_GUEST_FEE.toLocaleString()} x {nights} nights)</span>
            <span>KES {extraGuestFee.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-[#1f2937]">
          <span>Service fee</span>
          <span>KES {serviceFee.toLocaleString()}</span>
        </div>
        {lateCheckoutFee > 0 && (
          <div className="flex justify-between text-[#1f2937]">
            <span>Late check-out ({formatTime12h(bookingData.checkOutTime)})</span>
            <span>KES {lateCheckoutFee.toLocaleString()}</span>
          </div>
        )}
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Promo discount</span>
            <span>-KES {discountAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="border-t border-[#0B0B45]/20 pt-2 flex justify-between font-bold text-[#0B0B45]">
          <span>Total</span>
          <span>KES {total.toLocaleString()}</span>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full bg-[#C49A6C] text-white py-4 rounded-full font-bold hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#0B0B45]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            `Pay KES ${total.toLocaleString()}`
          )}
        </button>
      </form>

      <p className="text-center text-sm text-[#6b7280]">
        By confirming, you agree to our terms and conditions
      </p>
    </div>
  );

  // Booking Complete
  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-24 pb-16 flex items-center justify-center min-h-[80vh]">
          <div className="max-w-md mx-auto px-6 text-center">
            <div className="w-24 h-24 bg-[#C49A6C]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[#0B0B45] mb-4">Booking Confirmed!</h1>
            <p className="text-[#6b7280] mb-6">
              Thank you for your booking. We have sent a confirmation email to {bookingData.email} with all the details.
            </p>
            <div className="bg-[#D9D9D9] rounded-2xl p-6 mb-6 text-left">
              <h3 className="font-bold text-[#0B0B45] mb-2">Booking Summary</h3>
              <p className="text-[#1f2937]">{property?.title}</p>
              <p className="text-[#6b7280] text-sm">{property?.location}</p>
              <div className="mt-3 pt-3 border-t border-[#0B0B45]/10">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b7280]">Check-in</span>
                  <span className="font-medium">{bookingData.checkIn}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[#6b7280]">Check-out</span>
                  <span className="font-medium">{bookingData.checkOut} · {formatTime12h(bookingData.checkOutTime)}</span>
                </div>
                {lateCheckoutFee > 0 && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-[#6b7280]">Late check-out fee</span>
                    <span className="font-medium">KES {lateCheckoutFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[#6b7280]">Guests</span>
                  <span className="font-medium">{bookingData.guests}</span>
                </div>
                <div className="flex justify-between font-bold text-[#0B0B45] mt-2 pt-2 border-t border-[#0B0B45]/10">
                  <span>Total Paid</span>
                  <span>KES {total.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-[#C49A6C] text-white py-3 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200"
              >
                Return to Home
              </button>
              <button
                onClick={() => window.print()}
                className="w-full border-2 border-[#0B0B45] text-[#0B0B45] py-3 rounded-full font-semibold hover:bg-[#0B0B45] hover:text-white transition-all duration-200"
              >
                Print Confirmation
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Loading state
  if (loadingProperty || !property) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#6b7280]">Loading property...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="pt-20 md:pt-24 pb-12 md:pb-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
          {/* Progress Steps */}
          <div className="max-w-md md:max-w-2xl mx-auto mb-8 md:mb-10">
            <div className="flex items-start justify-center">
              {[1, 2, 3].map((s, i) => (
                <div key={s} className="flex items-center">
                  {i > 0 && (
                    <div
                      className={`w-8 md:w-16 h-1 mx-1 md:mx-2 transition-colors ${
                        step > i ? 'bg-[#C49A6C]' : 'bg-[#D9D9D9]'
                      }`}
                    />
                  )}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                        step >= s
                          ? 'bg-[#C49A6C] text-white'
                          : 'bg-[#D9D9D9] text-[#6b7280]'
                      }`}
                    >
                      {s}
                    </div>
                    <span className="text-xs text-[#6b7280] mt-2 whitespace-nowrap">
                      {s === 1 ? 'Dates' : s === 2 ? 'Details' : 'Payment'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Left Column - Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-[#D9D9D9] p-5 md:p-8">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
              </div>
            </div>

            {/* Right Column - Property Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border border-[#D9D9D9] p-6 sticky top-24">
                <Link to={`/property/${property?.id}`} className="block">
                  <img
                    src={(property?.images?.[0] || '')}
                    alt={property?.title}
                    className="w-full h-48 object-cover rounded-xl mb-4"
                  />
                </Link>
                <h3 className="font-bold text-[#0B0B45] text-lg">{property?.title}</h3>
                {bedOption && (
                  <p className="text-sm text-[#C49A6C] font-medium mt-1">
                    {bedOption === '2bed' ? '2 Bed' : '1 Bed'} &middot; KES {propertyPrice.toLocaleString()}/night
                  </p>
                )}
                <div className="flex items-center text-[#6b7280] text-sm mt-1">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {property?.location}
                </div>
                
                <div className="flex items-center mt-2 space-x-4 text-sm">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-[#C49A6C] mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-medium">{property?.rating}</span>
                  </div>
                  <div className="flex items-center text-[#6b7280]">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {(bedOption ? (bedOption === '2bed' ? 2 : 1) : property?.bedrooms)} beds
                  </div>
                </div>

                {nights > 0 && (
                  <div className="mt-6 pt-6 border-t border-[#D9D9D9]">
                    <h4 className="font-semibold text-[#0B0B45] mb-3">Price Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-[#1f2937]">
                        <span>KES {propertyPrice.toLocaleString()} x {nights} nights</span>
                        <span>KES {subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[#1f2937]">
                        <span>Cleaning fee</span>
                        <span>KES {cleaningFee.toLocaleString()}</span>
                      </div>
                      {extraGuestFee > 0 && (
                        <div className="flex justify-between text-[#1f2937]">
                          <span>Extra guest fee ({extraGuests} x KES {EXTRA_GUEST_FEE.toLocaleString()} x {nights} nights)</span>
                          <span>KES {extraGuestFee.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[#1f2937]">
                        <span>Service fee</span>
                        <span>KES {serviceFee.toLocaleString()}</span>
                      </div>
                      {lateCheckoutFee > 0 && (
                        <div className="flex justify-between text-[#1f2937]">
                          <span>Late check-out</span>
                          <span>KES {lateCheckoutFee.toLocaleString()}</span>
                        </div>
                      )}
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Promo discount</span>
                          <span>-KES {discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-[#D9D9D9] flex justify-between font-bold text-[#0B0B45]">
                        <span>Total</span>
                        <span>KES {total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default BookingPage;
