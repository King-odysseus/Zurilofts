import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Spinner, Textarea } from 'flowbite-react';
import { ChevronLeft, MessageCircleMore, Send } from 'lucide-react';
import apiClient from '../api/client.js';
import GuestMessagesLayout, { GuestMessageBubble } from '../components/GuestMessagesLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

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

function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    document.title = 'Support | ZuriLofts';
  }, []);

  const scrollToBottom = useCallback(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, []);

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const response = await apiClient.get('/conversations');
      setConversations(response.data.data || []);
      setConversationsError(null);
    } catch {
      setConversationsError('Could not load your conversations.');
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  const loadThread = useCallback(async () => {
    try {
      const response = await apiClient.get('/messages');
      setMessages(response.data.data || []);
      setError(null);
      requestAnimationFrame(scrollToBottom);
    } catch {
      setError('Could not load support messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [scrollToBottom]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadThread();
    const interval = setInterval(loadThread, 20000);
    return () => clearInterval(interval);
  }, [loadThread]);

  async function handleSend(event) {
    event.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const response = await apiClient.post('/messages', { body: text });
      setMessages((current) => [...current, response.data.data]);
      setBody('');
      setError(null);
      requestAnimationFrame(scrollToBottom);
    } catch {
      setError('Could not send your support message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return <GuestMessagesLayout
    activeTab="support"
    conversations={conversations}
    currentUserId={user?.id}
    loading={conversationsLoading}
    error={conversationsError}
    onRetry={loadConversations}
    detailOpen
  >
    <header className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Link className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-navy hover:bg-surface lg:hidden" to="/inbox" aria-label="Back to messages">
        <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
      </Link>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
        <MessageCircleMore className="h-[19px] w-[19px]" strokeWidth={1.7} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-bold text-navy">ZuriLofts Support</h2>
        <p className="mt-0.5 truncate text-xs text-muted">Booking help and general questions</p>
      </div>
    </header>

    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" ref={threadRef} aria-live="polite">
      {loading ? <div className="flex flex-col gap-2" aria-label="Loading support messages"><span className="block h-10 w-3/5 animate-pulse rounded-2xl bg-surface" /><span className="block h-10 w-2/5 animate-pulse self-end rounded-2xl bg-surface" /><span className="block h-10 w-1/2 animate-pulse rounded-2xl bg-surface" /></div> : error && messages.length === 0 ? <Alert color="failure">
        <p>{error}</p>
        <Button color="light" size="xs" type="button" onClick={loadThread} className="mt-2">Try again</Button>
      </Alert> : messages.length === 0 ? <div className="m-auto max-w-[340px] text-center"><strong className="block text-base font-bold text-navy">How can we help?</strong><p className="mt-1.5 text-xs leading-relaxed text-muted">Send the team a message about your booking or account.</p></div> : messages.map((message) => {
        const mine = message.senderRole === 'USER';
        return <GuestMessageBubble key={message.id} mine={mine} meta={`${mine ? 'You' : 'ZuriLofts Support'} · ${formatMessageTime(message.createdAt)}`}>{message.body}</GuestMessageBubble>;
      })}
      {error && messages.length > 0 && <Alert color="failure" className="self-center text-[11px]">{error}</Alert>}
    </div>

    <form className="sticky bottom-0 border-t border-border bg-white p-3" onSubmit={handleSend}>
      <div className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend(event);
            }
          }}
          rows={1}
          placeholder="Write a message..."
          aria-label="Message"
          className="min-h-[44px] flex-1"
        />
        <Button type="submit" disabled={sending || !body.trim()} aria-label={sending ? 'Sending message' : 'Send message'} className="shrink-0">
          {sending ? <Spinner size="sm" /> : <Send className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
          <span>Send</span>
        </Button>
      </div>
    </form>
  </GuestMessagesLayout>;
}

export default MessagesPage;
