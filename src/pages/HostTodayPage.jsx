import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { CalendarDays } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/client.js";
import { firstImage } from "../utils/images.js";

function formatToday() {
  return new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" });
}

function guestName(booking) {
  const user = booking.user || {};
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Guest";
}

function guestInitials(booking) {
  const user = booking.user || {};
  return `${user.firstName?.[0] || "G"}${user.lastName?.[0] || ""}`.toUpperCase();
}

function bookingTime(booking, type) {
  if (type === "arrival") return booking.checkInTime || "15:00";
  if (type === "departure") return booking.checkOutTime || "10:00";
  return "In house";
}

function relativeTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function GuestOperationCard({ booking, type, compact = false }) {
  const property = booking.property || {};
  const image = firstImage(property) || property.coverImage;
  const propertyTitle = property.title || "Your stay";
  const time = bookingTime(booking, type);

  return <article className={`op-host-guest-card${compact ? " is-compact" : ""}`}>
    <Link to={`/property/${property.id || ""}`} className="op-host-guest-thumb" aria-label={propertyTitle}>
      {image ? <img src={image} alt="" /> : <span>{guestInitials(booking)}</span>}
    </Link>
    <div className="op-host-guest-copy">
      <strong>{guestName(booking)}</strong>
      <span>{propertyTitle} · {time}</span>
      <Link to={`/messages?booking=${booking.id}`}>Message guest</Link>
    </div>
    <Link className="op-host-guest-view" to={`/bookings/${booking.id}`}>View</Link>
  </article>;
}

GuestOperationCard.propTypes = {
  booking: PropTypes.shape({
    id: PropTypes.string.isRequired,
    checkInTime: PropTypes.string,
    checkOutTime: PropTypes.string,
    user: PropTypes.shape({ firstName: PropTypes.string, lastName: PropTypes.string }),
    property: PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
      images: PropTypes.arrayOf(PropTypes.string),
      imagesJson: PropTypes.string,
      coverImage: PropTypes.string,
    }),
  }).isRequired,
  type: PropTypes.oneOf(["arrival", "departure", "inhouse"]).isRequired,
  compact: PropTypes.bool,
};

function EmptyPanel({ label }) {
  return <div className="op-host-empty">
    <span><CalendarDays strokeWidth={1.6} aria-hidden="true" /></span>
    <strong>No {label.toLowerCase()} today</strong>
    <p>This panel will update when the schedule changes.</p>
  </div>;
}

EmptyPanel.propTypes = { label: PropTypes.string.isRequired };

function OperationPanel({ title, count, tone, bookings, type }) {
  return <section className="op-host-panel">
    <header>
      <h2>{title}</h2>
      <span className={`is-${tone}`}>{count} today</span>
    </header>
    <div className="op-host-panel-list">
      {bookings.length === 0 ? <EmptyPanel label={title} /> : bookings.map((booking) => <GuestOperationCard key={booking.id} booking={booking} type={type} compact />)}
    </div>
  </section>;
}

OperationPanel.propTypes = {
  title: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  tone: PropTypes.oneOf(["arrival", "departure", "inhouse"]).isRequired,
  bookings: PropTypes.arrayOf(PropTypes.object).isRequired,
  type: PropTypes.oneOf(["arrival", "departure", "inhouse"]).isRequired,
};

function RecentMessages({ conversations, loading }) {
  return <section className="op-host-messages">
    <header>
      <div><span>GUEST MESSAGES</span><h2>Recent conversations</h2></div>
      <Link to="/inbox">View inbox</Link>
    </header>
    {loading ? <div className="op-host-message-loading"><span /><span /></div> : conversations.length === 0 ? <div className="op-host-empty"><strong>No guest messages yet</strong><p>New stay conversations will appear here.</p></div> : <div className="op-host-message-list">
      {conversations.map((conversation) => {
        const booking = conversation.booking || {};
        const property = booking.property || {};
        const user = booking.user || {};
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Guest";
        const image = firstImage(property);
        return <Link key={conversation.id} to={`/inbox/${conversation.id}`} className="op-host-message-row">
          <span className="op-host-message-avatar">{image ? <img src={image} alt="" /> : name.slice(0, 1)}</span>
          <span className="op-host-message-copy"><strong>{name}</strong><small>{property.title || "Stay"}</small><p>{conversation.lastMessage?.content || "No messages yet"}</p></span>
          <time>{relativeTime(conversation.lastMessage?.createdAt || conversation.updatedAt)}</time>
        </Link>;
      })}
    </div>}
  </section>;
}

RecentMessages.propTypes = {
  conversations: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool.isRequired,
};

