import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Dropdown from '../components/Dropdown.jsx';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const BED_OPTIONS = [
  { value: '1bed', label: '1 Bedroom' },
  { value: '2bed', label: '2 Bedroom' },
];

function ConfirmDialog({ open, title, message, confirmLabel, confirmClass, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel}></div>
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-bold text-[#0B0B45] mb-2">{title}</h3>
        <p className="text-[#6b7280] text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold rounded-full border border-[#D9D9D9] text-[#6b7280] hover:bg-gray-50"
          >
            Keep
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded-full text-white ${confirmClass}`}
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-[#0B0B45]">Edit Booking</h3>
          <button onClick={onClose} className="text-[#6b7280] hover:text-[#1f2937] text-xl leading-none">&times;</button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6b7280] mb-1">Check-in</label>
              <input
                type="date"
                value={form.checkIn}
                onChange={set('checkIn')}
                className="w-full px-3 py-2 rounded-xl border border-[#D9D9D9] text-sm text-[#1f2937] focus:outline-none focus:border-[#C49A6C]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6b7280] mb-1">Check-out</label>
              <input
                type="date"
                value={form.checkOut}
                onChange={set('checkOut')}
                className="w-full px-3 py-2 rounded-xl border border-[#D9D9D9] text-sm text-[#1f2937] focus:outline-none focus:border-[#C49A6C]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6b7280] mb-1">Guests</label>
              <input
                type="number"
                min="1"
                max="6"
                value={form.guests}
                onChange={set('guests')}
                className="w-full px-3 py-2 rounded-xl border border-[#D9D9D9] text-sm text-[#1f2937] focus:outline-none focus:border-[#C49A6C]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6b7280] mb-1">Bed Option</label>
              <Dropdown
                value={form.bedOption}
                onChange={(v) => setForm((prev) => ({ ...prev, bedOption: v }))}
                options={BED_OPTIONS}
                triggerClassName="w-full px-3 py-2 rounded-xl border border-[#D9D9D9] text-sm text-[#1f2937] focus:outline-none focus:border-[#C49A6C]"
                placeholder="Select..."
                ariaLabel="Bed option"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6b7280] mb-1">Check-in Time</label>
              <input
                type="time"
                value={form.checkInTime}
                onChange={set('checkInTime')}
                className="w-full px-3 py-2 rounded-xl border border-[#D9D9D9] text-sm text-[#1f2937] focus:outline-none focus:border-[#C49A6C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6b7280] mb-1">Check-out Time</label>
              <input
                type="time"
                value={form.checkOutTime}
                onChange={set('checkOutTime')}
                className="w-full px-3 py-2 rounded-xl border border-[#D9D9D9] text-sm text-[#1f2937] focus:outline-none focus:border-[#C49A6C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6b7280] mb-1">Special Requests</label>
            <textarea
              value={form.specialRequests}
              onChange={set('specialRequests')}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-[#D9D9D9] text-sm text-[#1f2937] focus:outline-none focus:border-[#C49A6C] resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-full bg-[#C49A6C] text-white font-semibold text-sm hover:bg-[#b8895a] disabled:opacity-50"
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

function AdminBookings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modal / dialog state
  const [editingBooking, setEditingBooking] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchBookings(); }, [statusFilter]);

  async function fetchBookings() {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      // Admins see all bookings; hosts only those on their own listings.
      const res = await apiClient.get(isAdmin ? '/admin/bookings' : '/bookings/host', { params });
      setBookings(res.data.data || []);
    } catch (err) { console.error('AdminBookings error', err); }
    finally { setLoading(false); }
  }

  async function handleStatusChange(id, status) {
    setActionLoading(true);
    try {
      await apiClient.patch(`/admin/bookings/${id}/status`, { status });
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch {
      alert('Failed to update booking status');
    } finally {
      setActionLoading(false);
      setCancelTarget(null);
    }
  }

  async function handleDelete(id) {
    setActionLoading(true);
    try {
      await apiClient.delete(`/admin/bookings/${id}`);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch {
      alert('Failed to delete booking');
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-[#0B0B45]">Bookings</h1>
        <Dropdown
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'CONFIRMED', label: 'Confirmed' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
          triggerClassName="w-48 px-4 py-2.5 rounded-xl bg-white border border-[#D9D9D9] text-sm text-[#1f2937] focus:outline-none focus:border-[#C49A6C]"
          placeholder="All Statuses"
          ariaLabel="Filter by status"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-[#D9D9D9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8f9fa] border-b border-[#D9D9D9]">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Guest</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Property</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Check-in</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Check-out</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Guests</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Payment</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-[#D9D9D9]/50 hover:bg-[#f8f9fa]">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-[#0B0B45]">{b.user?.firstName} {b.user?.lastName}</p>
                        <p className="text-xs text-[#6b7280]">{b.user?.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">{b.property?.title}</td>
                    <td className="py-3 px-4 text-xs">{new Date(b.checkIn).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-xs">{new Date(b.checkOut).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{b.guests}</td>
                    <td className="py-3 px-4 font-semibold">KES {b.total.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                        b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{b.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      {b.paidAt ? (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          PAID {b.paymentChannel ? `· ${b.paymentChannel}` : ''}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                          UNPAID
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {!isAdmin && <span className="text-xs text-[#6b7280]">View only</span>}
                        {isAdmin && b.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(b.id, 'CONFIRMED')}
                              disabled={actionLoading}
                              className="px-3 py-1 text-xs font-semibold rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setCancelTarget(b)}
                              disabled={actionLoading}
                              className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {isAdmin && b.status === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => setEditingBooking(b)}
                              disabled={actionLoading}
                              className="px-3 py-1 text-xs font-semibold rounded-lg bg-[#0B0B45]/10 text-[#0B0B45] hover:bg-[#0B0B45]/20 disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setCancelTarget(b)}
                              disabled={actionLoading}
                              className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => setDeleteTarget(b)}
                              disabled={actionLoading}
                              className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </>
                        )}

                        {isAdmin && b.status === 'CANCELLED' && (
                          <button
                            onClick={() => setDeleteTarget(b)}
                            disabled={actionLoading}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bookings.length === 0 && (
            <div className="text-center py-12 text-[#6b7280]">No bookings found{statusFilter ? ` with status "${statusFilter}"` : ''}.</div>
          )}
        </div>
      )}

      {/* Edit Modal */}
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
        confirmClass="bg-red-600 hover:bg-red-700"
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
        confirmClass="bg-red-600 hover:bg-red-700"
        onConfirm={() => handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default AdminBookings;
