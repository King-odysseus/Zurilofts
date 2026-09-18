import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "../api/client.js";

function AdminMessages() {
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null); // { userId, firstName, lastName, email }
  const [thread, setThread] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const bottomRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await apiClient.get("/admin/messages");
      setConversations(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
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
      setConversations((prev) =>
        prev.map((c) => (c.userId === conv.userId ? { ...c, unread: 0 } : c)),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  async function handleReply(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !activeUser) return;
    setSending(true);
    try {
      const res = await apiClient.post(`/admin/messages/${activeUser.userId}`, {
        body: text,
      });
      setThread((prev) => [...prev, res.data.data]);
      setBody("");
      loadConversations();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E8EF] pb-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#C49A6C]">
            Workspace / Support
          </p>
          <h1 className="text-2xl font-bold text-[#0B1F42]">Support inbox</h1>
          <p className="mt-1 text-sm text-[#5B6B82]">
            Conversations with your guests.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#5B6B82]">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Typical reply time &lt; 2 hours
        </span>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Conversations", conversations.length],
          [
            "Unread",
            conversations.reduce(
              (total, conversation) => total + (conversation.unread || 0),
              0,
            ),
          ],
          [
            "Selected thread",
            activeUser
              ? `${activeUser.firstName} ${activeUser.lastName}`
              : "None",
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[#E3E8EF] bg-white p-4 shadow-[0_4px_16px_rgba(11,31,66,0.04)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
              {label}
            </p>
            <p className="mt-2 truncate text-xl font-bold text-[#0B1F42]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid min-h-[60vh] grid-cols-1 overflow-hidden rounded-2xl border border-[#E3E8EF] bg-white shadow-[0_4px_16px_rgba(11,31,66,0.04)] md:grid-cols-3 xl:grid-cols-4">
        {/* Conversation list */}
        <div className="max-h-[70vh] overflow-y-auto border-b border-[#E3E8EF] md:border-b-0 md:border-r">
          {loadingList ? (
            <p className="text-sm text-[#6b7280] p-4">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-[#6b7280] p-4">No conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.userId}
                onClick={() => openConversation(c)}
                className={`w-full text-left px-4 py-3 border-b border-[#E5E7EB] hover:bg-canvas transition-colors ${
                  activeUser?.userId === c.userId ? "bg-canvas" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#222222] text-sm">
                    {c.firstName} {c.lastName}
                  </span>
                  {c.unread > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {c.unread}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6b7280] truncate mt-0.5">
                  {c.lastMessage
                    ? `${c.lastMessage.senderRole === "ADMIN" ? "You: " : ""}${c.lastMessage.body}`
                    : ""}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Thread */}
        <div className="flex max-h-[70vh] flex-col md:col-span-2">
          {!activeUser ? (
            <div className="flex-1 flex items-center justify-center text-[#6b7280] text-sm p-8">
              Select a conversation to read and reply.
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-[#E5E7EB]">
                <p className="font-semibold text-[#222222] text-sm">
                  {activeUser.firstName} {activeUser.lastName}
                </p>
                <p className="text-xs text-[#6b7280]">{activeUser.email}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingThread ? (
                  <p className="text-xs text-[#6b7280] text-center py-6">
                    Loading…
                  </p>
                ) : (
                  thread.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.senderRole === "ADMIN" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-[14px] text-sm ${
                          m.senderRole === "ADMIN"
                            ? "bg-[#2563EB] text-white rounded-br-md"
                            : "bg-[#f0f0f5] text-[#222222] rounded-bl-md"
                        }`}
                      >
                        {m.body}
                        <div
                          className={`text-[10px] mt-1 ${m.senderRole === "ADMIN" ? "text-white/70" : "text-[#6b7280]"}`}
                        >
                          {new Date(m.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              <form
                onSubmit={handleReply}
                className="flex gap-2 border-t border-[#E3E8EF] p-3"
              >
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your reply…"
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 text-sm bg-white text-[#222222]"
                />
                <button
                  type="submit"
                  disabled={sending || !body.trim()}
                  className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#C49A6C] text-white text-sm font-semibold hover:bg-[#B8895C] transition-all disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
        <aside className="hidden border-l border-[#E3E8EF] bg-[#F8FAFC] p-5 xl:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
            Conversation context
          </p>
          {activeUser ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-[#0B1F42]">
                  {activeUser.firstName} {activeUser.lastName}
                </p>
                <p className="mt-1 text-xs text-[#5B6B82]">
                  {activeUser.email}
                </p>
              </div>
              <div className="rounded-xl border border-[#E3E8EF] bg-white p-3">
                <p className="text-xs text-[#94A3B8]">Status</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  Open conversation
                </p>
              </div>
              <div className="rounded-xl border border-[#E3E8EF] bg-white p-3">
                <p className="text-xs text-[#94A3B8]">Next step</p>
                <p className="mt-1 text-sm text-[#5B6B82]">
                  Reply to keep the guest updated.
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#5B6B82]">
              Select a conversation to see guest details.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

export default AdminMessages;
