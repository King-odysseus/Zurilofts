import { useEffect, useState } from "react";
import { Badge, Button, TabItem, Tabs } from "flowbite-react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { CalendarDays } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/client.js";
import { firstImage } from "../utils/images.js";

// Badge tones replace the old per-tone status pills on each panel header.
const TONE_COLORS = { arrival: "info", inhouse: "warning", departure: "success" };

const CARD = "rounded-xl border border-border bg-elevated p-5 shadow-sm";
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600";

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

  return <article className={`flex items-center gap-3 rounded-xl border border-border bg-elevated ${compact ? "p-2.5" : "p-3"}`}>
    <Link to={`/property/${property.id || ""}`} className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface text-sm font-bold uppercase text-muted" aria-label={propertyTitle}>
      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <span>{guestInitials(booking)}</span>}
    </Link>
    <div className="min-w-0 flex-1">
      <strong className="block truncate text-sm font-semibold text-navy">{guestName(booking)}</strong>
      <span className="block truncate text-xs text-muted">{propertyTitle} · {time}</span>
      <Link to={`/messages?booking=${booking.id}`} className="text-xs font-semibold text-navy underline-offset-2 hover:underline">Message guest</Link>
    </div>
    <Link className="shrink-0 text-xs font-semibold text-muted transition-colors hover:text-navy" to={`/bookings/${booking.id}`}>View</Link>
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
  return <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-elevated px-5 py-12 text-center">
    <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-muted"><CalendarDays className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" /></span>
    <strong className="text-sm font-semibold text-navy">No {label.toLowerCase()} today</strong>
    <p className="text-xs text-muted">This panel will update when the schedule changes.</p>
  </div>;
}

EmptyPanel.propTypes = { label: PropTypes.string.isRequired };

