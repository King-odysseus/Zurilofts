import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Alert, Button, Spinner, Textarea } from 'flowbite-react';
import { ChevronLeft, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import GuestMessagesLayout, { GuestMessageBubble } from '../components/GuestMessagesLayout.jsx';
import { getConversationParticipant } from '../utils/conversations.js';
import { firstImage } from '../utils/images.js';

function formatMessageTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStayContext(booking) {
  if (!booking?.checkIn) return 'Booking conversation';
  const format = (value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${format(booking.checkIn)} - ${format(booking.checkOut)}`;
}

function ConversationPage() {
  const { conversationId: routeId } = useParams();
  const { pathname } = useLocation();
  const conversationId = routeId || pathname.split('/')[2];
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    document.title = 'Conversation | ZuriLofts';
  }, []);

  const fetchConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const response = await apiClient.get('/conversations');
      const items = response.data.data || [];
      setConversations(items);
      setConversation(items.find((item) => item.id === conversationId) || null);
      setConversationsError(null);
    } catch {
      setConversationsError('Could not load your conversations.');
    } finally {
      setConversationsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const scrollToBottom = useCallback(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const response = await apiClient.get(`/conversations/${conversationId}/messages`);
      setMessages(response.data.data || []);
      setError(null);
      requestAnimationFrame(scrollToBottom);
    } catch {
      setError('Could not load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    if (!conversationId) return undefined;
    let active = true;

    async function markRead() {
      try {
        await apiClient.patch(`/conversations/${conversationId}/read`);
      } catch {
        // Read state is best effort and should not block the thread.
      }
    }

    loadMessages();
    markRead();
    const interval = setInterval(() => {
      if (!active) return;
      loadMessages();
      markRead();
    }, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [conversationId, loadMessages]);

  const canSend = draft.trim().length > 0 && !sending;

  async function handleSend() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const response = await apiClient.post(`/conversations/${conversationId}/messages`, { content });
      setMessages((current) => [...current, response.data.data]);
      setDraft('');
      requestAnimationFrame(scrollToBottom);
    } catch {
      setError('Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  const participant = getConversationParticipant(conversation, user?.id);
  const property = conversation?.booking?.property || {};
  const image = firstImage(property);

  return <GuestMessagesLayout
    activeTab="inbox"
    conversations={conversations}
    currentUserId={user?.id}
    selectedId={conversationId}
    loading={conversationsLoading}
    error={conversationsError}
    onRetry={fetchConversations}
    detailOpen
  >
    <header className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Link className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-navy hover:bg-surface lg:hidden" to="/inbox" aria-label="Back to messages">
        <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
      </Link>
      {image && <img className="h-10 w-10 shrink-0 rounded-lg object-cover" src={image} alt="" />}
      <div className="min-w-0">
        <h2 className="truncate text-sm font-bold text-navy">{participant.name}</h2>
        <p className="mt-0.5 truncate text-xs text-muted">{property.title || 'Stay conversation'} <span>·</span> {formatStayContext(conversation?.booking)}</p>
      </div>
      {property.id && <Link className="ml-auto shrink-0 text-xs font-semibold text-primary-600 hover:text-primary-700" to={`/property/${property.id}`}>View stay</Link>}
    </header>

    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" ref={threadRef} aria-live="polite">
      {loading ? <div className="flex flex-col gap-2" aria-label="Loading messages"><span className="block h-10 w-3/5 animate-pulse rounded-2xl bg-surface" /><span className="block h-10 w-2/5 animate-pulse self-end rounded-2xl bg-surface" /><span className="block h-10 w-1/2 animate-pulse rounded-2xl bg-surface" /></div> : error && messages.length === 0 ? <Alert color="failure">
        <p>{error}</p>
        <Button color="light" size="xs" type="button" onClick={loadMessages} className="mt-2">Try again</Button>
      </Alert> : messages.length === 0 ? <div className="m-auto max-w-[340px] text-center"><strong className="block text-base font-bold text-navy">No messages yet</strong><p className="mt-1.5 text-xs leading-relaxed text-muted">Say hello to {participant.name} and start planning the stay.</p></div> : messages.map((message) => {
        const isMine = message.senderId === user?.id;
        const senderName = [message.sender?.firstName, message.sender?.lastName].filter(Boolean).join(' ') || 'User';
        return <GuestMessageBubble key={message.id} mine={isMine} meta={`${isMine ? 'You' : senderName} · ${formatMessageTime(message.createdAt)}`}>{message.content}</GuestMessageBubble>;
      })}
      {error && messages.length > 0 && <Alert color="failure" className="self-center text-[11px]">{error}</Alert>}
    </div>

    <div className="sticky bottom-0 border-t border-border bg-white p-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="Write a message..."
          aria-label="Message"
          className="min-h-[44px] flex-1"
        />
        <Button type="button" onClick={handleSend} disabled={!canSend} aria-label={sending ? 'Sending message' : 'Send message'} className="shrink-0">
          {sending ? <Spinner size="sm" /> : <Send className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
          <span>Send</span>
        </Button>
      </div>
    </div>
  </GuestMessagesLayout>;
}

export default ConversationPage;
