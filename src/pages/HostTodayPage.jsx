import { useEffect, useState } from "react";
import { Alert, Badge, Button, TabItem, Tabs } from "flowbite-react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { CalendarDays } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/client.js";
import { firstImage } from "../utils/images.js";
import HostCard, { HOST_EYEBROW } from "../components/HostCard.jsx";
import HostFollowUps from "../components/HostFollowUps.jsx";

// Badge tones replace the old per-tone status pills on each panel header.
const TONE_COLORS = { arrival: "info", inhouse: "warning", departure: "success" };

const SKELETON_HEIGHTS = ["h-24", "h-44", "h-24", "h-64"];

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

function GuestOperationCard({ booking, type, compact = false, onMessage, messagePending }) {
  const property = booking.property || {};
  const image = firstImage(property) || property.coverImage;
  const propertyTitle = property.title || "Your stay";
  const time = bookingTime(booking, type);

  // Rows sit inside a HostCard on desktop and directly on the page on mobile,
  // so the tile carries its own surface tint instead of a border that would
  // double up with the card outline.
  return <article className={`flex items-center gap-3 rounded-xl bg-surface ${compact ? "p-2.5" : "p-3"}`}>
    <Link to={`/property/${property.id || ""}`} className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-elevated text-sm font-bold uppercase text-muted" aria-label={propertyTitle}>
      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <span>{guestInitials(booking)}</span>}
    </Link>
    <div className="min-w-0 flex-1">
      <strong className="block truncate text-sm font-semibold text-navy">{guestName(booking)}</strong>
      <span className="block truncate text-xs text-muted">{propertyTitle} · {time}</span>
      {/* A guest conversation belongs to the host inbox. This used to open the
          traveller support thread, which is a different inbox entirely. */}
      <button type="button" onClick={() => onMessage(booking.id)} disabled={messagePending} className="text-xs font-semibold text-navy underline-offset-2 hover:underline disabled:opacity-60">{messagePending ? "Opening..." : "Message guest"}</button>
    </div>
    <Link className="shrink-0 text-xs font-semibold text-muted transition-colors hover:text-navy" to={`/host/reservations/${booking.id}`}>View</Link>
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
  onMessage: PropTypes.func.isRequired,
  messagePending: PropTypes.bool,
};

function EmptyPanel({ label }) {
  return <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-elevated px-5 py-12 text-center">
    <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-muted"><CalendarDays className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" /></span>
    <strong className="text-sm font-semibold text-navy">No {label.toLowerCase()} today</strong>
    <p className="text-xs text-muted">This panel will update when the schedule changes.</p>
  </div>;
}

EmptyPanel.propTypes = { label: PropTypes.string.isRequired };

function StatTile({ label, hint, value }) {
  return <HostCard>
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
        <small className="mt-1 block text-xs text-muted">{hint}</small>
      </div>
      <strong className="text-2xl font-bold tabular-nums text-navy">{value}</strong>
    </div>
  </HostCard>;
}

StatTile.propTypes = {
  label: PropTypes.string.isRequired,
  hint: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
};

function OperationPanel({ title, count, tone, bookings, type, onMessage, messageBookingId }) {
  return <HostCard title={title} action={<Badge color={TONE_COLORS[tone]}>{count} today</Badge>}>
    <div className="space-y-3">
      {bookings.length === 0 ? <EmptyPanel label={title} /> : bookings.map((booking) => <GuestOperationCard key={booking.id} booking={booking} type={type} compact onMessage={onMessage} messagePending={messageBookingId === booking.id} />)}
    </div>
  </HostCard>;
}

OperationPanel.propTypes = {
  title: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  tone: PropTypes.oneOf(["arrival", "departure", "inhouse"]).isRequired,
  bookings: PropTypes.arrayOf(PropTypes.object).isRequired,
  type: PropTypes.oneOf(["arrival", "departure", "inhouse"]).isRequired,
  onMessage: PropTypes.func.isRequired,
  messageBookingId: PropTypes.string,
};

