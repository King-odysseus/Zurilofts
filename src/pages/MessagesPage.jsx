import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, MessageCircleMore } from 'lucide-react';
import apiClient from '../api/client.js';
import GuestMessagesLayout, { GuestMessageBubble } from '../components/GuestMessagesLayout.jsx';
import MessageComposer from '../components/MessageComposer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

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
  const { t } = useLanguage();
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

  const scrollToBottom = useCallback(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, []);

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      // Same guest-side list as /inbox: support lives beside the traveller's
      // stay threads, never the host-side ones an account may also have.
      const response = await apiClient.get('/conversations', { params: { side: 'guest' } });
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

  // Resolving true is what tells the composer the message was accepted; on a
  // failed post it resolves false, so the typed text and staged files stay put.
  const sendMessage = useCallback(async ({ text, attachments }) => {
    setSending(true);
    try {
      const response = await apiClient.post('/messages', { body: text, attachments });
      setMessages((current) => [...current, response.data.data]);
      setBody('');
      setError(null);
      requestAnimationFrame(scrollToBottom);
      return true;
    } catch {
      setError('Could not send your support message. Please try again.');
      return false;
    } finally {
      setSending(false);
    }
  }, [scrollToBottom]);

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
      <Link className="opg-message-back" to="/inbox" aria-label={t('a11y2.backToMessages')}>
        <ChevronLeft strokeWidth={1.9} aria-hidden="true" />
      </Link>
      <span className="opg-message-context-icon">
        <MessageCircleMore strokeWidth={1.7} aria-hidden="true" />
      </span>
      <div className="opg-message-context">
        <h2>{t('messages.supportName')}</h2>
        <p>{t('messages.supportContext')}</p>
      </div>
    </header>

    {/* The pane header sits straight above the first bubble, so the thread's own
        top padding is the only gap between them. The ! prefix is needed because
        the thread rule in styles.css ships after Tailwind's utilities and pins
        its padding. */}
    <div className="opg-message-thread !pt-6" ref={threadRef} aria-live="polite">
      {loading ? <div className="opg-message-loading" aria-label={t('messages.loadingSupport')}><span /><span /><span /></div> : error && messages.length === 0 ? <div className="opg-message-error"><p>{error}</p><button type="button" onClick={loadThread}>{t('common.retry')}</button></div> : messages.length === 0 ? <div className="opg-message-empty"><strong>{t('messages.howCanWeHelp')}</strong><p>{t('messages.howCanWeHelpHint')}</p></div> : messages.map((message) => {
        const mine = message.senderRole === 'USER';
        return <GuestMessageBubble key={message.id} mine={mine} attachments={message.attachments} meta={`${mine ? t('messages.you') : t('messages.supportName')} · ${formatMessageTime(message.createdAt)}`}>{message.body}</GuestMessageBubble>;
      })}
      {error && messages.length > 0 && <p className="opg-message-inline-error">{error}</p>}
    </div>

    {/* Kept as the pane's footer element so the existing spacing rules still
        position the composer; the control itself is the shared MessageComposer. */}
    <div className="opg-message-composer">
      <MessageComposer
        value={body}
        onChange={setBody}
        onSubmit={sendMessage}
        placeholder={t('messages.writeMessage')}
        ariaLabel={t('messages.composerLabel')}
        sending={sending}
      />
    </div>
  </GuestMessagesLayout>;
}

export default MessagesPage;
