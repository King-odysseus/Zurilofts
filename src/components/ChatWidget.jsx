import { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../api/client.js';

const STORAGE_KEY = 'zuri_chat_session';

function getOrCreateSessionId() {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = 'chat_' + crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! 👋 How can we help you today? Ask us anything about our apartments.' },
  ]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const messagesEnd = useRef(null);
  const sessionId = useRef(getOrCreateSessionId());
  const lastReplyId = useRef(0);

  const scrollToBottom = useCallback(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Poll for team replies coming back from Telegram while the chat is open
  useEffect(() => {
    if (!open || !started) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await apiClient.get('/chat/messages', {
          params: { sessionId: sessionId.current, after: lastReplyId.current },
        });
        const msgs = data?.messages || [];
        if (!msgs.length) return;
        lastReplyId.current = Math.max(lastReplyId.current, ...msgs.map((m) => m.id));
        const replies = msgs.filter((m) => m.from === 'agent');
        if (replies.length) {
          setMessages((prev) => [...prev, ...replies.map((m) => ({ from: 'bot', text: m.text }))]);
        }
      } catch {
        /* ignore transient poll errors */
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [open, started]);

  function handleStart() {
    if (!name.trim()) {
      setError('Please enter your name first');
      return;
    }
    setError('');
    setStarted(true);
  }

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    if (!name.trim()) {
      setError('Please enter your name first');
      return;
    }

    setError('');
    const userMsg = { from: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setSending(true);

    try {
      await apiClient.post('/chat/send', {
        name: name.trim(),
        email: email.trim(),
        message: trimmed,
        sessionId: sessionId.current,
      });

      // Show the "we'll reply" note only on the first message — after that the
      // conversation stays live and team replies stream in via polling.
      if (!sent) {
        setMessages((prev) => [
          ...prev,
          { from: 'bot', text: 'Thanks! Your message has been sent. We typically reply within 2 hours during business hours — keep this chat open and replies will appear here. ✨' },
        ]);
        setSent(true);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to send. Please try again or email us at info@zuriloft.com.';
      setMessages((prev) => [...prev, { from: 'bot', text: errMsg }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#C49A6C] rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-200 hover:shadow-xl group"
          aria-label="Open chat"
        >
          <svg className="w-7 h-7 text-[#262262]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-[#D9D9D9] flex flex-col overflow-hidden transition-all duration-300" style={{ maxHeight: '520px' }}>
          {/* Header */}
          <div className="bg-[#262262] px-5 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-[#C49A6C] rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#262262]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">ZuriLofts Chat</p>
                <p className="text-white/60 text-xs">We reply within 2 hours</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa]" style={{ maxHeight: '280px' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  m.from === 'user'
                    ? 'bg-[#C49A6C] text-[#262262] rounded-br-md font-medium'
                    : 'bg-white border border-[#D9D9D9] text-[#1f2937] rounded-bl-md shadow-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={messagesEnd} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 bg-white border-t border-[#D9D9D9]">
            {!started ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  placeholder="Your name"
                  className="neu-input w-full px-4 py-2.5 text-sm focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="neu-input w-full px-4 py-2.5 text-sm focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
                />
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={sending}
                  className="w-full bg-[#C49A6C] text-[#262262] py-2.5 rounded-full font-semibold text-sm hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50"
                >
                  Start Chat
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6b7280]">Chatting as <span className="font-semibold text-[#262262]">{name}</span></span>
                  <button
                    type="button"
                    onClick={() => { setStarted(false); setName(''); setEmail(''); setMessages([{ from: 'bot', text: 'Hi! 👋 How can we help you today? Ask us anything about our apartments.' }]); setSent(false); }}
                    className="text-xs text-[#C49A6C] hover:text-[#262262]"
                  >
                    New chat
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="neu-input flex-1 px-4 py-2.5 text-sm focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280] disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-10 h-10 bg-[#C49A6C] rounded-full flex items-center justify-center flex-shrink-0 hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-[#262262] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5 text-[#262262]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </>
  );
}

export default ChatWidget;
