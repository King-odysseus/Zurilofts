import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import GuestAccountLayout from './GuestAccountLayout.jsx';
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
  const preview = conversation.lastMessage?.content || 'No messages yet';
  const timestamp = conversation.lastMessage?.createdAt || conversation.updatedAt;
  const unread = Number(conversation.unreadCount) > 0;

  return <Link to={`/inbox/${conversation.id}`} className={`opg-conversation-row${selected ? ' is-selected' : ''}`} aria-current={selected ? 'page' : undefined}>
    <span className="opg-conversation-avatar">
      {image ? <img src={image} alt="" /> : participant.avatar ? <img src={participant.avatar} alt="" /> : <span>{initials(participant.name)}</span>}
    </span>
    <span className="opg-conversation-summary">
      <span className="opg-conversation-line">
        <strong>{participant.name} <i>·</i> {property.title || 'Stay conversation'}</strong>
        <time dateTime={timestamp || undefined}>{formatListTime(timestamp)}</time>
      </span>
      <span className="opg-conversation-preview">{preview}</span>
    </span>
    {unread && <span className="opg-conversation-unread" aria-label="Unread messages" />}
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
    }),
    booking: PropTypes.shape({
      property: PropTypes.shape({
        title: PropTypes.string,
        images: PropTypes.arrayOf(PropTypes.string),
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
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
    </span>
    <span className="opg-conversation-summary">
      <span className="opg-conversation-line"><strong>ZuriLofts Support</strong><span>Help</span></span>
      <span className="opg-conversation-preview">Questions about a stay or booking?</span>
    </span>
  </Link>;
}

SupportRow.propTypes = { selected: PropTypes.bool };

function ConversationList({ activeTab, conversations, currentUserId, selectedId, loading, error, onRetry }) {
  return <aside className="opg-conversation-list" aria-label="Conversations">
    <div className="opg-conversation-list-head">
      <h2>Messages</h2>
      <div className="opg-message-tabs" role="tablist" aria-label="Message type">
        <Link to="/inbox" role="tab" aria-selected={activeTab === 'inbox'} className={activeTab === 'inbox' ? 'is-active' : ''}>Inbox</Link>
        <Link to="/messages" role="tab" aria-selected={activeTab === 'support'} className={activeTab === 'support' ? 'is-active' : ''}>Support</Link>
      </div>
    </div>

    <div className="opg-conversation-scroll">
      {loading ? <div className="opg-conversation-loading" aria-label="Loading conversations"><span /><span /><span /></div> : error ? <div className="opg-conversation-error"><p>{error}</p><button type="button" onClick={onRetry}>Try again</button></div> : <>
        {conversations.length === 0 && <div className="opg-conversation-empty"><strong>No stay messages</strong><span>Conversations with hosts will appear here.</span></div>}
        {conversations.map((conversation) => <ConversationRow key={conversation.id} conversation={conversation} currentUserId={currentUserId} selected={selectedId === conversation.id} />)}
      </>}
      <SupportRow selected={activeTab === 'support'} />
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

export function GuestMessageBubble({ mine, meta, children }) {
  return <div className={`opg-message-item${mine ? ' is-mine' : ''}`}>
    <div className="opg-message-bubble">{children}</div>
    {meta && <span className="opg-message-meta">{meta}</span>}
  </div>;
}

GuestMessageBubble.propTypes = {
  mine: PropTypes.bool,
  meta: PropTypes.string,
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
    <div className={`opg-messages-layout${detailOpen ? ' is-detail-open' : ''}`}>
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
