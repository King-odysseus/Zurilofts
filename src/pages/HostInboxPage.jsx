import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Label, Textarea } from 'flowbite-react';
import PropTypes from 'prop-types';
import {
  CalendarDays,
  ChevronLeft,
  MessageCircleMore,
  Search,
  Settings2,
  Users,
  X,
} from 'lucide-react';
import apiClient from '../api/client.js';
import MessageAttachments from '../components/MessageAttachments.jsx';
import MessageComposer from '../components/MessageComposer.jsx';
import HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { CONVERSATIONS_READ_EVENT, getConversationParticipant } from '../utils/conversations.js';
import { firstImage } from '../utils/images.js';

// Hosts and travellers each have their own inbox. This is the host one: the
// guests staying at the signed-in account's properties. The traveller inbox owns
// the conversations the account starts as a guest, and the two never mix, which
// is why every request here is scoped with side=host.
//
// The screen borrows the shape of a mature host inbox: the list on the left, the
// thread in the middle, and the reservation on the right. A host answers a
// message with the stay in front of them, so the booking never lives on
// another page.

const DAY_MS = 86_400_000;

// The list and reservation columns fill the space between the page header and
// the phone's bottom bar, so nothing important sits under the navigation. On
// desktop they grow to a tall fixed column with their own scrolling.
const COLUMN_HEIGHT = 'max-h-[calc(100dvh-19rem)] min-h-[360px] md:max-h-none md:h-[calc(100vh-14rem)] md:min-h-[520px]';

// An opened thread is a page on a phone, not a card on one: it takes the height
// between the page heading and the phone's bottom bar, so the composer stays
// pinned to the bottom instead of floating where the last message happened to
// end. md keeps the tall fixed column the side-by-side layout needs.
const PAGE_THREAD_HEIGHT = 'h-[calc(100dvh-19rem)] min-h-[360px] md:h-[calc(100vh-14rem)] md:min-h-[520px]';

// Flowbite's card theme owns the radius, border, shadow and surface, and Tailwind
// picks between two utilities of the same kind by emission order rather than by
// the order they appear in the class attribute. The important marks are what make
// the card chrome disappear on small screens for certain, so no stray hairline
// or shadow is left framing the thread; md restores the card for the two and
// three column layout. The colours are theme tokens, so both themes follow.
const THREAD_PAGE_SHELL = [
  '-mx-4 !rounded-none !border-0 !bg-canvas !shadow-none',
  'md:mx-0 md:!rounded-[14px] md:!border md:!bg-elevated md:!shadow-sm',
].join(' ');

// label holds a translation key, not a word: this table sits at module scope
// where no translator is in reach, so each render site passes it through t().
const STATUS_TONE = {
  CONFIRMED: { label: 'hostinbox.statusConfirmed', dot: 'bg-emerald-500' },
  PENDING: { label: 'hostinbox.statusAwaitingPayment', dot: 'bg-amber-500' },
  CANCELLED: { label: 'hostinbox.statusCancelled', dot: 'bg-red-400' },
  CONFLICT: { label: 'hostinbox.statusDatesConflict', dot: 'bg-red-500' },
};

function statusOf(status) {
  // An unknown status is server data, so it is shown as it arrives; t() returns
  // an unknown key unchanged, which is exactly that behaviour.
  return STATUS_TONE[status] || { label: status || 'hostinbox.statusUnavailable', dot: 'bg-slate-400' };
}

function startOfDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatWhen(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? formatTime(iso)
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatDayLabel(value, t) {
  const day = startOfDay(value);
  if (!day) return '';
  const today = startOfDay(new Date());
  const offset = Math.round((today - day) / DAY_MS);
  if (offset === 0) return t('hostinbox.today');
  if (offset === 1) return t('hostinbox.yesterday');
  if (offset > 1 && offset < 7) return day.toLocaleDateString('en-GB', { weekday: 'long' });
  return day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "13-15 Nov" - the range a host reads at a glance, month shown once. */
function formatStayRange(checkIn, checkOut, t) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return t('hostinbox.datesUnavailable');
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: sameMonth ? undefined : 'short' });
  const endLabel = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${startLabel}-${endLabel}`;
}

function nightsBetween(checkIn, checkOut) {
  const start = startOfDay(checkIn);
  const end = startOfDay(checkOut);
  if (!start || !end) return 0;
  const nights = Math.round((end - start) / DAY_MS);
  return nights > 0 ? nights : 0;
}

// The fallback is a parameter so the two callers can pass a translated label; a
// saved reply preview keeps the English one because it is inserted into a
// host-written message body rather than read as interface copy.
function formatDay(value, unavailableLabel = 'Date unavailable') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return unavailableLabel;
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function initialsFor(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'G';
}

/** Group messages under a day heading, so a long thread reads as days rather
 *  than one wall of bubbles. */
function groupByDay(messages, t) {
  const groups = [];
  for (const message of messages) {
    const day = startOfDay(message.createdAt);
    const key = day ? day.toISOString().slice(0, 10) : 'unknown';
    const current = groups[groups.length - 1];
    if (current && current.key === key) current.messages.push(message);
    else groups.push({ key, label: formatDayLabel(message.createdAt, t), messages: [message] });
  }
  return groups;
}

// The host's saved per-property templates are written with {placeholders}. A
// saved reply inserted into the composer should read like a real draft, so the
// same tokens are filled from this booking before the host edits it.
function renderSavedReply(body, booking, property) {
  const guest = booking?.user || {};
  const host = property?.host || {};
  const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(' ').trim();
  const hostName = [host.firstName, host.lastName].filter(Boolean).join(' ').trim();
  const context = {
    guestFirstName: guest.firstName || 'there',
    guestName: guestName || 'there',
    guest: guestName || 'there',
    hostFirstName: host.firstName || 'your host',
    hostName: hostName || 'your host',
    host: hostName || 'your host',
    property: property?.title || 'your stay',
    location: property?.location || '',
    neighborhood: property?.neighborhood || property?.location || '',
    address: property?.address || property?.location || '',
    checkIn: formatDay(booking?.checkIn),
    checkOut: formatDay(booking?.checkOut),
    guests: String(booking?.guests ?? ''),
  };
  // A template sentence such as "in {location}" would otherwise leave "in !"
  // behind when a property has no location filled in.
  return body
    .replace(/\{(\w+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(context, key) ? context[key] : match
    ))
    .replace(/\s+in\s*([,.!?;:])/gi, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
}

/* ------------------------------------------------------------------ list ---- */

function GuestRow({ conversation, currentUserId, selected }) {
  const { t } = useLanguage();
  const participant = getConversationParticipant(conversation, currentUserId);
  const booking = conversation.booking || {};
  const property = booking.property || {};
  const image = firstImage(property);
  const unread = Number(conversation.unreadCount) || 0;
  const status = statusOf(booking.status);
  const stay = formatStayRange(booking.checkIn, booking.checkOut, t);

  // Full-bleed row on one shared gutter: the divider runs straight across and
  // nothing is inset, so every row and the thread header beside it start at the
  // same x. The selected row is a fill plus a bronze hairline drawn on the edge,
  // which shifts no content, rather than a bordered tile inside list padding.
  return <Link
    to={`/host/inbox/${conversation.id}`}
    aria-current={selected ? 'page' : undefined}
    className={`relative flex min-h-[72px] items-start gap-3 px-4 py-4 transition-colors ${selected ? 'bg-surface' : 'hover:bg-surface'}`}
  >
    {selected && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" aria-hidden="true" />}
    {/* Stay first, guest second: the thumbnail identifies the property and the
        small avatar says who wrote, which is how a host scans a full inbox.
        40px matches the thread header avatar so the two panes line up. */}
    <span className="relative h-10 w-10 shrink-0">
      <span className="block h-10 w-10 overflow-hidden rounded-lg bg-surface">
        {image
          ? <img src={image} alt="" className="h-full w-full object-cover" />
          : <span className="grid h-full w-full place-items-center text-muted"><CalendarDays className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" /></span>}
      </span>
      <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center overflow-hidden rounded-full border-2 border-elevated bg-navy-bg text-[8px] font-bold text-white">
        {participant.avatar ? <img src={participant.avatar} alt="" className="h-full w-full object-cover" /> : initialsFor(participant.name)}
      </span>
    </span>

    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2">
        <strong className={`truncate text-sm text-navy ${unread > 0 ? 'font-bold' : 'font-semibold'}`}>{participant.name}</strong>
        <time className="shrink-0 text-[10px] text-muted" dateTime={conversation.lastMessage?.createdAt || conversation.updatedAt}>{formatWhen(conversation.lastMessage?.createdAt || conversation.updatedAt)}</time>
      </div>
      <p className={`mt-1.5 truncate text-xs ${unread > 0 ? 'font-semibold text-navy' : 'text-muted'}`}>{conversation.lastMessage?.content || (conversation.lastMessage?.attachments?.length ? t('hostinbox.sentAttachment') : t('hostinbox.noMessagesYet'))}</p>
      <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
        <span className="truncate">{t(status.label)}, {stay}, {property.title || t('hostinbox.yourStay')}</span>
      </p>
    </div>

    {/* Bronze as a mark only: one 8px dot, never a filled block. */}
    {unread > 0 && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={t(unread === 1 ? 'hostinbox.unreadMessageOne' : 'hostinbox.unreadMessageOther', { count: unread })} />}
  </Link>;
}

GuestRow.propTypes = {
  conversation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    unreadCount: PropTypes.number,
    updatedAt: PropTypes.string,
    lastMessage: PropTypes.shape({ content: PropTypes.string, createdAt: PropTypes.string, attachments: PropTypes.array }),
    booking: PropTypes.object,
  }).isRequired,
  currentUserId: PropTypes.string,
  selected: PropTypes.bool.isRequired,
};

function ConversationList({
  conversations,
  totalCount,
  unreadCount,
  currentUserId,
  selectedId,
  loading,
  error,
  onRetry,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  settingsOpen,
  onToggleSettings,
  hideEnded,
  onHideEndedChange,
  onCloseSettings,
  className,
}) {
  const { t } = useLanguage();
  // flush: the rows run edge to edge, so the divider is one straight line and
  // every row shares the px-4 gutter the thread header uses beside it.
  return <HostCard
    flush
    title={t('hostinbox.messages')}
    className={`${className || ''} ${COLUMN_HEIGHT} overflow-hidden`.trim()}
    action={<div className="flex items-center gap-1">
      {/* Bronze stays a mark: a small count pill, never a filled block. */}
      {unreadCount > 0 && <Badge color="gray">{t('hostinbox.unreadBadge', { count: unreadCount })}</Badge>}
      <div className="relative">
        <button
          type="button"
          onClick={onToggleSettings}
          aria-label={t('hostinbox.messagingSettings')}
          aria-expanded={settingsOpen}
          className="grid h-11 w-11 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-navy"
        >
          <Settings2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </button>
        <MessagingSettings
          open={settingsOpen}
          hideEnded={hideEnded}
          onHideEndedChange={onHideEndedChange}
          onClose={onCloseSettings}
        />
      </div>
    </div>}
  >
    <div className="shrink-0 border-b border-border px-4 py-4">
      <label className="flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-muted focus-within:ring-1 focus-within:ring-primary">
        <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('hostinbox.searchGuestsOrStays')}
          aria-label={t('hostinbox.searchGuestConversations')}
          className="w-full min-w-0 border-0 bg-transparent p-0 text-sm text-navy placeholder:text-muted focus:outline-none focus:ring-0"
        />
      </label>
      <div className="mt-3 flex items-center gap-2" role="group" aria-label={t('hostinbox.filterConversations')}>
        {[['all', t('hostinbox.filterAll', { count: totalCount })], ['unread', t('hostinbox.filterUnread', { count: unreadCount })]].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onFilterChange(key)}
            aria-pressed={filter === key}
            className={`inline-flex h-9 items-center rounded-full px-3.5 text-xs font-semibold transition-colors ${filter === key ? 'bg-navy-bg text-white hover:bg-navy-hover' : 'bg-inset text-muted hover:text-navy'}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto">
      {loading ? <div className="flex flex-col gap-3 p-3" role="status" aria-label={t('hostinbox.loadingGuestConversations')}>
        <span className="block h-16 animate-pulse rounded-xl bg-inset" />
        <span className="block h-16 animate-pulse rounded-xl bg-inset [animation-delay:150ms]" />
        <span className="block h-16 animate-pulse rounded-xl bg-inset [animation-delay:300ms]" />
      </div> : error ? <div className="m-3 rounded-xl border border-dashed border-border p-4 text-center">
        <p className="text-xs text-muted">{error}</p>
        <Button type="button" size="sm" color="light" className="mt-2 min-h-[44px]" onClick={onRetry}>{t('hostinbox.tryAgain')}</Button>
      </div> : conversations.length === 0 ? <div className="m-3 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-4 py-10 text-center">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-muted"><MessageCircleMore className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" /></span>
        <strong className="text-sm font-semibold text-navy">{totalCount === 0 ? t('hostinbox.noGuestMessagesYet') : t('hostinbox.nothingMatches')}</strong>
        <p className="text-xs leading-relaxed text-muted">
          {totalCount === 0
            ? t('hostinbox.noGuestMessagesHint')
            : hideEnded
              ? t('hostinbox.nothingMatchesHidden')
              : t('hostinbox.nothingMatchesHint')}
        </p>
      </div> : <ul className="divide-y divide-border">
        {conversations.map((conversation) => <li key={conversation.id}>
          <GuestRow conversation={conversation} currentUserId={currentUserId} selected={selectedId === conversation.id} />
        </li>)}
      </ul>}
    </div>
  </HostCard>;
}

