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
    } catch (err) { console.error(err); } finally {
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
    } catch (err) { console.error(err); } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />
      <div className="flex-1 pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 md:px-6">
          <div className="mb-6 rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 shadow-sm">
            <h1 className="text-2xl font-bold text-[#222222]">Messages</h1>
            <p className="text-[#6b7280] text-sm">Chat with the ZuriLofts team. We usually reply within a few hours.</p>
          </div>

          <div className="neu-card flex flex-col h-[60vh]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <p className="text-sm text-[#6b7280] text-center py-10">Loading…</p>
              ) : messages.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 bg-[#2563EB]/15 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#6b7280]">No messages yet. Send us a message and we&apos;ll get back to you.</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderRole === 'USER' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-[14px] text-sm ${
                        m.senderRole === 'USER'
                          ? 'bg-[#2563EB] text-white rounded-br-md'
                          : 'bg-[#f0f0f5] text-[#222222] rounded-bl-md'
                      }`}
                    >
                      {m.body}
                      <div className={`text-[11px] mt-1 ${m.senderRole === 'USER' ? 'text-white/70' : 'text-[#6b7280]'}`}>
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-[#E5E7EB] flex gap-2">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 min-h-[44px] px-4 py-3 rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 text-sm bg-white text-[#222222]"
              />
              <button
                type="submit"
                disabled={sending || !body.trim()}
                className="min-h-[44px] px-6 py-3 rounded-lg bg-[#C49A6C] text-white text-sm font-semibold hover:bg-[#B8895C] transition-all disabled:opacity-50"
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
