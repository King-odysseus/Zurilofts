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
  OPEN: 'bg-amber-100 text-amber-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-700',
  DISMISSED: 'bg-[#E5E7EB]/40 text-[#222222]',
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
    <form onSubmit={handleSubmit} className="bg-white rounded-[14px] p-6 shadow-md space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold text-[#222222]">Report an issue with this booking</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="block text-sm font-semibold text-[#222222] mb-1">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20">
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-[#222222] mb-1">What happened?</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          minLength={10}
          required
          className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
          placeholder="Describe the issue in detail - our team and the other party will see this."
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="min-h-[44px] px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-colors disabled:opacity-50"
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
            <p className="text-[#6b7280]">A booking is required to open a dispute.</p>
          </main>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-canvas">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">
          <div className="mb-6 rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 shadow-sm sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Guest support</p>
            <h1 className="mt-2 text-2xl font-bold text-[#222222]">Report a booking issue</h1>
            <p className="mt-1 text-sm text-[#6b7280]">Tell us what happened and our team will review it with the other party.</p>
          </div>
          <NewDisputeForm bookingId={bookingId} onCreated={(d) => navigate(`/disputes/${d.id}`, { replace: true })} />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !dispute) {
    return (
      <div className="min-h-screen bg-canvas">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">
          <p className="text-red-600">{error}</p>
        </main>
      </div>
    );
  }

  const closed = dispute.status === 'RESOLVED' || dispute.status === 'DISMISSED';

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <Link to="/trips" className="text-sm text-[#2563EB] font-semibold hover:text-[#1D4ED8]">&larr; Back to trips</Link>
        <div className="bg-white rounded-[14px] p-6 shadow-md mt-4">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-xl font-bold text-[#222222]">{CATEGORY_LABELS[dispute.category] || dispute.category}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[dispute.status] || ''}`}>
              {dispute.status.replace('_', ' ')}
            </span>
          </div>
          <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#6b7280]">
            <span>Opened {new Date(dispute.createdAt).toLocaleDateString()}</span>
            <span>{dispute.messages.length} message{dispute.messages.length === 1 ? '' : 's'}</span>
            <span>{dispute.evidence.length} evidence file{dispute.evidence.length === 1 ? '' : 's'}</span>
          </div>
          <p className="text-[#222222] mb-4 whitespace-pre-wrap">{dispute.description}</p>

          {dispute.resolution && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-1">Resolution</p>
              <p className="text-sm text-green-800">{dispute.resolution}</p>
            </div>
          )}

          {/* Timeline - real recorded events, not a synthesised history */}
          {dispute.timeline?.length > 0 && (
            <div className="mb-6 border-t border-[#E5E7EB] pt-4">
              <p className="text-sm font-semibold text-[#222222] mb-3">Timeline</p>
              <ol className="space-y-3">
                {dispute.timeline.map((event, idx) => (
                  <li key={`${event.action}-${event.createdAt}-${idx}`} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#2563EB]" aria-hidden="true" />
                    <div>
                      <p className="text-sm text-[#222222]">
                        {TIMELINE_LABELS[event.action] || event.action}
                        {event.note && <span className="text-[#6b7280]"> - {event.note}</span>}
                      </p>
                      <p className="text-xs text-[#6b7280]">{new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Evidence */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-[#222222] mb-2">Evidence</p>
            <ul className="space-y-1 mb-2">
              {dispute.evidence.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => handleDownloadEvidence(e)}
                    className="text-sm text-[#2563EB] hover:text-[#1D4ED8] underline"
                  >
                    {e.originalName}
                  </button>
                </li>
              ))}
              {dispute.evidence.length === 0 && <li className="text-sm text-[#6b7280]">No evidence uploaded yet.</li>}
            </ul>
            {!closed && (
              <label className="inline-block px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm hover:shadow-md text-[#6b7280] hover:text-[#2563EB] cursor-pointer transition-all">
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
          <div className="border-t border-[#E5E7EB] pt-4">
            <p className="text-sm font-semibold text-[#222222] mb-3">Messages</p>
            <ul className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              {dispute.messages.map((m) => (
                <li key={m.id} className="bg-canvas rounded-xl p-3">
                  <p className="text-xs font-semibold text-[#222222] mb-1">{m.senderRole}</p>
                  <p className="text-sm text-[#222222] whitespace-pre-wrap">{m.body}</p>
                </li>
              ))}
              {dispute.messages.length === 0 && <li className="text-sm text-[#6b7280]">No messages yet.</li>}
            </ul>
            {!closed && (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-colors disabled:opacity-50"
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