ConversationList.propTypes = {
  conversations: PropTypes.arrayOf(PropTypes.object).isRequired,
  totalCount: PropTypes.number.isRequired,
  unreadCount: PropTypes.number.isRequired,
  currentUserId: PropTypes.string,
  selectedId: PropTypes.string,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  filter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  search: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  settingsOpen: PropTypes.bool.isRequired,
  onToggleSettings: PropTypes.func.isRequired,
  hideEnded: PropTypes.bool.isRequired,
  onHideEndedChange: PropTypes.func.isRequired,
  onCloseSettings: PropTypes.func.isRequired,
  className: PropTypes.string,
};

function MessagingSettings({ open, hideEnded, onHideEndedChange, onClose }) {
  const { t } = useLanguage();
  if (!open) return null;
  return <>
    <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label={t('hostinbox.closeMessagingSettings')} onClick={onClose} />
    <div className="absolute right-0 top-full z-40 mt-1 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-elevated shadow-xl" role="dialog" aria-label={t('hostinbox.messagingSettings')}>
      <p className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('hostinbox.messagingSettings')}</p>

      <label className="flex min-h-[44px] cursor-pointer items-start gap-2.5 px-3 py-4 hover:bg-surface">
        <input
          type="checkbox"
          checked={hideEnded}
          onChange={(event) => onHideEndedChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-0"
        />
        <span>
          <span className="block text-xs font-semibold text-navy">{t('hostinbox.hideEnded')}</span>
          <span className="block text-[11px] leading-relaxed text-muted">{t('hostinbox.hideEndedHint')}</span>
        </span>
      </label>

      <Link to="/host/listings" className="block min-h-[44px] border-t border-border px-3 py-4 hover:bg-surface">
        <span className="block text-xs font-semibold text-navy">{t('hostinbox.savedReplies')}</span>
        <span className="block text-[11px] leading-relaxed text-muted">{t('hostinbox.savedRepliesHint')}</span>
      </Link>

      <Link to="/contact" className="block min-h-[44px] border-t border-border px-3 py-4 hover:bg-surface">
        <span className="block text-xs font-semibold text-navy">{t('hostinbox.giveFeedback')}</span>
        <span className="block text-[11px] leading-relaxed text-muted">{t('hostinbox.giveFeedbackHint')}</span>
      </Link>
    </div>
  </>;
}

