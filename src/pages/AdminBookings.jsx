import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Dropdown as FlowbiteDropdown,
  DropdownItem,
  Label,
  Select,
  Textarea,
  TextInput,
} from 'flowbite-react';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const BOOKING_TABS = [
  { id: 'all', label: 'All bookings', status: '' },
  { id: 'upcoming', label: 'Upcoming', status: 'CONFIRMED' },
  { id: 'payment', label: 'Payment review', status: 'PENDING' },
  { id: 'cancelled', label: 'Cancelled', status: 'CANCELLED' },
];

const BED_OPTIONS = [
  { value: '', label: 'Select bedroom option' },
  { value: '1bed', label: '1 Bedroom' },
  { value: '2bed', label: '2 Bedroom' },
];

const CHECK_OUT_OPTIONS = [
  { value: '10:00', label: '10:00 AM (Standard)' },
  { value: '11:00', label: '11:00 AM (+1/4 night)' },
  { value: '12:00', label: '12:00 PM (+1/2 night)' },
  { value: '13:00', label: '1:00 PM (+1 full night)' },
];

function SearchIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm4 2a2 2 0 100-4 2 2 0 000 4z" />
    </svg>
  );
}

function ConfirmDialog({ open, title, message, confirmLabel, confirmClass, onConfirm, onCancel, busy }) {
  if (!open) return null;

  return (
    <div className="op-admin-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="op-admin-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-confirm-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h3 id="booking-confirm-title">{title}</h3>
        <p>{message}</p>
        <div className="op-admin-dialog-actions">
          <Button color="light" onClick={onCancel} disabled={busy}>Keep</Button>
          <Button className={confirmClass} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working...' : confirmLabel}
          </Button>
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
  busy: PropTypes.bool,
};

function EditBookingModal({ booking, onClose, onSaved }) {
  const [form, setForm] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    bedOption: '',
    checkInTime: '',
    checkOutTime: '10:00',
    specialRequests: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!booking) return;
    const toDateStr = (date) => new Date(date).toISOString().split('T')[0];
    setForm({
      checkIn: toDateStr(booking.checkIn),
      checkOut: toDateStr(booking.checkOut),
      guests: booking.guests || 1,
      bedOption: booking.bedOption || '',
      checkInTime: booking.checkInTime || '',
      checkOutTime: booking.checkOutTime || '10:00',
      specialRequests: booking.specialRequests || '',
    });
    setError('');
  }, [booking]);

  if (!booking) return null;

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (new Date(form.checkOut) <= new Date(form.checkIn)) {
      setError('Check-out date must be after the check-in date.');
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.put(`/admin/bookings/${booking.id}`, {
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: Number(form.guests),
        bedOption: form.bedOption || null,
        checkInTime: form.checkInTime || null,
        checkOutTime: form.checkOutTime || null,
        specialRequests: form.specialRequests || null,
      });
      onSaved(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update booking.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="op-admin-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="op-admin-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-edit-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="op-admin-dialog-heading">
          <div>
            <p className="op-admin-eyebrow">BOOKING {bookingReference(booking.id)}</p>
            <h2 id="booking-edit-title">Edit booking details</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close edit booking dialog">&times;</button>
        </div>

        {error && <div className="op-admin-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="op-admin-booking-form">
          <div className="op-admin-form-grid">
            <div>
              <Label htmlFor="booking-check-in">Check-in</Label>
              <TextInput id="booking-check-in" type="date" value={form.checkIn} onChange={updateField('checkIn')} required />
            </div>
            <div>
              <Label htmlFor="booking-check-out">Check-out</Label>
              <TextInput id="booking-check-out" type="date" value={form.checkOut} onChange={updateField('checkOut')} required />
            </div>
          </div>

          <div className="op-admin-form-grid">
            <div>
              <Label htmlFor="booking-guests">Guests</Label>
              <TextInput id="booking-guests" type="number" min="1" max="6" value={form.guests} onChange={updateField('guests')} required />
            </div>
            <div>
              <Label htmlFor="booking-bed-option">Bedroom option</Label>
              <Select id="booking-bed-option" value={form.bedOption} onChange={updateField('bedOption')}>
                {BED_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </div>
          </div>

          <div className="op-admin-form-grid">
            <div>
              <Label htmlFor="booking-check-in-time">Check-in time</Label>
              <TextInput id="booking-check-in-time" type="time" value={form.checkInTime} onChange={updateField('checkInTime')} />
            </div>
            <div>
              <Label htmlFor="booking-check-out-time">Check-out time</Label>
              <Select id="booking-check-out-time" value={form.checkOutTime} onChange={updateField('checkOutTime')}>
                {CHECK_OUT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="booking-special-requests">Special requests</Label>
            <Textarea id="booking-special-requests" rows={3} value={form.specialRequests} onChange={updateField('specialRequests')} />
          </div>

          <div className="op-admin-dialog-actions">
            <Button color="light" type="button" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="op-admin-bronze-button" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
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

function formatTime12h(time) {
  if (!time) return 'Not set';
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute || 0).padStart(2, '0')} ${period}`;
}

function isLateCheckout(time) {
  if (!time) return false;
  const [hour, minute] = time.split(':').map(Number);
  return hour > 10 || (hour === 10 && minute > 0);
}

function bookingReference(id = '') {
  const compact = String(id).replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase();
  return `#ZL-${compact || '----'}`;
}

function relativeBookingTime(dateValue) {
  if (!dateValue) return 'Recently created';
  const date = new Date(dateValue);
  const diff = Date.now() - date.getTime();
  if (diff >= 0 && diff < 60_000) return 'Just now';
  if (diff >= 0 && diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} min ago`;
  if (diff >= 0 && diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Booked today';
  return `Booked ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

function formatDateRange(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 'Dates not set';
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const startLabel = start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const endLabel = end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
}

function paymentMethodLabel(method) {
  const value = String(method || '').toUpperCase();
  if (value.includes('MPESA') || value.includes('M-PESA')) return 'M-Pesa';
  if (value.includes('CARD')) return 'Card';
  if (value.includes('BANK')) return 'Bank transfer';
  if (!value) return 'Payment method pending';
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function paymentSummary(booking) {
  const method = paymentMethodLabel(booking.paymentMethod);
  if (booking.paidAt) return `${method} - verified`;
  if (booking.status === 'CANCELLED') return `${method} - released`;
  return `${method} - checking`;
}

function statusMeta(booking) {
  if (booking.refundStatus === 'REFUND_PENDING') return { label: 'Refund pending', tone: 'danger' };
  if (booking.status === 'CONFLICT') return { label: 'Needs review', tone: 'warning' };
  if (booking.status === 'CONFIRMED') return { label: 'Confirmed', tone: 'success' };
  if (booking.status === 'CANCELLED') return { label: 'Cancelled', tone: 'danger' };
  if (booking.status === 'PENDING') return { label: 'Payment pending', tone: 'warning' };
  return { label: String(booking.status || 'Unknown').replaceAll('_', ' ').toLowerCase(), tone: 'neutral' };
}

function bedSummary(booking) {
  if (booking.bedOption === '2bed') return '2 bedrooms';
  if (booking.bedOption === '1bed') return '1 bedroom';
  return booking.property?.bedrooms ? `${booking.property.bedrooms} bedrooms` : 'Bedrooms not set';
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function AdminBookings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [editingBooking, setEditingBooking] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const selectedTab = BOOKING_TABS.find((tab) => tab.id === activeTab) || BOOKING_TABS[0];

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedTab.status) params.status = selectedTab.status;
      const response = await apiClient.get(isAdmin ? '/admin/bookings' : '/bookings/host', { params });
      setBookings(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Bookings could not be loaded. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedTab.status]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const visibleBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bookings.filter((booking) => {
      if (selectedTab.id === 'upcoming' && new Date(booking.checkIn) < today) return false;
      if (!query) return true;

      const haystack = [
        booking.id,
        bookingReference(booking.id),
        booking.user?.firstName,
        booking.user?.lastName,
        booking.user?.email,
        booking.property?.title,
        booking.property?.location,
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [bookings, search, selectedTab.id]);

  async function handleStatusChange(id, status) {
    setActionLoading(true);
    setError('');
    try {
      const response = await apiClient.patch(`/admin/bookings/${id}/status`, { status });
      const updated = response.data.data || {};
      setBookings((current) => current.map((booking) => (
        booking.id === id ? { ...booking, ...updated, status } : booking
      )));
      setCancelTarget(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update booking status.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(id) {
    setActionLoading(true);
    setError('');
    try {
      await apiClient.delete(`/admin/bookings/${id}`);
      setBookings((current) => current.filter((booking) => booking.id !== id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete booking.');
    } finally {
      setActionLoading(false);
    }
  }

  function handleEditSaved(updated) {
    setBookings((current) => current.map((booking) => (
      booking.id === updated.id ? { ...booking, ...updated } : booking
    )));
    setEditingBooking(null);
  }

  function exportBookings() {
    const rows = visibleBookings.map((booking) => [
      bookingReference(booking.id),
      booking.user?.firstName || '',
      booking.user?.lastName || '',
      booking.user?.email || '',
      booking.property?.title || '',
      new Date(booking.checkIn).toLocaleDateString('en-GB'),
      new Date(booking.checkOut).toLocaleDateString('en-GB'),
      booking.guests || '',
      paymentSummary(booking),
      booking.total || 0,
      statusMeta(booking).label,
    ]);
    const header = ['Booking', 'First name', 'Last name', 'Guest email', 'Stay', 'Check-in', 'Check-out', 'Guests', 'Payment', 'Total KES', 'Status'];
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ZuriLofts_bookings_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderActions(booking) {
    if (!isAdmin) return null;

    const canConfirm = booking.status === 'PENDING';
    const canEdit = booking.status === 'CONFIRMED' || booking.status === 'CONFLICT';
    const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED' || booking.status === 'CONFLICT';
    const canDelete = booking.status === 'CANCELLED' || booking.status === 'CONFIRMED' || booking.status === 'CONFLICT';

    if (!canConfirm && !canEdit && !canCancel && !canDelete) return null;

    return (
      <FlowbiteDropdown
        inline
        arrowIcon={false}
        placement="bottom-end"
        label={<><span className="sr-only">Open actions for {bookingReference(booking.id)}</span><DotsIcon /></>}
        theme={{ inlineWrapper: 'op-admin-row-menu-trigger' }}
      >
        {canConfirm && <DropdownItem onClick={() => handleStatusChange(booking.id, 'CONFIRMED')}>Confirm booking</DropdownItem>}
        {canEdit && <DropdownItem onClick={() => setEditingBooking(booking)}>Edit details</DropdownItem>}
        {canCancel && <DropdownItem className="text-red-600" onClick={() => setCancelTarget(booking)}>Cancel booking</DropdownItem>}
        {canDelete && <DropdownItem className="text-red-600" onClick={() => setDeleteTarget(booking)}>Delete booking</DropdownItem>}
      </FlowbiteDropdown>
    );
  }

  return (
    <div className="op-admin-overview op-admin-bookings" data-openpencil-frame="0:3396">
      <div className="op-admin-heading op-admin-bookings-heading">
        <div>
          <h1>Bookings</h1>
          <p>Monitor reservations, payment state, and guest support issues.</p>
        </div>
        <div className="op-admin-bookings-tools">
          <div className="op-admin-booking-search">
            <SearchIcon />
            <TextInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search booking ID"
              aria-label="Search booking ID, guest, or stay"
            />
          </div>
          <Button color="light" onClick={exportBookings} disabled={!visibleBookings.length}>Export</Button>
        </div>
      </div>

      <div className="op-admin-bookings-tabs" role="tablist" aria-label="Booking filters">
        {BOOKING_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'is-active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="op-admin-error" role="alert">{error}</div>}

      <section className="op-admin-booking-board" aria-label="Bookings">
        <div className="op-admin-booking-scroll">
          <div className="op-admin-booking-table" role="table">
            <div className="op-admin-booking-columns" role="row">
              <span role="columnheader">BOOKING</span>
              <span role="columnheader">GUEST &amp; STAY</span>
              <span role="columnheader">DATES</span>
              <span role="columnheader">PAYMENT</span>
              <span role="columnheader">STATUS</span>
            </div>

            {loading ? (
              <div className="op-admin-booking-empty" role="row">
                <span className="op-admin-booking-spinner" aria-hidden="true" />
                <p>Loading bookings...</p>
              </div>
            ) : visibleBookings.length ? visibleBookings.map((booking) => {
              const status = statusMeta(booking);
              const actions = renderActions(booking);
              return (
                <div className="op-admin-booking-row" role="row" key={booking.id}>
                  <div role="cell" data-label="Booking">
                    <strong>{bookingReference(booking.id)}</strong>
                    <small>{relativeBookingTime(booking.createdAt)}</small>
                  </div>
                  <div role="cell" className="op-admin-booking-stay" data-label="Guest and stay">
                    <strong>{booking.user?.firstName || 'Guest'} {booking.user?.lastName || ''} - {booking.property?.title || 'Stay pending'}</strong>
                    <small>{booking.guests || 0} {booking.guests === 1 ? 'guest' : 'guests'} - {bedSummary(booking)}</small>
                  </div>
                  <div role="cell" className="op-admin-booking-dates" data-label="Dates">
                    <strong>{formatDateRange(booking.checkIn, booking.checkOut)}</strong>
                    <small>
                      In {formatTime12h(booking.checkInTime || '15:00')} / Out {formatTime12h(booking.checkOutTime || '10:00')}
                      {isLateCheckout(booking.checkOutTime) && booking.lateCheckoutFee > 0 ? ` - +KES ${booking.lateCheckoutFee.toLocaleString()}` : ''}
                    </small>
                  </div>
                  <div role="cell" className="op-admin-booking-payment" data-label="Payment">
                    <strong>{paymentSummary(booking)}</strong>
                    <small>KES {Number(booking.total || 0).toLocaleString()}</small>
                  </div>
                  <div role="cell" className="op-admin-booking-status" data-label="Status">
                    <span className={`op-admin-booking-pill is-${status.tone}`}>{status.label}</span>
                    {actions && <div className="op-admin-booking-actions">{actions}</div>}
                    {!isAdmin && <small>View only</small>}
                  </div>
                </div>
              );
            }) : (
              <div className="op-admin-booking-empty" role="row">
                <strong>No bookings in this view</strong>
                <p>{search ? 'Try a different booking, guest, or stay search.' : 'New reservations will appear here when guests book a stay.'}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <EditBookingModal
        booking={editingBooking}
        onClose={() => setEditingBooking(null)}
        onSaved={handleEditSaved}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel booking"
        message={cancelTarget
          ? `Cancel ${bookingReference(cancelTarget.id)} for ${cancelTarget.user?.firstName || 'this guest'} at ${cancelTarget.property?.title || 'this stay'}? The dates will be released.`
          : ''}
        confirmLabel="Cancel booking"
        confirmClass="op-admin-danger-button"
        onConfirm={() => handleStatusChange(cancelTarget.id, 'CANCELLED')}
        onCancel={() => setCancelTarget(null)}
        busy={actionLoading}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete booking"
        message={deleteTarget
          ? `Permanently delete ${bookingReference(deleteTarget.id)} for ${deleteTarget.user?.firstName || 'this guest'}? This cannot be undone.`
          : ''}
        confirmLabel="Delete forever"
        confirmClass="op-admin-danger-button"
        onConfirm={() => handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        busy={actionLoading}
      />
    </div>
  );
}

export default AdminBookings;
