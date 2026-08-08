import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import Spinner from '../components/Spinner.jsx';

function parseImages(property) {
  if (!property) return [];
  if (Array.isArray(property.images)) return property.images;
  if (property.imagesJson) {
    try {
      const parsed = JSON.parse(property.imagesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatMessageTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOtherParticipant(conversation, currentUserId) {
  const booking = conversation?.booking || {};
  const guest = booking.user || {};
  const isGuest = guest.id === currentUserId;
  if (isGuest) {
    return { name: 'Host', isHost: true };
  }
  return { name: `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest', isHost: false };
}

function MessageBubble({ message, isMine }) {
  const sender = message.sender || {};
  const senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'User';

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] sm:max-w-[70%] ${isMine ? 'text-right' : 'text-left'}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
            isMine
              ? 'bg-[#0B0B45] text-white rounded-br-md'
              : 'bg-white border border-[#D9D9D9] text-[#1f2937] rounded-bl-md'
          }`}
        >
          {message.content}
        </div>
        <p className={`text-[11px] text-[#6b7280] mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
          {isMine ? 'You' : senderName} · {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

MessageBubble.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    createdAt: PropTypes.string,
    sender: PropTypes.shape({
      firstName: PropTypes.string,
      lastName: PropTypes.string,
    }),
  }).isRequired,
  isMine: PropTypes.bool.isRequired,
};

function ConversationPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  // Load conversation metadata (property title + other participant) from the list
  useEffect(() => {
    let cancelled = false;
    async function loadConversation() {
      try {
        const res = await apiClient.get('/conversations');
        if (cancelled) return;
        const found = (res.data.data || []).find((c) => c.id === conversationId);
        setConversation(found || null);
      } catch {
        // Non-fatal: thread still renders with messages
      }
    }
    loadConversation();
    return () => { cancelled = true; };
  }, [conversationId]);

  // Load messages + mark read + poll every 30s
  useEffect(() => {
    if (!conversationId) return;
    let active = true;

    async function loadMessages() {
      try {
        const res = await apiClient.get(`/conversations/${conversationId}/messages`);
        if (!active) return;
        setMessages(res.data.data || []);
        setError(null);
        scrollToBottom();
      } catch (err) {
        if (!active) return;
        setError('Could not load messages. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }

    async function markRead() {
      try {
        await apiClient.patch(`/conversations/${conversationId}/read`);
      } catch {
        // Ignore read-marking failures
      }
    }

    loadMessages();
    markRead();
    const interval = setInterval(() => {
      loadMessages();
      markRead();
    }, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [conversationId, scrollToBottom]);

  const canSend = draft.trim().length > 0 && !sending;

  async function handleSend() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await apiClient.post(`/conversations/${conversationId}/messages`, { content });
      const newMessage = res.data.data;
      setMessages((prev) => [...prev, newMessage]);
      setDraft('');
      scrollToBottom();
    } catch (err) {
      setError('Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  const other = getOtherParticipant(conversation, user?.id);
  const property = conversation?.booking?.property || {};
  const images = parseImages(property);

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link
            to="/inbox"
            className="p-2 rounded-full hover:bg-[#D9D9D9]/40 transition-colors text-[#0B0B45]"
            aria-label="Back to inbox"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[#0B0B45] truncate">{other.name}</h1>
            <p className="text-sm text-[#6b7280] truncate">{property.title || 'Property'}</p>
          </div>
          {images[0] && (
            <img src={images[0]} alt={property.title} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-[#D9D9D9] p-4 space-y-3 min-h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : error && messages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#6b7280] mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200"
              >
                Try again
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#6b7280]">No messages yet. Say hello to {other.name}.</p>
            </div>
          ) : (
            messages.map((m) => (
              <MessageBubble key={m.id} message={m} isMine={m.senderId === user?.id} />
            ))
          )}
          {error && messages.length > 0 && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="mt-4 pb-4">
          <div className="flex items-end gap-2 bg-white rounded-2xl border border-[#D9D9D9] p-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Write a message..."
              className="flex-1 resize-none bg-transparent outline-none px-3 py-2 text-sm text-[#1f2937] placeholder-[#6b7280] max-h-32"
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                canSend
                  ? 'bg-[#C49A6C] text-white hover:bg-[#b8895c]'
                  : 'bg-[#D9D9D9] text-[#6b7280] cursor-not-allowed'
              }`}
            >
              {sending ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              Send
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default ConversationPage;
