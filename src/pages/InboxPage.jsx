import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { MessageCircleMore } from 'lucide-react';
import apiClient from '../api/client.js';
import GuestMessagesLayout from '../components/GuestMessagesLayout.jsx';

// The icon tile carries the gap above the heading. The paragraph's own margin is
// !important in styles.css and cannot be raised from here, so the tile's bottom
// margin (with the ! prefix, since that rule ships after Tailwind's utilities)
// holds the stack spacing for the whole empty state.
function ConversationPlaceholder() {
  return <div className="opg-message-placeholder">
    <span className="!mb-5">
      <MessageCircleMore strokeWidth={1.7} aria-hidden="true" />
    </span>
    <h2>Select a conversation</h2>
    <p>Open a stay conversation to read messages and reply to your host.</p>
  </div>;
}

function InboxPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      // This is the traveller inbox: only the conversations booked as a guest.
      // Host-side threads belong to the host inbox at /host/inbox.
      const response = await apiClient.get('/conversations', { params: { side: 'guest' } });
      setConversations(response.data.data || []);
      setError(null);
    } catch {
      setError('Could not load your messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return <GuestMessagesLayout
    activeTab="inbox"
    conversations={conversations}
    currentUserId={user?.id}
    loading={loading}
    error={error}
    onRetry={fetchConversations}
  >
    <ConversationPlaceholder />
  </GuestMessagesLayout>;
}

export default InboxPage;