MessagingSettings.propTypes = {
  open: PropTypes.bool.isRequired,
  hideEnded: PropTypes.bool.isRequired,
  onHideEndedChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

/* ---------------------------------------------------------------- thread ---- */

function Thread({
  conversation,
  messages,
  loading,
  error,
  onRetry,
  onSend,
  sending,
  currentUserId,
  savedReplies,
  savedRepliesLoading,
  onShowReservation,
  className,
}) {
  const { t } = useLanguage();
  const threadRef = useRef(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages]);

  const participant = getConversationParticipant(conversation, currentUserId);
  const booking = conversation?.booking || {};
  const property = booking.property || {};
  const image = firstImage(property);
  const groups = useMemo(() => groupByDay(messages, t), [messages, t]);
  const status = statusOf(booking.status);
  const stay = formatStayRange(booking.checkIn, booking.checkOut, t);

  // The composer clears its own staged files once this resolves true, but the
  // draft lives here, so a successful send has to clear it too. A failed one
  // keeps both, and the host retries without retyping.
  async function handleSend({ text, attachments }) {
    const sent = await onSend({ text, attachments });
    if (sent) setDraft('');
    return sent;
  }

  // No HostCard head: the thread head carries an avatar, a name and two actions,
  // which is more than the shared head slot takes. flush keeps the custom head
  // on the card edge so its gutter matches the list beside it.
  // Below md the thread is a full page: the shell classes strip the card's
  // border, radius, shadow and surface (see THREAD_PAGE_SHELL) and restore them
  // from md up, where the list and reservation columns sit beside it.
  return <HostCard flush className={`${THREAD_PAGE_SHELL} ${className || ''} ${PAGE_THREAD_HEIGHT} overflow-hidden`.trim()}>
    <header className="shrink-0 border-b border-border px-4 py-4">
      {/* One obvious way out on a phone: two columns squeezed into 360px would
          leave neither pane readable, so mobile shows one pane at a time and
          this row is a full 44px tap target. */}
      <Link to="/host/inbox" className="mb-2 flex min-h-[44px] items-center gap-1 text-sm font-semibold text-navy md:hidden">
        <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
        {t('hostinbox.backToMessages')}
      </Link>
      <div className="flex items-center gap-3">
        <span className="relative h-10 w-10 shrink-0">
          <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-navy-bg text-[11px] font-bold text-white">
            {participant.avatar ? <img src={participant.avatar} alt="" className="h-full w-full object-cover" /> : initialsFor(participant.name)}
          </span>
          {image && <img className="absolute -bottom-1 -right-1 h-4 w-4 rounded border border-elevated object-cover" src={image} alt="" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-navy">{participant.name}</h2>
          <p className="truncate text-xs text-muted">{property.title || t('hostinbox.stayConversation')}, {stay}</p>
        </div>
        <Button type="button" size="sm" color="light" className="min-h-[44px] shrink-0 xl:hidden" onClick={onShowReservation}>{t('hostinbox.reservation')}</Button>
        {conversation?.booking?.id && <Button as={Link} to={`/host/reservations/${conversation.booking.id}`} size="sm" color="light" className="hidden shrink-0 sm:inline-flex">{t('hostinbox.openBooking')}</Button>}
      </div>
    </header>

    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5" ref={threadRef} aria-live="polite">
      {loading ? <div className="flex flex-col gap-2" role="status" aria-label={t('hostinbox.loadingMessages')}>
        <span className="block h-12 w-2/3 animate-pulse rounded-xl bg-inset" />
        <span className="ml-auto block h-12 w-1/2 animate-pulse rounded-xl bg-inset" />
        <span className="block h-12 w-3/5 animate-pulse rounded-xl bg-inset" />
      </div> : error && messages.length === 0 ? <div className="rounded-xl border border-dashed border-border p-4 text-center">
        <p className="text-xs text-muted">{error}</p>
        <Button type="button" size="sm" color="light" className="mt-2 min-h-[44px]" onClick={onRetry}>{t('hostinbox.tryAgain')}</Button>
      </div> : messages.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <strong className="block text-sm font-semibold text-navy">{t('hostinbox.noMessagesYet')}</strong>
        <p className="mt-2 text-xs leading-relaxed text-muted">{t('hostinbox.sayHello', { name: participant.name })}</p>
      </div> : <>
        {/* The stay sits at the top of the thread the way a booking marker does in
            a mature host inbox: it dates every message below it. */}
        {booking.id && <div className="mb-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t(status.label)}</p>
          <p className="mt-2 text-xs text-muted">{t((booking.guests || 1) === 1 ? 'hostinbox.guestOne' : 'hostinbox.guestOther', { count: booking.guests || 1 })}, {stay}</p>
          {/* A 44px button rather than a small inline link: on a phone the stay
              marker is the only way into the reservation from the thread. */}
          <Button type="button" size="sm" color="light" className="mt-2 min-h-[44px] xl:hidden" onClick={onShowReservation}>{t('hostinbox.showReservation')}</Button>
        </div>}

        {groups.map((group) => <div key={group.key} className="mb-5 last:mb-0">
          <p className="mb-3 text-center text-[11px] font-semibold text-muted">{group.label}</p>
          <div className="space-y-4">
            {group.messages.map((message) => {
              const mine = message.senderId === currentUserId;
              return <div key={message.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                {/* Time above the bubble, outside it: a bubble that carries its own
                    timestamp reads as a card, not a message. */}
                <span className="mb-1 text-[10px] text-muted">{formatTime(message.createdAt)}</span>
                <div className={`max-w-[min(82%,34rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${mine ? 'bg-navy-bg text-white' : 'bg-surface text-navy'}`}>
                  {/* A bubble is drawn for its content: an attachment-only message
                      must not leave an empty line where the text would be. */}
                  {message.content ? <p className="whitespace-pre-wrap break-words">{message.content}</p> : null}
                  <MessageAttachments
                    attachments={message.attachments}
                    mine={mine}
                    className={message.content ? 'mt-2' : ''}
                  />
                </div>
              </div>;
            })}
          </div>
        </div>)}
      </>}
      {error && messages.length > 0 && <p className="mt-3 text-center text-xs text-red-600">{error}</p>}
    </div>

    <div className="border-t border-border p-3">
      <MessageComposer
        value={draft}
        onChange={setDraft}
        onSubmit={handleSend}
        placeholder={t('hostinbox.replyToPlaceholder', { name: participant.name })}
        ariaLabel={t('hostinbox.replyToGuest')}
        sending={sending}
        savedReplies={savedRepliesLoading ? [] : savedReplies}
        onInsertSavedReply={(reply) => setDraft(renderSavedReply(reply.body, booking, property))}
      />
    </div>
  </HostCard>;
}

Thread.propTypes = {
  conversation: PropTypes.object,
  messages: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  onSend: PropTypes.func.isRequired,
  sending: PropTypes.bool.isRequired,
  currentUserId: PropTypes.string,
  savedReplies: PropTypes.arrayOf(PropTypes.object).isRequired,
  savedRepliesLoading: PropTypes.bool.isRequired,
  onShowReservation: PropTypes.func.isRequired,
  className: PropTypes.string,
};

/* ----------------------------------------------------------- reservation ---- */

/** A private note to self, kept in the browser: it is a host's own scratchpad,
 *  never part of the conversation and never sent to the guest. */
function usePrivateNote(conversationId) {
  const key = conversationId ? `zuri:host-note:${conversationId}` : null;
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!key) {
      setNote('');
      return;
    }
    try {
      setNote(window.localStorage.getItem(key) || '');
    } catch (err) {
      console.error('Could not read the private note for this conversation:', err);
    }
  }, [key]);

  const update = useCallback((next) => {
    setNote(next);
    if (!key) return;
    try {
      if (next.trim()) window.localStorage.setItem(key, next);
      else window.localStorage.removeItem(key);
    } catch (err) {
      console.error('Could not save the private note for this conversation:', err);
    }
  }, [key]);

  return [note, update];
}