function RecentMessages({ conversations, loading }) {
  return <HostCard
    eyebrow="GUEST MESSAGES"
    title="Recent conversations"
    action={<Button as={Link} to="/host/inbox" color="light" size="sm">View inbox</Button>}
  >
    {loading
      ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <span className="block h-20 animate-pulse rounded-xl bg-surface" />
        <span className="block h-20 animate-pulse rounded-xl bg-surface" />
      </div>
      : conversations.length === 0
        ? <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-5 py-12 text-center">
          <strong className="text-sm font-semibold text-navy">No guest messages yet</strong>
          <p className="text-xs text-muted">New stay conversations will appear here.</p>
        </div>
        : <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {conversations.map((conversation) => {
        const booking = conversation.booking || {};
        const property = booking.property || {};
        const user = booking.user || {};
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Guest";
        const image = firstImage(property);
        return <Link key={conversation.id} to={`/host/inbox/${conversation.id}`} className="flex items-start gap-3 rounded-xl bg-surface p-3 transition-colors hover:bg-surface">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-elevated text-xs font-bold uppercase text-muted">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1)}</span>
          <div className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold text-navy">{name}</strong><small className="block truncate text-xs text-muted">{property.title || "Stay"}</small><p className="mt-1 truncate text-xs text-muted">{conversation.lastMessage?.content || "No messages yet"}</p></div>
          <time className="shrink-0 text-[10px] text-muted">{relativeTime(conversation.lastMessage?.createdAt || conversation.updatedAt)}</time>
        </Link>;
      })}
    </div>}
  </HostCard>;
}

RecentMessages.propTypes = {
  conversations: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool.isRequired,
};

