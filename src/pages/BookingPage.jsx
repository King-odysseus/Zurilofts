import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import apiClient from '../api/client.js';

function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Property from API
  const [property, setProperty] = useState(null);
  const [loadingProperty, setLoadingProperty] = useState(true);

  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);

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
    checkInTime: '',
    paymentMethod: 'card',
  });

  useEffect(() => {
    async function fetchProperty() {
      try {
        const res = await apiClient.get(`/properties/${id}`);
        setProperty(res.data.data);
      } catch {
        // fallback
      } finally {
        setLoadingProperty(false);
      }
    }
    fetchProperty();
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
  const propertyPrice = property?.price || 0;
  const subtotal = nights * propertyPrice;
  const cleaningFee = 1500;
  const serviceFee = Math.round(subtotal * 0.12);
  const discountAmount = promoResult?.discountAmount || 0;
  const total = subtotal + cleaningFee + serviceFee - discountAmount;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingData({ ...bookingData, [name]: value });
  };

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
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        guests: bookingData.guests,
        checkInTime: bookingData.checkInTime || undefined,
        specialRequests: bookingData.specialRequests || undefined,
        paymentMethod: bookingData.paymentMethod,
        promoCode: promoResult?.code || undefined,
      });

      // Update booking data with server response for confirmation display
      if (res.data.data) {
        const b = res.data.data;
        setBookingData((prev) => ({
          ...prev,
          confirmationId: b.id,
          totalCharged: b.total,
          discountAmount: b.discountAmount,
        }));
      }

      setIsProcessing(false);
      setBookingComplete(true);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Booking failed. Please try again.');
      setIsProcessing(false);
    }
  };

  // Step 1: Dates & Guests
  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#262262]">Select Dates & Guests</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#1f2937] mb-2">Check-in Date *</label>
          <input
            type="date"
            name="checkIn"
            value={bookingData.checkIn}
            onChange={handleInputChange}
            min={new Date().toISOString().split('T')[0]}
            className="date-input neu-input w-full px-4 py-3 focus:outline-none transition-all bg-white text-[#1f2937]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#1f2937] mb-2">Check-out Date *</label>
          <input
            type="date"
            name="checkOut"
            value={bookingData.checkOut}
            onChange={handleInputChange}
            min={bookingData.checkIn || new Date().toISOString().split('T')[0]}
            className="date-input neu-input w-full px-4 py-3 focus:outline-none transition-all bg-white text-[#1f2937]"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1f2937] mb-2">Number of Guests *</label>
        <select
          name="guests"
          value={bookingData.guests}
          onChange={handleInputChange}
          className="neu-input w-full px-4 py-3 focus:outline-none transition-all bg-white"
          required
        >
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <option key={num} value={num}>
              {num} {num === 1 ? 'guest' : 'guests'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1f2937] mb-2">Estimated Check-in Time</label>
        <input
          type="time"
          name="checkInTime"
          value={bookingData.checkInTime}
          onChange={handleInputChange}
          className="date-input neu-input w-full px-4 py-3 focus:outline-none transition-all bg-white text-[#1f2937]"
        />
      </div>

      {nights > 0 && (
        <div className="bg-[#C49A6C]/10 rounded-xl p-4">
          <p className="text-[#262262] font-medium">
            {nights} {nights === 1 ? 'night' : 'nights'} selected
          </p>
          <p className="text-[#6b7280] text-sm">
            KES {propertyPrice.toLocaleString()} per night
          </p>
        </div>
      )}

      <button
        onClick={() => setStep(2)}
        disabled={!bookingData.checkIn || !bookingData.checkOut || nights <= 0}
        className="w-full bg-[#262262] text-white py-3 rounded-full font-semibold hover:bg-[#262262]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="text-[#C49A6C] hover:text-[#262262] font-medium flex items-center transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <h2 className="text-2xl font-bold text-[#262262]">Guest Information</h2>

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
        <input
          type="tel"
          name="phone"
          value={bookingData.phone}
          onChange={handleInputChange}
          placeholder="+254 712 345 678"
          className="neu-input w-full px-4 py-3 focus:outline-none transition-all bg-white text-[#1f2937] placeholder-[#6b7280]"
          required
        />
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
        className="w-full bg-[#262262] text-white py-3 rounded-full font-semibold hover:bg-[#262262]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="text-[#C49A6C] hover:text-[#262262] font-medium flex items-center transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <h2 className="text-2xl font-bold text-[#262262]">Payment</h2>

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
            <svg className="w-8 h-8 text-[#262262] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <svg className="w-8 h-8 text-[#262262] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="px-4 py-3 rounded-xl text-sm font-semibold bg-[#262262] text-white hover:bg-[#1a1850] transition-all duration-200 disabled:opacity-50"
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
            {promoResult.discountPercent}% off — KES {promoResult.discountAmount.toLocaleString()} saved!
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
        <div className="flex justify-between text-[#1f2937]">
          <span>Service fee</span>
          <span>KES {serviceFee.toLocaleString()}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Promo discount</span>
            <span>-KES {discountAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="border-t border-[#262262]/20 pt-2 flex justify-between font-bold text-[#262262]">
          <span>Total</span>
          <span>KES {total.toLocaleString()}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full bg-[#C49A6C] text-[#262262] py-4 rounded-full font-bold hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#262262]" fill="none" viewBox="0 0 24 24">
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
            <h1 className="text-3xl font-bold text-[#262262] mb-4">Booking Confirmed!</h1>
            <p className="text-[#6b7280] mb-6">
              Thank you for your booking. We have sent a confirmation email to {bookingData.email} with all the details.
            </p>
            <div className="bg-[#D9D9D9] rounded-2xl p-6 mb-6 text-left">
              <h3 className="font-bold text-[#262262] mb-2">Booking Summary</h3>
              <p className="text-[#1f2937]">{property?.title}</p>
              <p className="text-[#6b7280] text-sm">{property?.location}</p>
              <div className="mt-3 pt-3 border-t border-[#262262]/10">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b7280]">Check-in</span>
                  <span className="font-medium">{bookingData.checkIn}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[#6b7280]">Check-out</span>
                  <span className="font-medium">{bookingData.checkOut}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[#6b7280]">Guests</span>
                  <span className="font-medium">{bookingData.guests}</span>
                </div>
                <div className="flex justify-between font-bold text-[#262262] mt-2 pt-2 border-t border-[#262262]/10">
                  <span>Total Paid</span>
                  <span>KES {total.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-[#C49A6C] text-[#262262] py-3 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200"
              >
                Return to Home
              </button>
              <button
                onClick={() => window.print()}
                className="w-full border-2 border-[#262262] text-[#262262] py-3 rounded-full font-semibold hover:bg-[#262262] hover:text-white transition-all duration-200"
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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="pt-20 md:pt-24 pb-12 md:pb-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
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
                          ? 'bg-[#C49A6C] text-[#262262]'
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
                <Link to={`/property/${property.id}`} className="block">
                  <img
                    src={(property?.images?.[0] || '')}
                    alt={property?.title}
                    className="w-full h-48 object-cover rounded-xl mb-4"
                  />
                </Link>
                <h3 className="font-bold text-[#262262] text-lg">{property?.title}</h3>
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
                    <span className="font-medium">{property.rating}</span>
                  </div>
                  <div className="flex items-center text-[#6b7280]">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {property.bedrooms} beds
                  </div>
                </div>

                {nights > 0 && (
                  <div className="mt-6 pt-6 border-t border-[#D9D9D9]">
                    <h4 className="font-semibold text-[#262262] mb-3">Price Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-[#1f2937]">
                        <span>KES {propertyPrice.toLocaleString()} x {nights} nights</span>
                        <span>KES {subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[#1f2937]">
                        <span>Cleaning fee</span>
                        <span>KES {cleaningFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[#1f2937]">
                        <span>Service fee</span>
                        <span>KES {serviceFee.toLocaleString()}</span>
                      </div>
                      <div className="pt-2 border-t border-[#D9D9D9] flex justify-between font-bold text-[#262262]">
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
