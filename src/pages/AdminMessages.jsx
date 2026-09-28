import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/client.js';

function AdminMessages() {
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null); // { userId, firstName, lastName, email }
  const [thread, setThread] = useState([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const bottomRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/messages');
      setConversations(res.data.data || []);
    } catch { /* ignore */ } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const t = setInterval(loadConversations, 30000);
    return () => clearInterval(t);
  }, [loadConversations]);

  const openConversation = useCallback(async (conv) => {
    setActiveUser(conv);
    setLoadingThread(true);
    try {
      const res = await apiClient.get(`/admin/messages/${conv.userId}`);
      setThread(res.data.data || []);
      // clear unread badge locally
      setConversations((prev) => prev.map((c) => (c.userId === conv.userId ? { ...c, unread: 0 } : c)));
    } catch { /* ignore */ } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  async function handleReply(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !activeUser) return;
    setSending(true);
    try {
      const res = await apiClient.post(`/admin/messages/${activeUser.userId}`, { body: text });
      setThread((prev) => [...prev, res.data.data]);
      setBody('');
      loadConversations();
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold text-[#0B0B45] mb-1">Messages</h1>
      <p className="text-[#6b7280] mb-6">Conversations with your guests.</p>

      <div className="bg-white rounded-2xl shadow-sm border border-[#D9D9D9] overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[60vh]">
        {/* Conversation list */}
        <div className="border-b md:border-b-0 md:border-r border-[#D9D9D9] overflow-y-auto max-h-[70vh]">
          {loadingList ? (
            <p className="text-sm text-[#6b7280] p-4">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-[#6b7280] p-4">No conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.userId}
                onClick={() => openConversation(c)}
                className={`w-full text-left px-4 py-3 border-b border-[#D9D9D9] hover:bg-[#f8f9fa] transition-colors ${
                  activeUser?.userId === c.userId ? 'bg-[#f8f9fa]' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#0B0B45] text-sm">{c.firstName} {c.lastName}</span>
                  {c.unread > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{c.unread}</span>
                  )}
                </div>
                <p className="text-xs text-[#6b7280] truncate mt-0.5">
                  {c.lastMessage ? `${c.lastMessage.senderRole === 'ADMIN' ? 'You: ' : ''}${c.lastMessage.body}` : ''}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Thread */}
        <div className="md:col-span-2 flex flex-col max-h-[70vh]">
          {!activeUser ? (
            <div className="flex-1 flex items-center justify-center text-[#6b7280] text-sm p-8">
              Select a conversation to read and reply.
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-[#D9D9D9]">
                <p className="font-semibold text-[#0B0B45] text-sm">{activeUser.firstName} {activeUser.lastName}</p>
                <p className="text-xs text-[#6b7280]">{activeUser.email}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingThread ? (
                  <p className="text-xs text-[#6b7280] text-center py-6">Loading…</p>
                ) : (
                  thread.map((m) => (
                    <div key={m.id} className={`flex ${m.senderRole === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                          m.senderRole === 'ADMIN'
                            ? 'bg-[#C49A6C] text-white rounded-br-md'
                            : 'bg-[#f0f0f5] text-[#1f2937] rounded-bl-md'
                        }`}
                      >
                        {m.body}
                        <div className={`text-[10px] mt-1 ${m.senderRole === 'ADMIN' ? 'text-white/70' : 'text-[#6b7280]'}`}>
                          {new Date(m.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={handleReply} className="p-3 border-t border-[#D9D9D9] flex gap-2">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your reply…"
                  className="flex-1 px-4 py-2.5 rounded-full border border-[#D9D9D9] focus:outline-none focus:border-[#C49A6C] text-sm bg-white text-[#1f2937]"
                />
                <button
                  type="submit"
                  disabled={sending || !body.trim()}
                  className="px-5 py-2.5 rounded-full bg-[#C49A6C] text-white text-sm font-semibold hover:bg-[#b8895c] transition-all disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminMessages;
