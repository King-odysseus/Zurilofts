import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { MessageCircleMore } from 'lucide-react';
import apiClient from '../api/client.js';
import GuestMessagesLayout from '../components/GuestMessagesLayout.jsx';

function ConversationPlaceholder() {
  return <div className="opg-message-placeholder">
    <span>
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

  useEffect(() => {
    document.title = 'Messages | ZuriLofts';
  }, []);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/conversations');
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
