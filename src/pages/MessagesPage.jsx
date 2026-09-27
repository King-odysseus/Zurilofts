import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import MessagesTabBar from '../components/MessagesTabBar.jsx';
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
          <div className="mb-6 rounded-2xl border border-[#E3E8EF] bg-white px-5 py-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#C49A6C]">Guest support</p>
            <h1 className="text-2xl font-bold text-[#0B1F42]">Messages</h1>
            <p className="text-sm text-[#5B6B82]">Chat with the ZuriLofts team. We usually reply within a few hours.</p>
          </div>

          <MessagesTabBar active="support" />

          <div className="flex h-[60vh] flex-col overflow-hidden rounded-2xl border border-[#E3E8EF] bg-white shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <p className="text-sm text-[#6b7280] text-center py-10">Loading…</p>
              ) : messages.length === 0 ? (
                <div className="text-center py-10">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#FDE8D8]">
                    <svg className="h-7 w-7 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          ? 'bg-[#0B1F42] text-white rounded-br-md'
                          : 'bg-[#F7F4EF] text-[#0B1F42] rounded-bl-md'
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
            <form onSubmit={handleSend} className="flex gap-2 border-t border-[#E3E8EF] bg-[#FCFBF9] p-3">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type a message…"
                className="min-h-[44px] flex-1 rounded-[10px] border-0 bg-[#F7F4EF] px-4 py-3 text-sm text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40"
              />
              <button
                type="submit"
                disabled={sending || !body.trim()}
                className="min-h-[44px] rounded-[10px] bg-[#0B1F42] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#07072E] disabled:opacity-50"
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
