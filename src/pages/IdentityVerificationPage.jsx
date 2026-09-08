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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <h1 className="text-2xl font-bold text-[#222222] mb-2">Verify your identity</h1>
        <p className="text-[#6b7280] mb-8">
          {bookingId
            ? "We need to verify who you are before confirming payment. Your booking dates are held while you complete this - you won't lose your spot."
            : 'We verify every guest before confirming payment on a booking.'}
        </p>

        {bookingId && approved && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-[14px] p-5">
            <p className="text-green-800 font-semibold mb-3">You&apos;re verified! You can now complete payment.</p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <button
              onClick={handleContinueToPayment}
              disabled={resuming}
              className="min-h-[44px] px-6 py-2.5 rounded-lg font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-all duration-200 disabled:opacity-50"
            >
              {resuming ? 'Redirecting...' : 'Continue to payment'}
            </button>
          </div>
        )}

        <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-6 shadow-md">
          <IdentityVerificationPanel onApproved={() => setApproved(true)} />
        </div>

        {bookingId && (
          <p className="text-sm text-[#6b7280] mt-6">
            Verification is usually reviewed within a day. You can safely close this page - your booking will be waiting for you in{' '}
            <Link to="/trips" className="text-[#2563EB] font-semibold hover:text-[#1D4ED8]">My Trips</Link> once you return.
          </p>
        )}
      </main>
    </div>
  );
}

export default IdentityVerificationPage;
