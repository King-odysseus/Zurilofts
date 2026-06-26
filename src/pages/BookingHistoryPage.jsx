import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import Spinner from '../components/Spinner.jsx';
import apiClient from '../api/client.js';

// --- Helpers ---
const STATUS_STYLES = {
  PENDING:   { bg: 'bg-amber-100 border-amber-200 text-amber-700', label: 'Pending' },
  CONFIRMED: { bg: 'bg-emerald-100 border-emerald-200 text-emerald-700', label: 'Confirmed' },
  CANCELLED: { bg: 'bg-red-100 border-red-200 text-red-700', label: 'Cancelled' },
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatCurrency(n) {
  if (n == null) return '—';
  return `KES ${Number(n).toLocaleString()}`;
}

function generateInvoice(booking) {
  // Dynamic import to avoid bundling jsPDF unless invoice is actually downloaded
  import('jspdf').then(({ jsPDF }) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(11, 11, 69); // #0B0B45
    doc.text('ZuriLofts - Booking Invoice', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // #6b7280
    doc.text(`Booking #${booking.id ? booking.id.slice(0, 8) : '—'}`, 14, 28);

    let y = 36;
    const items = [
      ['Property', booking.property?.title || '—'],
      ['Location', booking.property?.location || 'Nairobi'],
      ['Check-in', formatDate(booking.checkIn)],
      ['Check-out', formatDate(booking.checkOut)],
      ['Guests', String(booking.guests || 1)],
      ['Status', STATUS_STYLES[booking.status]?.label || booking.status],
    ];
    if (booking.subtotal != null) {
      items.push(
        ['Subtotal', formatCurrency(booking.subtotal)],
        ['Cleaning Fee', formatCurrency(booking.cleaningFee || 0)],
        ['Service Fee', formatCurrency(booking.serviceFee || 0)],
      );
    }
    if (booking.discountAmount) items.push(['Discount', `-KES ${Number(booking.discountAmount).toLocaleString()}`]);
    if (booking.lateCheckoutFee) items.push(['Late Check-out Fee', formatCurrency(booking.lateCheckoutFee)]);
    items.push(
      ['Total', formatCurrency(booking.total)],
      ['Payment Ref', booking.paymentReference ? booking.paymentReference.slice(0, 16) : '—'],
    );

    items.forEach(([label, value]) => {
      doc.setFontSize(9);
      doc.setTextColor(11, 11, 69);
      doc.text(label, 14, y);
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(value, 14, y + 5);
      y += 11;
    });

    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text('This is a computer-generated invoice.', 14, y + 2);

    doc.save(`ZuriLofts_Invoice_${booking.id ? booking.id.slice(0, 8) : 'booking'}.pdf`);
  }).catch(() => {});
}

function BookingHistoryPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchBookings = async () => {
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
  };

  useEffect(() => { fetchBookings(); }, [statusFilter]);

  const now = new Date();
  const filtered = useMemo(() => {
    let list = bookings;
    if (statusFilter === 'upcoming') {
      list = list.filter((b) => b.status === 'CONFIRMED' && new Date(b.checkIn) >= now);
    } else if (statusFilter === 'past') {
      list = list.filter((b) => b.status === 'CONFIRMED' && new Date(b.checkOut) < now);
    } else if (statusFilter === 'cancelled') {
      list = list.filter((b) => b.status === 'CANCELLED');
    }
    return list;
  }, [bookings, statusFilter, now]);

  const STATUS_FILTERS = [
    { value: 'all',      label: 'All Bookings' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past',     label: 'Past' },
    { value: 'cancelled',label: 'Cancelled' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
          <Spinner />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-3xl font-bold text-[#0B0B45] mb-2">My Bookings</h1>
        <p className="text-[#6b7280] mb-6">
          {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {STATUS_FILTERS.map((sf) => (
            <button
              key={sf.value}
              onClick={() => setStatusFilter(sf.value)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                statusFilter === sf.value
                  ? 'bg-[#C49A6C] text-white'
                  : 'bg-white border-2 border-[#D9D9D9] text-[#0B0B45]'
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
              <div className="w-20 h-20 bg-[#D9D9D9]/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#0B0B45] mb-1">No bookings found</h3>
              <p className="text-[#6b7280]">
                Try adjusting your filters or{' '}
                <Link to="/properties" className="text-[#C49A6C] font-semibold hover:underline">
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
                className="bg-white rounded-2xl border border-[#D9D9D9] shadow-sm p-4 md:p-6"
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
                    <h3 className="font-semibold text-[#0B0B45]">{booking.property?.title || 'Property'}</h3>
                    <div className="flex items-center text-[#6b7280] text-sm mt-0.5">
                      <svg className="w-3.5 h-3.5 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {booking.property?.location || 'Nairobi'}
                    </div>

                    {/* Status badge */}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-2 ${STATUS_STYLES[booking.status]?.bg || 'bg-[#D9D9D9]'}`}>
                      {STATUS_STYLES[booking.status]?.label || booking.status}
                    </span>

                    {/* Dates */}
                    <div className="mt-3 flex gap-4 text-sm">
                      <div>
                        <span className="text-xs text-[#6b7280] block">Check-in</span>
                        <span className="font-medium">{formatDate(booking.checkIn)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-[#6b7280] block">Check-out</span>
                        <span className="font-medium">{formatDate(booking.checkOut)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-[#6b7280] block">Guests</span>
                        <span className="font-medium">{booking.guests || 1}</span>
                      </div>
                      {booking.total != null && (
                        <div>
                          <span className="text-xs text-[#6b7280] block">Total</span>
                          <span className="font-medium text-[#0B0B45]">{formatCurrency(booking.total)}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => generateInvoice(booking)}
                        className="flex items-center gap-1.5 bg-[#0B0B45] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#0B0B45]/90 transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Invoice
                      </button>
                      <Link
                        to={`/property/${booking.propertyId}`}
                        className="flex items-center gap-1.5 border-2 border-[#0B0B45] text-[#0B0B45] px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#0B0B45] hover:text-white transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default BookingHistoryPage;
