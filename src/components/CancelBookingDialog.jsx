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
      <div className="relative bg-white rounded-[14px] border border-[#E5E7EB] shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold text-[#0B0B45] mb-1">Cancel this booking?</h3>
        <p className="text-sm font-semibold text-[#1f2937]">{booking.property?.title || 'Property'}</p>
        {formatDates(booking.checkIn, booking.checkOut) && (
          <p className="text-xs text-[#6b7280] mb-3">{formatDates(booking.checkIn, booking.checkOut)}</p>
        )}

        <p className="text-sm text-[#6b7280] leading-relaxed mb-4">
          {paid
            ? 'This stay has already been paid for. Cancelling releases the dates and flags your refund for processing - refunds are sent manually, so it may take a little time.'
            : 'This booking has not been paid for yet. Cancelling releases these dates right away.'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={performing}
            className="px-4 py-2 text-sm font-semibold rounded-full text-[#6b7280] shadow-sm hover:shadow-md hover:bg-gray-50 transition-shadow disabled:opacity-50"
          >
            Keep booking
          </button>
          <button
            onClick={handleConfirm}
            disabled={performing}
            className="px-4 py-2 text-sm font-semibold rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
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
