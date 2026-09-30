import { Fragment, useState, useEffect, useMemo } from 'react';
import { useLocation, useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Dropdown as FlowbiteDropdown, DropdownItem, Radio, Textarea, TextInput } from 'flowbite-react';
import { Check, ChevronLeft, Clock, CreditCard, House, Landmark, LoaderCircle, MapPin, Star, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import AvailabilityCalendar from '../components/AvailabilityCalendar.jsx';
import apiClient from '../api/client.js';
import logo from '../assets/zurilofts-logo.png';

import { COUNTRY_CODES, validatePhone, detectCountry } from '../utils/phone.js';

function CheckoutDropdown({ value, options, onChange, ariaLabel, className = '' }) {
  const selected = options.find((option) => String(option.value) === String(value));
  return (
    <FlowbiteDropdown
      inline
      theme={{ inlineWrapper: `op-checkout-select ${className}`.trim() }}
      label={<span className="op-checkout-select-value">{selected?.label ?? 'Select'}</span>}
      placement="bottom-start"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <DropdownItem key={option.value} onClick={() => onChange(option.value)}>
          <span className="flex w-full items-center justify-between gap-6">
            <span>{option.label}</span>
            {String(option.value) === String(value) && <Check className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
          </span>
        </DropdownItem>
      ))}
    </FlowbiteDropdown>
  );
}

