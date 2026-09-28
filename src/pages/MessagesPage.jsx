import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Textarea } from 'flowbite-react';
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
    <header className="opg-message-pane-head">
      <Link className="opg-message-back" to="/inbox" aria-label="Back to messages">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M15 19l-7-7 7-7" /></svg>
      </Link>
      <span className="opg-message-context-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
      </span>
      <div className="opg-message-context">
        <h2>ZuriLofts Support</h2>
        <p>Booking help and general questions</p>
      </div>
    </header>

    <div className="opg-message-thread" ref={threadRef} aria-live="polite">
      {loading ? <div className="opg-message-loading" aria-label="Loading support messages"><span /><span /><span /></div> : error && messages.length === 0 ? <div className="opg-message-error"><p>{error}</p><button type="button" onClick={loadThread}>Try again</button></div> : messages.length === 0 ? <div className="opg-message-empty"><strong>How can we help?</strong><p>Send the team a message about your booking or account.</p></div> : messages.map((message) => {
        const mine = message.senderRole === 'USER';
        return <GuestMessageBubble key={message.id} mine={mine} meta={`${mine ? 'You' : 'ZuriLofts Support'} · ${formatMessageTime(message.createdAt)}`}>{message.body}</GuestMessageBubble>;
      })}
      {error && messages.length > 0 && <p className="opg-message-inline-error">{error}</p>}
    </div>

    <form className="opg-message-composer" onSubmit={handleSend}>
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
        className="opg-message-textarea"
      />
      <button className="opg-message-send" type="submit" disabled={sending || !body.trim()}>
        {sending ? <span className="opg-message-send-spinner" /> : <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>}
        Send
      </button>
    </form>
  </GuestMessagesLayout>;
}

export default MessagesPage;
