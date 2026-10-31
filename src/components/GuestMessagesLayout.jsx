import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { MessageCircleMore, Search } from 'lucide-react';
import GuestAccountLayout from './GuestAccountLayout.jsx';
import MessageAttachments from './MessageAttachments.jsx';
import { firstImage } from '../utils/images.js';
import { getConversationParticipant } from '../utils/conversations.js';

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'Z';
}

function formatListTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-GB', date.getFullYear() === now.getFullYear() ? { weekday: 'short' } : { day: 'numeric', month: 'short' });
}

function ConversationRow({ conversation, currentUserId, selected }) {
  const property = conversation.booking?.property || {};
  const participant = getConversationParticipant(conversation, currentUserId);
  const image = firstImage(property);
  // A file-only message has no text, so the preview names the file instead of
  // claiming the conversation is empty.
  const lastMessage = conversation.lastMessage;
  const preview = lastMessage?.content || (lastMessage?.attachments?.length ? 'Sent an attachment' : 'No messages yet');
  const timestamp = conversation.lastMessage?.createdAt || conversation.updatedAt;
  const unread = Number(conversation.unreadCount) > 0;

  return <Link to={`/inbox/${conversation.id}`} className={`opg-conversation-row${selected ? ' is-selected' : ''}`} aria-current={selected ? 'page' : undefined}>
    <span className="opg-conversation-avatar">
      {image ? <img src={image} alt="" /> : participant.avatar ? <img src={participant.avatar} alt="" /> : <span>{initials(participant.name)}</span>}
    </span>
    <span className="opg-conversation-summary">
      <span className="opg-conversation-line">
        <strong>{participant.name}<span className="opg-conversation-stay"> <i>·</i> {property.title || 'Stay conversation'}</span></strong>
        <time dateTime={timestamp || undefined}>{formatListTime(timestamp)}</time>
      </span>
      <span className="opg-conversation-preview">{preview}</span>
    </span>
    {unread && <span className="opg-conversation-unread" aria-label={`${conversation.unreadCount} unread`}>{conversation.unreadCount}</span>}
  </Link>;
}

ConversationRow.propTypes = {
  conversation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    updatedAt: PropTypes.string,
    unreadCount: PropTypes.number,
    lastMessage: PropTypes.shape({
      content: PropTypes.string,
      createdAt: PropTypes.string,
      attachments: PropTypes.array,
    }),
    booking: PropTypes.shape({
      property: PropTypes.shape({
        title: PropTypes.string,
        images: PropTypes.array,
        imagesJson: PropTypes.string,
        host: PropTypes.shape({
          id: PropTypes.string,
          firstName: PropTypes.string,
          lastName: PropTypes.string,
          avatar: PropTypes.string,
        }),
      }),
      user: PropTypes.shape({
        id: PropTypes.string,
        firstName: PropTypes.string,
        lastName: PropTypes.string,
        avatar: PropTypes.string,
      }),
    }),
  }).isRequired,
  currentUserId: PropTypes.string,
  selected: PropTypes.bool,
};

function SupportRow({ selected }) {
  return <Link to="/messages" className={`opg-conversation-row opg-support-row${selected ? ' is-selected' : ''}`}>
    <span className="opg-conversation-avatar is-support">
      <MessageCircleMore strokeWidth={1.8} aria-hidden="true" />
    </span>
    <span className="opg-conversation-summary">
      <span className="opg-conversation-line"><strong>ZuriLofts Support</strong><span>Help</span></span>
      <span className="opg-conversation-preview">Questions about a stay or booking?</span>
    </span>
  </Link>;
}

SupportRow.propTypes = { selected: PropTypes.bool };

