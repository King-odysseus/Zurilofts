import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/client.js";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

const STATUS_LABELS = {
  PENDING: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

const STATUS_STYLES = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

function formatDateRange(checkIn, checkOut) {
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  const sameMonth = ci.getMonth() === co.getMonth() && ci.getFullYear() === co.getFullYear();
  const ciStr = ci.toLocaleDateString("en-KE", { day: "numeric", month: sameMonth ? undefined : "short" });
  const coStr = co.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  return sameMonth ? `${ciStr} \u2013 ${coStr}` : `${ciStr} \u2013 ${coStr}`;
}

function getNights(checkIn, checkOut) {
  return Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
}

function BookingCard({ booking, isPast }) {
  const p = booking.property || {};
  const host = p.host || {};
  const image = p.images?.[0] || p.coverImage;
  const reviewSubmitted = booking.review && booking.review.id;
  const nights = getNights(booking.checkIn, booking.checkOut);
  const navigate = useNavigate();

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
    <article className="group bg-white border border-[#D9D9D9]/50 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200">
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
                className="text-base font-semibold text-[#1f2937] hover:text-[#C49A6C] transition-colors truncate"
              >
                {p.title}
              </Link>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_STYLES[booking.status] || "bg-gray-100 text-gray-600"}`}
              >
                {STATUS_LABELS[booking.status] || booking.status}
              </span>
            </div>

            <p className="text-sm text-[#6b7280] mb-2">
              <svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {p.location || "Nairobi"}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#6b7280] mb-3">
              <span>{formatDateRange(booking.checkIn, booking.checkOut)}</span>
              <span className="hidden sm:inline text-[#D9D9D9]">|</span>
              <span>{nights} night{nights !== 1 ? "s" : ""}</span>
              <span className="hidden sm:inline text-[#D9D9D9]">|</span>
              <span>{booking.guests} guest{booking.guests !== 1 ? "s" : ""}</span>
              {booking.bedOption && (
                <>
                  <span className="hidden sm:inline text-[#D9D9D9]">|</span>
                  <span>{booking.bedOption === "1bed" ? "1 bed" : "2 bed"}</span>
                </>
              )}
            </div>

            {/* Host contact (upcoming only) */}
            {!isPast && host.firstName && (
              <div className="flex items-center gap-2 text-sm text-[#6b7280] mb-3">
                <div className="w-7 h-7 rounded-full bg-[#C49A6C]/10 flex items-center justify-center text-xs font-semibold text-[#C49A6C]">
                  {host.firstName[0]}{host.lastName?.[0]}
                </div>
                <span>
                  Hosted by <span className="font-medium text-[#1f2937]">{host.firstName} {host.lastName}</span>
                  {host.phone && (
                    <span className="ml-2 text-[#C49A6C]">{host.phone}</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#D9D9D9]/50">
            <span className="text-sm font-semibold text-[#0B0B45]">
              KES {booking.total?.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              {isPast && !reviewSubmitted && (
                <Link
                  to={`/property/${p.id}?review=true`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#C49A6C]/10 text-[#C49A6C] hover:bg-[#C49A6C]/20 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Leave a review
                </Link>
              )}
              {isPast && reviewSubmitted && (
                <span className="text-xs text-[#6b7280] flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-[#C49A6C]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Reviewed
                </span>
              )}
              <button
                onClick={openConversation}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Message host
              </button>
              <Link
                to={`/booking/${booking.id}`}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border-2 border-[#0B0B45] text-[#0B0B45] hover:bg-[#0B0B45] hover:text-white transition-all duration-200"
              >
                View details
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
};

function EmptyState({ isPast }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#D9D9D9]/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isPast ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          )}
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[#0B0B45] mb-1">
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
          className="inline-flex items-center px-5 py-2.5 rounded-full font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200"
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
    <div className="bg-white border border-[#D9D9D9]/50 rounded-2xl overflow-hidden shadow-md">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-48 lg:w-56 h-40 sm:h-36 bg-[#D9D9D9]/40 animate-pulse" />
        <div className="flex-1 p-4 sm:p-5 space-y-3">
          <div className="h-5 w-2/3 bg-[#D9D9D9]/40 rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-[#D9D9D9]/40 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-[#D9D9D9]/40 rounded animate-pulse" />
          <div className="flex justify-between pt-3 border-t border-[#D9D9D9]/20">
            <div className="h-4 w-20 bg-[#D9D9D9]/40 rounded animate-pulse" />
            <div className="h-8 w-24 bg-[#D9D9D9]/40 rounded-full animate-pulse" />
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
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Hero panel */}
        <div className="bg-gradient-to-br from-[#0B0B45] to-[#07072e] rounded-2xl p-6 sm:p-8 text-white mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Your stays</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Trips</h1>
          <p className="mt-2 max-w-md text-sm text-white/60">Upcoming adventures and past memories - all in one place.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#D9D9D9] mb-8">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-5 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === "upcoming"
                ? "text-[#0B0B45]"
                : "text-[#6b7280] hover:text-[#1f2937]"
            }`}
          >
            Upcoming
            {upcoming.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-[#C49A6C]/10 text-[#C49A6C] text-xs font-bold rounded-full">
                {upcoming.length}
              </span>
            )}
            {activeTab === "upcoming" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C49A6C]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`px-5 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === "past"
                ? "text-[#0B0B45]"
                : "text-[#6b7280] hover:text-[#1f2937]"
            }`}
          >
            Past
            {past.length > 0 && (
              <span className="ml-1.5 text-[#6b7280] text-xs">({past.length})</span>
            )}
            {activeTab === "past" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C49A6C]" />
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
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200"
            >
              Try again
            </button>
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState isPast={activeTab === "past"} />
        ) : (
          <div className="space-y-4">
            {displayed.map((b) => (
              <BookingCard key={b.id} booking={b} isPast={activeTab === "past"} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