function ReservationPanel({ conversation, currentUserId, onClose, className }) {
  const { t } = useLanguage();
  const booking = conversation?.booking || {};
  const property = booking.property || {};
  const participant = getConversationParticipant(conversation, currentUserId);
  const [note, setNote] = usePrivateNote(conversation?.id);
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const status = statusOf(booking.status);

  // The card head is the shared one: title on the left, close on the right, so
  // the panel edge lines up with the list and thread cards beside it.
  return <HostCard
    flush
    title={t('hostinbox.reservation')}
    className={`${className || ''} ${COLUMN_HEIGHT} overflow-hidden`.trim()}
    action={<button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-navy xl:hidden" aria-label={t('hostinbox.closeReservationDetails')}>
      <X className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
    </button>}
  >
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
      <div className="flex flex-col items-center text-center">
        <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-navy-bg text-lg font-bold text-white">
          {participant.avatar ? <img src={participant.avatar} alt="" className="h-full w-full object-cover" /> : initialsFor(participant.name)}
        </span>
        <h3 className="mt-3 text-base font-semibold text-navy">{participant.name}</h3>
        <p className="mt-1.5 text-xs text-muted">
          {t((booking.guests || 1) === 1 ? 'hostinbox.guestOne' : 'hostinbox.guestOther', { count: booking.guests || 1 })}, {t(nights === 1 ? 'hostinbox.nightOne' : 'hostinbox.nightOther', { count: nights })}
        </p>
        <p className="mt-2 text-xs text-muted">{property.title || t('hostinbox.stay')}</p>
      </div>

      <div className="mt-5 rounded-xl border border-border">
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="p-3">
            <p className="text-[11px] font-semibold text-navy">{t('hostinbox.checkIn')}</p>
            <p className="mt-1.5 text-xs text-muted">{formatDay(booking.checkIn, t('hostinbox.dateUnavailable'))}</p>
            <p className="text-[11px] text-muted">{booking.checkInTime ? `${booking.checkInTime} EAT` : t('hostinbox.timeFlexible')}</p>
          </div>
          <div className="p-3">
            <p className="text-[11px] font-semibold text-navy">{t('hostinbox.checkOut')}</p>
            <p className="mt-1.5 text-xs text-muted">{formatDay(booking.checkOut, t('hostinbox.dateUnavailable'))}</p>
            <p className="text-[11px] text-muted">{booking.checkOutTime ? `${booking.checkOutTime} EAT` : t('hostinbox.byCheckoutTime')}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3 rounded-xl border border-border p-3.5">
        <p className="flex items-center gap-2 text-xs text-navy">
          <Users className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
          {t((booking.guests || 1) === 1 ? 'hostinbox.guestOne' : 'hostinbox.guestOther', { count: booking.guests || 1 })}
        </p>
        <p className="flex items-center gap-2 text-xs text-navy">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
          {t(status.label)}
        </p>
        {booking.total != null && <p className="flex items-center justify-between gap-2 text-xs text-navy">
          <span>{t('hostinbox.guestTotal')}</span>
          <strong className="tabular-nums">KES {Number(booking.total).toLocaleString()}</strong>
        </p>}
      </div>

      {/* Label above field, same rhythm as the host settings forms. */}
      <div className="mt-5">
        <Label htmlFor="host-private-note" className="mb-1.5 block">{t('hostinbox.yourNotes')}</Label>
        <Textarea
          id="host-private-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder={t('hostinbox.addNotePlaceholder')}
        />
        <p className="mt-1.5 text-xs text-muted">{t('hostinbox.privateNoteHint')}</p>
      </div>

      {booking.id && <Button as={Link} to={`/host/reservations/${booking.id}`} color="light" size="sm" className="mt-4 min-h-[44px] w-full">{t('hostinbox.openBooking')}</Button>}
    </div>
  </HostCard>;
}