function OperationPanel({ title, count, tone, bookings, type }) {
  return <section className={CARD}>
    <header className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-navy">{title}</h2>
      <Badge color={TONE_COLORS[tone]}>{count} today</Badge>
    </header>
    <div className="space-y-3">
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
  return <section className={CARD}>
    <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className={`block ${EYEBROW}`}>GUEST MESSAGES</span>
        <h2 className="mt-1 text-base font-semibold text-navy">Recent conversations</h2>
      </div>
      <Button as={Link} to="/inbox" color="light" size="sm">View inbox</Button>
    </header>
    {loading ? <div className="grid grid-cols-1 gap-3 lg:grid-cols-3"><span className="block h-20 animate-pulse rounded-xl border border-border bg-surface" /><span className="block h-20 animate-pulse rounded-xl border border-border bg-surface" /></div> : conversations.length === 0 ? <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-5 py-12 text-center"><strong className="text-sm font-semibold text-navy">No guest messages yet</strong><p className="text-xs text-muted">New stay conversations will appear here.</p></div> : <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {conversations.map((conversation) => {
        const booking = conversation.booking || {};
        const property = booking.property || {};
        const user = booking.user || {};
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Guest";
        const image = firstImage(property);
        return <Link key={conversation.id} to={`/inbox/${conversation.id}`} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-primary-50">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-elevated text-xs font-bold uppercase text-muted">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1)}</span>
          <div className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold text-navy">{name}</strong><small className="block truncate text-xs text-muted">{property.title || "Stay"}</small><p className="mt-1 truncate text-xs text-muted">{conversation.lastMessage?.content || "No messages yet"}</p></div>
          <time className="shrink-0 text-[10px] text-muted">{relativeTime(conversation.lastMessage?.createdAt || conversation.updatedAt)}</time>
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

  if (loading) return <div className="space-y-6" aria-label="Loading host dashboard"><span className="block h-24 animate-pulse rounded-xl border border-border bg-elevated" /><span className="block h-44 animate-pulse rounded-xl border border-border bg-elevated" /><span className="block h-24 animate-pulse rounded-xl border border-border bg-elevated" /><span className="block h-64 animate-pulse rounded-xl border border-border bg-elevated" /></div>;

  if (error) return <div className="space-y-6"><div className="rounded-xl border border-border bg-elevated p-5 shadow-sm"><p className="text-sm text-charcoal">{error}</p><Button type="button" size="sm" className="mt-3" onClick={() => window.location.reload()}>Try again</Button></div></div>;

  const { arrivals = [], departures = [], inHouse = [], summary = {} } = data || {};
  const priority = arrivals[0] || inHouse[0] || departures[0];
  const priorityType = arrivals[0] ? "arrival" : inHouse[0] ? "inhouse" : "departure";

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className={EYEBROW}>HOST WORKSPACE</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Today</h1>
        <span className="mt-1 block text-sm text-muted">{formatToday()}</span>
      </div>
      <Button as={Link} to="/host/calendar" color="light" size="sm" className="hidden md:inline-flex">Open calendar</Button>
    </header>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-primary-50 dark:bg-primary/15 p-5 shadow-sm sm:flex-row sm:items-center lg:col-span-2">
        <div>
          <p className={EYEBROW}>TODAY AT YOUR STAYS</p>
          <h2 className="mt-1 text-xl font-semibold text-navy">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}{user?.firstName ? `, ${user.firstName}` : ""}</h2>
          <span className="mt-2 block text-sm leading-relaxed text-muted">{summary.arrivals || 0} arrivals, {summary.departures || 0} departures, and {summary.inHouse || 0} in-house guests on today&apos;s schedule.</span>
        </div>
        <Button as={Link} to="/host/calendar" size="sm" className="self-start md:hidden">Open calendar</Button>
      </section>
      <section className="flex flex-col items-start rounded-xl border border-border bg-navy-bg p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">PRIORITY NEXT STEP</p>
        <h2 className="mt-1 text-xl font-semibold text-white">{priority ? (priorityType === "arrival" ? "Confirm arrival details" : priorityType === "departure" ? "Review today's checkout" : "Check your in-house guest") : "Your day is clear"}</h2>
        <span className="mt-2 block text-sm leading-relaxed text-white/70">{priority ? `${guestName(priority)} at ${priority.property?.title || "your property"} · ${bookingTime(priority, priorityType)}` : "There are no urgent guest actions scheduled right now."}</span>
        {/* The card only needs its own action when there is a booking to open.
            With nothing scheduled the call to action repeated the calendar
            button already shown above, so the card stays informational. */}
        {priority && <Button as={Link} to={`/bookings/${priority.id}`} size="sm" className="mt-4 self-start">Review booking</Button>}
      </section>
    </div>

    <div className="hidden grid-cols-1 gap-4 sm:grid sm:grid-cols-3">
      <article className="flex items-center justify-between gap-4 rounded-xl border border-border bg-elevated p-4 shadow-sm"><div><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Arrivals</span><small className="mt-1 block text-xs text-muted">Guests checking in</small></div><strong className="text-2xl font-bold text-navy">{summary.arrivals || 0}</strong></article>
      <article className="flex items-center justify-between gap-4 rounded-xl border border-border bg-elevated p-4 shadow-sm"><div><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Departures</span><small className="mt-1 block text-xs text-muted">Guests checking out</small></div><strong className="text-2xl font-bold text-navy">{summary.departures || 0}</strong></article>
      <article className="flex items-center justify-between gap-4 rounded-xl border border-border bg-elevated p-4 shadow-sm"><div><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">In house</span><small className="mt-1 block text-xs text-muted">Stays in progress</small></div><strong className="text-2xl font-bold text-navy">{summary.inHouse || 0}</strong></article>
    </div>

    <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:[&>section:last-child]:col-span-2 lg:[&>section:last-child]:col-span-1">
      <OperationPanel title="Arrivals" count={arrivals.length} tone="arrival" bookings={arrivals} type="arrival" />
      <OperationPanel title="In house" count={inHouse.length} tone="inhouse" bookings={inHouse} type="inhouse" />
      <OperationPanel title="Departures" count={departures.length} tone="departure" bookings={departures} type="departure" />
    </div>

    <div className="md:hidden">
      <Tabs
        aria-label="Today's operations"
        variant="pills"
        onActiveTabChange={(index) => setMobileTab(["arrival", "inhouse", "departure"][index])}
      >
        {[
          ["arrival", "Arrivals", arrivals],
          ["inhouse", "In house", inHouse],
          ["departure", "Departures", departures],
        ].map(([key, label, items]) => <TabItem
          key={key}
          title={<span className="flex flex-col leading-tight"><span className="whitespace-nowrap">{label}</span><span className="text-[11px] opacity-70">{items.length}</span></span>}
          active={mobileTab === key}
        >
          <div className="space-y-3">
            {items.length === 0
              ? <EmptyPanel label={key === "arrival" ? "Arrivals" : key === "departure" ? "Departures" : "In-house guests"} />
              : items.map((booking) => <GuestOperationCard key={booking.id} booking={booking} type={key} compact />)}
          </div>
        </TabItem>)}
      </Tabs>
    </div>

    <RecentMessages conversations={conversations} loading={conversationsLoading} />
  </div>;
}
