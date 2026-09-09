import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import apiClient from '../api/client';
import { useFavorites } from '../context/FavoritesContext.jsx';

function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('reference');
  const [status, setStatus] = useState('loading'); // loading | success | pending | failed
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const { toggleFavorite, isFavorite } = useFavorites();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      setError('No payment reference found. Please try booking again.');
      return;
    }

    async function verify() {
      try {
        const res = await apiClient.get(`/payments/verify/${reference}`);
        const data = res.data;

        if (data.data?.confirmed) {
          setStatus('success');
          // Fetch booking details
          if (data.data.bookingId) {
            try {
              const bookingRes = await apiClient.get(`/bookings/${data.data.bookingId}`);
              setBooking(bookingRes.data.data);
            } catch (err) {
              console.error('Failed to fetch booking details:', err);
            }
          }
        } else {
          // Paystack's own status distinguishes a payment still processing
          // (pending/ongoing) from one that actually failed/was abandoned -
          // a pending payment must never be shown or treated as a failure,
          // and never invites another charge.
          const providerStatus = data.data?.providerStatus;
          if (providerStatus === 'pending' || providerStatus === 'ongoing') {
            setStatus('pending');
          } else {
            setStatus('failed');
          }
          setError(data.message || 'Payment verification failed. Please try again.');
        }
      } catch (err) {
        setStatus('failed');
        setError(err.response?.data?.message || 'Unable to verify payment. If you completed payment, it will be confirmed shortly.');
      }
    }

    verify();
  }, [reference]);

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <div className="pt-24 pb-16 flex items-center justify-center min-h-[80vh]">
        <div className="max-w-md mx-auto px-6 text-center">

          {/* Loading */}
          {status === 'loading' && (
            <>
              <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h1 className="text-2xl font-bold text-[#222222] mb-4">Verifying Payment</h1>
              <p className="text-[#6b7280]">Please wait while we confirm your payment...</p>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <div className="w-24 h-24 bg-[#2563EB]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-[#222222] mb-4">Booking Confirmed!</h1>
              <p className="text-[#6b7280] mb-6">
                Your payment was successful. We&apos;ve sent a confirmation to your email.
              </p>

              {booking && (
                <div className="bg-white rounded-[14px] shadow-lg p-6 mb-6 text-left">
                  <h3 className="font-bold text-[#222222] mb-2">Booking Summary</h3>
                  <p className="text-[#222222] font-medium">{booking.property?.title}</p>
                  <p className="text-[#6b7280] text-sm">{booking.property?.location}</p>
                  <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6b7280]">Check-in</span>
                      <span className="font-medium">{booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-[#6b7280]">Check-out</span>
                      <span className="font-medium">{booking.checkOut ? new Date(booking.checkOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-[#6b7280]">Guests</span>
                      <span className="font-medium">{booking.guests}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[#222222] mt-2 pt-2 border-t border-[#E5E7EB]">
                      <span>Total Paid</span>
                      <span>KES {booking.total?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#6b7280] mt-1">
                      <span>Payment Ref</span>
                      <span className="font-mono">{booking.paymentReference?.slice(0, 16)}...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Post-booking save prompt */}
              {booking && !saved && !isFavorite(booking.propertyId) && (
                <div className="bg-white rounded-[14px] border-2 border-[#2563EB]/30 p-4 mb-6 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#2563EB]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#222222]">Save this property for later?</p>
                      <p className="text-xs text-[#6b7280] mt-0.5">
                        Add it to your favourites so you can find it again easily.
                      </p>
                      <button
                        onClick={async () => {
                          const ok = await toggleFavorite(booking.propertyId);
                          if (ok) setSaved(true);
                        }}
                        className="mt-2 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                      >
                        Yes, save to favourites
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/')}
                  className="w-full min-h-[44px] bg-[#C49A6C] text-white py-3 rounded-lg font-semibold hover:bg-[#B8895C] transition-all duration-200"
                >
                  Return to Home
                </button>
                {booking && (
                  <button
                    onClick={() => navigate(`/property/${booking.propertyId}`)}
                    className="w-full min-h-[44px] py-3 rounded-lg font-semibold border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-all duration-200"
                  >
                    View Property
                  </button>
                )}
              </div>
            </>
          )}

          {/* Pending - still processing, distinct from a real failure. Never
              offers to retry/charge again; the existing booking stays open
              and the guest can check back (Trips reflects the real status
              once the webhook/next verify confirms it). */}
          {status === 'pending' && (
            <>
              <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#222222] mb-4">Payment Pending</h1>
              <p className="text-[#6b7280] mb-6">
                We haven&apos;t received final confirmation from the payment provider yet. This can take a few
                minutes - your booking is held and you don&apos;t need to pay again.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/trips')}
                  className="w-full min-h-[44px] bg-[#C49A6C] text-white py-3 rounded-lg font-semibold hover:bg-[#B8895C] transition-all duration-200"
                >
                  Check my trips
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full min-h-[44px] py-3 rounded-lg font-semibold border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-all duration-200"
                >
                  Return to Home
                </button>
              </div>
            </>
          )}

          {/* Failed */}
          {status === 'failed' && (
            <>
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#222222] mb-4">Payment Failed</h1>
              <p className="text-[#6b7280] mb-6">{error}</p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/')}
                  className="w-full min-h-[44px] bg-[#C49A6C] text-white py-3 rounded-lg font-semibold hover:bg-[#B8895C] transition-all duration-200"
                >
                  Return to Home
                </button>
              </div>
            </>
          )}

        </div>
      </div>
      <Footer />
    </div>
  );
}

export default PaymentCallback;
