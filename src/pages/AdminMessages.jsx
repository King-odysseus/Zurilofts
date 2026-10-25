import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Spinner, Textarea, TextInput } from 'flowbite-react';
import { ChevronLeft, MessageSquareText, Search } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../api/client.js';

// Shared surface styles for both panes so the inbox reads as one component.
const METRIC_CARD = 'rounded-xl border border-border bg-white p-5 shadow-sm';
const METRIC_LABEL = 'text-[11px] font-semibold uppercase tracking-wide text-muted';
const METRIC_VALUE = 'mt-2 block text-2xl font-bold text-navy';
const METRIC_NOTE = 'mt-1 block text-xs text-muted';
const AVATAR = 'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-bg text-[11px] font-semibold text-white';
const EMPTY_STATE = 'flex flex-col items-center gap-2 px-4 py-10 text-center';

function BackIcon() {
  return <ChevronLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />;
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
    <div className="space-y-6" data-openpencil-frame="0:7458">
      <div className={`flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between ${activeUserId ? 'hidden lg:flex' : ''}`}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">ZURILOFTS · ADMIN · OPERATIONS</p>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Messages</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">Review guest conversations, keep support replies moving, and track unread demand.</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 ${activeUserId ? 'hidden lg:grid' : ''}`}>
        <article className={METRIC_CARD}>
          <span className={METRIC_LABEL}>CONVERSATIONS</span>
          <strong className={METRIC_VALUE}>{conversations.length}</strong>
          <small className={METRIC_NOTE}>Guests with a support history</small>
        </article>
        <article className={METRIC_CARD}>
          <span className={METRIC_LABEL}>UNREAD MESSAGES</span>
          <strong className={METRIC_VALUE}>{unreadTotal}</strong>
          <small className={METRIC_NOTE}>Waiting for an operations reply</small>
        </article>
        <article className={METRIC_CARD}>
          <span className={METRIC_LABEL}>OPEN THREAD</span>
          <strong className={`${METRIC_VALUE} truncate`}>{activePreview ? `${activePreview.firstName || ''} ${activePreview.lastName || ''}`.trim() || 'Guest' : 'None'}</strong>
          <small className={METRIC_NOTE}>{activePreview ? activePreview.email || 'Guest conversation' : 'Select a guest to read the thread'}</small>
        </article>
        <article className={METRIC_CARD}>
          <span className={METRIC_LABEL}>LAST SYNC</span>
          <strong className={METRIC_VALUE}>{lastSync ? lastSync.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-'}</strong>
          <small className={METRIC_NOTE}>Automatically refreshed every 30 seconds</small>
        </article>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        {/* Two panes on desktop; one pane at a time on phones, driven by the route. */}
        <div className={`grid grid-cols-1 lg:h-[calc(100vh_-_18rem)] lg:max-h-[680px] lg:min-h-[520px] lg:grid-cols-3 lg:overflow-hidden ${activeUserId ? 'h-[calc(100dvh_-_172px)] min-h-[420px]' : ''}`}>
          <aside className={`${activeUserId ? 'hidden lg:flex' : 'flex'} min-h-0 min-w-0 flex-col border-border lg:col-span-1 lg:border-r`}>
            <div className="flex-none border-b border-border p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.8} aria-hidden="true" />
                <TextInput type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="pl-9" />
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {loadingList ? (
                <div className={EMPTY_STATE}>
                  <Spinner size="md" aria-hidden="true" />
                  <strong className="text-sm font-semibold text-navy">Loading conversations</strong>
                </div>
              ) : visibleConversations.length === 0 ? (
                <div className={EMPTY_STATE}>
                  <strong className="text-sm font-semibold text-navy">No conversations found</strong>
                  <p className="text-xs text-muted">Adjust the search or wait for a new guest message.</p>
                </div>
              ) : visibleConversations.map((conversation) => (
                <Link key={conversation.userId} to={`/admin/messages/${encodeURIComponent(conversation.userId)}`} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${activeUserId === conversation.userId ? 'bg-primary-50' : 'hover:bg-surface'}`} aria-current={activeUserId === conversation.userId ? 'page' : undefined}>
                  <span className={AVATAR} aria-hidden="true">{initials(conversation)}</span>
                  <span className="block min-w-0 flex-1 space-y-1">
                    <span className="flex items-center justify-between gap-2">
                      <strong className="min-w-0 truncate text-xs font-semibold text-navy">{conversation.firstName} {conversation.lastName}</strong>
                      <small className="shrink-0 text-[10px] text-muted">{formatMessageTime(conversation.lastMessage?.createdAt)}</small>
                    </span>
                    <span className="block truncate text-xs text-muted">{conversation.lastMessage ? `${conversation.lastMessage.senderRole === 'ADMIN' ? 'You: ' : ''}${conversation.lastMessage.body}` : 'No messages yet'}</span>
                  </span>
                  {conversation.unread > 0 && <span className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{conversation.unread}</span>}
                </Link>
              ))}
            </div>
          </aside>

          <div className={`${activeUserId ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 flex-col lg:col-span-2`}>
            {!activeUserId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-navy" aria-hidden="true"><MessageSquareText className="h-6 w-6" strokeWidth={1.5} /></span>
                <strong className="text-sm font-semibold text-navy">Select a conversation</strong>
                <p className="max-w-sm text-xs leading-relaxed text-muted">Choose a guest from the queue to read the full thread and reply.</p>
              </div>
            ) : (
              <>
                <header className="flex min-h-[64px] flex-none items-center gap-3 border-b border-border px-4 py-3">
                  <Link className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-navy lg:hidden" to="/admin/messages" aria-label="Back to conversations"><BackIcon /></Link>
                  <span className={AVATAR} aria-hidden="true">{initials(activePreview)}</span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-semibold text-navy">{activePreview?.firstName} {activePreview?.lastName}</strong>
                    <span className="block truncate text-xs text-muted">{activePreview?.email}</span>
                  </div>
                </header>

                {error && <Alert color="failure" role="alert" className="mx-4 mt-3">{error}</Alert>}

                <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-4">
                  {loadingThread ? (
                    <div className={EMPTY_STATE}>
                      <Spinner size="md" aria-hidden="true" />
                      <strong className="text-sm font-semibold text-navy">Loading thread</strong>
                    </div>
                  ) : thread.length === 0 ? (
                    <div className={EMPTY_STATE}>
                      <strong className="text-sm font-semibold text-navy">No messages in this thread</strong>
                      <p className="text-xs text-muted">Send the first reply below.</p>
                    </div>
                  ) : thread.map((message) => {
                    const fromAdmin = message.senderRole === 'ADMIN';
                    return (
                      <article key={message.id} className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${fromAdmin ? 'self-end rounded-br-md bg-primary-700 text-white' : 'self-start rounded-bl-md bg-surface text-navy'}`}>
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
                        <span className={`mt-1.5 block text-[10px] ${fromAdmin ? 'text-white/80' : 'text-muted'}`}>{fromAdmin ? 'ZuriLofts support' : `${activePreview?.firstName || 'Guest'}`} · {formatThreadTime(message.createdAt)}</span>
                      </article>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <form className="flex flex-none items-end gap-2 border-t border-border p-3" onSubmit={handleReply}>
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
                    className="min-h-0 flex-1 resize-none"
                  />
                  <Button type="submit" disabled={sending || !body.trim()}>{sending ? 'Sending...' : 'Send reply'}</Button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminMessages;
