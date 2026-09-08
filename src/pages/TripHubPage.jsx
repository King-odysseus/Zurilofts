import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/client.js";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import CancelBookingDialog, { canCancelBooking } from "../components/CancelBookingDialog.jsx";

const STATUS_META = {
  PENDING: { label: "Awaiting confirmation", bg: "bg-amber-500", icon: "clock" },
  CONFIRMED: { label: "Confirmed", bg: "bg-green-600", icon: "check" },
  CANCELLED: { label: "Cancelled", bg: "bg-red-600", icon: "x" },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, bg: "bg-[#6b7280]", icon: null };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white flex-shrink-0 ${meta.bg}`}
    >
      {meta.icon === "check" && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {meta.icon === "x" && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {meta.icon === "clock" && (
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

function formatDateRange(checkIn, checkOut) {
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  const sameMonth = ci.getMonth() === co.getMonth() && ci.getFullYear() === co.getFullYear();
  const ciStr = ci.toLocaleDateString("en-KE", { day: "numeric", month: sameMonth ? undefined : "short" });
  const coStr = co.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  return sameMonth ? `${ciStr} – ${coStr}` : `${ciStr} – ${coStr}`;
}

function getNights(checkIn, checkOut) {
  return Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
}

function BookingCard({ booking, isPast, onRequestCancel }) {
  const p = booking.property || {};
  const host = p.host || {};
  const image = p.images?.[0] || p.coverImage;
  const reviewSubmitted = booking.review && booking.review.id;
  const nights = getNights(booking.checkIn, booking.checkOut);
  const navigate = useNavigate();
  const cancellable = canCancelBooking(booking);

  // Open (or create) the reservation conversation for this booking, then go to it.
  // The endpoint is idempotent, so it is safe to click repeatedly.
  async function openConversation() {
    try {
      const res = await apiClient.post("/conversations", { bookingId: booking.id });
      const conversation = res.data.data;
      navigate(`/inbox/${conversation.id}`);
    } catch (err) {
      console.error("Failed to open conversation", err);
    }
  }

  return (
    <article className="group bg-white rounded-[14px] border border-[#E5E7EB] overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex flex-col sm:flex-row">
        {/* Property image */}
        <Link
          to={`/property/${p.id}`}
          className="sm:w-48 lg:w-56 flex-shrink-0 overflow-hidden"
        >
          <img
            src={image || "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80"}
            alt={p.title}
            className="w-full h-40 sm:h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        {/* Details */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <Link
                to={`/property/${p.id}`}
                className="text-base font-semibold text-[#222222] hover:text-[#2563EB] transition-colors truncate"
              >
                {p.title}
              </Link>
              <StatusBadge status={booking.status} />
            </div>

            <p className="text-sm text-[#6b7280] mb-2">
              <svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {p.location || "Nairobi"}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#6b7280] mb-3">
              <span>{formatDateRange(booking.checkIn, booking.checkOut)}</span>
              <span className="hidden sm:inline text-[#E5E7EB]">|</span>
              <span>{nights} night{nights !== 1 ? "s" : ""}</span>
              <span className="hidden sm:inline text-[#E5E7EB]">|</span>
              <span>{booking.guests} guest{booking.guests !== 1 ? "s" : ""}</span>
              {booking.bedOption && (
                <>
                  <span className="hidden sm:inline text-[#E5E7EB]">|</span>
                  <span>{booking.bedOption === "1bed" ? "1 bed" : "2 bed"}</span>
                </>
              )}
            </div>

            {/* Host contact (upcoming only) */}
            {!isPast && host.firstName && (
              <div className="flex items-center gap-2 text-sm text-[#6b7280] mb-3">
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs font-semibold text-[#2563EB]">
                  {host.firstName[0]}{host.lastName?.[0]}
                </div>
                <span>
                  Hosted by <span className="font-medium text-[#222222]">{host.firstName} {host.lastName}</span>
                  {host.phone && (
                    <span className="ml-2 text-[#222222]">{host.phone}</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E5E7EB]">
            <span className="text-sm font-semibold text-[#222222]">
              KES {booking.total?.toLocaleString()}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isPast && !reviewSubmitted && (
                <Link
                  to={`/property/${p.id}?review=true`}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg text-xs font-semibold text-[#222222] border border-[#E5E7EB] hover:bg-[#F7F7F5] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Leave a review
                </Link>
              )}
              {isPast && reviewSubmitted && (
                <span className="text-xs text-[#6b7280] flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-[#2563EB]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Reviewed
                </span>
              )}
              <button
                onClick={openConversation}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg text-xs font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Message host
              </button>
              {/* /booking/:id is the checkout route and takes a PROPERTY id, so
                  passing booking.id here left the page stuck on "Loading property..." */}
              <Link
                to={`/property/${p.id}`}
                className="inline-flex items-center min-h-[44px] px-3 rounded-lg text-xs font-semibold text-[#222222] border border-[#E5E7EB] hover:bg-[#F7F7F5] transition-all duration-200"
              >
                View details
              </Link>
              {cancellable && (
                <button
                  onClick={() => onRequestCancel?.(booking)}
                  className="inline-flex items-center gap-1 min-h-[44px] px-3 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel booking
                </button>
              )}
              <Link
                to={`/disputes/new?bookingId=${booking.id}`}
                className="inline-flex items-center min-h-[44px] px-3 rounded-lg text-xs font-semibold text-[#6b7280] hover:text-red-600 transition-colors"
              >
                Report an issue
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

BookingCard.propTypes = {
  booking: PropTypes.shape({
    id: PropTypes.string.isRequired,
    checkIn: PropTypes.string.isRequired,
    checkOut: PropTypes.string.isRequired,
    guests: PropTypes.number.isRequired,
    status: PropTypes.string.isRequired,
    total: PropTypes.number,
    bedOption: PropTypes.string,
    review: PropTypes.shape({
      id: PropTypes.string,
      rating: PropTypes.number,
    }),
    property: PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
      location: PropTypes.string,
      images: PropTypes.arrayOf(PropTypes.string),
      coverImage: PropTypes.string,
      host: PropTypes.shape({
        firstName: PropTypes.string,
        lastName: PropTypes.string,
        phone: PropTypes.string,
      }),
    }),
  }).isRequired,
  isPast: PropTypes.bool,
  onRequestCancel: PropTypes.func,
};

function EmptyState({ isPast }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F7F7F5] border border-[#E5E7EB] flex items-center justify-center">
        <svg className="w-8 h-8 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isPast ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          )}
        </svg>
      </div>
      <h3 className="text-lg font-bold text-[#222222] mb-1">
        {isPast ? "No past trips" : "No upcoming trips"}
      </h3>
      <p className="text-[#6b7280] max-w-sm mx-auto mb-6">
        {isPast
          ? "When you complete a stay, it will appear here so you can leave reviews and rebook favourites."
          : "You do not have any upcoming stays. Start exploring our properties to book your next trip."}
      </p>
      {!isPast && (
        <Link
          to="/properties"
          className="inline-flex items-center min-h-[44px] px-6 rounded-lg font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-all duration-200"
        >
          Browse properties
        </Link>
      )}
    </div>
  );
}

EmptyState.propTypes = {
  isPast: PropTypes.bool,
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-[14px] border border-[#E5E7EB] overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-48 lg:w-56 h-40 sm:h-36 bg-[#E5E7EB]/60 animate-pulse" />
        <div className="flex-1 p-4 sm:p-5 space-y-3">
          <div className="h-5 w-2/3 bg-[#E5E7EB]/60 rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-[#E5E7EB]/60 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-[#E5E7EB]/60 rounded animate-pulse" />
          <div className="flex justify-between pt-3 border-t border-[#E5E7EB]">
            <div className="h-4 w-20 bg-[#E5E7EB]/60 rounded animate-pulse" />
            <div className="h-8 w-24 bg-[#E5E7EB]/60 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TripHubPage() {
  const { isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [cancelTarget, setCancelTarget] = useState(null);

  useEffect(() => {
    document.title = "Trips | ZuriLofts";
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    async function fetchBookings() {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get("/bookings?limit=50");
        if (!cancelled) setBookings(res.data.data || []);
      } catch (err) {
        if (!cancelled) setError("Could not load your trips. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchBookings();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const u = [];
    const p = [];
    for (const b of bookings) {
      if (b.status === "CANCELLED") {
        p.push(b);
      } else if (new Date(b.checkOut) < now) {
        p.push(b);
      } else {
        u.push(b);
      }
    }
    return { upcoming: u, past: p };
  }, [bookings]);

  const displayed = activeTab === "upcoming" ? upcoming : past;

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Header panel */}
        <div className="rounded-[14px] border border-[#E5E7EB] bg-white p-6 sm:p-8 mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Your stays</p>
          <h1 className="mt-1 text-2xl font-bold text-[#222222] sm:text-3xl">Trips</h1>
          <p className="mt-2 max-w-md text-sm text-[#6b7280]">Upcoming adventures and past memories - all in one place.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E5E7EB] mb-8">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`min-h-[44px] px-5 text-sm font-semibold transition-colors relative ${
              activeTab === "upcoming"
                ? "text-[#2563EB]"
                : "text-[#6b7280] hover:text-[#222222]"
            }`}
          >
            Upcoming
            {upcoming.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-blue-50 text-[#2563EB] text-xs font-bold rounded-full">
                {upcoming.length}
              </span>
            )}
            {activeTab === "upcoming" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`min-h-[44px] px-5 text-sm font-semibold transition-colors relative ${
              activeTab === "past"
                ? "text-[#2563EB]"
                : "text-[#6b7280] hover:text-[#222222]"
            }`}
          >
            Past
            {past.length > 0 && (
              <span className="ml-1.5 text-[#6b7280] text-xs">({past.length})</span>
            )}
            {activeTab === "past" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB]" />
            )}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-[#6b7280] mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center min-h-[44px] px-4 rounded-lg text-sm font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-all duration-200"
            >
              Try again
            </button>
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState isPast={activeTab === "past"} />
        ) : (
          <div className="space-y-4">
            {displayed.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                isPast={activeTab === "past"}
                onRequestCancel={setCancelTarget}
              />
            ))}
          </div>
        )}
      </main>
      <CancelBookingDialog
        booking={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onSuccess={(cancelled) =>
          setBookings((prev) => prev.map((b) => (b.id === cancelled.id ? { ...b, status: "CANCELLED" } : b)))
        }
      />
      <Footer />
    </div>
  );
}
