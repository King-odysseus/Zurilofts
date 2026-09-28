import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, TextInput } from 'flowbite-react';
import apiClient from '../api/client.js';

function SearchIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
    </svg>
  );
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
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
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

  const openConversation = useCallback(async (conversation) => {
    setActiveUser(conversation);
    setLoadingThread(true);
    setError('');
    try {
      const response = await apiClient.get(`/admin/messages/${conversation.userId}`);
      setThread(response.data.data || []);
      setConversations((current) => current.map((entry) => entry.userId === conversation.userId ? { ...entry, unread: 0 } : entry));
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Conversation could not be loaded.');
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  async function handleReply(event) {
    event.preventDefault();
    const text = body.trim();
    if (!text || !activeUser) return;
    setSending(true);
    setError('');
    try {
      const response = await apiClient.post(`/admin/messages/${activeUser.userId}`, { body: text });
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
  const activePreview = activeUser ? conversations.find((conversation) => conversation.userId === activeUser.userId) || activeUser : null;

  return (
    <div className="op-admin-overview op-admin-messages" data-openpencil-frame="0:7458">
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
        <article><span>OPEN THREAD</span><strong className="op-admin-message-active">{activeUser ? `${activeUser.firstName || ''} ${activeUser.lastName || ''}`.trim() : 'None'}</strong><small>{activeUser ? activeUser.email : 'Select a guest to read the thread'}</small></article>
        <article><span>LAST SYNC</span><strong className="op-admin-message-sync">{lastSync ? lastSync.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}</strong><small>Automatically refreshed every 30 seconds</small></article>
      </div>

      <section className={`op-admin-message-board ${activeUser ? 'has-active' : ''}`}>
        <aside className="op-admin-message-list-panel">
          <div className="op-admin-message-search"><SearchIcon /><TextInput type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></div>
          <div className="op-admin-message-list">
            {loadingList ? (
              <div className="op-admin-message-empty"><span className="op-admin-booking-spinner" aria-hidden="true" /><strong>Loading conversations</strong></div>
            ) : visibleConversations.length === 0 ? (
              <div className="op-admin-message-empty"><strong>No conversations found</strong><p>Adjust the search or wait for a new guest message.</p></div>
            ) : visibleConversations.map((conversation) => (
              <button key={conversation.userId} type="button" className={`op-admin-message-conversation ${activeUser?.userId === conversation.userId ? 'is-active' : ''}`} onClick={() => openConversation(conversation)}>
                <span className="op-admin-message-avatar" aria-hidden="true">{initials(conversation)}</span>
                <span className="op-admin-message-preview">
                  <span><strong>{conversation.firstName} {conversation.lastName}</strong><small>{formatMessageTime(conversation.lastMessage?.createdAt)}</small></span>
                  <span>{conversation.lastMessage ? `${conversation.lastMessage.senderRole === 'ADMIN' ? 'You: ' : ''}${conversation.lastMessage.body}` : 'No messages yet'}</span>
                </span>
                {conversation.unread > 0 && <span className="op-admin-message-unread">{conversation.unread}</span>}
              </button>
            ))}
          </div>
        </aside>

        <div className="op-admin-message-thread-panel">
          {!activeUser ? (
            <div className="op-admin-message-thread-empty">
              <span aria-hidden="true"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h8m-8 4h5m8-2a8 8 0 01-11.6 7.1L4 20l.9-3.4A8 8 0 1121 12z" /></svg></span>
              <strong>Select a conversation</strong>
              <p>Choose a guest from the queue to read the full thread and reply.</p>
            </div>
          ) : (
            <>
              <header className="op-admin-message-thread-head">
                <button type="button" className="op-admin-message-back" onClick={() => setActiveUser(null)} aria-label="Back to conversations"><BackIcon /></button>
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
                <TextInput value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a reply to the guest" aria-label="Reply to guest" />
                <Button className="op-admin-bronze-button" type="submit" disabled={sending || !body.trim()}>{sending ? 'Sending...' : 'Send reply'}</Button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default AdminMessages;
