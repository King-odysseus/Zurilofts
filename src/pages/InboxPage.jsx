import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext.jsx';
import { useMode } from '../context/ModeContext.jsx';
import apiClient from '../api/client.js';
import Navbar from '../components/Navbar.jsx';
import Spinner from '../components/Spinner.jsx';
import MessagesTabBar from '../components/MessagesTabBar.jsx';
import { firstImage } from '../utils/images.js';
import HostMobileBottomNav from '../components/HostMobileBottomNav.jsx';

function formatRelativeTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getOtherParticipant(conversation, currentUserId) {
  const booking = conversation.booking || {};
  const guest = booking.user || {};
  const isGuest = guest.id === currentUserId;
  if (isGuest) {
    // The other party is the host; their name is not included in the list
    // response, so fall back to a generic label.
    return { name: 'Host', isHost: true };
  }
  return { name: `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest', isHost: false };
}

export function ConversationRow({ conversation, currentUserId, compact = false, active = false }) {
  const booking = conversation.booking || {};
  const property = booking.property || {};
  const image = firstImage(property);
  const other = getOtherParticipant(conversation, currentUserId);
  const lastMessage = conversation.lastMessage;
  const preview = lastMessage ? lastMessage.content : 'No messages yet';
  const unread = conversation.unreadCount > 0;

  return (
    <Link
      to={`/inbox/${conversation.id}`}
      aria-current={active ? 'page' : undefined}
      className={`block bg-white p-4 transition-all duration-200 hover:bg-[#F7F4EF] ${compact ? 'border-b border-[#E5E7EB] last:border-b-0' : 'rounded-2xl border border-[#E5E7EB] shadow-sm'} ${active ? 'bg-[#F7F4EF] shadow-[inset_3px_0_0_#C49A6C]' : ''}`}
    >
      <div className="flex items-center gap-4">
        {/* Property thumbnail */}
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-[#E5E7EB]/30">
          {image ? (
            <img src={image} alt={property.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#6b7280]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-[#222222] truncate">{other.name}</h3>
            <span className="text-xs text-[#6b7280] flex-shrink-0">
              {formatRelativeTime(lastMessage ? lastMessage.createdAt : conversation.updatedAt)}
            </span>
          </div>
          <p className="text-sm text-[#6b7280] truncate">{property.title || 'Property'}</p>
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className={`text-sm truncate ${unread ? 'font-semibold text-[#222222]' : 'text-[#6b7280]'}`}>
              {preview}
            </p>
            {unread && (
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#C49A6C]" aria-label="Unread" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
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
      }),
      user: PropTypes.shape({
        id: PropTypes.string,
        firstName: PropTypes.string,
        lastName: PropTypes.string,
      }),
    }),
  }).isRequired,
  currentUserId: PropTypes.string.isRequired,
  compact: PropTypes.bool,
  active: PropTypes.bool,
};

function InboxPage() {
  const { user } = useAuth();
  const { mode } = useMode();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await apiClient.get('/conversations');
      setConversations(res.data.data || []);
      setError(null);
    } catch (err) {
      setError('Could not load your messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="mb-8 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-5 shadow-sm sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#C49A6C]">Guest workspace</p>
          <h1 className="mt-1 text-3xl font-bold text-[#0B1F42]">Inbox</h1>
          <p className="mt-1 text-[#52606F]">Messages about your bookings and stays.</p>
        </div>

        <MessagesTabBar active="inbox" />

        {!loading && !error && (
          <div className="hidden min-h-[560px] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm lg:grid lg:grid-cols-[360px_minmax(0,1fr)]">
            <section className="border-r border-[#E5E7EB]" aria-label="Conversations">
              <div className="border-b border-[#E5E7EB] px-5 py-4">
                <h2 className="font-bold text-[#222222]">Conversations</h2>
                <p className="mt-1 text-sm text-[#6b7280]">Choose a thread to view its messages.</p>
              </div>
              {conversations.length > 0 ? conversations.map((conversation) => (
                <ConversationRow key={conversation.id} conversation={conversation} currentUserId={user?.id} compact />
              )) : (
                <p className="px-5 py-8 text-sm text-[#6b7280]">No conversations yet.</p>
              )}
            </section>
            <section className="flex items-center justify-center bg-[#F7F7F5]/60 px-8 text-center" aria-label="Conversation preview">
              <div className="max-w-sm">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#6b7280] shadow-sm">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-[#222222]">{conversations.length ? 'Select a conversation' : 'No messages yet'}</h2>
                <p className="mt-2 text-sm text-[#6b7280]">
                  {conversations.length ? 'Choose a booking conversation from the list to read and reply.' : 'Messages about your bookings will appear here once you make a reservation.'}
                </p>
              </div>
            </section>
          </div>
        )}

        <div className="lg:hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-[#6b7280] mb-4">{error}</p>
            <button
              onClick={fetchConversations}
              className="inline-flex items-center min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-all duration-200"
            >
              Try again
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 bg-[#E5E7EB]/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#222222] mb-1">No messages yet</h3>
            <p className="text-[#6b7280] max-w-sm mx-auto">
              Messages about your bookings will appear here once you make a reservation.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((c) => (
              <ConversationRow key={c.id} conversation={c} currentUserId={user?.id} />
            ))}
          </div>
        )}
        </div>
      </main>
      {mode === 'hosting' && <HostMobileBottomNav />}
    </div>
  );
}

export default InboxPage;