ReservationPanel.propTypes = {
  conversation: PropTypes.object,
  currentUserId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  className: PropTypes.string,
};

function EmptyThread({ className }) {
  const { t } = useLanguage();
  return <HostCard flush className={`${className || ''} ${COLUMN_HEIGHT} overflow-hidden`.trim()}>
    <div className="grid flex-1 place-items-center px-6 py-12 text-center">
      <div className="flex flex-col items-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-muted"><MessageCircleMore className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" /></span>
        <strong className="mt-3 text-base font-semibold text-navy">{t('hostinbox.selectConversation')}</strong>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{t('hostinbox.selectConversationHint')}</p>
      </div>
    </div>
  </HostCard>;
}

EmptyThread.propTypes = { className: PropTypes.string };

/* ------------------------------------------------------------------ page ---- */

export default function HostInboxPage() {
  const { t } = useLanguage();
  const { conversationId: routeId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState('');
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(Boolean(routeId));
  const [messagesError, setMessagesError] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Off by default: a host who just checked someone out still wants the thread
  // they were using a minute ago.
  const [hideEnded, setHideEnded] = useState(() => {
    try {
      return window.localStorage.getItem('zuri:host-inbox-hide-ended') === '1';
    } catch {
      return false;
    }
  });
  const [reservationOpen, setReservationOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [savedRepliesLoading, setSavedRepliesLoading] = useState(false);
  // One fetch per property per session: the templates rarely change while a
  // host is working through their inbox.
  const savedReplyCache = useRef(new Map());

  const loadConversations = useCallback(async () => {
    try {
      const response = await apiClient.get('/conversations', { params: { side: 'host' } });
      setConversations(response.data.data || []);
      setConversationsError('');
    } catch {
      setConversationsError(t('hostinbox.loadGuestMessagesFailed'));
    } finally {
      setConversationsLoading(false);
    }
  }, [t]);

  const loadMessages = useCallback(async () => {
    if (!routeId) return;
    setMessagesLoading(true);
    try {
      const response = await apiClient.get(`/conversations/${routeId}/messages`);
      setMessages(response.data.data || []);
      setMessagesError('');
      // Reading the thread clears its unread dot in the list.
      try {
        await apiClient.patch(`/conversations/${routeId}/read`);
        setConversations((current) => current.map((conversation) => conversation.id === routeId ? { ...conversation, unreadCount: 0 } : conversation));
        window.dispatchEvent(new Event(CONVERSATIONS_READ_EVENT));
      } catch {
        // A failed read receipt must not hide the messages that did load.
      }
    } catch {
      setMessagesError(t('hostinbox.loadConversationFailed'));
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [routeId, t]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadMessages();
    if (!routeId) return undefined;
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, [routeId, loadMessages]);

  // Leaving a thread closes the reservation, so a different guest never opens
  // behind another stay's details.
  useEffect(() => {
    setReservationOpen(false);
  }, [routeId]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === routeId) || null,
    [conversations, routeId]
  );

  const propertyId = activeConversation?.booking?.property?.id || null;

  // Only the raw templates are cached; the preview is rendered at render time so
  // it always reflects this conversation's guest and dates.
  useEffect(() => {
    if (!propertyId) {
      setSavedTemplates([]);
      setSavedRepliesLoading(false);
      return undefined;
    }
    const cached = savedReplyCache.current.get(propertyId);
    if (cached) {
      setSavedTemplates(cached);
      setSavedRepliesLoading(false);
      return undefined;
    }
    let cancelled = false;
    setSavedRepliesLoading(true);
    apiClient.get(`/properties/${propertyId}/auto-messages`)
      .then((response) => {
        const templates = response.data?.data?.templates || [];
        const triggers = response.data?.data?.triggers || {};
        const list = templates.map((template) => ({
          trigger: template.trigger,
          label: triggers[template.trigger]?.label || template.trigger,
          body: template.body,
        }));
        savedReplyCache.current.set(propertyId, list);
        if (!cancelled) setSavedTemplates(list);
      })
      .catch((err) => {
        console.error('Could not load the saved replies for this stay:', err);
        if (!cancelled) setSavedTemplates([]);
      })
      .finally(() => {
        if (!cancelled) setSavedRepliesLoading(false);
      });
    return () => { cancelled = true; };
  }, [propertyId]);

  const savedReplies = useMemo(() => {
    const booking = activeConversation?.booking || {};
    const property = booking.property || {};
    return savedTemplates.map((template) => ({
      ...template,
      preview: renderSavedReply(template.body, booking, property),
    }));
  }, [savedTemplates, activeConversation]);

  const unreadTotal = useMemo(
    () => conversations.reduce((total, conversation) => total + (Number(conversation.unreadCount) || 0), 0),
    [conversations]
  );

  const visibleConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = Date.now();
    return conversations.filter((conversation) => {
      const checkOut = conversation.booking?.checkOut;
      if (hideEnded && checkOut && new Date(checkOut).getTime() < now) return false;
      if (filter === 'unread' && !(Number(conversation.unreadCount) > 0)) return false;
      if (!term) return true;
      const guest = conversation.booking?.user || {};
      const name = [guest.firstName, guest.lastName].filter(Boolean).join(' ').toLowerCase();
      const title = (conversation.booking?.property?.title || '').toLowerCase();
      return name.includes(term) || title.includes(term);
    });
  }, [conversations, filter, hideEnded, search]);

  // The composer hands back the text and any already-uploaded attachments, and
  // clears them only when this resolves true - so a failed post leaves both the
  // draft and the staged files where the host can retry them.
  async function sendMessage({ text, attachments }) {
    if (!routeId) return false;
    const content = (text || '').trim();
    const files = Array.isArray(attachments) ? attachments : [];
    // A file on its own is a message; nothing at all is not.
    if (!content && files.length === 0) return false;
    setSending(true);
    try {
      await apiClient.post(`/conversations/${routeId}/messages`, { content, attachments: files });
      await loadMessages();
      await loadConversations();
      return true;
    } catch {
      setMessagesError(t('hostinbox.sendReplyFailed'));
      return false;
    } finally {
      setSending(false);
    }
  }

  const showReservation = Boolean(routeId && activeConversation);
  const gridColumns = showReservation
    ? 'md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,290px)]'
    : 'md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]';

  return <div className="flex flex-col gap-5 sm:gap-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className={HOST_EYEBROW}>{t('hostinbox.hostWorkspace')}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{t('hostinbox.messages')}</h1>
      </div>
      <Button as={Link} to="/host/today" size="sm" color="light" className="min-h-[44px] w-full sm:min-h-0 sm:w-fit">{t('hostinbox.todaysSchedule')}</Button>
    </header>

    {conversationsError && <Alert color="failure">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1">{conversationsError}</p>
        <Button size="sm" color="light" className="min-h-[44px] shrink-0" onClick={loadConversations}>{t('hostinbox.tryAgain')}</Button>
      </div>
    </Alert>}

    <div className={`grid grid-cols-1 gap-5 ${gridColumns}`}>
      <ConversationList
        conversations={visibleConversations}
        totalCount={conversations.length}
        unreadCount={unreadTotal}
        currentUserId={user?.id}
        selectedId={routeId}
        loading={conversationsLoading}
        error=""
        onRetry={loadConversations}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
        hideEnded={hideEnded}
        onHideEndedChange={(next) => {
          setHideEnded(next);
          try {
            window.localStorage.setItem('zuri:host-inbox-hide-ended', next ? '1' : '0');
          } catch {
            // Preference is a nicety; the list still filters this session.
          }
        }}
        onCloseSettings={() => setSettingsOpen(false)}
        className={routeId ? 'hidden md:flex' : 'flex'}
      />

      {routeId
        ? <Thread
          conversation={activeConversation}
          messages={messages}
          loading={messagesLoading}
          error={messagesError}
          onRetry={loadMessages}
          onSend={sendMessage}
          sending={sending}
          currentUserId={user?.id}
          savedReplies={savedReplies}
          savedRepliesLoading={savedRepliesLoading}
          onShowReservation={() => setReservationOpen(true)}
          className={reservationOpen ? 'hidden xl:flex' : 'flex'}
        />
        : <EmptyThread className="hidden md:flex" />}

      {showReservation && <ReservationPanel
        conversation={activeConversation}
        currentUserId={user?.id}
        onClose={() => setReservationOpen(false)}
        className={reservationOpen ? 'flex' : 'hidden xl:flex'}
      />}
    </div>
  </div>;
}
