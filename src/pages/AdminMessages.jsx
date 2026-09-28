import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Textarea, TextInput } from 'flowbite-react';
import { ChevronLeft, MessageSquareText, Search } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../api/client.js';

function SearchIcon() {
  return <Search strokeWidth={1.8} aria-hidden="true" />;
}

function BackIcon() {
  return <ChevronLeft strokeWidth={1.8} aria-hidden="true" />;
}

function initials(conversation) {
  return `${conversation?.firstName?.[0] || ''}${conversation?.lastName?.[0] || ''}`.trim().toUpperCase() || 'G';
}

function formatMessageTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatThreadTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function AdminMessages() {
  const { userId } = useParams();
  const activeUserId = userId || null;
  const [conversations, setConversations] = useState([]);
  const [thread, setThread] = useState([]);
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const bottomRef = useRef(null);

  const loadConversations = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoadingList(true);
    try {
      const response = await apiClient.get('/admin/messages');
      setConversations(response.data.data || []);
      setLastSync(new Date());
      setError('');
    } catch (requestError) {
      if (!quiet) setError(requestError.response?.data?.error || 'Conversations could not be loaded.');
    } finally {
      if (!quiet) setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const timer = setInterval(() => loadConversations({ quiet: true }), 30_000);
    return () => clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeUserId) {
      setThread([]);
      setLoadingThread(false);
      setError('');
      return undefined;
    }

    let active = true;
    setLoadingThread(true);
    setThread([]);
    setError('');

    apiClient.get(`/admin/messages/${activeUserId}`)
      .then((response) => {
        if (!active) return;
        setThread(response.data.data || []);
        setConversations((current) => current.map((entry) => entry.userId === activeUserId ? { ...entry, unread: 0 } : entry));
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.response?.data?.error || 'Conversation could not be loaded.');
      })
      .finally(() => {
        if (active) setLoadingThread(false);
      });

    return () => {
      active = false;
    };
  }, [activeUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  async function handleReply(event) {
    event.preventDefault();
    const text = body.trim();
    if (!text || !activeUserId) return;
    setSending(true);
    setError('');
    try {
      const response = await apiClient.post(`/admin/messages/${activeUserId}`, { body: text });
      setThread((current) => [...current, response.data.data]);
      setBody('');
      await loadConversations({ quiet: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Reply could not be sent.');
    } finally {
      setSending(false);
    }
  }

  const visibleConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => [
      conversation.firstName,
      conversation.lastName,
      conversation.email,
      conversation.lastMessage?.body,
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [conversations, search]);

  const unreadTotal = conversations.reduce((sum, conversation) => sum + (Number(conversation.unread) || 0), 0);
  const activePreview = activeUserId
    ? conversations.find((conversation) => conversation.userId === activeUserId) || { userId: activeUserId, firstName: 'Guest', lastName: '', email: '' }
    : null;

  return (
    <div className={`op-admin-overview op-admin-messages ${activeUserId ? 'is-thread-view' : 'is-list-view'}`} data-openpencil-frame="0:7458">
      <div className="op-admin-heading op-admin-messages-heading">
        <div>
          <p className="op-admin-eyebrow">ZURILOFTS · ADMIN · GOVERNANCE</p>
          <h1>Messages</h1>
          <p>Review guest conversations, keep support replies moving, and track unread demand.</p>
        </div>
      </div>

      <div className="op-admin-metrics op-admin-catalog-metrics op-admin-message-metrics">
        <article><span>CONVERSATIONS</span><strong>{conversations.length}</strong><small>Guests with a support history</small></article>
        <article><span>UNREAD MESSAGES</span><strong>{unreadTotal}</strong><small>Waiting for an operations reply</small></article>
        <article><span>OPEN THREAD</span><strong className="op-admin-message-active">{activePreview ? `${activePreview.firstName || ''} ${activePreview.lastName || ''}`.trim() || 'Guest' : 'None'}</strong><small>{activePreview ? activePreview.email || 'Guest conversation' : 'Select a guest to read the thread'}</small></article>
        <article><span>LAST SYNC</span><strong className="op-admin-message-sync">{lastSync ? lastSync.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}</strong><small>Automatically refreshed every 30 seconds</small></article>
      </div>

      <section className={`op-admin-message-board ${activeUserId ? 'has-active' : ''}`}>
        <aside className="op-admin-message-list-panel">
          <div className="op-admin-message-search"><SearchIcon /><TextInput type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></div>
          <div className="op-admin-message-list">
            {loadingList ? (
              <div className="op-admin-message-empty"><span className="op-admin-booking-spinner" aria-hidden="true" /><strong>Loading conversations</strong></div>
            ) : visibleConversations.length === 0 ? (
              <div className="op-admin-message-empty"><strong>No conversations found</strong><p>Adjust the search or wait for a new guest message.</p></div>
            ) : visibleConversations.map((conversation) => (
              <Link key={conversation.userId} to={`/admin/messages/${encodeURIComponent(conversation.userId)}`} className={`op-admin-message-conversation ${activeUserId === conversation.userId ? 'is-active' : ''}`} aria-current={activeUserId === conversation.userId ? 'page' : undefined}>
                <span className="op-admin-message-avatar" aria-hidden="true">{initials(conversation)}</span>
                <span className="op-admin-message-preview">
                  <span><strong>{conversation.firstName} {conversation.lastName}</strong><small>{formatMessageTime(conversation.lastMessage?.createdAt)}</small></span>
                  <span>{conversation.lastMessage ? `${conversation.lastMessage.senderRole === 'ADMIN' ? 'You: ' : ''}${conversation.lastMessage.body}` : 'No messages yet'}</span>
                </span>
                {conversation.unread > 0 && <span className="op-admin-message-unread">{conversation.unread}</span>}
              </Link>
            ))}
          </div>
        </aside>

        <div className="op-admin-message-thread-panel">
          {!activeUserId ? (
            <div className="op-admin-message-thread-empty">
              <span aria-hidden="true"><MessageSquareText strokeWidth={1.5} /></span>
              <strong>Select a conversation</strong>
              <p>Choose a guest from the queue to read the full thread and reply.</p>
            </div>
          ) : (
            <>
              <header className="op-admin-message-thread-head">
                <Link className="op-admin-message-back" to="/admin/messages" aria-label="Back to conversations"><BackIcon /></Link>
                <span className="op-admin-message-avatar" aria-hidden="true">{initials(activePreview)}</span>
                <div><strong>{activePreview?.firstName} {activePreview?.lastName}</strong><span>{activePreview?.email}</span></div>
              </header>

              {error && <div className="op-admin-message-error" role="alert">{error}</div>}

              <div className="op-admin-message-thread">
                {loadingThread ? (
                  <div className="op-admin-message-empty"><span className="op-admin-booking-spinner" aria-hidden="true" /><strong>Loading thread</strong></div>
                ) : thread.length === 0 ? (
                  <div className="op-admin-message-empty"><strong>No messages in this thread</strong><p>Send the first reply below.</p></div>
                ) : thread.map((message) => {
                  const fromAdmin = message.senderRole === 'ADMIN';
                  return (
                    <article key={message.id} className={`op-admin-message-bubble ${fromAdmin ? 'is-admin' : 'is-guest'}`}>
                      <p>{message.body}</p>
                      <span>{fromAdmin ? 'ZuriLofts support' : `${activePreview?.firstName || 'Guest'}`} · {formatThreadTime(message.createdAt)}</span>
                    </article>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form className="op-admin-message-composer" onSubmit={handleReply}>
                <div className="op-admin-message-compose-surface">
                  <Textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    rows={1}
                    placeholder="Write a reply to the guest"
                    aria-label="Reply to guest"
                    className="op-admin-message-textarea"
                  />
                  <div className="op-admin-message-compose-actions">
                    <Button className="op-admin-bronze-button" type="submit" disabled={sending || !body.trim()}>{sending ? 'Sending...' : 'Send reply'}</Button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default AdminMessages;
