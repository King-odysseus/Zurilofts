import { useState } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

/** A booking a guest may still cancel themselves: an unpaid PENDING request, or
 *  a CONFIRMED stay whose check-in day has not yet begun. */
// This utility is intentionally exported alongside the dialog for booking-card guards.
// eslint-disable-next-line react-refresh/only-export-components
export function canCancelBooking(booking) {
  if (!booking) return false;
  if (booking.status === 'PENDING') return true;
  if (booking.status !== 'CONFIRMED') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(booking.checkIn) >= today;
}

function formatDates(checkIn, checkOut) {
  try {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const ciStr = ci.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const coStr = co.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${ciStr} - ${coStr}`;
  } catch {
    return '';
  }
}

/**
 * Confirmation dialog for a guest-initiated cancellation. Submits
 * POST /bookings/:id/cancel (server enforces ownership + money rules), then
 * reports success via onSuccess so the parent can refresh its list.
 */
function CancelBookingDialog({ booking, onClose, onSuccess }) {
  const toast = useToast();
  const [performing, setPerforming] = useState(false);
  const [error, setError] = useState('');

  if (!booking) return null;

  const paid = !!booking.paidAt;

  async function handleConfirm() {
    setPerforming(true);
    setError('');
    try {
      await apiClient.post(`/bookings/${booking.id}/cancel`);
      toast.success(
        paid
          ? 'Booking cancelled. Your refund has been flagged for processing.'
          : 'Booking cancelled. The dates have been released.',
        { title: 'Cancelled' }
      );
      onSuccess?.(booking);
      onClose?.();
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setPerforming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative w-full max-w-sm rounded-2xl border border-[#E3E8EF] bg-white p-6 shadow-[0_8px_28px_rgba(11,31,66,0.14)]">
        <h3 className="mb-1 text-lg font-bold text-[#0B1F42]">Cancel this booking?</h3>
        <p className="text-sm font-semibold text-[#0B1F42]">{booking.property?.title || 'Property'}</p>
        {formatDates(booking.checkIn, booking.checkOut) && (
          <p className="mb-3 text-xs text-[#5B6B82]">{formatDates(booking.checkIn, booking.checkOut)}</p>
        )}

        <p className="mb-4 text-sm leading-relaxed text-[#5B6B82]">
          {paid
            ? 'This stay has already been paid for. Cancelling releases the dates and flags your refund for processing - refunds are sent manually, so it may take a little time.'
            : 'This booking has not been paid for yet. Cancelling releases these dates right away.'}
        </p>

        {error && (
          <div className="mb-4 rounded-2xl border border-[#F1C9C9] bg-[#FDECEC] p-3 text-sm text-[#B42318]">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={performing}
            className="min-h-[44px] rounded-[10px] border border-[#E3E8EF] px-4 py-2 text-sm font-semibold text-[#0B1F42] transition-colors hover:bg-[#F7F4EF] disabled:opacity-50"
          >
            Keep booking
          </button>
          <button
            onClick={handleConfirm}
            disabled={performing}
            className="min-h-[44px] rounded-[10px] bg-[#B42318] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#8F1D15] disabled:opacity-50"
          >
            {performing ? 'Cancelling...' : 'Yes, cancel booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

CancelBookingDialog.propTypes = {
  booking: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    checkIn: PropTypes.string,
    checkOut: PropTypes.string,
    paidAt: PropTypes.string,
    property: PropTypes.shape({ title: PropTypes.string }),
  }),
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export default CancelBookingDialog;
