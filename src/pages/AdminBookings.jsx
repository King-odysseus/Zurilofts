import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Dropdown from '../components/Dropdown.jsx';
import Pagination from '../components/Pagination.jsx';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const BED_OPTIONS = [
  { value: '1bed', label: '1 Bedroom' },
  { value: '2bed', label: '2 Bedroom' },
];

const CHECK_OUT_OPTIONS = [
  { value: '10:00', label: '10:00 AM (Standard)' },
  { value: '11:00', label: '11:00 AM (+¼ night)' },
  { value: '12:00', label: '12:00 PM (+½ night)' },
  { value: '13:00', label: '1:00 PM (+1 full night)' },
];

// ── Semantic status metadata (label + soft badge) ─────────────────────────
const STATUS_META = {
  PENDING: { label: 'Pending', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  CONFIRMED: { label: 'Confirmed', badge: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  CANCELLED: { label: 'Cancelled', badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
};

const REFUND_META = {
  REFUND_PENDING: { label: 'Refund pending', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  REFUNDED: { label: 'Refunded', badge: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  REFUND_DECLINED: { label: 'Refund declined', badge: 'bg-gray-50 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
};

function Badge({ label, className, dot }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {label}
    </span>
  );
}

Badge.propTypes = {
  label: PropTypes.string.isRequired,
  className: PropTypes.string.isRequired,
  dot: PropTypes.string,
};

function StatusBadges({ booking }) {
  const status = STATUS_META[booking.status] || {
    label: booking.status,
    badge: 'bg-gray-50 text-gray-600 border-gray-200',
    dot: 'bg-gray-400',
  };
  const refund = booking.status === 'CANCELLED' ? REFUND_META[booking.refundStatus] : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge label={status.label} className={status.badge} dot={status.dot} />
      {refund && <Badge label={refund.label} className={refund.badge} dot={refund.dot} />}
    </div>
  );
}

StatusBadges.propTypes = {
  booking: PropTypes.object.isRequired,
};

function PaymentBadge({ booking }) {
  if (booking.paidAt) {
    return (
      <Badge
        label={`Paid${booking.paymentChannel ? ` · ${booking.paymentChannel}` : ''}`}
        className="bg-green-50 text-green-700 border-green-200"
        dot="bg-green-500"
      />
    );
  }
  return (
    <Badge label="Unpaid" className="bg-gray-50 text-gray-500 border-gray-200" dot="bg-gray-400" />
  );
}

PaymentBadge.propTypes = {
  booking: PropTypes.object.isRequired,
};

function BookingTimes({ booking }) {
  const checkoutLate = isLateCheckout(booking.checkOutTime);
  return (
    <span className="text-xs">
      <span className="text-[#6b7280]">In </span>
      {formatTime12h(booking.checkInTime || '15:00')}
      <span className="text-[#6b7280]"> · Out </span>
      <span className={checkoutLate ? 'text-amber-600 font-semibold' : ''}>
        {formatTime12h(booking.checkOutTime || '10:00')}
      </span>
      {booking.lateCheckoutFee > 0 && (
        <span className="ml-1 text-[10px] text-amber-600 font-medium">
          +KES {booking.lateCheckoutFee.toLocaleString()}
        </span>
      )}
    </span>
  );
}

BookingTimes.propTypes = {
  booking: PropTypes.object.isRequired,
};

// ── Shared button primitive ───────────────────────────────────────────────
function ActionButton({ variant = 'secondary', size = 'sm', className = '', disabled, onClick, title, children }) {
  const sizes = {
    sm: 'min-h-[32px] px-3 py-1.5 text-xs',
    md: 'min-h-[44px] px-4 py-2 text-sm',
  };
  const variants = {
    primary: 'bg-[#C49A6C] text-white hover:bg-[#B8895C]',
    secondary: 'bg-white border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5]',
    danger: 'bg-[#dc2626] text-white hover:bg-[#b91c1c]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

ActionButton.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  size: PropTypes.oneOf(['sm', 'md']),
  className: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  title: PropTypes.string,
  children: PropTypes.node,
};

// ── Row actions (identical logic for table + mobile cards) ────────────────
function BookingActions({
  booking,
  isAdmin,
  actionLoading,
  size,
  className = '',
  onConfirm,
  onCancel,
  onEdit,
  onDelete,
  onView,
  onMarkRefunded,
  onDeclineRefund,
}) {
  if (!isAdmin) {
    return <span className="text-xs text-[#6b7280]">View only</span>;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <ActionButton variant="secondary" size={size} onClick={() => onView(booking)}>View</ActionButton>
      {booking.status === 'PENDING' && (
        <>
          <ActionButton variant="primary" size={size} disabled={actionLoading} onClick={() => onConfirm(booking.id)}>
            Confirm
          </ActionButton>
          <ActionButton variant="secondary" size={size} disabled={actionLoading} onClick={() => onCancel(booking)}>
            Cancel
          </ActionButton>
        </>
      )}

      {booking.status === 'CONFIRMED' && (
        <>
          <ActionButton variant="secondary" size={size} disabled={actionLoading} onClick={() => onEdit(booking)}>
            Edit
          </ActionButton>
          <ActionButton variant="secondary" size={size} disabled={actionLoading} onClick={() => onCancel(booking)}>
            Cancel
          </ActionButton>
          <ActionButton variant="danger" size={size} disabled={actionLoading} onClick={() => onDelete(booking)}>
            Delete
          </ActionButton>
        </>
      )}

      {booking.status === 'CANCELLED' && booking.refundStatus === 'REFUND_PENDING' && (
        <>
          <ActionButton
            variant="primary"
            size={size}
            disabled={actionLoading}
            onClick={() => onMarkRefunded(booking.id)}
            title="Send the guest's refund from the Paystack dashboard, then mark it done"
          >
            Mark refunded
          </ActionButton>
          <ActionButton variant="secondary" size={size} disabled={actionLoading} onClick={() => onDeclineRefund(booking.id)}>
            Decline refund
          </ActionButton>
        </>
      )}

      {booking.status === 'CANCELLED' && (
        <ActionButton variant="danger" size={size} disabled={actionLoading} onClick={() => onDelete(booking)}>
          Delete
        </ActionButton>
      )}
    </div>
  );
}

BookingActions.propTypes = {
  booking: PropTypes.object.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  actionLoading: PropTypes.bool.isRequired,
  size: PropTypes.oneOf(['sm', 'md']),
  className: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onView: PropTypes.func.isRequired,
  onMarkRefunded: PropTypes.func.isRequired,
  onDeclineRefund: PropTypes.func.isRequired,
};

function ConfirmDialog({ open, title, message, confirmLabel, confirmClass, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel}></div>
      <div className="relative bg-white rounded-[14px] border border-[#E5E7EB] shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-bold text-[#222222] mb-2">{title}</h3>
        <p className="text-sm text-[#6b7280] mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg text-sm font-semibold bg-white border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-all"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg text-sm font-semibold text-white transition-all ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

ConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  confirmLabel: PropTypes.string.isRequired,
  confirmClass: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

function EditBookingModal({ booking, onClose, onSaved }) {
  const [form, setForm] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    bedOption: '',
    checkInTime: '',
    checkOutTime: '',
    specialRequests: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!booking) return;
    const toDateStr = (d) => {
      const date = new Date(d);
      return date.toISOString().split('T')[0];
    };
    setForm({
      checkIn: toDateStr(booking.checkIn),
      checkOut: toDateStr(booking.checkOut),
      guests: booking.guests,
      bedOption: booking.bedOption || '',
      checkInTime: booking.checkInTime || '',
      checkOutTime: booking.checkOutTime || '',
      specialRequests: booking.specialRequests || '',
    });
  }, [booking]);

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (new Date(form.checkOut) <= new Date(form.checkIn)) {
      setError('Check-out date must be after check-in date.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.put(`/admin/bookings/${booking.id}`, {
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: Number(form.guests),
        bedOption: form.bedOption || null,
        checkInTime: form.checkInTime || null,
        checkOutTime: form.checkOutTime || null,
        specialRequests: form.specialRequests || null,
      });
      onSaved(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update booking.');
    } finally {
      setSaving(false);
    }
  }

  if (!booking) return null;

  const fieldClass =
    'w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm text-[#222222] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-[14px] border border-[#E5E7EB] shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-[#222222]">Edit Booking</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#F7F7F5] hover:text-[#222222] transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#222222] mb-1">Check-in</label>
              <input
                type="date"
                value={form.checkIn}
                onChange={set('checkIn')}
                className={fieldClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#222222] mb-1">Check-out</label>
              <input
                type="date"
                value={form.checkOut}
                onChange={set('checkOut')}
                className={fieldClass}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#222222] mb-1">Guests</label>
              <input
                type="number"
                min="1"
                max="6"
                value={form.guests}
                onChange={set('guests')}
                className={fieldClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#222222] mb-1">Bed Option</label>
              <Dropdown
                value={form.bedOption}
                onChange={(v) => setForm((prev) => ({ ...prev, bedOption: v }))}
                options={BED_OPTIONS}
                triggerClassName={fieldClass}
                placeholder="Select..."
                ariaLabel="Bed option"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#222222] mb-1">Check-in Time</label>
              <input
                type="time"
                value={form.checkInTime}
                onChange={set('checkInTime')}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#222222] mb-1">Check-out Time</label>
              <Dropdown
                value={form.checkOutTime || '10:00'}
                onChange={(v) => setForm((prev) => ({ ...prev, checkOutTime: v }))}
                options={CHECK_OUT_OPTIONS}
                triggerClassName={fieldClass}
                ariaLabel="Check-out time"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1">Special Requests</label>
            <textarea
              value={form.specialRequests}
              onChange={set('specialRequests')}
              rows={2}
              className={`${fieldClass} resize-none min-h-[44px]`}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[44px] rounded-lg bg-[#C49A6C] text-white font-semibold text-sm hover:bg-[#B8895C] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

EditBookingModal.propTypes = {
  booking: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

// ── Helpers ────────────────────────────────────────────────────────────────
function formatTime12h(time) {
  if (!time) return '-';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

function isLateCheckout(time) {
  if (!time) return false;
  const [h, m] = time.split(':').map(Number);
  return h > 10 || (h === 10 && m > 0);
}

function AdminBookings() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';
  const PAGE_SIZE = 20;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Modal / dialog state
  const [editingBooking, setEditingBooking] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      // Admins see all bookings; hosts only those on their own listings.
      const res = await apiClient.get(isAdmin ? '/admin/bookings' : '/bookings/host', { params });
      setBookings(res.data.data || []);
      setPagination(res.data.pagination || null);
    } catch (err) { console.error('AdminBookings error', err); }
    finally { setLoading(false); }
  }, [statusFilter, page, isAdmin]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  async function handleStatusChange(id, status) {
    setActionLoading(true);
    try {
      const res = await apiClient.patch(`/admin/bookings/${id}/status`, { status });
      const updated = res.data.data || { status };
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
      toast.success(
        status === 'CONFIRMED'
          ? 'Booking confirmed.'
          : updated.refundStatus === 'REFUND_PENDING'
            ? 'Booking cancelled - refund flagged for processing.'
            : 'Booking cancelled and dates released.'
      );
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update booking status');
    } finally {
      setActionLoading(false);
      setCancelTarget(null);
    }
  }

  async function handleRefundResolve(id, action) {
    setActionLoading(true);
    try {
      const res = await apiClient.patch(`/admin/bookings/${id}/refund`, { action });
      const updated = res.data.data || { refundStatus: action };
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
      toast.success(action === 'REFUNDED' ? 'Refund marked as sent.' : 'Refund request declined.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update refund status');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(id) {
    setActionLoading(true);
    try {
      await apiClient.delete(`/admin/bookings/${id}`);
      if (bookings.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        setBookings((prev) => prev.filter((b) => b.id !== id));
      }
      toast.success('Booking deleted.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete booking');
    } finally {
      setActionLoading(false);
      setDeleteTarget(null);
    }
  }

  function handleEditSaved(updated) {
    setBookings((prev) =>
      prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
    );
    setEditingBooking(null);
  }

  const actionHandlers = {
    onConfirm: (id) => handleStatusChange(id, 'CONFIRMED'),
    onCancel: setCancelTarget,
    onEdit: setEditingBooking,
    onDelete: setDeleteTarget,
    onView: setViewingBooking,
    onMarkRefunded: (id) => handleRefundResolve(id, 'REFUNDED'),
    onDeclineRefund: (id) => handleRefundResolve(id, 'REFUND_DECLINED'),
  };

  const emptyMessage =
    pagination && pagination.totalPages > 1
      ? 'No bookings on this page.'
      : `No bookings found${statusFilter ? ` with status "${statusFilter}"` : ''}.`;

  const showPagination = pagination?.total != null || (pagination?.totalPages ?? 1) > 1;

  return (
    <div>
      <div className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 sm:px-6 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222222]">Bookings</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Review, confirm and manage every stay.</p>
        </div>
        <Dropdown
          value={statusFilter}
          onChange={(v) => { setPage(1); setStatusFilter(v); }}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'CONFIRMED', label: 'Confirmed' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
          triggerClassName="w-48 min-h-[44px] px-4 rounded-xl bg-white border border-[#E5E7EB] text-sm text-[#222222] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
          placeholder="All Statuses"
          ariaLabel="Filter by status"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          ['Bookings in view', bookings.length],
          ['Pending', bookings.filter((b) => b.status === 'PENDING').length],
          ['Confirmed', bookings.filter((b) => b.status === 'CONFIRMED').length],
          ['Cancelled', bookings.filter((b) => b.status === 'CANCELLED').length],
        ].map(([label, value]) => <div key={label} className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">{label}</p><p className="mt-2 text-2xl font-bold text-[#222222]">{value}</p></div>)}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b7280]">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm">Loading bookings…</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F7F7F5] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Guest</th>
                    <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Property</th>
                    <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Check-in</th>
                    <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Check-out</th>
                    <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Times</th>
                    <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Guests</th>
                    <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Total</th>
                    <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Status</th>
                    <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Payment</th>
                    <th className="text-right py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-[#E5E7EB]/60 last:border-0 hover:bg-[#F7F7F5]">
                      <td className="py-3 px-4 align-top">
                        <p className="font-semibold text-[#222222]">{b.user?.firstName} {b.user?.lastName}</p>
                        <p className="text-xs text-[#6b7280]">{b.user?.email}</p>
                      </td>
                      <td className="py-3 px-4 align-top text-[#222222]">{b.property?.title}</td>
                      <td className="py-3 px-4 align-top text-xs text-[#222222]">{new Date(b.checkIn).toLocaleDateString()}</td>
                      <td className="py-3 px-4 align-top text-xs text-[#222222]">{new Date(b.checkOut).toLocaleDateString()}</td>
                      <td className="py-3 px-4 align-top"><BookingTimes booking={b} /></td>
                      <td className="py-3 px-4 align-top text-[#222222]">{b.guests}</td>
                      <td className="py-3 px-4 align-top font-semibold text-[#222222]">KES {b.total.toLocaleString()}</td>
                      <td className="py-3 px-4 align-top"><StatusBadges booking={b} /></td>
                      <td className="py-3 px-4 align-top"><PaymentBadge booking={b} /></td>
                      <td className="py-3 px-4 align-top text-right">
                        <BookingActions
                          booking={b}
                          isAdmin={isAdmin}
                          actionLoading={actionLoading}
                          size="sm"
                          className="justify-end"
                          {...actionHandlers}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {bookings.length === 0 && (
              <div className="text-center py-16 text-[#6b7280]">
                <p className="text-sm">{emptyMessage}</p>
              </div>
            )}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {bookings.length === 0 ? (
              <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-8 text-center text-[#6b7280]">
                <p className="text-sm">{emptyMessage}</p>
              </div>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#222222]">{b.user?.firstName} {b.user?.lastName}</p>
                      <p className="text-xs text-[#6b7280]">{b.user?.email}</p>
                    </div>
                    <StatusBadges booking={b} />
                  </div>

                  <p className="text-sm font-semibold text-[#222222]">{b.property?.title}</p>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                    <div>
                      <p className="text-xs text-[#6b7280]">Check-in</p>
                      <p className="text-sm font-medium text-[#222222]">{new Date(b.checkIn).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6b7280]">Check-out</p>
                      <p className="text-sm font-medium text-[#222222]">{new Date(b.checkOut).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6b7280]">Times</p>
                      <BookingTimes booking={b} />
                    </div>
                    <div>
                      <p className="text-xs text-[#6b7280]">Guests</p>
                      <p className="text-sm font-medium text-[#222222]">{b.guests}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-3">
                    <span className="text-sm font-semibold text-[#222222]">KES {b.total.toLocaleString()}</span>
                    <PaymentBadge booking={b} />
                  </div>

                  <BookingActions
                    booking={b}
                    isAdmin={isAdmin}
                    actionLoading={actionLoading}
                    size="md"
                    {...actionHandlers}
                  />
                </div>
              ))
            )}
          </div>

          {/* Pagination footer */}
          {showPagination && (
            <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm">
              <Pagination
                page={pagination?.page ?? page}
                totalPages={pagination?.totalPages ?? 1}
                total={pagination?.total}
                limit={PAGE_SIZE}
                itemLabel="bookings"
                onPageChange={(p) => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {viewingBooking && (
        <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setViewingBooking(null)}>
          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-[#E5E7EB] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Booking details</p>
                <h2 className="mt-1 text-xl font-bold text-[#222222]">{viewingBooking.id}</h2>
              </div>
              <button type="button" onClick={() => setViewingBooking(null)} className="rounded-lg p-2 text-xl leading-none text-[#6b7280] hover:bg-[#F7F7F5]" aria-label="Close booking details">×</button>
            </div>
            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3">
                {viewingBooking.property?.images?.[0] && <img src={viewingBooking.property.images[0]} alt="" className="h-16 w-20 rounded-xl object-cover" />}
                <div><p className="font-semibold text-[#222222]">{viewingBooking.property?.title}</p><p className="text-sm text-[#6b7280]">{viewingBooking.property?.location}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-[#F7F7F5] p-3"><p className="text-xs text-[#6b7280]">Guest</p><p className="mt-1 font-semibold text-[#222222]">{viewingBooking.user?.firstName} {viewingBooking.user?.lastName}</p></div>
                <div className="rounded-xl bg-[#F7F7F5] p-3"><p className="text-xs text-[#6b7280]">Guests</p><p className="mt-1 font-semibold text-[#222222]">{viewingBooking.guests}</p></div>
                <div className="rounded-xl bg-[#F7F7F5] p-3"><p className="text-xs text-[#6b7280]">Check-in</p><p className="mt-1 font-semibold text-[#222222]">{new Date(viewingBooking.checkIn).toLocaleDateString()}</p></div>
                <div className="rounded-xl bg-[#F7F7F5] p-3"><p className="text-xs text-[#6b7280]">Check-out</p><p className="mt-1 font-semibold text-[#222222]">{new Date(viewingBooking.checkOut).toLocaleDateString()}</p></div>
              </div>
              <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-4"><span className="text-sm text-[#6b7280]">Total</span><span className="text-lg font-bold text-[#222222]">KES {viewingBooking.total.toLocaleString()}</span></div>
              <div className="flex flex-wrap gap-2"><StatusBadges booking={viewingBooking} /><PaymentBadge booking={viewingBooking} /></div>
            </div>
          </aside>
        </div>
      )}
      <EditBookingModal
        booking={editingBooking}
        onClose={() => setEditingBooking(null)}
        onSaved={handleEditSaved}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel Booking"
        message={
          cancelTarget
            ? `Cancel booking for ${cancelTarget.user?.firstName} ${cancelTarget.user?.lastName} at ${cancelTarget.property?.title}? This will free up the dates.`
            : ''
        }
        confirmLabel="Yes, Cancel Booking"
        confirmClass="bg-[#dc2626] hover:bg-[#b91c1c]"
        onConfirm={() => handleStatusChange(cancelTarget.id, 'CANCELLED')}
        onCancel={() => setCancelTarget(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Booking"
        message={
          deleteTarget
            ? `Permanently delete booking for ${deleteTarget.user?.firstName} ${deleteTarget.user?.lastName} at ${deleteTarget.property?.title}? This cannot be undone.`
            : ''
        }
        confirmLabel="Yes, Delete Forever"
        confirmClass="bg-[#dc2626] hover:bg-[#b91c1c]"
        onConfirm={() => handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default AdminBookings;
