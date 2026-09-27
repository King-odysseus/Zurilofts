import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import apiClient from '../api/client.js';

const CATEGORY_LABELS = {
  PROPERTY_CONDITION: 'Property condition',
  PAYMENT: 'Payment issue',
  CONDUCT: 'Guest/host conduct',
  CANCELLATION: 'Cancellation',
  OTHER: 'Other',
};

const STATUS_STYLES = {
  OPEN: 'bg-[#FDE8D8] text-[#9A4A1D]',
  UNDER_REVIEW: 'bg-[#EAF0F4] text-[#52606F]',
  RESOLVED: 'bg-[#E8F4EC] text-[#287A45]',
  DISMISSED: 'bg-[#EAF0F4] text-[#52606F]',
};

// Real dispute lifecycle events (server-recorded DisputeAudit rows), not a
// synthesised or invented history.
const TIMELINE_LABELS = {
  OPENED: 'Dispute opened',
  EVIDENCE_ADDED: 'Evidence added',
  MESSAGE_SENT: 'Message sent',
  STATUS_CHANGED: 'Status changed',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

function NewDisputeForm({ bookingId, onCreated }) {
  const [category, setCategory] = useState('PROPERTY_CONDITION');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await apiClient.post('/disputes', { bookingId, category, description });
      onCreated(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not open a dispute for this booking');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-2xl border border-[#E3E8EF] bg-white p-6 shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
      <h2 className="text-lg font-semibold text-[#0B1F42]">Report an issue with this booking</h2>
      {error && <p className="rounded-xl bg-[#FDECEC] px-3 py-2 text-sm text-[#B42318]">{error}</p>}
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#0B1F42]">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-12 w-full rounded-[10px] border-0 bg-[#F7F4EF] px-3 py-2 text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40">
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#0B1F42]">What happened?</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          minLength={10}
          required
          className="min-h-[44px] w-full rounded-[10px] border-0 bg-[#F7F4EF] px-3 py-2 text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40"
          placeholder="Describe the issue in detail - our team and the other party will see this."
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="min-h-[44px] rounded-[10px] bg-[#0B1F42] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#07072E] disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Open dispute'}
      </button>
    </form>
  );
}

function DisputeThreadPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const navigate = useNavigate();
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/disputes/${id}`);
      setDispute(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load this dispute');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!messageBody.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/disputes/${id}/messages`, { body: messageBody.trim() });
      setMessageBody('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send message');
    } finally {
      setSending(false);
    }
  }

  async function handleDownloadEvidence(evidence) {
    try {
      const response = await apiClient.get(`/disputes/${id}/evidence/${evidence.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = evidence.originalName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not download evidence');
    }
  }

  async function handleUploadEvidence(file) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      await apiClient.post(`/disputes/${id}/evidence`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not upload evidence');
    } finally {
      setUploading(false);
    }
  }

  // No :id yet - render the "open a new dispute" form for the given booking.
  if (!id) {
    if (!bookingId) {
      return (
        <div className="min-h-screen bg-canvas">
          <Navbar />
          <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">
            <p className="text-[#5B6B82]">A booking is required to open a dispute.</p>
          </main>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-canvas">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">
          <div className="mb-6 rounded-2xl border border-[#E3E8EF] bg-white px-5 py-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)] sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#C49A6C]">Guest support</p>
            <h1 className="mt-2 text-2xl font-bold text-[#0B1F42]">Report a booking issue</h1>
            <p className="mt-1 text-sm text-[#5B6B82]">Tell us what happened and our team will review it with the other party.</p>
          </div>
          <NewDisputeForm bookingId={bookingId} onCreated={(d) => navigate(`/disputes/${d.id}`, { replace: true })} />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C49A6C] border-t-transparent"></div>
      </div>
    );
  }

  if (error && !dispute) {
    return (
      <div className="min-h-screen bg-canvas">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">
          <p className="rounded-2xl bg-[#FDECEC] px-4 py-3 text-[#B42318]">{error}</p>
        </main>
      </div>
    );
  }

  const closed = dispute.status === 'RESOLVED' || dispute.status === 'DISMISSED';

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <Link to="/trips" className="text-sm font-semibold text-[#0B1F42] hover:text-[#C49A6C]">&larr; Back to trips</Link>
        <div className="mt-4 rounded-2xl border border-[#E3E8EF] bg-white p-6 shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-xl font-bold text-[#0B1F42]">{CATEGORY_LABELS[dispute.category] || dispute.category}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[dispute.status] || ''}`}>
              {dispute.status.replace('_', ' ')}
            </span>
          </div>
          <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#5B6B82]">
            <span>Opened {new Date(dispute.createdAt).toLocaleDateString()}</span>
            <span>{dispute.messages.length} message{dispute.messages.length === 1 ? '' : 's'}</span>
            <span>{dispute.evidence.length} evidence file{dispute.evidence.length === 1 ? '' : 's'}</span>
          </div>
          <p className="mb-4 whitespace-pre-wrap text-[#0B1F42]">{dispute.description}</p>

          {dispute.resolution && (
            <div className="mb-4 rounded-2xl border border-[#B9DEC4] bg-[#E8F4EC] p-4">
              <p className="mb-1 text-sm font-semibold text-[#287A45]">Resolution</p>
              <p className="text-sm text-[#287A45]">{dispute.resolution}</p>
            </div>
          )}

          {/* Timeline - real recorded events, not a synthesised history */}
          {dispute.timeline?.length > 0 && (
            <div className="mb-6 border-t border-[#E3E8EF] pt-4">
              <p className="text-sm font-semibold text-[#0B1F42] mb-3">Timeline</p>
              <ol className="space-y-3">
                {dispute.timeline.map((event, idx) => (
                  <li key={`${event.action}-${event.createdAt}-${idx}`} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#C49A6C]" aria-hidden="true" />
                    <div>
                      <p className="text-sm text-[#0B1F42]">
                        {TIMELINE_LABELS[event.action] || event.action}
                        {event.note && <span className="text-[#5B6B82]"> - {event.note}</span>}
                      </p>
                      <p className="text-xs text-[#5B6B82]">{new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Evidence */}
          <div className="mb-6">
            <p className="mb-2 text-sm font-semibold text-[#0B1F42]">Evidence</p>
            <ul className="space-y-1 mb-2">
              {dispute.evidence.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => handleDownloadEvidence(e)}
                    className="text-sm font-semibold text-[#0B1F42] underline hover:text-[#C49A6C]"
                  >
                    {e.originalName}
                  </button>
                </li>
              ))}
              {dispute.evidence.length === 0 && <li className="text-sm text-[#5B6B82]">No evidence uploaded yet.</li>}
            </ul>
            {!closed && (
              <label className="inline-block cursor-pointer rounded-[10px] border border-[#E3E8EF] px-3 py-1.5 text-xs font-semibold text-[#0B1F42] transition-all hover:bg-[#F7F4EF]">
                {uploading ? 'Uploading...' : 'Upload evidence'}
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadEvidence(file);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>

          {/* Messages */}
          <div className="border-t border-[#E3E8EF] pt-4">
            <p className="mb-3 text-sm font-semibold text-[#0B1F42]">Messages</p>
            <ul className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              {dispute.messages.map((m) => (
                <li key={m.id} className="rounded-xl bg-[#F7F4EF] p-3">
                  <p className="mb-1 text-xs font-semibold text-[#0B1F42]">{m.senderRole}</p>
                  <p className="whitespace-pre-wrap text-sm text-[#0B1F42]">{m.body}</p>
                </li>
              ))}
              {dispute.messages.length === 0 && <li className="text-sm text-[#5B6B82]">No messages yet.</li>}
            </ul>
            {!closed && (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Write a message..."
                  className="min-h-[44px] flex-1 rounded-[10px] border-0 bg-[#F7F4EF] px-3 py-2 text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="min-h-[44px] rounded-[10px] bg-[#0B1F42] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#07072E] disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default DisputeThreadPage;
