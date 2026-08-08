import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/client.js";
import Navbar from "../components/Navbar.jsx";

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getNights(checkIn, checkOut) {
  return Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
}

function TodayCard({ booking, type }) {
  const p = booking.property || {};
  const guest = booking.user || {};
  const image = p.images?.[0] || p.coverImage;
  const nights = getNights(booking.checkIn, booking.checkOut);
  const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(" ") || "Guest";

  const badges = {
    arrival: { label: "Arriving today", style: "bg-amber-100 text-amber-800" },
    departure: { label: "Departing today", style: "bg-blue-100 text-blue-800" },
    inhouse: { label: "In house", style: "bg-green-100 text-green-800" },
  };

  const badge = badges[type];

  return (
    <article className="bg-white border border-[#D9D9D9]/50 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200">
      <Link to={`/property/${p.id}`} className="block overflow-hidden">
        <img
          src={image || "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80"}
          alt={p.title}
          className="w-full h-36 object-cover transition-transform duration-500 hover:scale-105"
        />
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link
            to={`/property/${p.id}`}
            className="text-sm font-semibold text-[#1f2937] hover:text-[#C49A6C] transition-colors line-clamp-1"
          >
            {p.title}
          </Link>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${badge.style}`}>
            {badge.label}
          </span>
        </div>

        {/* Guest info */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-[#0B0B45]/10 flex items-center justify-center text-[10px] font-bold text-[#0B0B45]">
            {guest.firstName?.[0]}{guest.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#1f2937] truncate">{guestName}</p>
            {guest.phone && (
              <p className="text-xs text-[#6b7280]">{guest.phone}</p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-3">
          <svg className="w-3.5 h-3.5 flex-shrink-0 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formatDate(type === "arrival" ? booking.checkIn : booking.checkOut)}</span>
          <span className="text-[#D9D9D9]">|</span>
          <span>{nights} night{nights !== 1 ? "s" : ""}</span>
          <span className="text-[#D9D9D9]">|</span>
          <span>{booking.guests} guest{booking.guests !== 1 ? "s" : ""}</span>
          {booking.bedOption && (
            <>
              <span className="text-[#D9D9D9]">|</span>
              <span>{booking.bedOption === "1bed" ? "1 bed" : "2 bed"}</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-[#D9D9D9]/50">
          <Link
            to={`/booking/${booking.id}`}
            className="flex-1 text-center px-3 py-2 rounded-full text-xs font-semibold border-2 border-[#0B0B45] text-[#0B0B45] hover:bg-[#0B0B45] hover:text-white transition-all duration-200"
          >
            View details
          </Link>
          <Link
            to={`/messages?booking=${booking.id}`}
            className="flex-1 text-center px-3 py-2 rounded-full text-xs font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200"
          >
            Message guest
          </Link>
        </div>
      </div>
    </article>
  );
}

TodayCard.propTypes = {
  booking: PropTypes.shape({
    id: PropTypes.string.isRequired,
    checkIn: PropTypes.string.isRequired,
    checkOut: PropTypes.string.isRequired,
    guests: PropTypes.number.isRequired,
    bedOption: PropTypes.string,
    user: PropTypes.shape({
      firstName: PropTypes.string,
      lastName: PropTypes.string,
      phone: PropTypes.string,
    }),
    property: PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
      images: PropTypes.arrayOf(PropTypes.string),
      coverImage: PropTypes.string,
    }),
  }).isRequired,
  type: PropTypes.oneOf(["arrival", "departure", "inhouse"]).isRequired,
};

function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#D9D9D9]/50 rounded-2xl overflow-hidden shadow-md">
        <div className="h-36 bg-[#D9D9D9]/40 animate-pulse" />
        <div className="p-4 space-y-3">
          <div className="h-4 w-2/3 bg-[#D9D9D9]/40 rounded animate-pulse" />
          <div className="h-3 w-1/3 bg-[#D9D9D9]/40 rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-[#D9D9D9]/40 rounded animate-pulse" />
          <div className="flex gap-2 pt-3 border-t border-[#D9D9D9]/20">
            <div className="h-8 flex-1 bg-[#D9D9D9]/40 rounded-full animate-pulse" />
            <div className="h-8 flex-1 bg-[#D9D9D9]/40 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyPanel({ label, icon }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#D9D9D9]/30 flex items-center justify-center">
        <svg className="w-6 h-6 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      <p className="text-sm text-[#6b7280]">No {label.toLowerCase()} today</p>
    </div>
  );
}

EmptyPanel.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.node,
};

export default function HostTodayPage() {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "Today | ZuriLofts Host";
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    async function fetchToday() {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get("/bookings/host/today");
        if (!cancelled) setData(res.data.data);
      } catch (err) {
        if (!cancelled) setError("Could not load today's overview. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchToday();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
          <div className="mb-8">
            <div className="h-8 w-48 bg-[#D9D9D9]/40 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-[#D9D9D9]/40 rounded animate-pulse" />
          </div>
          {/* Summary skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-[#D9D9D9]/50 rounded-2xl p-5 shadow-md">
                <div className="h-4 w-16 bg-[#D9D9D9]/40 rounded animate-pulse mb-2" />
                <div className="h-8 w-12 bg-[#D9D9D9]/40 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PanelSkeleton />
            <PanelSkeleton />
            <PanelSkeleton />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
          <div className="text-center py-16">
            <p className="text-[#6b7280] mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200"
            >
              Try again
            </button>
          </div>
        </main>
      </div>
    );
  }

  const { arrivals = [], departures = [], inHouse = [], summary = {} } = data || {};

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Hero panel */}
        <div className="bg-gradient-to-br from-[#0B0B45] to-[#07072e] rounded-2xl p-6 sm:p-8 text-white mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Today{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/60">Your arrivals, in-house guests, and departures at a glance.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white border border-[#D9D9D9]/50 rounded-2xl p-5 shadow-md">
            <p className="text-sm text-[#6b7280] mb-1">Arrivals</p>
            <p className="text-2xl font-bold text-[#C49A6C]">{summary.arrivals}</p>
          </div>
          <div className="bg-white border border-[#D9D9D9]/50 rounded-2xl p-5 shadow-md">
            <p className="text-sm text-[#6b7280] mb-1">Departures</p>
            <p className="text-2xl font-bold text-[#0B0B45]">{summary.departures}</p>
          </div>
          <div className="bg-white border border-[#D9D9D9]/50 rounded-2xl p-5 shadow-md">
            <p className="text-sm text-[#6b7280] mb-1">In house</p>
            <p className="text-2xl font-bold text-green-600">{summary.inHouse}</p>
          </div>
        </div>

        {/* Three-panel grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Arrivals */}
          <section>
            <h2 className="text-lg font-semibold text-[#0B0B45] mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Arriving today
              {arrivals.length > 0 && (
                <span className="text-sm font-normal text-[#6b7280] ml-auto">{arrivals.length}</span>
              )}
            </h2>
            {arrivals.length === 0 ? (
              <EmptyPanel
                label="Arrivals"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
              />
            ) : (
              <div className="space-y-4">
                {arrivals.map((b) => (
                  <TodayCard key={b.id} booking={b} type="arrival" />
                ))}
              </div>
            )}
          </section>

          {/* In-house */}
          <section>
            <h2 className="text-lg font-semibold text-[#0B0B45] mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              In house
              {inHouse.length > 0 && (
                <span className="text-sm font-normal text-[#6b7280] ml-auto">{inHouse.length}</span>
              )}
            </h2>
            {inHouse.length === 0 ? (
              <EmptyPanel
                label="In-house guests"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />}
              />
            ) : (
              <div className="space-y-4">
                {inHouse.map((b) => (
                  <TodayCard key={b.id} booking={b} type="inhouse" />
                ))}
              </div>
            )}
          </section>

          {/* Departures */}
          <section>
            <h2 className="text-lg font-semibold text-[#0B0B45] mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              Departing today
              {departures.length > 0 && (
                <span className="text-sm font-normal text-[#6b7280] ml-auto">{departures.length}</span>
              )}
            </h2>
            {departures.length === 0 ? (
              <EmptyPanel
                label="Departures"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
              />
            ) : (
              <div className="space-y-4">
                {departures.map((b) => (
                  <TodayCard key={b.id} booking={b} type="departure" />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
