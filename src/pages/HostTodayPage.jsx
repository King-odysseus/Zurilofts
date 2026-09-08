import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/client.js";
import Navbar from "../components/Navbar.jsx";
import Spinner from "../components/Spinner.jsx";
import { firstImage } from "../utils/images.js";

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatRelativeTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getNights(checkIn, checkOut) {
  return Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
}

// checkInTime is stored as a 24h "HH:MM" string (or already am/pm). Normalise
// it to a compact 12h label for the arrivals list.
function formatTime(time) {
  if (!time) return "";
  if (/am|pm/i.test(time)) return time;
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m || "00"} ${period}`;
}

function TodayCard({ booking, type }) {
  const p = booking.property || {};
  const guest = booking.user || {};
  const image = firstImage(p) || p.coverImage;
  const nights = getNights(booking.checkIn, booking.checkOut);
  const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(" ") || "Guest";

  const badges = {
    arrival: { label: "Arriving today", style: "bg-amber-50 text-amber-700 border border-amber-200" },
    departure: { label: "Departing today", style: "bg-blue-50 text-[#2563EB] border border-blue-200" },
    inhouse: { label: "In house", style: "bg-green-50 text-green-700 border border-green-200" },
  };

  const badge = badges[type];

  return (
    <article className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md">
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
            className="text-sm font-bold text-[#222222] hover:text-[#2563EB] transition-colors line-clamp-1"
          >
            {p.title}
          </Link>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${badge.style}`}>
            {badge.label}
          </span>
        </div>

        {/* Guest info */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-[#F7F7F5] border border-[#E5E7EB] flex items-center justify-center text-xs font-bold text-[#222222]">
            {guest.firstName?.[0]}{guest.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#222222] truncate">{guestName}</p>
            {guest.phone && (
              <p className="text-xs text-[#6b7280]">{guest.phone}</p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6b7280] mb-3">
          <svg className="w-3.5 h-3.5 flex-shrink-0 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formatDate(type === "arrival" ? booking.checkIn : booking.checkOut)}</span>
          <span className="text-[#E5E7EB]">|</span>
          <span>{nights} night{nights !== 1 ? "s" : ""}</span>
          <span className="text-[#E5E7EB]">|</span>
          <span>{booking.guests} guest{booking.guests !== 1 ? "s" : ""}</span>
          {booking.bedOption && (
            <>
              <span className="text-[#E5E7EB]">|</span>
              <span>{booking.bedOption === "1bed" ? "1 bed" : "2 bed"}</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-[#E5E7EB]">
          {/* /booking/:id is the checkout route and takes a PROPERTY id, so
              passing booking.id here left the page stuck on "Loading property..." */}
          <Link
            to={`/property/${p.id}`}
            className="flex-1 min-h-[44px] flex items-center justify-center text-center px-3 rounded-lg text-xs font-semibold bg-white text-[#222222] border border-[#E5E7EB] hover:bg-[#F7F7F5] transition-all duration-200"
          >
            View details
          </Link>
          <Link
            to={`/messages?booking=${booking.id}`}
            className="flex-1 min-h-[44px] flex items-center justify-center text-center px-3 rounded-lg text-xs font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-all duration-200"
          >
            Message guest
          </Link>
        </div>
        <Link
          to={`/disputes/new?bookingId=${booking.id}`}
          className="block text-center mt-2 min-h-[44px] leading-[44px] text-xs font-semibold text-[#6b7280] hover:text-red-600 transition-colors"
        >
          Report an issue
        </Link>
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

// Guides a new host from "just signed up" to "first listing live". Steps are
// derived from real records (host application status + the host's own
// properties), not local-only flags, so it stays correct across devices and
// after a refresh. Hidden entirely once verification is APPROVED and at least
// one listing is PUBLISHED - a returning fully-onboarded host never sees it.
function OnboardingChecklist({ hostApplicationStatus, properties, role }) {
  const needsVerification = role === 'USER';
  const isApproved = hostApplicationStatus === 'APPROVED';
  const hasDraft = properties.some((p) => p.status === 'DRAFT' || p.status === 'REJECTED');
  const hasSubmitted = properties.some((p) => p.status === 'PENDING_REVIEW');
  const hasPublished = properties.some((p) => p.status === 'PUBLISHED');
  const hasAnyProperty = properties.length > 0;

  // ADMIN/HOST accounts do not go through host verification, so treat them as
  // already verified. This keeps the remaining listing steps ungated without
  // surfacing a "Verify your host account" step they never need.
  const isVerified = needsVerification ? isApproved : true;

  const steps = [
    {
      key: 'verify',
      label: 'Verify your host account',
      done: isApproved,
      description: isApproved
        ? 'Your account is verified.'
        : hostApplicationStatus === 'SUBMITTED'
          ? 'Your verification is under review.'
          : hostApplicationStatus === 'CHANGES_REQUESTED'
            ? 'The team requested changes - update and resubmit.'
            : 'Required before any listing can go live or take bookings.',
      cta: isApproved ? null : { label: 'Go to verification', to: '/host/application' },
    },
    {
      key: 'create',
      label: 'Create your first listing',
      done: hasAnyProperty,
      description: 'Draft listings are private until you submit them for review.',
      cta: hasAnyProperty ? null : { label: 'Add a property', to: '/host/properties/new' },
    },
    {
      key: 'submit',
      label: 'Submit a listing for review',
      done: hasSubmitted || hasPublished,
      description: !isVerified
        ? 'Available once your host account is verified.'
        : hasDraft
          ? 'You have a draft ready to submit.'
          : 'Submit a draft listing so the team can review it.',
      cta: hasDraft && isVerified ? { label: 'Manage listings', to: '/host/listings' } : null,
    },
    {
      key: 'publish',
      label: 'Get your listing published',
      done: hasPublished,
      description: hasPublished
        ? 'Guests can now find and book this listing.'
        : 'The team reviews submitted listings before they go live.',
      cta: null,
    },
  ].filter((step) => step.key !== 'verify' || needsVerification);

  if (steps.every((s) => s.done)) return null;

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <section className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-[#222222]">Get set up as a host</h2>
        <span className="text-sm font-medium text-[#6b7280]">{completedCount}/{steps.length} done</span>
      </div>
      <p className="text-sm text-[#6b7280] mb-5">
        You can explore your dashboard and prepare draft listings right away. Publishing and accepting bookings need a verified account and an approved listing.
      </p>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li
            key={step.key}
            className={`flex items-start gap-3 rounded-xl p-3 border transition-colors ${
              step.done ? 'bg-[#F7F7F5] border-transparent' : 'bg-white border-[#E5E7EB]'
            }`}
          >
            <div
              className={`mt-0.5 w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                step.done ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-[#2563EB]'
              }`}
            >
              {step.done ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${step.done ? 'text-[#6b7280] line-through' : 'text-[#222222]'}`}>
                {step.label}
              </p>
              <p className="text-xs text-[#6b7280] mt-0.5">{step.description}</p>
            </div>
            {step.cta && (
              <Link
                to={step.cta.to}
                className="flex-shrink-0 self-center min-h-[44px] inline-flex items-center px-3 rounded-lg text-xs font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-all duration-200"
              >
                {step.cta.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

OnboardingChecklist.propTypes = {
  hostApplicationStatus: PropTypes.string,
  properties: PropTypes.arrayOf(PropTypes.shape({ status: PropTypes.string })).isRequired,
  role: PropTypes.string,
};

function EmptyPanel({ label, icon }) {
  return (
    <div className="text-center py-12 px-4 bg-white rounded-[14px] border border-[#E5E7EB]">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#F7F7F5] border border-[#E5E7EB] flex items-center justify-center">
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

// Compact horizontal metric: an icon circle beside a value + label.
function MetricCard({ label, value, icon, iconClass }) {
  return (
    <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${iconClass}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-[#222222] leading-none">{value}</p>
        <p className="text-sm text-[#6b7280] mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.node,
  iconClass: PropTypes.string,
};

// A single compact guest row for the "Arriving today" card.
function ArrivalRow({ booking }) {
  const p = booking.property || {};
  const guest = booking.user || {};
  const image = firstImage(p) || p.coverImage;
  const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(" ") || "Guest";
  const arrivalTime = formatTime(booking.checkInTime);

  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <Link
        to={`/property/${p.id}`}
        className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[#F7F7F5] border border-[#E5E7EB]"
      >
        {image ? (
          <img src={image} alt={p.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#6b7280]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#222222] truncate">{guestName}</p>
        <Link to={`/property/${p.id}`} className="block text-xs text-[#6b7280] truncate hover:text-[#2563EB] transition-colors">
          {p.title}
        </Link>
      </div>

      <div className="hidden sm:block text-right flex-shrink-0">
        <p className="text-sm font-medium text-[#222222]">
          {booking.guests} guest{booking.guests !== 1 ? "s" : ""}
        </p>
        <p className="text-xs text-[#6b7280]">
          {arrivalTime ? `Arrives ${arrivalTime}` : "Arrives today"}
        </p>
      </div>

      <Link
        to={`/messages?booking=${booking.id}`}
        className="flex-shrink-0 inline-flex items-center justify-center min-h-[40px] px-3 rounded-lg text-xs font-semibold bg-white text-[#222222] border border-[#E5E7EB] hover:bg-[#F7F7F5] transition-all duration-200"
      >
        Message
      </Link>
    </li>
  );
}

ArrivalRow.propTypes = {
  booking: PropTypes.shape({
    id: PropTypes.string.isRequired,
    checkInTime: PropTypes.string,
    guests: PropTypes.number.isRequired,
    user: PropTypes.shape({
      firstName: PropTypes.string,
      lastName: PropTypes.string,
    }),
    property: PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
      images: PropTypes.arrayOf(PropTypes.string),
      coverImage: PropTypes.string,
    }),
  }).isRequired,
};

function ArrivingTodayCard({ arrivals }) {
  return (
    <section className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm overflow-hidden">
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
        <h2 className="text-lg font-bold text-[#222222] flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          Arriving today
        </h2>
        <Link to="/host/calendar" className="text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
          View calendar
        </Link>
      </header>

      {arrivals.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#F7F7F5] border border-[#E5E7EB] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-[#6b7280]">No arrivals today</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#E5E7EB]">
          {arrivals.map((b) => (
            <ArrivalRow key={b.id} booking={b} />
          ))}
        </ul>
      )}
    </section>
  );
}

ArrivingTodayCard.propTypes = {
  arrivals: PropTypes.array.isRequired,
};

// The single most important next action for the host, derived from real
// onboarding records (verification status + listing lifecycle). Approved hosts
// get a compact, non-intrusive reminder here instead of the full checklist.
function NextStepCard({ hostApplicationStatus, properties, role }) {
  const needsVerification = role === 'USER';
  const isApproved = hostApplicationStatus === 'APPROVED';
  const hasDraft = properties.some((p) => p.status === 'DRAFT' || p.status === 'REJECTED');
  const hasSubmitted = properties.some((p) => p.status === 'PENDING_REVIEW');
  const hasPublished = properties.some((p) => p.status === 'PUBLISHED');
  const hasAnyProperty = properties.length > 0;

  const badgeTones = {
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    info: 'bg-blue-50 text-[#2563EB] border border-blue-200',
    success: 'bg-green-50 text-green-700 border border-green-200',
  };

  let step;

  if (needsVerification && !isApproved) {
    step = {
      badge: { label: 'Action needed', tone: 'warning' },
      title: 'Verify your host account',
      copy: hostApplicationStatus === 'SUBMITTED'
        ? 'Your verification is under review. We will let you know once it is approved.'
        : hostApplicationStatus === 'CHANGES_REQUESTED'
          ? 'The team requested changes. Update and resubmit to continue.'
          : 'Verification is required before your listings can go live and take bookings.',
      cta: { label: 'Go to verification', to: '/host/application' },
      image: null,
    };
  } else if (!hasAnyProperty) {
    step = {
      badge: { label: 'Action needed', tone: 'warning' },
      title: 'Add your first listing',
      copy: 'Create your first listing to start hosting and accept bookings.',
      cta: { label: 'Add a property', to: '/host/properties/new' },
      image: null,
    };
  } else if (!hasSubmitted && !hasPublished && hasDraft) {
    step = {
      badge: { label: 'Action needed', tone: 'warning' },
      title: 'Submit your listing for review',
      copy: 'You have a draft ready. Submit it so the team can review and publish it.',
      cta: { label: 'Manage listings', to: '/host/listings' },
      image: firstImage(properties.find((p) => p.status === 'DRAFT' || p.status === 'REJECTED')),
    };
  } else if (hasSubmitted && !hasPublished) {
    step = {
      badge: { label: 'In review', tone: 'info' },
      title: 'Your listing is under review',
      copy: 'The team is reviewing your listing. We will notify you as soon as it is live.',
      cta: { label: 'View listings', to: '/host/listings' },
      image: firstImage(properties.find((p) => p.status === 'PENDING_REVIEW')),
    };
  } else {
    step = {
      badge: { label: 'All set', tone: 'success' },
      title: 'You are all set',
      copy: 'Your listing is live and ready to welcome guests.',
      cta: { label: 'View calendar', to: '/host/calendar' },
      image: firstImage(properties.find((p) => p.status === 'PUBLISHED')),
    };
  }

  return (
    <section className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
      {step.image && (
        <img
          src={step.image}
          alt={step.title}
          className="w-full h-32 object-cover"
        />
      )}
      <div className="p-5 flex flex-col flex-1">
        <span className={`inline-flex items-center self-start px-2 py-0.5 rounded-full text-xs font-semibold ${badgeTones[step.badge.tone]}`}>
          {step.badge.label}
        </span>
        <h2 className="mt-3 text-lg font-bold text-[#222222]">{step.title}</h2>
        <p className="mt-1 text-sm text-[#6b7280]">{step.copy}</p>
        <Link
          to={step.cta.to}
          className="mt-4 self-start inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-all duration-200"
        >
          {step.cta.label}
        </Link>
      </div>
    </section>
  );
}

NextStepCard.propTypes = {
  hostApplicationStatus: PropTypes.string,
  properties: PropTypes.arrayOf(PropTypes.shape({ status: PropTypes.string })).isRequired,
  role: PropTypes.string,
};

function RecentMessagesPanel({ conversations, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-6 flex items-center justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <section className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#222222] flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
          Recent guest messages
        </h2>
        <Link
          to="/inbox"
          className="text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
        >
          View all
        </Link>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-10 px-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#F7F7F5] border border-[#E5E7EB] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm text-[#6b7280]">No guest messages yet</p>
          <p className="text-xs text-[#6b7280] mt-1">Messages from guests about their stays will appear here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#E5E7EB]">
          {conversations.map((c) => {
            const booking = c.booking || {};
            const property = booking.property || {};
            const guest = booking.user || {};
            const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(" ") || "Guest";
            const lastMessage = c.lastMessage;
            const preview = lastMessage ? lastMessage.content : "No messages yet";
            const image = firstImage(property);
            return (
              <li key={c.id}>
                <Link
                  to={`/inbox/${c.id}`}
                  className="flex items-center gap-3 py-3 min-h-[44px] group"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-[#F7F7F5] border border-[#E5E7EB]">
                    {image ? (
                      <img src={image} alt={property.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#6b7280]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-[#222222] text-sm truncate group-hover:text-[#2563EB] transition-colors">
                        {guestName}
                      </p>
                      <span className="text-xs text-[#6b7280] flex-shrink-0">
                        {formatRelativeTime(lastMessage ? lastMessage.createdAt : c.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[#6b7280] truncate">{property.title || "Property"}</p>
                    <p className="text-sm text-[#6b7280] truncate">{preview}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

RecentMessagesPanel.propTypes = {
  conversations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      updatedAt: PropTypes.string,
      lastMessage: PropTypes.shape({
        content: PropTypes.string,
        createdAt: PropTypes.string,
      }),
      booking: PropTypes.shape({
        property: PropTypes.shape({
          title: PropTypes.string,
          images: PropTypes.arrayOf(PropTypes.string),
          imagesJson: PropTypes.string,
        }),
        user: PropTypes.shape({
          firstName: PropTypes.string,
          lastName: PropTypes.string,
        }),
      }),
    })
  ).isRequired,
  loading: PropTypes.bool.isRequired,
};

export default function HostTodayPage() {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [myProperties, setMyProperties] = useState([]);

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

  // Recent guest conversations for the host's daily-operations hub. The full
  // list is kept so the unread total (for the metric) is accurate; only the
  // first three are rendered in the panel.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    async function fetchConversations() {
      try {
        const res = await apiClient.get("/conversations");
        if (!cancelled) setConversations(res.data.data || []);
      } catch {
        if (!cancelled) setConversations([]);
      } finally {
        if (!cancelled) setConversationsLoading(false);
      }
    }
    fetchConversations();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Own listings, across every lifecycle status, to drive the onboarding
  // checklist and the compact "next step" reminder.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    async function fetchMyProperties() {
      try {
        const res = await apiClient.get('/properties/mine', { params: { limit: 50 } });
        if (!cancelled) setMyProperties(res.data.data || []);
      } catch {
        if (!cancelled) setMyProperties([]);
      }
    }
    fetchMyProperties();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
          <div className="mb-8">
            <div className="h-8 w-48 bg-[#E5E7EB] rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-[#E5E7EB] rounded animate-pulse" />
          </div>
          {/* Metric skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#E5E7EB] animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-6 w-10 bg-[#E5E7EB] rounded animate-pulse mb-2" />
                  <div className="h-3 w-16 bg-[#E5E7EB] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
          {/* Arrivals + next-step skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-5">
              <div className="h-5 w-32 bg-[#E5E7EB] rounded animate-pulse mb-4" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="w-12 h-12 rounded-xl bg-[#E5E7EB] animate-pulse flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 w-32 bg-[#E5E7EB] rounded animate-pulse mb-2" />
                    <div className="h-3 w-24 bg-[#E5E7EB] rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-16 bg-[#E5E7EB] rounded animate-pulse flex-shrink-0" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-5">
              <div className="h-4 w-20 bg-[#E5E7EB] rounded-full animate-pulse mb-4" />
              <div className="h-5 w-40 bg-[#E5E7EB] rounded animate-pulse mb-2" />
              <div className="h-3 w-full bg-[#E5E7EB] rounded animate-pulse mb-2" />
              <div className="h-3 w-2/3 bg-[#E5E7EB] rounded animate-pulse mb-4" />
              <div className="h-9 w-32 bg-[#E5E7EB] rounded animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
          <div className="text-center py-16">
            <p className="text-[#6b7280] mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center min-h-[44px] px-6 rounded-lg text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-all duration-200"
            >
              Try again
            </button>
          </div>
        </main>
      </div>
    );
  }

  const { arrivals = [], departures = [], inHouse = [] } = data || {};
  const unreadCount = conversations.reduce((n, c) => n + (c.unreadCount || 0), 0);

  // A plain USER with an in-progress (non-approved) application gets the full
  // step-by-step checklist. Approved hosts (and pre-verified HOST accounts)
  // see only the compact "next step" card so the checklist never crowds their
  // daily operations view.
  const isPendingUserApplicant = user?.role === 'USER' && user?.hostApplicationStatus !== 'APPROVED';

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Title block */}
        <div className="mb-8">
          <p className="text-sm text-[#6b7280]">
            {new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#222222] sm:text-3xl">
            Today{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
        </div>

        {isPendingUserApplicant && (
          <OnboardingChecklist hostApplicationStatus={user?.hostApplicationStatus} properties={myProperties} role={user?.role} />
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <MetricCard
            label="Arrivals"
            value={arrivals.length}
            iconClass="bg-amber-50 text-amber-600"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
          />
          <MetricCard
            label="Departures"
            value={departures.length}
            iconClass="bg-blue-50 text-[#2563EB]"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
          />
          <MetricCard
            label="Unread messages"
            value={unreadCount}
            iconClass="bg-green-50 text-green-600"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />}
          />
        </div>

        {/* Primary operations: arrivals + next step */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <ArrivingTodayCard arrivals={arrivals} />
          </div>
          <div>
            <NextStepCard hostApplicationStatus={user?.hostApplicationStatus} properties={myProperties} role={user?.role} />
          </div>
        </div>

        {/* Secondary operations: departures + in-house (full cards preserve the
            "view details" / "message" / "report an issue" actions) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <section>
            <h2 className="text-lg font-bold text-[#222222] mb-4 flex items-center gap-2">
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

          <section>
            <h2 className="text-lg font-bold text-[#222222] mb-4 flex items-center gap-2">
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
        </div>

        {/* Recent guest messages */}
        <RecentMessagesPanel conversations={conversations.slice(0, 3)} loading={conversationsLoading} />
      </main>
    </div>
  );
}
