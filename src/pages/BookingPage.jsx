import { Fragment, useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Dropdown as FlowbiteDropdown, DropdownItem, Label, Radio, Spinner, Textarea, TextInput } from 'flowbite-react';
import { Check, ChevronLeft, Clock, CreditCard, House, Landmark, LoaderCircle, MapPin, ShieldCheck, Star, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import AvailabilityCalendar from '../components/AvailabilityCalendar.jsx';
import apiClient from '../api/client.js';
import BrandLogo from '../components/BrandLogo.jsx';

import { useAuth } from '../context/AuthContext.jsx';

import { COUNTRY_CODES, validatePhone, detectCountry } from '../utils/phone.js';

function CheckoutDropdown({ value, options, onChange, ariaLabel, className = '' }) {
  const selected = options.find((option) => String(option.value) === String(value));
  return (
    <FlowbiteDropdown
      inline
      theme={{ inlineWrapper: `flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-semibold text-navy ${className}`.trim() }}
      label={<span className="truncate">{selected?.label ?? 'Select'}</span>}
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
  const { isAuthenticated } = useAuth();
  const urlVariant = searchParams.get('variant'); // '1bed' | '2bed' | null
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingComplete] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Property from API
  const [property, setProperty] = useState(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [propertyError, setPropertyError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [unavailableRanges, setUnavailableRanges] = useState([]);

  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);

  // Add-ons
  const [bookingId, setBookingId] = useState(null);
  const [availableAddOns, setAvailableAddOns] = useState([]);
  const [selectedAddOns, setSelectedAddOns] = useState([]); // { addOn, quantity }
  const [loadingAddOns, setLoadingAddOns] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [addOnsError, setAddOnsError] = useState('');
  const [pendingAddOnId, setPendingAddOnId] = useState(null); // guards double-submit

  // Bed option driven by URL variant (from property card click)
  // Properties define their own 1-bed / 2-bed prices via price1Bed / price2Bed
  const [bedOption, setBedOption] = useState(urlVariant);
  // Display fallback for the guest-count note only. The fee that is charged comes
  // from the server quote (extraGuestFeePerNight) - see EXTRA_GUEST_FEE_PER_NIGHT
  // in server/src/utils/pricing.ts.
  const EXTRA_GUEST_FEE = 800;

  // Standard stay times. Check-in from 3:00 PM, check-out by 10:00 AM. The late
  // check-out ladder (1h = quarter night, 2h = half, 3h = one full night, capped
  // at 3 hours) is priced by the server and served here as a fee per option.
  const STANDARD_CHECK_IN = '15:00';
  const STANDARD_CHECK_OUT = '10:00';
  // Maximum late check-out capped at 3 hours past standard (1:00 PM).
  const CHECK_OUT_OPTIONS = ['10:00', '11:00', '12:00', '13:00'];


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
    // Only prefill once the session is restored. Firing this before /auth/refresh
    // resolves guarantees a 401 on a cold load, and the retry costs an extra
    // refresh-token rotation. Guests skip it entirely - they have no profile yet.
    if (isAuthenticated) {
      fetchProfile();
    }

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
      } catch (error) {
        // Keep the reason: without it a failed fetch looks identical to "still
        // loading", which is how a bad or unpublished listing id used to leave the
        // guest on "Loading property..." forever with no way out.
        setPropertyError(
          error?.response?.status === 404
            ? 'This listing is no longer available.'
            : 'We could not load this listing right now. Please try again.'
        );
      } finally {
        setLoadingProperty(false);
      }
    }
    fetchProperty();

    apiClient
      .get(`/properties/${id}/availability`)
      .then((r) => setUnavailableRanges(r.data.data || []))
      .catch(() => { /* calendar still works, just nothing disabled */ });
  }, [id, urlVariant, isAuthenticated, reloadKey]);

  // ── Pricing ────────────────────────────────────────────────────────────────
  // Every money figure below comes from POST /bookings/quote. The client does not
  // compute a total: seasonal PriceRules and promo caps are server data, and a
  // second implementation here is exactly how a displayed total drifts from the
  // amount charged. The local fallbacks below are display placeholders until the
  // quote lands, never a number the guest is held to.
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [quoteRetryKey, setQuoteRetryKey] = useState(0);
  const retryQuote = () => setQuoteRetryKey((key) => key + 1);

  // Date arithmetic only, to gate controls before any quote exists.
  const requestedNights = useMemo(() => {
    if (!bookingData.checkIn || !bookingData.checkOut) return 0;
    const diff = new Date(bookingData.checkOut) - new Date(bookingData.checkIn);
    return Math.max(0, Math.ceil(diff / 86_400_000));
  }, [bookingData.checkIn, bookingData.checkOut]);

  // Price the stay on the server. Rejects on an unusable stay (bad dates, promo
  // below its minimum spend) so callers can surface the server's own message.
  const requestQuote = useCallback((promoCodeOverride) => (
    apiClient.post('/bookings/quote', {
      propertyId: id,
      bedOption,
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      guests: bookingData.guests,
      checkOutTime: bookingData.checkOutTime || undefined,
      promoCode: promoCodeOverride || undefined,
    }).then((res) => res.data.data)
  ), [id, bedOption, bookingData.checkIn, bookingData.checkOut, bookingData.guests, bookingData.checkOutTime]);

  const appliedPromoCode = promoResult?.code || null;

  useEffect(() => {
    if (!id || !bedOption || requestedNights <= 0) {
      setQuote(null);
      setQuoteError('');
      setQuoteLoading(false);
      return undefined;
    }

    let cancelled = false;
    setQuoteLoading(true);
    // Debounced: the guest stepper and the date inputs each fire many changes.
    const timer = setTimeout(async () => {
      try {
        const priced = await requestQuote(appliedPromoCode);
        if (cancelled) return;
        setQuote(priced);
        setQuoteError('');
        if (appliedPromoCode && !priced.promo) setPromoResult(null);
      } catch (err) {
        if (cancelled) return;
        // A promo that no longer qualifies must not hide the price of the stay:
        // drop it, re-price without it, and tell the guest why.
        if (appliedPromoCode) {
          setPromoResult(null);
          setPromoError(err.response?.data?.error || 'That promo code no longer applies.');
          try {
            const priced = await requestQuote();
            if (cancelled) return;
            setQuote(priced);
            setQuoteError('');
          } catch (retryErr) {
            if (cancelled) return;
            setQuote(null);
            setQuoteError(retryErr.response?.data?.error || 'Could not price this stay. Please try again.');
          }
          return;
        }
        setQuote(null);
        setQuoteError(err.response?.data?.error || 'Could not price this stay. Please try again.');
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 300);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [id, bedOption, requestedNights, bookingData.guests, bookingData.checkOutTime, appliedPromoCode, requestQuote, quoteRetryKey]);

  // Capacity belongs to the bed option, so it is known before any quote.
  const capacity = bedOption === '2bed' ? { included: 4, max: 6 } : { included: 2, max: 4 };
  const listNightlyPrice = bedOption === '2bed'
    ? (property?.price2Bed ?? property?.price ?? 0)
    : (bedOption === '1bed' ? (property?.price1Bed ?? property?.price ?? 0) : (property?.price ?? 0));
  const addOnsTotal = selectedAddOns.reduce((sum, item) => sum + item.quantity * (item.addOn.price || 0), 0);

  const pricing = {
    nights: quote?.nights ?? requestedNights,
    propertyPrice: quote?.nightlyPrice ?? listNightlyPrice,
    baseGuests: quote?.capacity?.included ?? capacity.included,
    maxGuests: quote?.capacity?.max ?? capacity.max,
    subtotal: quote?.subtotal ?? 0,
    extraGuests: quote?.extraGuests ?? 0,
    extraGuestFee: quote?.extraGuestFee ?? 0,
    extraGuestFeePerNight: quote?.extraGuestFeePerNight ?? EXTRA_GUEST_FEE,
    cleaningFee: quote?.cleaningFee ?? 0,
    serviceFee: quote?.serviceFee ?? 0,
    lateCheckoutFee: quote?.lateCheckoutFee ?? 0,
    discountAmount: quote?.discountAmount ?? 0,
    addOnsTotal,
    // Add-ons attach after the booking exists, so the quote excludes them; the
    // breakdown adds the guest's current selection on top.
    total: (quote?.total ?? 0) + addOnsTotal,
  };
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
      // Re-price with the code attached: the server computes the discount against
      // the real seasonal subtotal and enforces the minimum spend on it.
      const priced = await requestQuote(promoCode.toUpperCase());
      if (!priced.promo) {
        setPromoError('Invalid promo code');
        return;
      }
      setPromoResult({
        code: priced.promo.code,
        discountPercent: priced.promo.discountPercent,
        discountAmount: priced.discountAmount,
      });
      setQuote(priced);
      setQuoteError('');
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
      // The booking is created when the guest leaves the details step, which is
      // BEFORE add-ons are attached and BEFORE a payment method is chosen, so any
      // link minted back then carries the old total and the default channel. Always
      // mint a fresh link here: the server recalculates the total (add-ons included)
      // and opens the transaction on the method the guest actually picked.
      const id = bookingId || (await ensureBooking());
      if (!id) {
        setSubmitError('Could not start your booking. Please try again.');
        setIsProcessing(false);
        return;
      }

      const res = await apiClient.post(`/bookings/${id}/payment`, {
        paymentMethod: bookingData.paymentMethod,
      });
      const authorizationUrl = res.data.data.authorizationUrl;
      if (!authorizationUrl) {
        setSubmitError('Payment gateway unavailable. Please try again.');
        setIsProcessing(false);
        return;
      }

      window.location.href = authorizationUrl;
    } catch (err) {
      // An unverified guest cannot pay yet: send them to the verification step
      // instead of leaving a checkout button that can never succeed.
      if (err.response?.data?.error === 'IDENTITY_VERIFICATION_REQUIRED') {
        navigate('/verify-identity');
        return;
      }
      setSubmitError(err.response?.data?.error || 'Booking failed. Please try again.');
      setIsProcessing(false);
    }
  };

  // Step 1: Dates & Guests
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <Label className="mb-2 block">Dates *</Label>
        <AvailabilityCalendar
          value={{ checkIn: bookingData.checkIn, checkOut: bookingData.checkOut }}
          onChange={({ checkIn, checkOut }) => setBookingData((prev) => ({ ...prev, checkIn, checkOut }))}
          unavailableRanges={unavailableRanges}
        />
        {(bookingData.checkIn || bookingData.checkOut) && (
          <div className="flex gap-4 mt-3">
            <div className="flex-1 rounded-lg border border-border bg-white px-4 py-2">
              <span className="text-xs text-muted block">Check-in</span>
              <span className="font-semibold text-navy">{bookingData.checkIn || '-'}</span>
            </div>
            <div className="flex-1 rounded-lg border border-border bg-white px-4 py-2">
              <span className="text-xs text-muted block">Check-out</span>
              <span className="font-semibold text-navy">{bookingData.checkOut || '-'}</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <Label className="mb-2 block">Number of Guests *</Label>
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
          <p className="text-xs text-muted mt-1">
            This apartment fits up to {pricing.maxGuests} guests ({pricing.baseGuests} included in the {bedOption === '2bed' ? '2-bed' : '1-bed'} rate). Each additional guest is KES {pricing.extraGuestFeePerNight.toLocaleString()}/night.
            {bookingData.guests > pricing.baseGuests && (
              <span className="font-medium text-primary-700"> {pricing.extraGuests} extra guest{pricing.extraGuests > 1 ? 's' : ''} &middot; +KES {pricing.extraGuestFee.toLocaleString()}</span>
            )}
          </p>
        )}
        {bookingData.guests > pricing.maxGuests && (
          <Alert color="failure" className="mt-2">Maximum {pricing.maxGuests} guests for this room type. Exceeding this is grounds for removal.</Alert>
        )}
        {!bedOption && (
          <p className="text-xs text-muted mt-1">Select a bed option above to see guest limits.</p>
        )}
      </div>

      {/* Bed Option - shown as read-only since it was selected on the property card */}
      {bedOption && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-primary-50 p-4 dark:bg-white/5">
          <div>
            <p className="text-sm font-semibold text-navy">
              {bedOption === '2bed' ? '2-Bed Configuration' : '1-Bed Configuration'}
            </p>
            <p className="text-xs text-muted">
              Apartment fits up to {pricing.maxGuests} guests &middot; KES {pricing.propertyPrice.toLocaleString()}/night
            </p>
          </div>
          <span className="bg-primary text-navy-bg text-xs font-bold px-3 py-1 rounded-full">
            {bedOption === '2bed' ? '2 Bed' : '1 Bed'}
          </span>
        </div>
      )}

      {/* Standard times note */}
      <div className="flex items-start gap-3 rounded-lg bg-surface p-4">
        <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" strokeWidth={2} aria-hidden="true" />
        <p className="text-sm text-charcoal">
          Standard <span className="font-semibold">check-in from 3:00 PM</span> and{' '}
          <span className="font-semibold">check-out by 10:00 AM</span>. You may extend up to{' '}
          <span className="font-semibold">1:00 PM (3 hours max)</span>. The fee{' '}
          <span className="font-semibold">doubles each hour</span> past 10:00 AM, reaching a{' '}
          <span className="font-semibold">full extra night at 3 hours</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-2 block">Estimated Check-in Time</Label>
          <TextInput
            type="time"
            name="checkInTime"
            value={bookingData.checkInTime}
            onChange={handleInputChange}
            className="w-full"
            sizing="lg"
          />
          <p className="text-xs text-muted mt-1">From 3:00 PM</p>
        </div>
        <div>
          <Label className="mb-2 block">Check-out Time</Label>
          <CheckoutDropdown
            value={bookingData.checkOutTime}
            onChange={(v) => setBookingData((prev) => ({ ...prev, checkOutTime: v }))}
            options={CHECK_OUT_OPTIONS.map((time) => {
              // Fees come from the server quote, so each label matches the amount
              // charged. Before the stay is priced, show the plain time.
              const fee = quote?.lateCheckoutOptions?.find((opt) => opt.time === time)?.fee ?? 0;
              const hasQuote = Boolean(quote);
              return {
                value: time,
                label: `${formatTime12h(time)}${!hasQuote ? '' : fee > 0 ? ` (+KES ${fee.toLocaleString()})` : ' (Standard)'}`,
              };
            })}
            ariaLabel="Check-out time"
          />
          {pricing.lateCheckoutFee > 0 && (
            <p className="text-xs text-primary font-medium mt-1">
              Late check-out fee: KES {pricing.lateCheckoutFee.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {requestedNights > 0 && (
        <div className="bg-primary-50 rounded-xl p-4">
          <p className="text-navy font-medium">
            {requestedNights} {requestedNights === 1 ? 'night' : 'nights'} selected
          </p>
          <p className="text-muted text-sm">
            KES {pricing.propertyPrice.toLocaleString()} per night
          </p>
        </div>
      )}

      <Button
        onClick={() => setStep(2)}
        disabled={!bookingData.checkIn || !bookingData.checkOut || requestedNights <= 0 || !bedOption}
        className="w-full"
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
          size="sm"
          color="light"
        >
          <ChevronLeft className="w-5 h-5 mr-1" strokeWidth={2} aria-hidden="true" />
          Back
        </Button>
      </div>

      <div>
        <h2 className="text-base font-semibold text-navy">Guest Information</h2>
        <p className="mt-1 text-xs text-muted">Pre-filled from your account. Edit anything that&apos;s changed.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-2 block">First Name *</Label>
          <TextInput
            type="text"
            name="firstName"
            value={bookingData.firstName}
            onChange={handleInputChange}
            placeholder="John"
            className="w-full"
            sizing="lg"
            required
          />
        </div>
        <div>
          <Label className="mb-2 block">Last Name *</Label>
          <TextInput
            type="text"
            name="lastName"
            value={bookingData.lastName}
            onChange={handleInputChange}
            placeholder="Doe"
            className="w-full"
            sizing="lg"
            required
          />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Email *</Label>
        <TextInput
          type="email"
          name="email"
          value={bookingData.email}
          onChange={handleInputChange}
          placeholder="john@example.com"
          className="w-full"
          sizing="lg"
          required
        />
      </div>

      <div>
        <Label className="mb-2 block">Phone Number *</Label>
        <div className="flex gap-2">
          <CheckoutDropdown
            value={phoneCountryCode}
            onChange={(val) => handlePhoneChange(val, phoneNumber)}
            options={COUNTRY_CODES.map((c) => ({ value: c.code, label: c.dial }))}
            ariaLabel="Select country code"
            className="w-28 shrink-0"
          />
          <TextInput
            type="tel"
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(phoneCountryCode, e.target.value.replace(/\D/g, ''))}
            maxLength={15}
            placeholder={COUNTRY_CODES.find((c) => c.code === phoneCountryCode)?.example || ''}
            className="w-full"
            sizing="lg"
            required
          />
        </div>
        {phoneError && (
          <Alert color="failure" className="mt-2">{phoneError}</Alert>
        )}
      </div>

      {/* Additional guests - one form per extra person in the party */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="block text-sm font-semibold text-charcoal">
            Additional Guests {additionalGuests.length > 0 && `(${additionalGuests.length})`}
          </Label>
          <button
            type="button"
            onClick={addGuest}
            disabled={bookingData.guests >= pricing.maxGuests}
            className="text-sm font-semibold text-primary hover:text-navy transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add guest
          </button>
        </div>
        <p className="text-xs text-muted mb-3">
          You&apos;re booking for {bookingData.guests} {bookingData.guests === 1 ? 'guest' : 'guests'}. Add the names of anyone staying with you.
        </p>

        {additionalGuests.length === 0 ? (
          <p className="text-sm text-muted italic">Just you - add a guest if others are staying.</p>
        ) : (
          <div className="space-y-3">
            {additionalGuests.map((g, i) => (
              <div key={i} className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="mb-1 block text-xs font-medium text-muted">Guest {i + 2} first name</Label>
                  <TextInput
                    type="text"
                    value={g.firstName}
                    onChange={(e) => updateAdditionalGuest(i, 'firstName', e.target.value)}
                    placeholder="First name"
                    className="w-full"
                    sizing="lg"
                  />
                </div>
                <div className="flex-1">
                  <Label className="mb-1 block text-xs font-medium text-muted">Last name</Label>
                  <TextInput
                    type="text"
                    value={g.lastName}
                    onChange={(e) => updateAdditionalGuest(i, 'lastName', e.target.value)}
                    placeholder="Last name"
                    className="w-full"
                    sizing="lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeGuest(i)}
                  className="mb-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-navy"
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
        <Label className="mb-2 block">Special Requests</Label>
        <Textarea
          name="specialRequests"
          value={bookingData.specialRequests}
          onChange={handleInputChange}
          placeholder="Any special requirements or requests..."
          className="w-full"
          rows={4}
        />
      </div>

      <Button
        onClick={goToAddOns}
        disabled={!bookingData.firstName || !bookingData.lastName || !bookingData.email || !bookingData.phone || creatingBooking}
        className="w-full"
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
          size="sm"
          color="light"
        >
          <ChevronLeft className="w-5 h-5 mr-1" strokeWidth={2} aria-hidden="true" />
          Back
        </Button>
      </div>

      <div>
        <h2 className="text-base font-semibold text-navy">Enhance your stay</h2>
        <p className="text-sm text-muted mt-1">
          Add optional services to your booking. You can change quantities any time before payment.
        </p>
      </div>

      {addOnsError && (
        <div className="rounded-lg border border-border bg-surface p-3 text-sm text-charcoal" role="alert">
          {addOnsError}
        </div>
      )}

      {loadingAddOns ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="xl" />
        </div>
      ) : availableAddOns.length === 0 ? (
        <div className="rounded-xl bg-primary-50 p-6 text-center">
          <p className="text-muted">No add-ons are available for this property.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {availableAddOns.map((addOn) => {
            const selected = selectedAddOns.find((s) => s.addOn.id === addOn.id);
            const qty = selected?.quantity || 0;
            const subtotal = qty * (addOn.price || 0);
            const busy = pendingAddOnId === addOn.id;
            return (
              <div key={addOn.id} className={`flex flex-col gap-3 rounded-lg border p-3 text-sm sm:flex-row sm:items-start sm:justify-between ${qty > 0 ? 'border-primary bg-primary-50' : 'border-border'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-navy">{addOn.name}</h3>
                    <span className="bg-primary-50 text-navy text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
                      {addOn.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted mt-1">{addOn.description}</p>
                  <p className="text-sm font-semibold text-navy mt-1">
                    KES {addOn.price != null ? addOn.price.toLocaleString() : '-'} each
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeAddOnQuantity(addOn, qty - 1)}
                      disabled={busy || qty === 0}
                      className="w-9 h-9 rounded-full border border-border text-navy font-bold hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`Decrease ${addOn.name} quantity`}
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-semibold text-navy tabular-nums" aria-live="polite">
                      {busy ? '…' : qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeAddOnQuantity(addOn, qty + 1)}
                      disabled={busy || qty >= 20}
                      className="w-9 h-9 rounded-full border border-border text-navy font-bold hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`Increase ${addOn.name} quantity`}
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-navy">
                    {qty > 0 ? `KES ${subtotal.toLocaleString()}` : '-'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl bg-primary-50 p-4">
        <span className="font-semibold text-navy">Add-ons total</span>
        <span className="font-bold text-navy tabular-nums">KES {pricing.addOnsTotal.toLocaleString()}</span>
      </div>

      <Button
        onClick={() => setStep(4)}
        className="w-full"
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
          size="sm"
          color="light"
        >
          <ChevronLeft className="w-5 h-5 mr-1" strokeWidth={2} aria-hidden="true" />
          Back
        </Button>
      </div>

      <h2 className="text-base font-semibold text-navy">Payment</h2>

      <div className="space-y-3">
        <label className={`flex cursor-pointer items-center gap-1 rounded-lg border p-4 transition-colors ${
          bookingData.paymentMethod === 'card' ? 'border-primary bg-primary-50' : 'border-border bg-white'
        }`}>
          <Radio
            type="radio"
            name="paymentMethod"
            value="card"
            checked={bookingData.paymentMethod === 'card'}
            onChange={handleInputChange}
          />
          <div className="ml-4 flex items-center flex-1">
            <CreditCard className="w-8 h-8 text-navy mr-3" strokeWidth={1.5} aria-hidden="true" />
            <div>
              <p className="font-semibold text-charcoal">Credit/Debit Card</p>
              <p className="text-sm text-muted">Pay securely with your card</p>
            </div>
          </div>
        </label>

        <label className={`flex cursor-pointer items-center gap-1 rounded-lg border p-4 transition-colors ${
          bookingData.paymentMethod === 'mpesa' ? 'border-primary bg-primary-50' : 'border-border bg-white'
        }`}>
          <Radio
            type="radio"
            name="paymentMethod"
            value="mpesa"
            checked={bookingData.paymentMethod === 'mpesa'}
            onChange={handleInputChange}
          />
          <div className="ml-4 flex items-center flex-1">
            <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-navy-bg">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <div>
              <p className="font-semibold text-charcoal">M-Pesa</p>
              <p className="text-sm text-muted">Pay with M-Pesa mobile money</p>
            </div>
          </div>
        </label>

        <label className={`flex cursor-pointer items-center gap-1 rounded-lg border p-4 transition-colors ${
          bookingData.paymentMethod === 'bank' ? 'border-primary bg-primary-50' : 'border-border bg-white'
        }`}>
          <Radio
            type="radio"
            name="paymentMethod"
            value="bank"
            checked={bookingData.paymentMethod === 'bank'}
            onChange={handleInputChange}
          />
          <div className="ml-4 flex items-center flex-1">
            <Landmark className="w-8 h-8 text-navy mr-3" strokeWidth={1.5} aria-hidden="true" />
            <div>
              <p className="font-semibold text-charcoal">Bank Transfer</p>
              <p className="text-sm text-muted">Pay via bank transfer</p>
            </div>
          </div>
        </label>
      </div>

      {/* Promo Code */}
      <div className="mt-6">
        <Label className="mb-2 block">Promo Code</Label>
        <div className="flex gap-2">
          <TextInput
            type="text"
            value={promoCode}
            onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
            placeholder="Enter code"
            className="uppercase"
            sizing="lg"
            disabled={!!promoResult}
          />
          {promoResult ? (
            <Button
              type="button"
              onClick={() => { setPromoCode(''); setPromoResult(null); setPromoError(''); }}
              color="success"
            >
              Applied ✓
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleApplyPromo}
              disabled={validatingPromo || !promoCode.trim()}
              className="shrink-0"
            >
              {validatingPromo ? '...' : 'Apply'}
            </Button>
          )}
        </div>
        {promoError && (
          <Alert color="failure" className="mt-2">{promoError}</Alert>
        )}
        {promoResult && (
          <p className="mt-1 text-xs font-medium text-primary-700">
            {promoResult.discountPercent}% off. KES {promoResult.discountAmount.toLocaleString()} saved!
          </p>
        )}
      </div>

      <div className="space-y-2 rounded-xl bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3 text-charcoal tabular-nums">
          <span>
            {quote && quote.subtotal !== quote.nightlyPrice * quote.nights
              ? `Seasonal nightly rates x ${pricing.nights} nights`
              : `KES ${pricing.propertyPrice.toLocaleString()} x ${pricing.nights} nights`}
          </span>
          <span>KES {pricing.subtotal.toLocaleString()}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 text-charcoal tabular-nums">
          <span>Cleaning fee</span>
          <span>KES {pricing.cleaningFee.toLocaleString()}</span>
        </div>
        {pricing.extraGuestFee > 0 && (
          <div className="flex items-baseline justify-between gap-3 text-charcoal tabular-nums">
            <span>Extra guest fee ({pricing.extraGuests} guest{pricing.extraGuests > 1 ? 's' : ''} x KES {pricing.extraGuestFeePerNight.toLocaleString()} x {pricing.nights} nights)</span>
            <span>KES {pricing.extraGuestFee.toLocaleString()}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 text-charcoal tabular-nums">
          <span>Service fee</span>
          <span>KES {pricing.serviceFee.toLocaleString()}</span>
        </div>
        {selectedAddOns.map((item) => (
          <div key={item.addOn.id} className="flex items-baseline justify-between gap-3 text-charcoal tabular-nums">
            <span>{item.addOn.name} x {item.quantity}</span>
            <span>KES {(item.quantity * (item.addOn.price || 0)).toLocaleString()}</span>
          </div>
        ))}
        {pricing.lateCheckoutFee > 0 && (
          <div className="flex items-baseline justify-between gap-3 text-charcoal tabular-nums">
            <span>Late check-out ({formatTime12h(bookingData.checkOutTime)})</span>
            <span>KES {pricing.lateCheckoutFee.toLocaleString()}</span>
          </div>
        )}
        {pricing.discountAmount > 0 && (
          <div className="flex items-baseline justify-between gap-3 text-primary-700 tabular-nums">
            <span>Promo discount</span>
            <span>-KES {pricing.discountAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-border pt-3 font-bold text-navy tabular-nums">
          <span>Total</span>
          <span>KES {pricing.total.toLocaleString()}</span>
        </div>
      </div>

      {submitError && (
        <div className="rounded-lg border border-border bg-surface p-3 text-sm text-charcoal" role="alert">
          {submitError}
        </div>
      )}

      {quoteError && (
        <div className="mb-3 rounded-lg border border-border bg-surface p-3" role="alert">
          <p className="text-sm text-charcoal">{quoteError}</p>
          <button
            type="button"
            onClick={retryQuote}
            className="mt-1 text-sm font-semibold text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      )}
      {quoteLoading && !quote && (
        <p className="mb-3 text-sm text-muted">Pricing your stay...</p>
      )}

      <form onSubmit={handleSubmit}>
        <Button
          type="submit"
          disabled={isProcessing || !quote || quoteLoading}
          className="w-full"
          pill
        >
          {isProcessing ? (
            <>
              <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-navy" strokeWidth={2} aria-hidden="true" />
              Processing...
            </>
          ) : quote ? (
            `Pay KES ${pricing.total.toLocaleString()}`
          ) : quoteLoading ? (
            'Pricing...'
          ) : (
            'Pricing unavailable'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        By confirming, you agree to our terms and conditions
      </p>
    </div>
  );

  // Booking Complete
  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex min-h-[80vh] items-center justify-center px-4 pb-16 pt-24">
          <div className="max-w-md mx-auto px-6 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary-50">
              <Check className="w-12 h-12 text-primary" strokeWidth={2} aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold text-navy mb-4">Booking Confirmed!</h1>
            <p className="text-muted mb-6">
              Thank you for your booking. We have sent a confirmation email to {bookingData.email} with all the details.
            </p>
            <div className="mb-6 rounded-xl border border-border bg-surface p-6 text-left">
              <h3 className="font-bold text-navy mb-2">Booking Summary</h3>
              <p className="text-charcoal">{property?.title}</p>
              <p className="text-muted text-sm">{property?.location}</p>
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-baseline justify-between text-sm tabular-nums">
                  <span className="text-muted">Check-in</span>
                  <span className="font-medium">{bookingData.checkIn}</span>
                </div>
                <div className="flex items-baseline justify-between text-sm tabular-nums mt-1">
                  <span className="text-muted">Check-out</span>
                  <span className="font-medium">{bookingData.checkOut} · {formatTime12h(bookingData.checkOutTime)}</span>
                </div>
                {pricing.lateCheckoutFee > 0 && (
                  <div className="flex items-baseline justify-between text-sm tabular-nums mt-1">
                    <span className="text-muted">Late check-out fee</span>
                    <span className="font-medium">KES {pricing.lateCheckoutFee.toLocaleString()}</span>
                  </div>
                )}
                {selectedAddOns.map((item) => (
                  <div key={item.addOn.id} className="flex items-baseline justify-between text-sm tabular-nums mt-1">
                    <span className="text-muted">{item.addOn.name} x {item.quantity}</span>
                    <span className="font-medium">KES {(item.quantity * (item.addOn.price || 0)).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex items-baseline justify-between text-sm tabular-nums mt-1">
                  <span className="text-muted">Guests</span>
                  <span className="font-medium">{bookingData.guests}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3 font-bold text-navy tabular-nums">
                  <span>Total Paid</span>
                  <span>KES {pricing.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full rounded-full bg-primary py-3 font-semibold text-navy-bg transition-colors hover:bg-primary-600"
              >
                Return to Home
              </button>
              <button
                onClick={() => window.print()}
                className="w-full rounded-full border-2 border-navy py-3 font-semibold text-navy transition-colors hover:bg-navy-bg hover:text-white"
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
  if (loadingProperty) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Spinner size="xl" className="mx-auto mb-4" />
            <p className="text-muted">Loading property...</p>
          </div>
        </div>
      </div>
    );
  }

  // Separate from the loading branch on purpose: a fetch failure must render an exit,
  // not an endless spinner.
  if (!property) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md px-4">
            <h1 className="text-lg font-semibold text-navy mb-2">Property unavailable</h1>
            <p className="text-muted mb-6">{propertyError || 'This listing could not be loaded.'}</p>
            <div className="flex items-center justify-center gap-3">
              <Button color="light" onClick={() => setReloadKey((key) => key + 1)}>
                Try again
              </Button>
              <Link
                to="/properties"
                className="rounded-full bg-navy-bg px-5 py-2.5 text-sm font-medium text-white"
              >
                Browse properties
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <header className="mx-auto mb-6 flex max-w-6xl items-center justify-between gap-4 rounded-xl border border-border bg-white px-4 py-3"><Link to={`/property/${property.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-navy transition-colors hover:text-primary-700"><ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />Back</Link><Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-navy"><BrandLogo imgClassName="h-6 w-auto" alt="" />ZuriLofts</Link><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted"><ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.8} aria-hidden="true" />Secure checkout</span></header>
      <div className="mx-auto mb-6 flex max-w-6xl items-center justify-between gap-4 rounded-xl border border-border bg-white px-4 py-3 text-sm"><div className="flex min-w-0 flex-col"><strong className="truncate text-navy">{property.title}</strong><span className="text-xs text-muted">{bookingData.checkIn && bookingData.checkOut ? `${bookingData.checkIn} - ${bookingData.checkOut}` : 'Choose your dates'} · {bookingData.guests} guests</span></div><strong className="shrink-0 tabular-nums text-navy">{pricing.nights > 0 ? `KSh ${pricing.total.toLocaleString()}` : `KSh ${pricing.propertyPrice.toLocaleString()}/night`}</strong></div>
      <div className="mx-auto max-w-6xl pb-12 md:pb-16">
        <div>
          {/* Progress Steps */}
          <div className="flex items-center gap-2 text-xs font-semibold text-muted sm:gap-3" aria-label="Checkout progress">
            {[1, 2, 4].map((s, i, steps) => (
              <Fragment key={s}>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${step >= s ? (step > s ? 'bg-primary-50 text-navy' : 'bg-navy-bg text-white') : ''}`}>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[11px] font-bold">
                    {i + 1}
                  </div>
                  <span>{s === 1 ? 'Stay' : s === 2 ? 'Details' : 'Payment'}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-px flex-1 ${step >= steps[i + 1] ? 'bg-primary' : 'bg-border'}`} aria-hidden="true" />
                )}
              </Fragment>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* Left Column - Form */}
            <div className="min-w-0">
              <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
              </div>
            </div>

            {/* Right Column - Property Summary */}
            <div className="min-w-0">
              <div className="h-fit rounded-xl border border-border bg-white p-5 shadow-sm lg:sticky lg:top-24">
                <Link to={`/property/${property?.id}`} className="block">
                  <img
                    src={(property?.images?.[0] || '')}
                    alt={property?.title}
                    className="w-full h-48 object-cover rounded-xl mb-4"
                  />
                </Link>
                <h3 className="font-bold text-navy text-lg">{property?.title}</h3>
                {bedOption && (
                  <p className="text-sm text-primary font-medium mt-1">
                    {bedOption === '2bed' ? '2 Bed' : '1 Bed'} &middot; KES {pricing.propertyPrice.toLocaleString()}/night
                  </p>
                )}
                <div className="flex items-center text-muted text-sm mt-1">
                  <MapPin className="w-4 h-4 mr-1" strokeWidth={2} aria-hidden="true" />
                  {property?.location}
                </div>

                <div className="flex items-center mt-2 space-x-4 text-sm">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-primary mr-1" fill="currentColor" aria-hidden="true" />
                    <span className="font-medium">{property?.rating}</span>
                  </div>
                  <div className="flex items-center text-muted">
                    <House className="w-4 h-4 mr-1" strokeWidth={2} aria-hidden="true" />
                    {(() => { const n = bedOption ? (bedOption === '2bed' ? 2 : 1) : property?.bedrooms; return `${n} ${n === 1 ? 'bed' : 'beds'}`; })()}
                  </div>
                </div>

                {pricing.nights > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="font-semibold text-navy mb-3">Price Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-baseline justify-between gap-3 text-charcoal tabular-nums">
                        <span>KES {pricing.propertyPrice.toLocaleString()} x {pricing.nights} nights</span>
                        <span>KES {pricing.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 text-charcoal tabular-nums">
                        <span>Cleaning fee</span>
                        <span>KES {pricing.cleaningFee.toLocaleString()}</span>
                      </div>
                      {pricing.extraGuestFee > 0 && (
                        <div className="flex items-baseline justify-between gap-3 text-charcoal tabular-nums">
                          <span>Extra guest fee ({pricing.extraGuests} x KES {pricing.extraGuestFeePerNight.toLocaleString()} x {pricing.nights} nights)</span>
                          <span>KES {pricing.extraGuestFee.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-baseline justify-between gap-3 text-charcoal tabular-nums">
                        <span>Service fee</span>
                        <span>KES {pricing.serviceFee.toLocaleString()}</span>
                      </div>
                      {selectedAddOns.map((item) => (
                        <div key={item.addOn.id} className="flex items-baseline justify-between gap-3 text-charcoal tabular-nums">
                          <span>{item.addOn.name} x {item.quantity}</span>
                          <span>KES {(item.quantity * (item.addOn.price || 0)).toLocaleString()}</span>
                        </div>
                      ))}
                      {pricing.lateCheckoutFee > 0 && (
                        <div className="flex items-baseline justify-between gap-3 text-charcoal tabular-nums">
                          <span>Late check-out</span>
                          <span>KES {pricing.lateCheckoutFee.toLocaleString()}</span>
                        </div>
                      )}
                      {pricing.discountAmount > 0 && (
                        <div className="flex items-baseline justify-between gap-3 text-primary-700 tabular-nums">
                          <span>Promo discount</span>
                          <span>-KES {pricing.discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-baseline justify-between border-t border-border pt-3 text-base font-bold text-navy tabular-nums">
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
