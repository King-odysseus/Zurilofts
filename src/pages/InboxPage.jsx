import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import GuestMessagesLayout from '../components/GuestMessagesLayout.jsx';

function ConversationPlaceholder() {
  return <div className="opg-message-placeholder">
    <span>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
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
