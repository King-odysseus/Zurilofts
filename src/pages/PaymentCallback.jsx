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
  const [status, setStatus] = useState('loading'); // loading | success | failed
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
            } catch {
              // booking details fetch is optional for success display
            }
          }
        } else {
          setStatus('failed');
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
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24 pb-16 flex items-center justify-center min-h-[80vh]">
        <div className="max-w-md mx-auto px-6 text-center">

          {/* Loading */}
          {status === 'loading' && (
            <>
              <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h1 className="text-2xl font-bold text-[#0B0B45] mb-4">Verifying Payment</h1>
              <p className="text-[#6b7280]">Please wait while we confirm your payment...</p>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <div className="w-24 h-24 bg-[#C49A6C]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-[#0B0B45] mb-4">Booking Confirmed!</h1>
              <p className="text-[#6b7280] mb-6">
                Your payment was successful. We&apos;ve sent a confirmation to your email.
              </p>

              {booking && (
                <div className="bg-white rounded-2xl shadow-lg border border-[#D9D9D9] p-6 mb-6 text-left">
                  <h3 className="font-bold text-[#0B0B45] mb-2">Booking Summary</h3>
                  <p className="text-[#1f2937] font-medium">{booking.property?.title}</p>
                  <p className="text-[#6b7280] text-sm">{booking.property?.location}</p>
                  <div className="mt-3 pt-3 border-t border-[#D9D9D9]">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6b7280]">Check-in</span>
                      <span className="font-medium">{booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-[#6b7280]">Check-out</span>
                      <span className="font-medium">{booking.checkOut ? new Date(booking.checkOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-[#6b7280]">Guests</span>
                      <span className="font-medium">{booking.guests}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[#0B0B45] mt-2 pt-2 border-t border-[#D9D9D9]">
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
                <div className="bg-white rounded-2xl border-2 border-[#C49A6C]/30 p-4 mb-6 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#C49A6C]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#0B0B45]">Save this property for later?</p>
                      <p className="text-xs text-[#6b7280] mt-0.5">
                        Add it to your favourites so you can find it again easily.
                      </p>
                      <button
                        onClick={async () => {
                          const ok = await toggleFavorite(booking.propertyId);
                          if (ok) setSaved(true);
                        }}
                        className="mt-2 text-sm font-semibold text-[#C49A6C] hover:text-[#b8895c] transition-colors"
                      >
                        Yes, save to favourites →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-[#C49A6C] text-white py-3 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200"
                >
                  Return to Home
                </button>
                {booking && (
                  <button
                    onClick={() => navigate(`/property/${booking.propertyId}`)}
                    className="w-full border-2 border-[#0B0B45] text-[#0B0B45] py-3 rounded-full font-semibold hover:bg-[#0B0B45] hover:text-white transition-all duration-200"
                  >
                    View Property
                  </button>
                )}
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
              <h1 className="text-2xl font-bold text-[#0B0B45] mb-4">Payment {status === 'failed' ? 'Failed' : 'Pending'}</h1>
              <p className="text-[#6b7280] mb-6">{error}</p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-[#C49A6C] text-white py-3 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200"
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
