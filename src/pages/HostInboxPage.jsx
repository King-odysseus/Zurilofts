import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Textarea } from 'flowbite-react';
import PropTypes from 'prop-types';
import { ChevronLeft, MessageCircleMore, Send } from 'lucide-react';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CONVERSATIONS_READ_EVENT, getConversationParticipant } from '../utils/conversations.js';
import { firstImage } from '../utils/images.js';

// Hosts and travellers each have their own inbox. This is the host one: the
// guests staying at the signed-in account's properties. The traveller inbox owns
// the conversations the account starts as a guest, and the two never mix, which
// is why every request here is scoped with side=host.

const CARD = 'rounded-xl border border-border bg-elevated shadow-sm';
const PANEL_HEAD = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600';


function formatWhen(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatStay(booking) {
  if (!booking?.checkIn || !booking?.checkOut) return 'Booking conversation';
  const format = (value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${format(booking.checkIn)} - ${format(booking.checkOut)}`;
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

function GuestRow({ conversation, currentUserId, selected }) {
  const participant = getConversationParticipant(conversation, currentUserId);
  const property = conversation.booking?.property || {};
  const unread = Number(conversation.unreadCount) || 0;

  return <Link
    to={`/host/inbox/${conversation.id}`}
    aria-current={selected ? 'page' : undefined}
    // The selected row is a fill, not a border: a bordered tile inside the list
    // padding reads as a box that was cut short at the top and bottom. The dark
    // value comes from the shared pale-tint rule in flowbite-controls.css, which
    // darkens bg-primary-50 app-wide, so no dark: class is needed here.
    className={`flex items-start gap-3 rounded-xl px-3 py-3.5 transition-colors ${selected ? 'bg-primary-50' : 'hover:bg-surface'}`}
  >
    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-navy-bg text-[11px] font-bold text-white">
      {participant.avatar ? <img src={participant.avatar} alt="" className="h-full w-full object-cover" /> : initialsFor(participant.name)}
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <strong className={`truncate text-sm ${unread > 0 ? 'font-bold text-navy' : 'font-semibold text-navy'}`}>{participant.name}</strong>
        <time className="shrink-0 text-[10px] text-muted" dateTime={conversation.lastMessage?.createdAt || conversation.updatedAt}>{formatWhen(conversation.lastMessage?.createdAt || conversation.updatedAt)}</time>
      </div>
      <span className="block truncate text-xs text-muted">{property.title || 'Your stay'}</span>
      <p className={`mt-1 truncate text-xs ${unread > 0 ? 'font-semibold text-navy' : 'text-muted'}`}>{conversation.lastMessage?.content || 'No messages yet'}</p>
    </div>
    {unread > 0 && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={`${unread} unread message${unread === 1 ? '' : 's'}`} />}
  </Link>;
}

GuestRow.propTypes = {
  conversation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    unreadCount: PropTypes.number,
    updatedAt: PropTypes.string,
    lastMessage: PropTypes.shape({ content: PropTypes.string, createdAt: PropTypes.string }),
    booking: PropTypes.object,
  }).isRequired,
  currentUserId: PropTypes.string,
  selected: PropTypes.bool.isRequired,
};

function ConversationList({ conversations, currentUserId, selectedId, loading, error, onRetry, className }) {
  return <section className={`${CARD} ${className} min-h-[420px] flex-col overflow-hidden`} aria-label="Guest conversations">
    <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <h2 className="text-base font-semibold text-navy">Guest messages</h2>
      <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">{conversations.length}</span>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      {loading ? <div className="space-y-2 p-1" aria-label="Loading guest conversations">
        <span className="block h-16 animate-pulse rounded-lg bg-surface" />
        <span className="block h-16 animate-pulse rounded-lg bg-surface" />
        <span className="block h-16 animate-pulse rounded-lg bg-surface" />
      </div> : error ? <div className="m-2 rounded-lg border border-dashed border-border p-4 text-center">
        <p className="text-xs text-muted">{error}</p>
        <Button type="button" size="xs" color="light" className="mt-2" onClick={onRetry}>Try again</Button>
      </div> : conversations.length === 0 ? <div className="m-2 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-10 text-center">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-muted"><MessageCircleMore className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" /></span>
        <strong className="text-sm font-semibold text-navy">No guest messages yet</strong>
        <p className="text-xs leading-relaxed text-muted">When a guest messages you about a stay, the conversation appears here.</p>
      </div> : conversations.map((conversation) => <GuestRow key={conversation.id} conversation={conversation} currentUserId={currentUserId} selected={selectedId === conversation.id} />)}
    </div>
  </section>;
}

ConversationList.propTypes = {
  conversations: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentUserId: PropTypes.string,
  selectedId: PropTypes.string,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  className: PropTypes.string,
};

function Thread({ conversation, messages, loading, error, onRetry, onSend, sending, currentUserId, className }) {
  const threadRef = useRef(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages]);

  const participant = getConversationParticipant(conversation, currentUserId);
  const property = conversation?.booking?.property || {};
  const image = firstImage(property);
  const canSend = draft.trim().length > 0 && !sending;

  async function submit() {
    const content = draft.trim();
    if (!content || sending) return;
    const sent = await onSend(content);
    if (sent) setDraft('');
  }

  return <section className={`${CARD} ${className} min-h-[420px] flex-col overflow-hidden`} aria-label="Conversation">
    <header className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Link to="/host/inbox" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface hover:text-navy md:hidden" aria-label="Back to guest messages">
        <ChevronLeft className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
      </Link>
      {image && <img className="h-10 w-10 shrink-0 rounded-lg object-cover" src={image} alt="" />}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold text-navy">{participant.name}</h2>
        <p className="truncate text-xs text-muted">{property.title || 'Stay conversation'} <span aria-hidden="true">·</span> {formatStay(conversation?.booking)}</p>
      </div>
      {conversation?.booking?.id && <Button as={Link} to={`/bookings/${conversation.booking.id}`} size="xs" color="light">View booking</Button>}
    </header>

    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" ref={threadRef} aria-live="polite">
      {loading ? <div className="space-y-2" aria-label="Loading messages">
        <span className="block h-12 w-2/3 animate-pulse rounded-xl bg-surface" />
        <span className="ml-auto block h-12 w-1/2 animate-pulse rounded-xl bg-surface" />
        <span className="block h-12 w-3/5 animate-pulse rounded-xl bg-surface" />
      </div> : error && messages.length === 0 ? <div className="rounded-lg border border-dashed border-border p-4 text-center">
        <p className="text-xs text-muted">{error}</p>
        <Button type="button" size="xs" color="light" className="mt-2" onClick={onRetry}>Try again</Button>
      </div> : messages.length === 0 ? <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <strong className="block text-sm font-semibold text-navy">No messages yet</strong>
        <p className="mt-1 text-xs leading-relaxed text-muted">Say hello to {participant.name} and share the arrival details.</p>
      </div> : <div className="space-y-3">
        {messages.map((message) => {
          const mine = message.senderId === currentUserId;
          return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[min(80%,34rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${mine ? 'bg-navy-bg text-white' : 'bg-surface text-navy'}`}>
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              <span className={`mt-1 block text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>{formatWhen(message.createdAt)}</span>
            </div>
          </div>;
        })}
      </div>}
      {error && messages.length > 0 && <p className="mt-3 text-center text-xs text-red-600">{error}</p>}
    </div>

    <div className="border-t border-border p-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={`Reply to ${participant.name}...`}
          aria-label="Reply to guest"
          className="flex-1"
        />
        <Button type="button" onClick={submit} disabled={!canSend} aria-label={sending ? 'Sending message' : 'Send message'}>
          <Send className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          <span className="ml-2 hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
        </Button>
      </div>
    </div>
  </section>;
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
  className: PropTypes.string,
};

function EmptyThread({ className }) {
  return <section className={`${CARD} ${className} min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center`}>
    <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-muted"><MessageCircleMore className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" /></span>
    <strong className="mt-3 text-base font-semibold text-navy">Select a conversation</strong>
    <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">Open a guest conversation to read the thread and reply. Messages about your stays arrive here, not in your travel inbox.</p>
  </section>;
}

EmptyThread.propTypes = { className: PropTypes.string };

export default function HostInboxPage() {
  const { conversationId: routeId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState('');
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(Boolean(routeId));
  const [messagesError, setMessagesError] = useState('');
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const response = await apiClient.get('/conversations', { params: { side: 'host' } });
      setConversations(response.data.data || []);
      setConversationsError('');
    } catch {
      setConversationsError('Could not load your guest messages.');
    } finally {
      setConversationsLoading(false);
    }
  }, []);

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
      setMessagesError('Could not load this conversation.');
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadMessages();
    if (!routeId) return undefined;
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, [routeId, loadMessages]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === routeId) || null,
    [conversations, routeId]
  );

  async function sendMessage(content) {
    if (!routeId) return false;
    setSending(true);
    try {
      await apiClient.post(`/conversations/${routeId}/messages`, { content });
      await loadMessages();
      await loadConversations();
      return true;
    } catch {
      setMessagesError('Could not send your reply. Please try again.');
      return false;
    } finally {
      setSending(false);
    }
  }

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className={PANEL_HEAD}>HOST WORKSPACE</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Guest messages</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Conversations with the guests staying at your properties.</p>
      </div>
      <Button as={Link} to="/host/today" size="sm" color="light">Today&apos;s schedule</Button>
    </header>

    {conversationsError && <Alert color="failure">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1">{conversationsError}</p>
        <Button size="xs" color="light" onClick={loadConversations}>Try again</Button>
      </div>
    </Alert>}

    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <ConversationList
        conversations={conversations}
        currentUserId={user?.id}
        selectedId={routeId}
        loading={conversationsLoading}
        error=""
        onRetry={loadConversations}
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
          className="flex"
        />
        : <EmptyThread className="hidden md:flex" />}
    </div>
  </div>;
}
