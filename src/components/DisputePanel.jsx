import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Badge, Button, Label, Spinner, Textarea } from 'flowbite-react';
import {
  CheckCircle2,
  Clock3,
  FileImage,
  FileText,
  LifeBuoy,
  MessageSquareText,
  Paperclip,
  Plus,
  Send,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import SelectMenu from './SelectMenu.jsx';

const DISPUTE_CATEGORIES = [
  { value: 'PROPERTY_CONDITION', label: 'Property condition' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'CONDUCT', label: 'Conduct' },
  { value: 'CANCELLATION', label: 'Cancellation' },
  { value: 'OTHER', label: 'Other' },
];

const CATEGORY_LABELS = Object.fromEntries(DISPUTE_CATEGORIES.map((category) => [category.value, category.label]));

const STATUS_META = {
  OPEN: { label: 'Open - awaiting review', color: 'warning', icon: Clock3 },
  UNDER_REVIEW: { label: 'Under review', color: 'info', icon: LifeBuoy },
  RESOLVED: { label: 'Resolved', color: 'success', icon: CheckCircle2 },
  DISMISSED: { label: 'Dismissed', color: 'gray', icon: XCircle },
};

const EVENT_LABELS = {
  OPENED: 'Dispute opened',
  EVIDENCE_ADDED: 'Evidence submitted',
  STATUS_CHANGED: 'Status updated',
  RESOLVED: 'Dispute resolved',
  DISMISSED: 'Dispute dismissed',
  NOTE_ADDED: 'Internal review recorded',
};

function bookingReference(id = '') {
  return `ZL-${id.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase() || 'NEW'}`;
}

function formatEventDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const day = sameDay ? 'Today' : date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  return `${day}, ${date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) return 'File';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(error, fallback) {
  return error.response?.data?.error || error.response?.data?.message || fallback;
}

function EvidenceItem({ disputeId, evidence }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let objectUrl = '';
    let cancelled = false;
    if (evidence.mimeType?.startsWith('image/')) {
      apiClient.get(`/disputes/${disputeId}/evidence/${evidence.id}`, { responseType: 'blob' })
        .then((response) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(response.data);
          setPreviewUrl(objectUrl);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [disputeId, evidence.id, evidence.mimeType]);

  async function openEvidence() {
    setOpening(true);
    setError('');
    try {
      const response = await apiClient.get(`/disputes/${disputeId}/evidence/${evidence.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(errorMessage(err, 'Could not open this evidence'));
    } finally {
      setOpening(false);
    }
  }

  const isImage = evidence.mimeType?.startsWith('image/');
  const Icon = isImage ? FileImage : FileText;

  return <div className="flex items-center gap-3 rounded-lg border border-border p-2">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface text-navy">
      {previewUrl ? <img src={previewUrl} alt="" className="h-12 w-12 object-cover" /> : <Icon size={18} strokeWidth={1.8} aria-hidden="true" />}
    </span>
    <div className="min-w-0 flex-1">
      <strong className="block truncate text-xs font-semibold text-navy">{evidence.originalName}</strong>
      <small className="mt-1 block truncate text-[11px] text-muted">{formatBytes(evidence.size)} - {formatEventDate(evidence.createdAt)}</small>
      {error && <span className="mt-1 block truncate text-[11px] text-red-600" role="alert">{error}</span>}
    </div>
    <Button size="xs" color="light" disabled={opening} onClick={openEvidence}>
      {opening ? 'Opening...' : 'View'}
    </Button>
  </div>;
}

EvidenceItem.propTypes = {
  disputeId: PropTypes.string.isRequired,
  evidence: PropTypes.shape({
    id: PropTypes.string.isRequired,
    originalName: PropTypes.string,
    mimeType: PropTypes.string,
    size: PropTypes.number,
    createdAt: PropTypes.string,
  }).isRequired,
};

function ThreadMessage({ message, currentUserId }) {
  const isMine = message.senderId === currentUserId;
  const sender = isMine ? 'You' : message.senderRole === 'ADMIN' ? 'ZuriLofts Support' : message.senderRole === 'HOST' ? 'Host' : 'Guest';
  return <article className={isMine ? 'ml-auto max-w-[85%] rounded-xl bg-primary-50 p-3 text-sm text-charcoal' : 'mr-auto max-w-[85%] rounded-xl bg-surface p-3 text-sm text-charcoal'}>
    <div className="flex items-center gap-2 text-xs text-muted">
      <MessageSquareText size={14} strokeWidth={1.8} aria-hidden="true" />
      <strong className="font-semibold text-navy">{sender}</strong>
      <time className="ml-auto" dateTime={message.createdAt}>{formatEventDate(message.createdAt)}</time>
    </div>
    <p className="mt-2 leading-relaxed">{message.body}</p>
  </article>;
}