export default function HostTodayPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState("arrival");
  const [messageBookingId, setMessageBookingId] = useState(null);
  const [messageError, setMessageError] = useState("");
  const [followUps, setFollowUps] = useState([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(true);

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
        // Guest conversations only: this is the host dashboard, so the traveller
        // threads this account may also have are left to the travel inbox.
        const response = await apiClient.get("/conversations", { params: { side: "host" } });
        if (active) setConversations((response.data.data || []).slice(0, 3));
      } catch {
        if (active) setConversations([]);
      } finally {
        if (active) setConversationsLoading(false);
      }
    }
    async function loadFollowUps() {
      try {
        const response = await apiClient.get("/reviews/host", { params: { limit: 10 } });
        if (active) setFollowUps(response.data.data?.followUps?.items || []);
      } catch {
        // A missing follow-up list must not hide the day's real schedule.
        if (active) setFollowUps([]);
      } finally {
        if (active) setFollowUpsLoading(false);
      }
    }
    loadToday();
    loadConversations();
    loadFollowUps();
    return () => { active = false; };
  }, [isAuthenticated]);

  // The conversation is created on demand, so a host writing to a guest they have
  // never messaged lands in the same thread the guest will see.
  async function openGuestConversation(bookingId) {
    setMessageBookingId(bookingId);
    setMessageError("");
    try {
      const response = await apiClient.post("/conversations", { bookingId });
      navigate(`/host/inbox/${response.data.data.id}`);
    } catch {
      setMessageError("Could not open that conversation. Please try again.");
    } finally {
      setMessageBookingId(null);
    }
  }

  if (loading) return <div className="space-y-6" aria-label="Loading host dashboard">
    {SKELETON_HEIGHTS.map((height, index) => <HostCard key={`${height}-${index}`}>
      <span className={`block ${height} animate-pulse rounded-xl bg-surface`} />
    </HostCard>)}
  </div>;

  if (error) return <div className="space-y-6"><HostCard><p className="text-sm text-charcoal">{error}</p><Button type="button" size="sm" onClick={() => window.location.reload()}>Try again</Button></HostCard></div>;

  const { arrivals = [], departures = [], inHouse = [], summary = {} } = data || {};
  const priority = arrivals[0] || inHouse[0] || departures[0];
  const priorityType = arrivals[0] ? "arrival" : inHouse[0] ? "inhouse" : "departure";

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className={HOST_EYEBROW}>HOST WORKSPACE</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Today</h1>
        <span className="mt-1 block text-sm text-muted">{formatToday()}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button as={Link} to="/host/reservations" color="light" size="sm" className="hidden md:inline-flex">All reservations</Button>
        <Button as={Link} to="/host/calendar" color="light" size="sm" className="hidden md:inline-flex">Open calendar</Button>
      </div>
    </header>

    {messageError && <Alert color="failure">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1">{messageError}</p>
        <Button size="xs" color="light" onClick={() => setMessageError("")}>Dismiss</Button>
      </div>
    </Alert>}

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <HostCard
        className="lg:col-span-2"
        eyebrow="TODAY AT YOUR STAYS"
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}${user?.firstName ? `, ${user.firstName}` : ""}`}
        action={<Button as={Link} to="/host/calendar" size="sm" className="md:hidden">Open calendar</Button>}
      >
        <p className="text-sm leading-relaxed text-muted">{summary.arrivals || 0} arrivals, {summary.departures || 0} departures, and {summary.inHouse || 0} in-house guests on today&apos;s schedule.</p>
      </HostCard>
      {/* White-on-navy text cannot use the shared head props, so the tint is the
          card body itself: flush removes the body padding and overflow-hidden
          trims the fill to the card radius. */}
      <HostCard flush className="overflow-hidden">
        <div className="flex h-full flex-col gap-3 bg-navy-bg p-4 sm:p-5">
          <div className="min-w-0">
            <p className={HOST_EYEBROW}>PRIORITY NEXT STEP</p>
            <h2 className="mt-1 text-base font-semibold text-white">{priority ? (priorityType === "arrival" ? "Confirm arrival details" : priorityType === "departure" ? "Review today's checkout" : "Check your in-house guest") : "Your day is clear"}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{priority ? `${guestName(priority)} at ${priority.property?.title || "your property"} · ${bookingTime(priority, priorityType)}` : "There are no urgent guest actions scheduled right now."}</p>
          </div>
          {/* The card only needs its own action when there is a booking to open.
              With nothing scheduled the call to action repeated the calendar
              button already shown above, so the card stays informational. */}
          {priority && <Button as={Link} to={`/host/reservations/${priority.id}`} size="sm" className="self-start">Review booking</Button>}
        </div>
      </HostCard>
    </div>

    <div className="hidden grid-cols-1 gap-4 sm:grid sm:grid-cols-3">
      <StatTile label="Arrivals" hint="Guests checking in" value={summary.arrivals || 0} />
      <StatTile label="Departures" hint="Guests checking out" value={summary.departures || 0} />
      <StatTile label="In house" hint="Stays in progress" value={summary.inHouse || 0} />
    </div>

    <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:[&>div:last-child]:col-span-2 lg:[&>div:last-child]:col-span-1">
      <OperationPanel title="Arrivals" count={arrivals.length} tone="arrival" bookings={arrivals} type="arrival" onMessage={openGuestConversation} messageBookingId={messageBookingId} />
      <OperationPanel title="In house" count={inHouse.length} tone="inhouse" bookings={inHouse} type="inhouse" onMessage={openGuestConversation} messageBookingId={messageBookingId} />
      <OperationPanel title="Departures" count={departures.length} tone="departure" bookings={departures} type="departure" onMessage={openGuestConversation} messageBookingId={messageBookingId} />
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
              : items.map((booking) => <GuestOperationCard key={booking.id} booking={booking} type={key} compact onMessage={openGuestConversation} messagePending={messageBookingId === booking.id} />)}
          </div>
        </TabItem>)}
      </Tabs>
    </div>

    <HostFollowUps items={followUps} loading={followUpsLoading} />

    <RecentMessages conversations={conversations} loading={conversationsLoading} />
  </div>;
}