function BookingPage() {
  const { id: routeId } = useParams();
  const { pathname } = useLocation();
  const id = routeId || pathname.split('/')[2];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlVariant = searchParams.get('variant'); // '1bed' | '2bed' | null
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingComplete] = useState(false);
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

  // Add-ons
  const [bookingId, setBookingId] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [availableAddOns, setAvailableAddOns] = useState([]);
  const [selectedAddOns, setSelectedAddOns] = useState([]); // { addOn, quantity }
  const [loadingAddOns, setLoadingAddOns] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [addOnsError, setAddOnsError] = useState('');
  const [pendingAddOnId, setPendingAddOnId] = useState(null); // guards double-submit

  // Bed option driven by URL variant (from property card click)
  // Properties define their own 1-bed / 2-bed prices via price1Bed / price2Bed
  const [bedOption, setBedOption] = useState(urlVariant);
  const EXTRA_GUEST_FEE = 800;

  // Standard stay times. Check-in from 3:00 PM, check-out by 10:00 AM.
  // A later check-out doubles each hour past 10:00 AM: 1h = ¼ night,
  // 2h = ½ night, 3h = 1 full extra night. Capped at 3 hours (1:00 PM).
  const STANDARD_CHECK_IN = '15:00';
  const STANDARD_CHECK_OUT = '10:00';
  const LATE_CHECKOUT_FULL_NIGHT_HOURS = 3;
  // Maximum late check-out capped at 3 hours past standard (1:00 PM).
  const CHECK_OUT_OPTIONS = ['10:00', '11:00', '12:00', '13:00'];

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
      const next = Math.min(pricing.maxGuests, prev.guests + 1);
      return { ...prev, guests: next };
    });
    setAdditionalGuests((prev) => {
      if (prev.length >= pricing.maxGuests - 1) return prev;
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
        if (!storedPhone) {
          setPhoneCountryCode(cc);
          setPhoneNumber(pn);
        }
      } catch {
        // not fatal - user can fill the fields manually
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
  }, [id, urlVariant]);

  // ── Cost calculations (memoised - expensive enough to matter on every date pick / guest toggle) ──
  const pricing = useMemo(() => {
    const nights = (() => {
      if (!bookingData.checkIn || !bookingData.checkOut) return 0;
      const diff = new Date(bookingData.checkOut) - new Date(bookingData.checkIn);
      return Math.max(0, Math.ceil(diff / 86_400_000));
    })();

    const propertyPrice = bedOption === '2bed'
      ? (property?.price2Bed ?? property?.price ?? 0)
      : (property?.price1Bed ?? property?.price ?? 0);
    const baseGuests = bedOption === '2bed' ? 4 : 2;
    const maxGuests  = bedOption === '2bed' ? 6 : 4;
    const subtotal    = nights * propertyPrice;
    const extraGuests = Math.max(0, bookingData.guests - baseGuests);
    const extraGuestFee = extraGuests * EXTRA_GUEST_FEE * nights;
    const cleaningFee    = 1500;
    const serviceFee     = Math.round(subtotal * 0.12);
    const lateCheckoutFee = calcLateCheckoutFee(bookingData.checkOutTime, propertyPrice);
    const discountAmount  = promoResult?.discountAmount || 0;
    const addOnsTotal = selectedAddOns.reduce((sum, item) => sum + (item.quantity * (item.addOn.price || 0)), 0);
    const total = subtotal + cleaningFee + serviceFee + extraGuestFee + lateCheckoutFee - discountAmount + addOnsTotal;

    return { nights, propertyPrice, baseGuests, maxGuests, subtotal, extraGuests, extraGuestFee, cleaningFee, serviceFee, lateCheckoutFee, discountAmount, addOnsTotal, total };
  }, [bookingData.checkIn, bookingData.checkOut, bookingData.guests, bookingData.checkOutTime, bedOption, property, promoResult, selectedAddOns]);
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
      const res = await apiClient.post('/promo/validate', { code: promoCode.toUpperCase(), subtotal: pricing.subtotal });
      setPromoResult(res.data.data);
    } catch (err) {
      setPromoError(err.response?.data?.error || 'Invalid promo code');
    } finally {
      setValidatingPromo(false);
    }
  }

  // Create the booking (returns a booking id + payment URL) so add-ons can be
  // attached to it. Called when the user advances from guest details to the
  // add-ons step. Guarded so it only runs once per flow.
  async function ensureBooking() {
    if (bookingId) return bookingId;
    if (creatingBooking) return null;
    setCreatingBooking(true);
    setAddOnsError('');
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
      const createdId = res.data.data.booking?.id || null;
      setBookingId(createdId);
      setPaymentUrl(res.data.data.paymentUrl || null);
      return createdId;
    } catch (err) {
      setAddOnsError(err.response?.data?.error || 'Could not start your booking. Please try again.');
      return null;
    } finally {
      setCreatingBooking(false);
    }
  }

  // Load the property's available add-ons and the booking's current selections.
  async function loadAddOns(bookingIdOverride) {
    const bid = bookingIdOverride || bookingId;
    setLoadingAddOns(true);
    setAddOnsError('');
    try {
      const [availRes, bookingRes] = await Promise.all([
        apiClient.get(`/properties/${id}/addons`),
        bid ? apiClient.get(`/bookings/${bid}/addons`) : Promise.resolve({ data: { data: [] } }),
      ]);
      const avail = Array.isArray(availRes.data.data) ? availRes.data.data : [];
      setAvailableAddOns(avail);
      const existing = Array.isArray(bookingRes.data.data) ? bookingRes.data.data : [];
      // Map existing booking add-ons (which include the addOn relation) into
      // the { addOn, quantity } shape used by the steppers.
      setSelectedAddOns(existing.map((item) => ({
        addOn: item.addOn || item,
        quantity: item.quantity || 0,
      })));
    } catch {
      setAddOnsError('Could not load add-ons. Please try again.');
    } finally {
      setLoadingAddOns(false);
    }
  }

  // Advance from guest details to the add-ons step, creating the booking first.
  async function goToAddOns() {
    const createdId = await ensureBooking();
    if (!createdId) return; // error already surfaced via addOnsError
    setStep(3);
    loadAddOns(createdId);
  }

  // Change the quantity of an add-on on the booking. 0 -> N is a POST, N -> M
  // (both > 0) is a PATCH, and N -> 0 is a DELETE. Never sends a price.
  async function changeAddOnQuantity(addOn, nextQty) {
    if (!bookingId || pendingAddOnId) return;
    const clamped = Math.max(0, Math.min(20, nextQty));
    const current = selectedAddOns.find((s) => s.addOn.id === addOn.id);
    const currentQty = current?.quantity || 0;

    // Optimistically update the UI, then reconcile with the server.
    setSelectedAddOns((prev) => {
      if (clamped === 0) return prev.filter((s) => s.addOn.id !== addOn.id);
      const exists = prev.some((s) => s.addOn.id === addOn.id);
      if (exists) return prev.map((s) => (s.addOn.id === addOn.id ? { ...s, quantity: clamped } : s));
      return [...prev, { addOn, quantity: clamped }];
    });

    setPendingAddOnId(addOn.id);
    setAddOnsError('');
    try {
      if (clamped === 0) {
        await apiClient.delete(`/bookings/${bookingId}/addons/${addOn.id}`);
      } else if (currentQty === 0) {
        await apiClient.post(`/bookings/${bookingId}/addons`, { addOnId: addOn.id, quantity: clamped });
      } else {
        await apiClient.patch(`/bookings/${bookingId}/addons/${addOn.id}`, { quantity: clamped });
      }
    } catch (err) {
      setAddOnsError(err.response?.data?.error || 'Could not update add-on. Please try again.');
      // Revert the optimistic update on failure.
      setSelectedAddOns((prev) => {
        if (currentQty === 0) return prev.filter((s) => s.addOn.id !== addOn.id);
        return prev.map((s) => (s.addOn.id === addOn.id ? { ...s, quantity: currentQty } : s));
      });
    } finally {
      setPendingAddOnId(null);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setSubmitError('');

    try {
      if (!paymentUrl) {
        // No booking created yet (e.g. user jumped straight to payment) - create
        // it now so we have a booking id and a payment URL to redirect to.
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
        setBookingId(res.data.data.booking?.id || null);
        setPaymentUrl(res.data.data.paymentUrl || null);
        if (res.data.data.paymentUrl) {
          window.location.href = res.data.data.paymentUrl;
          return;
        }
        setSubmitError('Payment gateway unavailable. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Booking already created during the add-ons step - just redirect to the
      // payment URL that was returned at creation time.
      window.location.href = paymentUrl;
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Booking failed. Please try again.');
      setIsProcessing(false);
    }
  };

  // Step 1: Dates & Guests
  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0B0B45]">Select your dates</h2>

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
              <span className="font-semibold text-[#0B0B45]">{bookingData.checkIn || '-'}</span>
            </div>
            <div className="flex-1 neu-input px-4 py-2 bg-white">
              <span className="text-xs text-[#6b7280] block">Check-out</span>
              <span className="font-semibold text-[#0B0B45]">{bookingData.checkOut || '-'}</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1f2937] mb-2">Number of Guests *</label>
        <CheckoutDropdown
          value={bookingData.guests}
          onChange={(v) => setGuestCount(Number(v))}
          options={Array.from({ length: pricing.maxGuests }, (_, i) => i + 1).map((num) => ({
            value: num,
            label: `${num} ${num === 1 ? 'guest' : 'guests'}`,
          }))}
          ariaLabel="Number of guests"
        />
        {bedOption && (
          <p className="text-xs text-[#6b7280] mt-1">
            This apartment fits up to {pricing.maxGuests} guests ({pricing.baseGuests} included in the {bedOption === '2bed' ? '2-bed' : '1-bed'} rate). Each additional guest is KES {EXTRA_GUEST_FEE.toLocaleString()}/night.
            {bookingData.guests > pricing.baseGuests && (
              <span className="text-amber-600 font-medium"> {pricing.extraGuests} extra guest{pricing.extraGuests > 1 ? 's' : ''} &middot; +KES {pricing.extraGuestFee.toLocaleString()}</span>
            )}
          </p>
        )}
        {bookingData.guests > pricing.maxGuests && (
          <p className="text-red-500 text-xs mt-1 font-semibold">Maximum {pricing.maxGuests} guests for this room type. Exceeding this is grounds for removal.</p>
        )}
        {!bedOption && (
          <p className="text-xs text-[#6b7280] mt-1">Select a bed option above to see guest limits.</p>
        )}
      </div>

      {/* Bed Option - shown as read-only since it was selected on the property card */}
      {bedOption && (
        <div className="bg-[#C49A6C]/10 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0B0B45]">
              {bedOption === '2bed' ? '2-Bed Configuration' : '1-Bed Configuration'}
            </p>
            <p className="text-xs text-[#6b7280]">
              Apartment fits up to {pricing.maxGuests} guests &middot; KES {pricing.propertyPrice.toLocaleString()}/night
            </p>
          </div>
          <span className="bg-[#C49A6C] text-white text-xs font-bold px-3 py-1 rounded-full">
            {bedOption === '2bed' ? '2 Bed' : '1 Bed'}
          </span>
        </div>
      )}

      {/* Standard times note */}
      <div className="bg-[#0B0B45]/5 rounded-xl p-4 flex items-start gap-3">
        <Clock className="w-5 h-5 text-[#C49A6C] flex-shrink-0 mt-0.5" strokeWidth={2} aria-hidden="true" />
        <p className="text-sm text-[#1f2937]">
          Standard <span className="font-semibold">check-in from 3:00 PM</span> and{' '}
          <span className="font-semibold">check-out by 10:00 AM</span>. You may extend up to{' '}
          <span className="font-semibold">1:00 PM (3 hours max)</span>. The fee{' '}
          <span className="font-semibold">doubles each hour</span> past 10:00 AM, reaching a{' '}
          <span className="font-semibold">full extra night at 3 hours</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#1f2937] mb-2">Estimated Check-in Time</label>
          <TextInput
            type="time"
            name="checkInTime"
            value={bookingData.checkInTime}
            onChange={handleInputChange}
            className="op-checkout-input"
            sizing="lg"
          />
          <p className="text-xs text-[#6b7280] mt-1">From 3:00 PM</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#1f2937] mb-2">Check-out Time</label>
          <CheckoutDropdown
            value={bookingData.checkOutTime}
            onChange={(v) => setBookingData((prev) => ({ ...prev, checkOutTime: v }))}
            options={CHECK_OUT_OPTIONS.map((time) => {
              const fee = calcLateCheckoutFee(time, pricing.propertyPrice);
              return {
                value: time,
                label: `${formatTime12h(time)}${fee > 0 ? ` (+KES ${fee.toLocaleString()})` : ' (Standard)'}`,
              };
            })}
            ariaLabel="Check-out time"
          />
          {pricing.lateCheckoutFee > 0 && (
            <p className="text-xs text-[#C49A6C] font-medium mt-1">
              Late check-out fee: KES {pricing.lateCheckoutFee.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {pricing.nights > 0 && (
        <div className="bg-[#C49A6C]/10 rounded-xl p-4">
          <p className="text-[#0B0B45] font-medium">
            {pricing.nights} {pricing.nights === 1 ? 'night' : 'nights'} selected
          </p>
          <p className="text-[#6b7280] text-sm">
            KES {pricing.propertyPrice.toLocaleString()} per night
          </p>
        </div>
      )}

      <Button
        onClick={() => setStep(2)}
        disabled={!bookingData.checkIn || !bookingData.checkOut || pricing.nights <= 0 || !bedOption}
        className="op-checkout-primary"
        pill
      >
        Continue
      </Button>
    </div>
  );

  // Step 2: Guest Details
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <Button
          type="button"
          onClick={() => setStep(1)}
          className="op-checkout-back-button"
          color="light"
        >
          <ChevronLeft className="w-5 h-5 mr-1" strokeWidth={2} aria-hidden="true" />
          Back
        </Button>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[#0B0B45]">Guest Information</h2>
        <p className="text-sm text-[#6b7280] mt-1">Pre-filled from your account. Edit anything that&apos;s changed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#1f2937] mb-2">First Name *</label>
          <TextInput
            type="text"
            name="firstName"
            value={bookingData.firstName}
            onChange={handleInputChange}
            placeholder="John"
            className="op-checkout-input"
            sizing="lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#1f2937] mb-2">Last Name *</label>
          <TextInput
            type="text"
            name="lastName"
            value={bookingData.lastName}
            onChange={handleInputChange}
            placeholder="Doe"
            className="op-checkout-input"
            sizing="lg"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1f2937] mb-2">Email *</label>
        <TextInput
          type="email"
          name="email"
          value={bookingData.email}
          onChange={handleInputChange}
          placeholder="john@example.com"
          className="op-checkout-input"
          sizing="lg"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1f2937] mb-2">Phone Number *</label>
        <div className="flex gap-2">
          <CheckoutDropdown
            value={phoneCountryCode}
            onChange={(val) => handlePhoneChange(val, phoneNumber)}
            options={COUNTRY_CODES.map((c) => ({ value: c.code, label: c.dial }))}
            ariaLabel="Select country code"
            className="op-checkout-country-code"
          />
          <TextInput
            type="tel"
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(phoneCountryCode, e.target.value.replace(/\D/g, ''))}
            maxLength={15}
            placeholder={COUNTRY_CODES.find((c) => c.code === phoneCountryCode)?.example || ''}
            className="op-checkout-input"
            sizing="lg"
            required
          />
        </div>
        {phoneError && (
          <p className="text-red-500 text-xs mt-1">{phoneError}</p>
        )}
      </div>

      {/* Additional guests - one form per extra person in the party */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-semibold text-[#1f2937]">
            Additional Guests {additionalGuests.length > 0 && `(${additionalGuests.length})`}
          </label>
          <button
            type="button"
            onClick={addGuest}
            disabled={bookingData.guests >= pricing.maxGuests}
            className="text-sm font-semibold text-[#C49A6C] hover:text-[#0B0B45] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add guest
          </button>
        </div>
        <p className="text-xs text-[#6b7280] mb-3">
          You&apos;re booking for {bookingData.guests} {bookingData.guests === 1 ? 'guest' : 'guests'}. Add the names of anyone staying with you.
        </p>

        {additionalGuests.length === 0 ? (
          <p className="text-sm text-[#6b7280] italic">Just you - add a guest if others are staying.</p>
        ) : (
          <div className="space-y-3">
            {additionalGuests.map((g, i) => (
              <div key={i} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#6b7280] mb-1">Guest {i + 2} first name</label>
                  <TextInput
                    type="text"
                    value={g.firstName}
                    onChange={(e) => updateAdditionalGuest(i, 'firstName', e.target.value)}
                    placeholder="First name"
                    className="op-checkout-input"
                    sizing="lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#6b7280] mb-1">Last name</label>
                  <TextInput
                    type="text"
                    value={g.lastName}
                    onChange={(e) => updateAdditionalGuest(i, 'lastName', e.target.value)}
                    placeholder="Last name"
                    className="op-checkout-input"
                    sizing="lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeGuest(i)}
                  className="mb-1 w-10 h-10 flex items-center justify-center rounded-xl text-[#6b7280] hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                  aria-label="Remove guest"
                >
                  <Trash2 className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1f2937] mb-2">Special Requests</label>
        <Textarea
          name="specialRequests"
          value={bookingData.specialRequests}
          onChange={handleInputChange}
          placeholder="Any special requirements or requests..."
          className="op-checkout-input"
          rows={4}
        />
      </div>

      <Button
        onClick={goToAddOns}
        disabled={!bookingData.firstName || !bookingData.lastName || !bookingData.email || !bookingData.phone || creatingBooking}
        className="op-checkout-primary"
        pill
      >
        {creatingBooking ? 'Starting your booking...' : 'Continue to Add-ons'}
      </Button>
    </div>
  );

  // Step 3: Add-ons
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <Button
          type="button"
          onClick={() => setStep(2)}
          className="op-checkout-back-button"
          color="light"
        >
          <ChevronLeft className="w-5 h-5 mr-1" strokeWidth={2} aria-hidden="true" />
          Back
        </Button>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[#0B0B45]">Enhance your stay</h2>
        <p className="text-sm text-[#6b7280] mt-1">
          Add optional services to your booking. You can change quantities any time before payment.
        </p>
      </div>

      {addOnsError && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">
          {addOnsError}
        </div>
      )}

      {loadingAddOns ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : availableAddOns.length === 0 ? (
        <div className="rounded-xl bg-[#F3E9DC] p-6 text-center">
          <p className="text-[#6b7280]">No add-ons are available for this property.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {availableAddOns.map((addOn) => {
            const selected = selectedAddOns.find((s) => s.addOn.id === addOn.id);
            const qty = selected?.quantity || 0;
            const subtotal = qty * (addOn.price || 0);
            const busy = pendingAddOnId === addOn.id;
            return (
              <div key={addOn.id} className="border border-[#D9D9D9] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#0B0B45]">{addOn.name}</h3>
                    <span className="bg-[#C49A6C]/10 text-[#0B0B45] text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
                      {addOn.category}
                    </span>
                  </div>
                  <p className="text-sm text-[#6b7280] mt-1">{addOn.description}</p>
                  <p className="text-sm font-semibold text-[#0B0B45] mt-1">
                    KES {addOn.price != null ? addOn.price.toLocaleString() : '-'} each
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeAddOnQuantity(addOn, qty - 1)}
                      disabled={busy || qty === 0}
                      className="w-9 h-9 rounded-full border border-[#D9D9D9] text-[#0B0B45] font-bold hover:border-[#C49A6C] hover:text-[#C49A6C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`Decrease ${addOn.name} quantity`}
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-semibold text-[#0B0B45]" aria-live="polite">
                      {busy ? '…' : qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeAddOnQuantity(addOn, qty + 1)}
                      disabled={busy || qty >= 20}
                      className="w-9 h-9 rounded-full border border-[#D9D9D9] text-[#0B0B45] font-bold hover:border-[#C49A6C] hover:text-[#C49A6C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`Increase ${addOn.name} quantity`}
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-[#0B0B45]">
                    {qty > 0 ? `KES ${subtotal.toLocaleString()}` : '-'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl bg-[#F3E9DC] p-4">
        <span className="font-semibold text-[#0B0B45]">Add-ons total</span>
        <span className="font-bold text-[#0B0B45]">KES {pricing.addOnsTotal.toLocaleString()}</span>
      </div>

      <Button
        onClick={() => setStep(4)}
        className="op-checkout-primary"
        pill
      >
        Continue to Payment
      </Button>
    </div>
  );

  // Step 4: Payment
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <Button
          type="button"
          onClick={() => setStep(3)}
          className="op-checkout-back-button"
          color="light"
        >
          <ChevronLeft className="w-5 h-5 mr-1" strokeWidth={2} aria-hidden="true" />
          Back
        </Button>
      </div>

      <h2 className="text-2xl font-bold text-[#0B0B45]">Payment</h2>

      <div className="space-y-3">
        <label className={`flex items-center p-4 cursor-pointer transition-all ${
          bookingData.paymentMethod === 'card' ? 'neu-radio-selected' : 'neu-radio-card'
        }`}>
          <Radio
            type="radio"
            name="paymentMethod"
            value="card"
            checked={bookingData.paymentMethod === 'card'}
            onChange={handleInputChange}
          />
          <div className="ml-4 flex items-center flex-1">
            <CreditCard className="w-8 h-8 text-[#0B0B45] mr-3" strokeWidth={1.5} aria-hidden="true" />
            <div>
              <p className="font-semibold text-[#1f2937]">Credit/Debit Card</p>
              <p className="text-sm text-[#6b7280]">Pay securely with your card</p>
            </div>
          </div>
        </label>

        <label className={`flex items-center p-4 cursor-pointer transition-all ${
          bookingData.paymentMethod === 'mpesa' ? 'neu-radio-selected' : 'neu-radio-card'
        }`}>
          <Radio
            type="radio"
            name="paymentMethod"
            value="mpesa"
            checked={bookingData.paymentMethod === 'mpesa'}
            onChange={handleInputChange}
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
          <Radio
            type="radio"
            name="paymentMethod"
            value="bank"
            checked={bookingData.paymentMethod === 'bank'}
            onChange={handleInputChange}
          />
          <div className="ml-4 flex items-center flex-1">
            <Landmark className="w-8 h-8 text-[#0B0B45] mr-3" strokeWidth={1.5} aria-hidden="true" />
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
          <TextInput
            type="text"
            value={promoCode}
            onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
            placeholder="Enter code"
            className="op-checkout-input uppercase"
            sizing="lg"
            disabled={!!promoResult}
          />
          {promoResult ? (
            <Button
              type="button"
              onClick={() => { setPromoCode(''); setPromoResult(null); setPromoError(''); }}
              className="op-checkout-success"
            >
              Applied ✓
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleApplyPromo}
              disabled={validatingPromo || !promoCode.trim()}
              className="op-checkout-primary op-checkout-promo-apply"
            >
              {validatingPromo ? '...' : 'Apply'}
            </Button>
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

      <div className="space-y-2 rounded-xl bg-[#F7F4EF] p-4">
        <div className="flex justify-between text-[#1f2937]">
          <span>KES {pricing.propertyPrice.toLocaleString()} x {pricing.nights} nights</span>
          <span>KES {pricing.subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[#1f2937]">
          <span>Cleaning fee</span>
          <span>KES {pricing.cleaningFee.toLocaleString()}</span>
        </div>
        {pricing.extraGuestFee > 0 && (
          <div className="flex justify-between text-[#1f2937]">
            <span>Extra guest fee ({pricing.extraGuests} guest{pricing.extraGuests > 1 ? 's' : ''} x KES {EXTRA_GUEST_FEE.toLocaleString()} x {pricing.nights} nights)</span>
            <span>KES {pricing.extraGuestFee.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-[#1f2937]">
          <span>Service fee</span>
          <span>KES {pricing.serviceFee.toLocaleString()}</span>
        </div>
        {selectedAddOns.map((item) => (
          <div key={item.addOn.id} className="flex justify-between text-[#1f2937]">
            <span>{item.addOn.name} x {item.quantity}</span>
            <span>KES {(item.quantity * (item.addOn.price || 0)).toLocaleString()}</span>
          </div>
        ))}
        {pricing.lateCheckoutFee > 0 && (
          <div className="flex justify-between text-[#1f2937]">
            <span>Late check-out ({formatTime12h(bookingData.checkOutTime)})</span>
            <span>KES {pricing.lateCheckoutFee.toLocaleString()}</span>
          </div>
        )}
        {pricing.discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Promo discount</span>
            <span>-KES {pricing.discountAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="border-t border-[#0B0B45]/20 pt-2 flex justify-between font-bold text-[#0B0B45]">
          <span>Total</span>
          <span>KES {pricing.total.toLocaleString()}</span>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Button
          type="submit"
          disabled={isProcessing}
          className="op-checkout-bronze"
          pill
        >
          {isProcessing ? (
            <>
              <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#0B0B45]" strokeWidth={2} aria-hidden="true" />
              Processing...
            </>
          ) : (
            `Pay KES ${pricing.total.toLocaleString()}`
          )}
        </Button>
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
              <Check className="w-12 h-12 text-[#C49A6C]" strokeWidth={2} aria-hidden="true" />
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
                {pricing.lateCheckoutFee > 0 && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-[#6b7280]">Late check-out fee</span>
                    <span className="font-medium">KES {pricing.lateCheckoutFee.toLocaleString()}</span>
                  </div>
                )}
                {selectedAddOns.map((item) => (
                  <div key={item.addOn.id} className="flex justify-between text-sm mt-1">
                    <span className="text-[#6b7280]">{item.addOn.name} x {item.quantity}</span>
                    <span className="font-medium">KES {(item.quantity * (item.addOn.price || 0)).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[#6b7280]">Guests</span>
                  <span className="font-medium">{bookingData.guests}</span>
                </div>
                <div className="flex justify-between font-bold text-[#0B0B45] mt-2 pt-2 border-t border-[#0B0B45]/10">
                  <span>Total Paid</span>
                  <span>KES {pricing.total.toLocaleString()}</span>
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
      </div>
    );
  }

  return (
    <div className="op-checkout-screen min-h-screen bg-white">
      <header className="op-checkout-chrome"><Link to={`/property/${property.id}`} className="op-checkout-back">← &nbsp;Back</Link><Link to="/" className="op-checkout-brand"><img src={logo} alt="" />ZuriLofts</Link><span className="op-checkout-secure">♟ &nbsp;Secure checkout</span></header>
      <div className="op-checkout-summary"><div><strong>{property.title}</strong><span>{bookingData.checkIn && bookingData.checkOut ? `${bookingData.checkIn} - ${bookingData.checkOut}` : 'Choose your dates'} · {bookingData.guests} guests</span></div><strong>{pricing.nights > 0 ? `KSh ${pricing.total.toLocaleString()}` : 'Total at checkout'}</strong></div>
      <div className="op-checkout-main pb-12 md:pb-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
          {/* Progress Steps */}
          <div className="op-checkout-progress" aria-label="Checkout progress">
            {[1, 2, 4].map((s, i, steps) => (
              <Fragment key={s}>
                <div className="op-checkout-progress-step">
                  <div className={`op-checkout-progress-circle${step >= s ? ' is-active' : ''}`}>
                    {i + 1}
                  </div>
                  <span>{s === 1 ? 'Stay' : s === 2 ? 'Details' : 'Payment'}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`op-checkout-progress-line${step >= steps[i + 1] ? ' is-active' : ''}`} aria-hidden="true" />
                )}
              </Fragment>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Left Column - Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-[#D9D9D9] p-5 md:p-8">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
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
                    {bedOption === '2bed' ? '2 Bed' : '1 Bed'} &middot; KES {pricing.propertyPrice.toLocaleString()}/night
                  </p>
                )}
                <div className="flex items-center text-[#6b7280] text-sm mt-1">
                  <MapPin className="w-4 h-4 mr-1" strokeWidth={2} aria-hidden="true" />
                  {property?.location}
                </div>

                <div className="flex items-center mt-2 space-x-4 text-sm">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-[#C49A6C] mr-1" fill="currentColor" aria-hidden="true" />
                    <span className="font-medium">{property?.rating}</span>
                  </div>
                  <div className="flex items-center text-[#6b7280]">
                    <House className="w-4 h-4 mr-1" strokeWidth={2} aria-hidden="true" />
                    {(bedOption ? (bedOption === '2bed' ? 2 : 1) : property?.bedrooms)} beds
                  </div>
                </div>

                {pricing.nights > 0 && (
                  <div className="mt-6 pt-6 border-t border-[#D9D9D9]">
                    <h4 className="font-semibold text-[#0B0B45] mb-3">Price Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-[#1f2937]">
                        <span>KES {pricing.propertyPrice.toLocaleString()} x {pricing.nights} nights</span>
                        <span>KES {pricing.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[#1f2937]">
                        <span>Cleaning fee</span>
                        <span>KES {pricing.cleaningFee.toLocaleString()}</span>
                      </div>
                      {pricing.extraGuestFee > 0 && (
                        <div className="flex justify-between text-[#1f2937]">
                          <span>Extra guest fee ({pricing.extraGuests} x KES {EXTRA_GUEST_FEE.toLocaleString()} x {pricing.nights} nights)</span>
                          <span>KES {pricing.extraGuestFee.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[#1f2937]">
                        <span>Service fee</span>
                        <span>KES {pricing.serviceFee.toLocaleString()}</span>
                      </div>
                      {selectedAddOns.map((item) => (
                        <div key={item.addOn.id} className="flex justify-between text-[#1f2937]">
                          <span>{item.addOn.name} x {item.quantity}</span>
                          <span>KES {(item.quantity * (item.addOn.price || 0)).toLocaleString()}</span>
                        </div>
                      ))}
                      {pricing.lateCheckoutFee > 0 && (
                        <div className="flex justify-between text-[#1f2937]">
                          <span>Late check-out</span>
                          <span>KES {pricing.lateCheckoutFee.toLocaleString()}</span>
                        </div>
                      )}
                      {pricing.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Promo discount</span>
                          <span>-KES {pricing.discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-[#D9D9D9] flex justify-between font-bold text-[#0B0B45]">
                        <span>Total</span>
                        <span>KES {pricing.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingPage;