ThreadMessage.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    senderId: PropTypes.string,
    senderRole: PropTypes.string,
    body: PropTypes.string.isRequired,
    createdAt: PropTypes.string,
  }).isRequired,
  currentUserId: PropTypes.string,
};

function ThreadEvent({ event }) {
  const label = EVENT_LABELS[event.action] || 'Dispute updated';
  const note = event.action === 'OPENED' ? CATEGORY_LABELS[event.note] || event.note : event.note;
  return <div className="flex items-start gap-3 text-xs text-muted">
    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
    <div><strong className="block text-sm font-semibold text-navy">{label}</strong><small className="mt-1 block">{formatEventDate(event.createdAt)}{note ? ` - ${note}` : ''}</small></div>
  </div>;
}

ThreadEvent.propTypes = {
  event: PropTypes.shape({
    action: PropTypes.string.isRequired,
    note: PropTypes.string,
    createdAt: PropTypes.string,
  }).isRequired,
};

function CreateDisputeForm({ bookings, onCreated }) {
  const availableBookings = bookings.filter((booking) => booking.status !== 'CANCELLED');
  const [bookingId, setBookingId] = useState(availableBookings[0]?.id || '');
  const [category, setCategory] = useState('PROPERTY_CONDITION');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!availableBookings.some((booking) => booking.id === bookingId)) setBookingId(availableBookings[0]?.id || '');
  }, [availableBookings, bookingId]);

  async function submit(event) {
    event.preventDefault();
    if (description.trim().length < 10) {
      setError('Describe the issue in at least 10 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiClient.post('/disputes', { bookingId, category, description: description.trim() });
      setDescription('');
      await onCreated();
    } catch (err) {
      setError(errorMessage(err, 'Could not open this dispute'));
    } finally {
      setSaving(false);
    }
  }

  if (availableBookings.length === 0) {
    return <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-700"><ShieldAlert size={22} strokeWidth={1.8} aria-hidden="true" /></span>
      <h3 className="text-lg font-semibold text-navy">No eligible booking</h3>
      <p className="text-sm leading-relaxed text-muted">A dispute can be opened after a booking exists on your account.</p>
      <Button color="light" href="/trips">Go to trips</Button>
    </div>;
  }

  return <form className="space-y-4" onSubmit={submit}>
    <div className="flex items-center gap-3 rounded-lg bg-surface p-4">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary-700"><ShieldAlert size={20} strokeWidth={1.8} aria-hidden="true" /></span>
      <div className="min-w-0"><strong className="block text-sm font-semibold text-navy">Start with the booking</strong><p className="mt-1 text-xs leading-relaxed text-muted">Your report and booking history stay together for the resolution team.</p></div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="dispute-booking">Booking</Label>
        <SelectMenu
          id="dispute-booking"
          ariaLabel="Booking"
          value={bookingId}
          onChange={(next) => setBookingId(next)}
          options={availableBookings.map((booking) => ({
            value: booking.id,
            label: `${bookingReference(booking.id)} - ${booking.property?.title || 'Stay booking'}`,
          }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dispute-category">Issue category</Label>
        <SelectMenu
          id="dispute-category"
          ariaLabel="Issue category"
          value={category}
          onChange={(next) => setCategory(next)}
          options={DISPUTE_CATEGORIES}
        />
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="dispute-description">What happened?</Label>
      <Textarea id="dispute-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the issue and what outcome you need." maxLength={4000} required />
    </div>
    {error && <Alert color="failure">{error}</Alert>}
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={saving}>{saving ? <Spinner size="sm" /> : 'Open dispute'}</Button>
      <span className="text-xs leading-relaxed text-muted">We share this only with the booking participants and ZuriLofts resolution team.</span>
    </div>
  </form>;
}

CreateDisputeForm.propTypes = {
  bookings: PropTypes.arrayOf(PropTypes.object).isRequired,
  onCreated: PropTypes.func.isRequired,
};

function DisputePanel({ disputes, bookings, loading = false, error = '', onRefresh }) {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const evidenceInputRef = useRef(null);

  useEffect(() => {
    if (!disputes.some((dispute) => dispute.id === selectedId)) setSelectedId(disputes[0]?.id || '');
  }, [disputes, selectedId]);

  const selected = disputes.find((dispute) => dispute.id === selectedId) || disputes[0];
  const booking = bookings.find((item) => item.id === selected?.bookingId);
  const status = STATUS_META[selected?.status] || STATUS_META.OPEN;
  const StatusIcon = status.icon;
  const closed = selected?.status === 'RESOLVED' || selected?.status === 'DISMISSED';

  const thread = useMemo(() => {
    if (!selected) return [];
    const history = (selected.timeline || [])
      .filter((event) => event.action !== 'MESSAGE_SENT')
      .map((event) => ({ ...event, type: 'event' }));
    const messages = (selected.messages || []).map((item) => ({ ...item, type: 'message' }));
    return [...history, ...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [selected]);

  async function sendMessage(event) {
    event.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setActionError('');
    setNotice('');
    try {
      await apiClient.post(`/disputes/${selected.id}/messages`, { body: message.trim() });
      setMessage('');
      setNotice('Message sent.');
      await onRefresh();
    } catch (err) {
      setActionError(errorMessage(err, 'Could not send this message'));
    } finally {
      setSending(false);
    }
  }

  async function uploadEvidence(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setActionError('');
    setNotice('');
    try {
      const body = new FormData();
      body.append('file', file);
      await apiClient.post(`/disputes/${selected.id}/evidence`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNotice('Evidence uploaded.');
      await onRefresh();
    } catch (err) {
      setActionError(errorMessage(err, 'Could not upload this evidence'));
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[180px] items-center justify-center gap-3 text-sm text-muted" role="status"><Spinner size="lg" /><span>Loading your reports...</span></div>;
  }

  if (error) return <Alert color="failure">{error}</Alert>;
  if (!selected) return <CreateDisputeForm bookings={bookings} onCreated={onRefresh} />;

  return <div className="space-y-4">
    <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-navy">Report an issue</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">Booking {bookingReference(selected.bookingId)} {booking?.property?.title ? `- ${booking.property.title}` : ''}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {disputes.length > 1 && <SelectMenu
          ariaLabel="Select dispute"
          value={selected.id}
          onChange={(next) => setSelectedId(next)}
          className="min-w-[190px]"
          options={disputes.map((dispute) => ({
            value: dispute.id,
            label: `${bookingReference(dispute.bookingId)} - ${CATEGORY_LABELS[dispute.category] || dispute.category}`,
          }))}
        />}
        <Badge color={status.color} icon={StatusIcon}>{status.label}</Badge>
      </div>
    </header>

    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="min-w-0 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dispute-category-current">Issue category</Label>
          {/* Read-only: a category is fixed once the dispute is opened, so the
              handler exists only because SelectMenu requires one. */}
          <SelectMenu
            id="dispute-category-current"
            ariaLabel="Issue category"
            value={selected.category}
            onChange={() => {}}
            disabled
            options={DISPUTE_CATEGORIES}
          />
        </div>

        <div className="rounded-r-lg border-l-[3px] border-primary bg-surface p-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Issue summary</span>
          <p className="mt-1.5 text-sm leading-relaxed text-charcoal">{selected.description}</p>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Evidence</span>
          {(selected.evidence || []).length > 0 ? <div className="space-y-2">
            {selected.evidence.map((item) => <EvidenceItem key={item.id} disputeId={selected.id} evidence={item} />)}
          </div> : <p className="text-xs leading-relaxed text-muted">No evidence has been added yet.</p>}
          {!closed && <Button color="light" fullSized disabled={uploading} onClick={() => evidenceInputRef.current?.click()}>
            {uploading ? <Spinner size="sm" /> : <><Plus size={16} strokeWidth={1.8} aria-hidden="true" />Add evidence</>}
          </Button>}
          <input ref={evidenceInputRef} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={uploadEvidence} />
        </div>

        <p className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted"><Paperclip size={14} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />Your information is shared only with participants and the ZuriLofts resolution team.</p>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div><h3 className="text-sm font-semibold text-navy">Resolution thread</h3><p className="mt-1 text-xs text-muted">Messages and recorded status events</p></div>
          {closed && <Badge color={selected.status === 'RESOLVED' ? 'success' : 'gray'}>{selected.resolution || status.label}</Badge>}
        </div>
        <div className="space-y-3">
          {thread.map((item) => item.type === 'message'
            ? <ThreadMessage key={`message-${item.id}`} message={item} currentUserId={user?.id} />
            : <ThreadEvent key={`event-${item.action}-${item.createdAt}`} event={item} />)}
        </div>

        {actionError && <Alert color="failure">{actionError}</Alert>}
        {notice && <Alert color="success">{notice}</Alert>}

        {closed ? <div className="flex items-center gap-2 rounded-lg bg-surface p-3 text-xs text-muted"><CheckCircle2 size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0" /><span>This dispute is closed. The recorded resolution remains available above.</span></div> : <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={sendMessage}>
          <div className="min-w-0 flex-1"><Textarea aria-label="Add a message to this dispute" placeholder="Add a message to this dispute..." className="resize-none" value={message} onChange={(event) => setMessage(event.target.value)} rows={1} maxLength={2000} required /></div>
          <Button type="submit" disabled={sending || !message.trim()}>{sending ? <Spinner size="sm" /> : <><Send size={15} strokeWidth={1.8} aria-hidden="true" />Send</>}</Button>
        </form>}
      </div>
    </div>
  </div>;
}

DisputePanel.propTypes = {
  disputes: PropTypes.arrayOf(PropTypes.object).isRequired,
  bookings: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onRefresh: PropTypes.func.isRequired,
};

export default DisputePanel;
