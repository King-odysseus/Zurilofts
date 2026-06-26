import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import apiClient from '../api/client.js';

function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadThread = useCallback(async () => {
    try {
      const res = await apiClient.get('/messages');
      setMessages(res.data.data || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThread();
    const t = setInterval(loadThread, 20000);
    return () => clearInterval(t);
  }, [loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await apiClient.post('/messages', { body: text });
      setMessages((prev) => [...prev, res.data.data]);
      setBody('');
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="flex-1 pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 md:px-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#0B0B45]">Messages</h1>
            <p className="text-[#6b7280] text-sm">Chat with the ZuriLofts team. We usually reply within a few hours.</p>
          </div>

          <div className="shadow-sm flex flex-col h-[60vh]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <p className="text-sm text-[#6b7280] text-center py-10">Loading…</p>
              ) : messages.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 bg-[#C49A6C]/15 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#6b7280]">No messages yet. Send us a message and we&apos;ll get back to you.</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderRole === 'USER' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                        m.senderRole === 'USER'
                          ? 'bg-[#C49A6C] text-white rounded-br-md'
                          : 'bg-[#f0f0f5] text-[#1f2937] rounded-bl-md'
                      }`}
                    >
                      {m.body}
                      <div className={`text-[10px] mt-1 ${m.senderRole === 'USER' ? 'text-white/70' : 'text-[#6b7280]'}`}>
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-[#D9D9D9] flex gap-2">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 px-4 py-3 rounded-full border border-[#D9D9D9] focus:outline-none focus:border-[#C49A6C] text-sm bg-white text-[#1f2937]"
              />
              <button
                type="submit"
                disabled={sending || !body.trim()}
                className="px-6 py-3 rounded-full bg-[#C49A6C] text-white text-sm font-semibold hover:bg-[#b8895c] transition-all disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default MessagesPage;
