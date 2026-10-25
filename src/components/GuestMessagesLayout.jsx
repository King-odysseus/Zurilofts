import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Alert, Button } from 'flowbite-react';
import { MessageCircleMore } from 'lucide-react';
import GuestAccountLayout from './GuestAccountLayout.jsx';
import { firstImage } from '../utils/images.js';
import { getConversationParticipant } from '../utils/conversations.js';

// Selected conversation gets the brand tint; the rest stay flat with a hover wash.
const ROW_BASE = 'grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 border-l-2 px-3 py-2.5 no-underline transition-colors';
const ROW_SELECTED = 'border-primary bg-surface';
const ROW_IDLE = 'border-transparent hover:bg-surface';

function rowClass(selected) {
  return `${ROW_BASE} ${selected ? ROW_SELECTED : ROW_IDLE}`;
}

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

  return <Link to={`/inbox/${conversation.id}`} className={rowClass(selected)} aria-current={selected ? 'page' : undefined}>
    <span className="grid h-[42px] w-[42px] shrink-0 place-items-center overflow-hidden rounded-full bg-primary-50 text-xs font-bold text-navy">
      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : participant.avatar ? <img src={participant.avatar} alt="" className="h-full w-full object-cover" /> : <span>{initials(participant.name)}</span>}
    </span>
    <span className="min-w-0">
      <span className="flex items-center justify-between gap-2">
        <strong className="min-w-0 truncate text-xs font-bold text-navy">{participant.name} <i className="not-italic text-muted">·</i> {property.title || 'Stay conversation'}</strong>
        <time dateTime={timestamp || undefined} className="shrink-0 text-[10px] text-muted">{formatListTime(timestamp)}</time>
      </span>
      <span className="mt-1 block truncate text-[11px] text-muted">{preview}</span>
    </span>
    {unread && <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-primary" aria-label="Unread messages" />}
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
  return <Link to="/messages" className={rowClass(selected)}>
    <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-navy-bg text-white">
      <MessageCircleMore className="h-[19px] w-[19px]" strokeWidth={1.8} aria-hidden="true" />
    </span>
    <span className="min-w-0">
      <span className="flex items-center justify-between gap-2"><strong className="truncate text-xs font-bold text-navy">ZuriLofts Support</strong><span className="shrink-0 text-[10px] text-muted">Help</span></span>
      <span className="mt-1 block truncate text-[11px] text-muted">Questions about a stay or booking?</span>
    </span>
  </Link>;
}

SupportRow.propTypes = { selected: PropTypes.bool };

// List pane: hidden on phones while a thread is open, always visible from lg up.
function paneDisplayClass(isOpen) {
  return isOpen ? 'flex' : 'hidden lg:flex';
}

function listTabClass(isActive) {
  return `inline-flex min-w-[66px] items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold no-underline transition-colors ${isActive ? 'bg-navy-bg text-white' : 'text-muted hover:text-navy'}`;
}

function ConversationList({ activeTab, conversations, currentUserId, selectedId, loading, error, onRetry, open = true }) {
  return <aside className={`${paneDisplayClass(open)} h-[calc(100dvh-210px)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-white lg:h-[600px] lg:min-h-0`} aria-label="Conversations">
    <div className="shrink-0 px-4 pb-3 pt-4">
      <h2 className="mb-3 text-xl font-bold text-navy">Messages</h2>
      <div className="inline-flex items-center gap-1 rounded-lg bg-surface p-1" role="tablist" aria-label="Message type">
        <Link to="/inbox" role="tab" aria-selected={activeTab === 'inbox'} className={listTabClass(activeTab === 'inbox')}>Inbox</Link>
        <Link to="/messages" role="tab" aria-selected={activeTab === 'support'} className={listTabClass(activeTab === 'support')}>Support</Link>
      </div>
    </div>

    <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto px-1 pb-2">
      {loading ? <div className="flex flex-col gap-2 p-2" aria-label="Loading conversations"><span className="block h-[62px] animate-pulse rounded-lg bg-surface" /><span className="block h-[62px] animate-pulse rounded-lg bg-surface" /><span className="block h-[62px] animate-pulse rounded-lg bg-surface" /></div> : error ? <Alert color="failure" className="m-2">
        <p>{error}</p>
        <Button color="light" size="xs" type="button" onClick={onRetry} className="mt-2">Try again</Button>
      </Alert> : <>
        {conversations.length === 0 && <div className="px-3 py-5 text-center"><strong className="block text-[13px] font-bold text-navy">No stay messages</strong><span className="mt-1 block text-[11px] leading-relaxed text-muted">Conversations with hosts will appear here.</span></div>}
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
  open: PropTypes.bool,
};

export function GuestMessageBubble({ mine, meta, children }) {
  return <div className={`flex w-[88%] max-w-[560px] flex-col sm:w-[78%] ${mine ? 'items-end self-end' : 'items-start'}`}>
    <div className={`max-w-full whitespace-pre-wrap rounded-2xl px-3.5 py-3 text-xs leading-relaxed text-navy ${mine ? 'rounded-br-sm bg-primary-50' : 'rounded-bl-sm bg-surface'}`}>{children}</div>
    {meta && <span className="mt-1.5 text-[10px] text-muted">{meta}</span>}
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
    compact={Boolean(detailOpen)}
  >
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <ConversationList
        activeTab={activeTab}
        conversations={conversations}
        currentUserId={currentUserId}
        selectedId={selectedId}
        loading={loading}
        error={error}
        onRetry={onRetry}
        open={!detailOpen}
      />
      <section className={`${paneDisplayClass(Boolean(detailOpen))} h-[calc(100dvh-210px)] min-h-[380px] flex-col overflow-hidden rounded-xl border border-border bg-white lg:h-[600px] lg:min-h-0`}>{children}</section>
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
