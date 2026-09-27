import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import IdentityVerificationPanel from '../components/IdentityVerificationPanel.jsx';
import apiClient from '../api/client.js';

/**
 * Standalone identity-verification step a guest is sent to mid-checkout (see
 * BookingPage's requiresIdentityVerification / IDENTITY_VERIFICATION_REQUIRED
 * handling). The booking that triggered this already exists and is untouched
 * while the guest verifies - "Continue to payment" simply resumes it.
 */
function IdentityVerificationPage() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [approved, setApproved] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState('');

  async function handleContinueToPayment() {
    if (!bookingId) return;
    setResuming(true);
    setError('');
    try {
      const res = await apiClient.post(`/bookings/${bookingId}/payment`);
      const url = res.data.data?.authorizationUrl;
      if (url) {
        window.location.href = url;
        return;
      }
      setError('Payment gateway unavailable. Please try again.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resume payment. Please try again.');
    } finally {
      setResuming(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-6">
        <div className="mb-8 rounded-2xl border border-[#E3E8EF] bg-white px-5 py-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)] sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#C49A6C]">Trust &amp; safety</p>
        <h1 className="mb-2 mt-1 text-2xl font-bold text-[#0B1F42]">Verify your identity</h1>
        <p className="mb-2 text-[#52606F]">
          {bookingId
            ? "We need to verify who you are before confirming payment. Your booking dates are held while you complete this - you won't lose your spot."
            : 'We verify every guest before confirming payment on a booking.'}
        </p>
        </div>

        {bookingId && approved && (
          <div className="mb-8 rounded-2xl border border-[#BDE2C8] bg-[#E8F4EC] p-5">
            <p className="text-green-800 font-semibold mb-3">You&apos;re verified! You can now complete payment.</p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <button
              onClick={handleContinueToPayment}
              disabled={resuming}
              className="min-h-[44px] rounded-lg bg-[#0B1F42] px-6 py-2.5 font-semibold text-white transition-all duration-200 hover:bg-[#07072E] disabled:opacity-50"
            >
              {resuming ? 'Redirecting...' : 'Continue to payment'}
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-[#E3E8EF] bg-white p-6 shadow-[0_8px_28px_rgba(11,31,66,0.08)]">
          <IdentityVerificationPanel onApproved={() => setApproved(true)} />
        </div>

        {bookingId && (
          <p className="mt-6 text-sm text-[#5B6B82]">
            Verification is usually reviewed within a day. You can safely close this page - your booking will be waiting for you in{' '}
            <Link to="/trips" className="font-semibold text-[#9A744A] hover:text-[#C49A6C]">My Trips</Link> once you return.
          </p>
        )}
      </main>
    </div>
  );
}

export default IdentityVerificationPage;
