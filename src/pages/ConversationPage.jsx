import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import GuestMessagesLayout, { GuestMessageBubble } from '../components/GuestMessagesLayout.jsx';
import MessageComposer from '../components/MessageComposer.jsx';
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

  const fetchConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      // Traveller-side list: the thread opened here is one this account booked as a
      // guest, so the list beside it must match, not the host inbox.
      const response = await apiClient.get('/conversations', { params: { side: 'guest' } });
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

  // Resolving true is what tells the composer the message was accepted; on a
  // failed post it resolves false, so the typed text and staged files stay put.
  const sendMessage = useCallback(async ({ text, attachments }) => {
    setSending(true);
    try {
      const response = await apiClient.post(`/conversations/${conversationId}/messages`, { content: text, attachments });
      setMessages((current) => [...current, response.data.data]);
      setDraft('');
      setError(null);
      requestAnimationFrame(scrollToBottom);
      return true;
    } catch {
      setError('Could not send your message. Please try again.');
      return false;
    } finally {
      setSending(false);
    }
  }, [conversationId, scrollToBottom]);

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
    <header className="opg-message-pane-head">
      <Link className="opg-message-back" to="/inbox" aria-label="Back to messages">
        <ChevronLeft strokeWidth={1.9} aria-hidden="true" />
      </Link>
      {image && <img className="opg-message-context-image" src={image} alt="" />}
      <div className="opg-message-context">
        <h2>{participant.name}</h2>
        <p>{property.title || 'Stay conversation'} <span>·</span> {formatStayContext(conversation?.booking)}</p>
      </div>
      {property.id && <Link className="opg-message-booking-link" to={`/property/${property.id}`}>View stay</Link>}
    </header>

    <div className="opg-message-thread" ref={threadRef} aria-live="polite">
      {loading ? <div className="opg-message-loading" aria-label="Loading messages"><span /><span /><span /></div> : error && messages.length === 0 ? <div className="opg-message-error"><p>{error}</p><button type="button" onClick={loadMessages}>Try again</button></div> : messages.length === 0 ? <div className="opg-message-empty"><strong>No messages yet</strong><p>Say hello to {participant.name} and start planning the stay.</p></div> : messages.map((message) => {
        const isMine = message.senderId === user?.id;
        const senderName = [message.sender?.firstName, message.sender?.lastName].filter(Boolean).join(' ') || 'User';
        return <GuestMessageBubble key={message.id} mine={isMine} attachments={message.attachments} meta={`${isMine ? 'You' : senderName} · ${formatMessageTime(message.createdAt)}`}>{message.content}</GuestMessageBubble>;
      })}
      {error && messages.length > 0 && <p className="opg-message-inline-error">{error}</p>}
    </div>

    {/* Kept as the pane's footer element so the existing spacing rules still
        position the composer; the control itself is the shared MessageComposer. */}
    <div className="opg-message-composer">
      <MessageComposer
        value={draft}
        onChange={setDraft}
        onSubmit={sendMessage}
        placeholder={`Reply to ${participant.name}...`}
        ariaLabel={`Message ${participant.name}`}
        sending={sending}
      />
    </div>
  </GuestMessagesLayout>;
}

export default ConversationPage;