export default function HostTodayPage() {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState("arrival");

  useEffect(() => {
    document.title = "Today | ZuriLofts Host";
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    async function loadToday() {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get("/bookings/host/today");
        if (active) setData(response.data.data);
      } catch {
        if (active) setError("Could not load today's overview. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    async function loadConversations() {
      try {
        const response = await apiClient.get("/conversations");
        if (active) setConversations((response.data.data || []).slice(0, 3));
      } catch {
        if (active) setConversations([]);
      } finally {
        if (active) setConversationsLoading(false);
      }
    }
    loadToday();
    loadConversations();
    return () => { active = false; };
  }, [isAuthenticated]);

  if (loading) return <div className="op-host-today op-host-loading" aria-label="Loading host dashboard"><span /><span /><span /><span /></div>;

  if (error) return <div className="op-host-today"><div className="op-host-error"><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div></div>;

  const { arrivals = [], departures = [], inHouse = [], summary = {} } = data || {};
  const priority = arrivals[0] || inHouse[0] || departures[0];
  const priorityType = arrivals[0] ? "arrival" : inHouse[0] ? "inhouse" : "departure";
  const mobileItems = mobileTab === "arrival" ? arrivals : mobileTab === "departure" ? departures : inHouse;

  return <div className="op-host-today">
    <div className="op-host-heading">
      <div><p>HOST WORKSPACE</p><h1>Today</h1><span>{formatToday()}</span></div>
      <Link className="op-host-outline-action" to="/host/calendar">Open calendar</Link>
    </div>

    <div className="op-host-hero-grid">
      <section className="op-host-greeting">
        <div><p>TODAY AT YOUR STAYS</p><h2>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}{user?.firstName ? `, ${user.firstName}` : ""}</h2><span>{summary.arrivals || 0} arrivals, {summary.departures || 0} departures, and {summary.inHouse || 0} in-house guests on today&apos;s schedule.</span></div>
        <Link to="/host/calendar">Open calendar</Link>
      </section>
      <section className="op-host-priority">
        <p>PRIORITY NEXT STEP</p>
        <h2>{priority ? (priorityType === "arrival" ? "Confirm arrival details" : priorityType === "departure" ? "Review today's checkout" : "Check your in-house guest") : "Your day is clear"}</h2>
        <span>{priority ? `${guestName(priority)} at ${priority.property?.title || "your property"} · ${bookingTime(priority, priorityType)}` : "There are no urgent guest actions scheduled right now."}</span>
        <Link to={priority ? `/bookings/${priority.id}` : "/host/calendar"}>{priority ? "Review booking" : "Open calendar"}</Link>
      </section>
    </div>

    <div className="op-host-summary">
      <article><span>Arrivals</span><strong>{summary.arrivals || 0}</strong><small>Guests checking in</small></article>
      <article><span>Departures</span><strong>{summary.departures || 0}</strong><small>Guests checking out</small></article>
      <article><span>In house</span><strong>{summary.inHouse || 0}</strong><small>Stays in progress</small></article>
    </div>

    <div className="op-host-panel-grid">
      <OperationPanel title="Arrivals" count={arrivals.length} tone="arrival" bookings={arrivals} type="arrival" />
      <OperationPanel title="In house" count={inHouse.length} tone="inhouse" bookings={inHouse} type="inhouse" />
      <OperationPanel title="Departures" count={departures.length} tone="departure" bookings={departures} type="departure" />
    </div>

    <div className="op-host-mobile-ops">
      <div className="op-host-mobile-tabs" role="tablist" aria-label="Today's operations">
        <button type="button" role="tab" aria-selected={mobileTab === "arrival"} className={mobileTab === "arrival" ? "is-active" : ""} onClick={() => setMobileTab("arrival")}>Arrivals <span>{arrivals.length}</span></button>
        <button type="button" role="tab" aria-selected={mobileTab === "inhouse"} className={mobileTab === "inhouse" ? "is-active" : ""} onClick={() => setMobileTab("inhouse")}>In house <span>{inHouse.length}</span></button>
        <button type="button" role="tab" aria-selected={mobileTab === "departure"} className={mobileTab === "departure" ? "is-active" : ""} onClick={() => setMobileTab("departure")}>Departures <span>{departures.length}</span></button>
      </div>
      <div className="op-host-mobile-list">
        {mobileItems.length === 0 ? <EmptyPanel label={mobileTab === "arrival" ? "Arrivals" : mobileTab === "departure" ? "Departures" : "In-house guests"} /> : mobileItems.map((booking) => <GuestOperationCard key={booking.id} booking={booking} type={mobileTab} compact />)}
      </div>
    </div>

    <RecentMessages conversations={conversations} loading={conversationsLoading} />
  </div>;
}