function ConversationList({ activeTab, conversations, currentUserId, selectedId, loading, error, onRetry }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const unreadCount = conversations.filter((conversation) => Number(conversation.unreadCount) > 0).length;

  // Filtering stays client-side: the inbox is fetched whole, so search and the
  // unread toggle never need a round trip.
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (filter === 'unread' && !(Number(conversation.unreadCount) > 0)) return false;
      if (!needle) return true;
      const participant = getConversationParticipant(conversation, currentUserId);
      const haystack = `${participant.name} ${conversation.booking?.property?.title || ''} ${conversation.lastMessage?.content || ''}`;
      return haystack.toLowerCase().includes(needle);
    });
  }, [conversations, currentUserId, filter, query]);

  const narrowed = query.trim().length > 0 || filter === 'unread';

  return <aside className="opg-conversation-list" aria-label="Conversations">
    <div className="opg-conversation-list-head">
      <h2>Messages</h2>
      <label className="opg-conversation-search">
        <Search strokeWidth={2} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search messages"
          aria-label="Search messages"
        />
      </label>
      <div className="opg-message-tabs" role="tablist" aria-label="Message type">
        <Link to="/inbox" role="tab" aria-selected={activeTab === 'inbox'} className={activeTab === 'inbox' ? 'is-active' : ''}>Inbox</Link>
        <Link to="/messages" role="tab" aria-selected={activeTab === 'support'} className={activeTab === 'support' ? 'is-active' : ''}>Support</Link>
      </div>
      {activeTab === 'inbox' && <div className="opg-conversation-filters" role="group" aria-label="Filter conversations">
        <button type="button" className={filter === 'all' ? 'is-active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All<span>{conversations.length}</span></button>
        <button type="button" className={filter === 'unread' ? 'is-active' : ''} aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>Unread<span>{unreadCount}</span></button>
      </div>}
    </div>

    <div className="opg-conversation-scroll">
      {loading ? <div className="opg-conversation-loading" aria-label="Loading conversations"><span /><span /><span /></div> : error ? <div className="opg-conversation-error"><p>{error}</p><button type="button" onClick={onRetry}>Try again</button></div> : <>
        {conversations.length === 0 && <div className="opg-conversation-empty"><strong>No stay messages</strong><span>Conversations with hosts will appear here.</span></div>}
        {conversations.length > 0 && visible.length === 0 && <div className="opg-conversation-empty"><strong>No matches</strong><span>Try a different name, or clear the search.</span></div>}
        {visible.map((conversation) => <ConversationRow key={conversation.id} conversation={conversation} currentUserId={currentUserId} selected={selectedId === conversation.id} />)}
      </>}
      {/* Support stays reachable even when search or the unread filter hides every stay. */}
      {!narrowed && <SupportRow selected={activeTab === 'support'} />}
    </div>
  </aside>;
}

ConversationList.propTypes = {
  activeTab: PropTypes.oneOf(['inbox', 'support']).isRequired,
  conversations: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentUserId: PropTypes.string,
  selectedId: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onRetry: PropTypes.func,
};

// One message: its text and the files that travelled with it. The attachments
// live inside the bubble so a received photo reads as part of the message
// rather than a separate row, and MessageAttachments styles its links from
// `mine` so they stay legible on the navy outgoing bubble.
export function GuestMessageBubble({ mine, meta, attachments, children }) {
  return <div className={`opg-message-item${mine ? ' is-mine' : ''}`}>
    <div className="opg-message-bubble">
      {children}
      <MessageAttachments attachments={attachments} mine={mine} className="mt-2" />
    </div>
    {meta && <span className="opg-message-meta">{meta}</span>}
  </div>;
}

GuestMessageBubble.propTypes = {
  mine: PropTypes.bool,
  meta: PropTypes.string,
  // Raw API value or a parsed list: messages written before attachments existed
  // come back without the field, and MessageAttachments tolerates both.
  attachments: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
  children: PropTypes.node.isRequired,
};

function GuestMessagesLayout({ activeTab, conversations = [], currentUserId, selectedId, loading, error, onRetry, detailOpen, children }) {
  return <GuestAccountLayout
    active="inbox"
    eyebrow="Travel"
    title="Messages"
    description="Stay conversations and ZuriLofts support in one place."
    pageClassName={detailOpen ? 'is-message-thread' : 'is-messages-index'}
  >
    {/* `is-thread-open` marks the opened conversation for the stylesheet, which
        turns the pane into the page itself (no card edge, bubbles on the page
        surface). `is-detail-open` keeps the phone view hiding the list. */}
    <div className={`opg-messages-layout${detailOpen ? ' is-detail-open is-thread-open' : ''}`}>
      <ConversationList
        activeTab={activeTab}
        conversations={conversations}
        currentUserId={currentUserId}
        selectedId={selectedId}
        loading={loading}
        error={error}
        onRetry={onRetry}
      />
      <section className="opg-message-pane">{children}</section>
    </div>
  </GuestAccountLayout>;
}

GuestMessagesLayout.propTypes = {
  activeTab: PropTypes.oneOf(['inbox', 'support']).isRequired,
  conversations: PropTypes.arrayOf(PropTypes.object),
  currentUserId: PropTypes.string,
  selectedId: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onRetry: PropTypes.func,
  detailOpen: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

export default GuestMessagesLayout;
