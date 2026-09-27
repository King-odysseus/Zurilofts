import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import Spinner from '../components/Spinner.jsx';
import CancelBookingDialog, { canCancelBooking } from '../components/CancelBookingDialog.jsx';
import apiClient from '../api/client.js';
import { generateInvoice } from '../utils/invoice.js';

// --- Helpers ---
const STATUS_STYLES = {
  PENDING:   { bg: 'bg-[#FDE8D8] text-[#9A4A1D]', label: 'Pending', icon: 'clock' },
  CONFIRMED: { bg: 'bg-[#E8F4EC] text-[#287A45]', label: 'Confirmed', icon: 'check' },
  CANCELLED: { bg: 'bg-[#FDECEC] text-[#B42318]', label: 'Cancelled', icon: 'x' },
};

function StatusBadge({ status }) {
  const meta = STATUS_STYLES[status] || { bg: 'bg-[#5B6B82]', label: status, icon: null };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.bg}`}>
      {meta.icon === 'check' && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {meta.icon === 'x' && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {meta.icon === 'clock' && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {meta.label}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
};

function formatDate(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatCurrency(n) {
  if (n == null) return '-';
  return `KES ${Number(n).toLocaleString()}`;
}

function BookingHistoryPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancelTarget, setCancelTarget] = useState(null);
  const navigate = useNavigate();

  // Open (or create) the reservation conversation for a booking, then go to it.
  // The endpoint is idempotent, so it is safe to click repeatedly.
  async function openConversation(bookingId) {
    try {
      const res = await apiClient.post('/conversations', { bookingId });
      const conversation = res.data.data;
      navigate(`/inbox/${conversation.id}`);
    } catch (err) {
      console.error('Failed to open conversation', err);
    }
  }

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await apiClient.get('/bookings', { params });
      setBookings(res.data.data || []);
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const filtered = useMemo(() => {
    const now = new Date(); // "now" must be evaluated per computation, not per render
    let list = bookings;
    if (statusFilter === 'upcoming') {
      list = list.filter((b) => b.status === 'CONFIRMED' && new Date(b.checkIn) >= now);
    } else if (statusFilter === 'past') {
      list = list.filter((b) => b.status === 'CONFIRMED' && new Date(b.checkOut) < now);
    } else if (statusFilter === 'cancelled') {
      list = list.filter((b) => b.status === 'CANCELLED');
    }
    return list;
  }, [bookings, statusFilter]);

  const STATUS_FILTERS = [
    { value: 'all',      label: 'All Bookings' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past',     label: 'Past' },
    { value: 'cancelled',label: 'Cancelled' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas">
        <Navbar />
        <div className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
          <Spinner />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto w-full max-w-[1344px] px-4 pb-16 pt-24 sm:px-6 md:px-8">
        <div className="mb-6 rounded-2xl border border-[#E3E8EF] bg-white px-5 py-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)] sm:px-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#C49A6C]">Your stays</p>
        <h1 className="mb-2 text-2xl font-bold text-[#0B1F42]">My Bookings</h1>
        <p className="mb-6 text-[#5B6B82]">
          {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
        </p>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {STATUS_FILTERS.map((sf) => (
            <button
              key={sf.value}
              onClick={() => setStatusFilter(sf.value)}
              className={`min-h-[44px] px-4 rounded-full text-sm font-semibold transition-all duration-200 ${
                statusFilter === sf.value
                  ? 'bg-[#0B1F42] text-white'
                  : 'border border-[#E3E8EF] bg-white text-[#52606F] hover:bg-[#F7F4EF]'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>

        {/* Booking cards */}
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center min-h-[30vh] py-12">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-[#F7F4EF] border border-[#E3E8EF] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-[#5B6B82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mb-1 text-lg font-bold text-[#0B1F42]">No bookings found</h3>
              <p className="text-[#5B6B82]">
                Try adjusting your filters or{' '}
                <Link to="/properties" className="font-semibold text-[#0B1F42] hover:text-[#C49A6C] hover:underline">
                  browse properties
                </Link>
                .
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((booking) => (
              <div
                key={booking.id}
                className="rounded-2xl border border-[#E3E8EF] bg-white p-4 shadow-[0_4px_16px_rgba(11,31,66,0.04)] md:p-6"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Property image */}
                  {booking.property?.images?.[0] && (
                    <img
                      src={booking.property.images[0]}
                      alt={booking.property.title}
                      className="w-full md:w-48 h-32 object-cover rounded-xl"
                    />
                  )}

                  <div className="flex-1">
                    {/* Title + Location */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-[#0B1F42]">{booking.property?.title || 'Property'}</h3>
                      <StatusBadge status={booking.status} />
                    </div>
                    <div className="flex items-center text-[#5B6B82] text-sm mt-0.5">
                      <svg className="w-3.5 h-3.5 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {booking.property?.location || 'Nairobi'}
                    </div>

                    {/* Dates */}
                    <div className="mt-3 flex gap-4 text-sm">
                      <div>
                        <span className="text-xs text-[#5B6B82] block">Check-in</span>
                        <span className="font-medium text-[#0B1F42]">{formatDate(booking.checkIn)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-[#5B6B82] block">Check-out</span>
                        <span className="font-medium text-[#0B1F42]">{formatDate(booking.checkOut)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-[#5B6B82] block">Guests</span>
                        <span className="font-medium text-[#0B1F42]">{booking.guests || 1}</span>
                      </div>
                      {booking.total != null && (
                        <div>
                          <span className="text-xs text-[#5B6B82] block">Total</span>
                          <span className="font-medium text-[#0B1F42]">{formatCurrency(booking.total)}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={() => openConversation(booking.id)}
                        className="flex min-h-[44px] items-center gap-1.5 rounded-[10px] bg-[#0B1F42] px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#07072E]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Message host
                      </button>
                      <button
                        onClick={() => generateInvoice(booking)}
                        className="flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-[#E3E8EF] bg-white px-4 text-sm font-semibold text-[#0B1F42] transition-all duration-200 hover:bg-[#F7F4EF]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Invoice
                      </button>
                      <Link
                        to={`/property/${booking.propertyId}`}
                        className="flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-[#E3E8EF] bg-white px-4 text-sm font-semibold text-[#0B1F42] transition-all duration-200 hover:bg-[#F7F4EF]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Link>
                      {canCancelBooking(booking) && (
                        <button
                          onClick={() => setCancelTarget(booking)}
                          className="flex items-center gap-1.5 min-h-[44px] bg-red-50 text-red-600 px-4 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CancelBookingDialog
        booking={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onSuccess={(cancelled) =>
          setBookings((prev) =>
            prev.map((b) => (b.id === cancelled.id ? { ...b, status: 'CANCELLED' } : b))
          )
        }
      />
      <Footer />
    </div>
  );
}

export default BookingHistoryPage;
