import { useLanguage } from '../context/LanguageContext.jsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Spinner, TextInput } from 'flowbite-react';
import { ChevronLeft, MessageSquareText, Search } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../api/client.js';
import MessageComposer from '../components/MessageComposer.jsx';
import MessageAttachments from '../components/MessageAttachments.jsx';
import { parseAttachments } from '../utils/attachments.js';

// Shared surface styles for both panes so the inbox reads as one component.
const METRIC_CARD = 'rounded-xl bg-elevated shadow-md p-5';
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
  const { t } = useLanguage();
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
  const [listError, setListError] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const bottomRef = useRef(null);

  const loadConversations = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoadingList(true);
    try {
      const response = await apiClient.get('/admin/messages');
      setConversations(response.data.data || []);
      setLastSync(new Date());
      setListError('');
    } catch (requestError) {
      // A failed background poll leaves the last good list on screen; only a
      // foreground load is worth interrupting the admin for.
      if (!quiet) setListError(requestError.response?.data?.error || 'Conversations could not be loaded.');
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

    // The badge may only disappear once the server agrees it is gone. A local
    // zero on its own is what the 30-second poll used to undo, so the read is
    // recorded first and the count is cleared after it succeeds. A failed
    // mark-read is logged and leaves the count visible, because rendering it as
    // read while the server still holds it unread is the exact bug being fixed.
    const markThreadRead = async () => {
      try {
        await apiClient.patch(`/admin/messages/${activeUserId}/read`);
        if (!active) return;
        setConversations((current) => current.map((entry) => entry.userId === activeUserId ? { ...entry, unread: 0 } : entry));
        // Re-read the inbox so the page's unread totals come from the server
        // rather than from the optimistic zero above.
        await loadConversations({ quiet: true });
      } catch (requestError) {
        console.error('Could not mark the conversation as read:', requestError);
      }
    };

    apiClient.get(`/admin/messages/${activeUserId}`)
      .then((response) => {
        if (!active) return;
        setThread(response.data.data || []);
        markThreadRead();
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
  }, [activeUserId, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  // The composer hands back the typed text plus any files it already uploaded.
  // Returning whether the send was accepted is what lets it keep both when the
  // request fails, instead of silently dropping a reply the admin just wrote.
  async function handleReply({ text, attachments }) {
    if (!activeUserId) return false;
    const trimmed = (text || '').trim();
    const files = parseAttachments(attachments);
    // A photo of the damage is a valid reply on its own, so text is optional.
    if (!trimmed && files.length === 0) return false;

    setSending(true);
    setError('');
    try {
      const response = await apiClient.post(`/admin/messages/${activeUserId}`, { body: trimmed, attachments: files });
      const created = response.data?.data;
      // The message is accepted even if the API answers without the row; refusing
      // here would tell the admin the send failed when it did not.
      if (created) setThread((current) => [...current, created]);
      setBody('');
      await loadConversations({ quiet: true });
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Reply could not be sent.');
      return false;
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

  // A full-page thread sits flush under the admin bar, so the page gutters between
  // heading, metrics and section are dropped while it is open on a phone and
  // restored from lg up, where the card layout returns.
  return (
    <div className={activeUserId ? 'space-y-0 lg:space-y-8' : 'space-y-8'}>
      <div className={`flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between ${activeUserId ? 'hidden lg:flex' : ''}`}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{t('admin.messagesTitle')}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{t('admin.messagesDescription')}</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 ${activeUserId ? 'hidden lg:grid' : ''}`}>
        <article className={METRIC_CARD}>
          <span className={METRIC_LABEL}>{t('admin.conversations').toUpperCase()}</span>
          <strong className={METRIC_VALUE}>{conversations.length}</strong>
          <small className={METRIC_NOTE}>{t('admin.conversationsNote')}</small>
        </article>
        <article className={METRIC_CARD}>
          <span className={METRIC_LABEL}>{t('admin.unreadMessages').toUpperCase()}</span>
          <strong className={METRIC_VALUE}>{unreadTotal}</strong>
          <small className={METRIC_NOTE}>{t('admin.unreadNote')}</small>
        </article>
        <article className={METRIC_CARD}>
          <span className={METRIC_LABEL}>{t('admin.openThread').toUpperCase()}</span>
          <strong className={`${METRIC_VALUE} truncate`}>{activePreview ? `${activePreview.firstName || ''} ${activePreview.lastName || ''}`.trim() || 'Guest' : 'None'}</strong>
          <small className={METRIC_NOTE}>{activePreview ? activePreview.email || 'Guest conversation' : 'Select a guest to read the thread'}</small>
        </article>
        <article className={METRIC_CARD}>
          <span className={METRIC_LABEL}>{t('admin.lastSync').toUpperCase()}</span>
          <strong className={METRIC_VALUE}>{lastSync ? lastSync.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-'}</strong>
          <small className={METRIC_NOTE}>{t('admin.autoRefresh')}</small>
        </article>
      </div>

      {/* On a phone an open thread *is* the page, so the card disappears: no border,
          radius or shadow, and the section is pulled out over the page gutter so the
          thread runs edge to edge under the admin bar. The negative bottom margin
          absorbs the shell's own bar clearance, otherwise that padding would leave a
          dead band under the composer. From lg up the inbox is still a two-pane card
          and every one of those styles comes back. */}
      <section className={`overflow-hidden ${
        activeUserId
          ? '-mx-4 -mb-[calc(92px_+_env(safe-area-inset-bottom))] bg-transparent lg:mx-0 lg:mb-0 lg:rounded-xl lg:border lg:border-border lg:bg-elevated lg:shadow-sm'
          : 'rounded-xl bg-elevated shadow-md'
      }`}>
        {/* Two panes on desktop; one pane at a time on phones, driven by the route.
            The phone height is the viewport minus everything the admin shell spends
            above and below the page: the 56px phone bar, the 80px top offset that
            contentSpacing sets for a thread route, and the 58px section bar. Sized
            from those numbers so the composer ends exactly on the bar instead of
            sliding under it. */}
        <div className={`grid grid-cols-1 lg:h-[calc(100vh_-_18rem)] lg:max-h-[680px] lg:min-h-[520px] lg:grid-cols-3 lg:overflow-hidden ${activeUserId ? 'h-[calc(100dvh_-_194px_-_env(safe-area-inset-bottom))] min-h-[420px]' : ''}`}>
          <aside className={`${activeUserId ? 'hidden lg:flex' : 'flex'} min-h-0 min-w-0 flex-col border-border lg:col-span-1 lg:border-r`}>
            <div className="flex-none border-b border-border p-3">
              <div className="relative [&_input]:border-0 [&_input]:bg-surface [&_input]:pl-9">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.8} aria-hidden="true" />
                <TextInput type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('admin.searchConversations')} aria-label={t('a11y3.searchConversations')} />
              </div>
            </div>
            {/* The queue's own failure has to be visible in the index view too, so
                it lives in the list pane instead of inside the thread. */}
            {listError && <Alert color="failure" role="alert" className="m-2 text-center">{listError}</Alert>}
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {loadingList ? (
                <div className={EMPTY_STATE}>
                  <Spinner size="md" aria-hidden="true" />
                  <strong className="text-sm font-semibold text-navy">{t('admin.loadingConversations')}</strong>
                </div>
              ) : visibleConversations.length === 0 ? (
                <div className={EMPTY_STATE}>
                  <strong className="text-sm font-semibold text-navy">{t('admin.noConversations')}</strong>
                  <p className="text-xs text-muted">{t('admin.noConversationsHint')}</p>
                </div>
              ) : visibleConversations.map((conversation) => (
                <Link key={conversation.userId} to={`/admin/messages/${encodeURIComponent(conversation.userId)}`} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${activeUserId === conversation.userId ? 'bg-primary-50 dark:bg-primary/15' : 'hover:bg-surface'}`} aria-current={activeUserId === conversation.userId ? 'page' : undefined}>
                  <span className={AVATAR} aria-hidden="true">{initials(conversation)}</span>
                  <span className="block min-w-0 flex-1 space-y-1">
                    <span className="flex items-center justify-between gap-2">
                      <strong className="min-w-0 truncate text-xs font-semibold text-navy">{conversation.firstName} {conversation.lastName}</strong>
                      <small className="shrink-0 text-[10px] text-muted">{formatMessageTime(conversation.lastMessage?.createdAt)}</small>
                    </span>
                    <span className="block truncate text-xs text-muted">{conversation.lastMessage ? `${conversation.lastMessage.senderRole === 'ADMIN' ? 'You: ' : ''}${conversation.lastMessage.body || 'Attachment'}` : 'No messages yet'}</span>
                  </span>
                  {conversation.unread > 0 && <span className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{conversation.unread}</span>}
                </Link>
              ))}
            </div>
          </aside>

          <div className={`${activeUserId ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 flex-col lg:col-span-2`}>
            {!activeUserId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary/15 text-navy" aria-hidden="true"><MessageSquareText className="h-6 w-6" strokeWidth={1.5} /></span>
                <strong className="text-sm font-semibold text-navy">{t('admin.selectConversation')}</strong>
                <p className="max-w-sm text-xs leading-relaxed text-muted">{t('admin.selectConversationHint')}</p>
              </div>
            ) : (
              <>
                <header className="flex min-h-[64px] flex-none items-center gap-3 border-b border-border px-4 py-3">
                  <Link className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-navy lg:hidden" to="/admin/messages" aria-label={t('admin.backToConversations')}><BackIcon /></Link>
                  <span className={AVATAR} aria-hidden="true">{initials(activePreview)}</span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-semibold text-navy">{activePreview?.firstName} {activePreview?.lastName}</strong>
                    <span className="block truncate text-xs text-muted">{activePreview?.email}</span>
                  </div>
                </header>

                {error && <Alert color="failure" role="alert" className="mx-4 mt-3 text-center">{error}</Alert>}

                <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-4">
                  {loadingThread ? (
                    <div className={EMPTY_STATE}>
                      <Spinner size="md" aria-hidden="true" />
                      <strong className="text-sm font-semibold text-navy">{t('admin.loadingThread')}</strong>
                    </div>
                  ) : thread.length === 0 ? (
                    <div className={EMPTY_STATE}>
                      <strong className="text-sm font-semibold text-navy">{t('admin.noMessagesInThread')}</strong>
                      <p className="text-xs text-muted">{t('admin.sendFirstReply')}</p>
                    </div>
                  ) : thread.map((message) => {
                    const fromAdmin = message.senderRole === 'ADMIN';
                    const attachments = parseAttachments(message.attachments);
                    return (
                      <article key={message.id} className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${fromAdmin ? 'self-end rounded-br-md bg-primary-700 text-white' : 'self-start rounded-bl-md bg-surface text-navy'}`}>
                        {message.body && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>}
                        {attachments.length > 0 && <MessageAttachments attachments={attachments} mine={fromAdmin} className={message.body ? 'mt-2' : ''} />}
                        <span className={`mt-1.5 block text-[10px] ${fromAdmin ? 'text-white/80' : 'text-muted'}`}>{fromAdmin ? 'ZuriLofts support' : `${activePreview?.firstName || 'Guest'}`} - {formatThreadTime(message.createdAt)}</span>
                      </article>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* The hairline is the only separation the composer needs: the pill,
                    the attach control and the send arrow already carry their own shape. */}
                <div className="flex-none border-t border-border p-3">
                  <MessageComposer
                    value={body}
                    onChange={setBody}
                    onSubmit={handleReply}
                    placeholder={activePreview?.firstName ? t('a11y3.replyToName', { name: activePreview.firstName }) : t('a11y3.replyToGuestPlaceholder')}
                    ariaLabel={t('a11y3.replyToGuestLabel')}
                    sending={sending}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminMessages;
