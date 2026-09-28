import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Badge, Button, Label, Select, Spinner, Textarea } from 'flowbite-react';
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

  return <div className="op-dispute-evidence">
    <span className="op-dispute-evidence-thumb">
      {previewUrl ? <img src={previewUrl} alt="" /> : <Icon size={18} strokeWidth={1.8} aria-hidden="true" />}
    </span>
    <div className="op-dispute-evidence-copy">
      <strong>{evidence.originalName}</strong>
      <small>{formatBytes(evidence.size)} - {formatEventDate(evidence.createdAt)}</small>
      {error && <span role="alert">{error}</span>}
    </div>
    <Button size="xs" color="light" disabled={opening} onClick={openEvidence} className="op-dispute-evidence-open">
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
  return <article className={`op-dispute-message${isMine ? ' is-mine' : ''}`}>
    <div className="op-dispute-message-head">
      <MessageSquareText size={14} strokeWidth={1.8} aria-hidden="true" />
      <strong>{sender}</strong>
      <time dateTime={message.createdAt}>{formatEventDate(message.createdAt)}</time>
    </div>
    <p>{message.body}</p>
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
  return <div className="op-dispute-event">
    <span className="op-dispute-event-dot" aria-hidden="true" />
    <div><strong>{label}</strong><small>{formatEventDate(event.createdAt)}{note ? ` - ${note}` : ''}</small></div>
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
    return <div className="op-dispute-empty">
      <span><ShieldAlert size={22} strokeWidth={1.8} aria-hidden="true" /></span>
      <h3>No eligible booking</h3>
      <p>A dispute can be opened after a booking exists on your account.</p>
      <Button color="light" href="/trips">Go to trips</Button>
    </div>;
  }

  return <form className="op-dispute-create" onSubmit={submit}>
    <div className="op-dispute-create-intro">
      <span><ShieldAlert size={20} strokeWidth={1.8} aria-hidden="true" /></span>
      <div><strong>Start with the booking</strong><p>Your report and booking history stay together for the resolution team.</p></div>
    </div>
    <div className="op-dispute-create-grid">
      <div className="op-dispute-field">
        <Label htmlFor="dispute-booking">Booking</Label>
        <Select id="dispute-booking" value={bookingId} onChange={(event) => setBookingId(event.target.value)} required>
          {availableBookings.map((booking) => <option key={booking.id} value={booking.id}>
            {bookingReference(booking.id)} - {booking.property?.title || 'Stay booking'}
          </option>)}
        </Select>
      </div>
      <div className="op-dispute-field">
        <Label htmlFor="dispute-category">Issue category</Label>
        <Select id="dispute-category" value={category} onChange={(event) => setCategory(event.target.value)} required>
          {DISPUTE_CATEGORIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </div>
    </div>
    <div className="op-dispute-field">
      <Label htmlFor="dispute-description">What happened?</Label>
      <Textarea id="dispute-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the issue and what outcome you need." maxLength={4000} required />
    </div>
    {error && <Alert color="failure">{error}</Alert>}
    <div className="op-dispute-create-actions">
      <Button type="submit" disabled={saving} className="op-trust-button-primary">{saving ? <Spinner size="sm" /> : 'Open dispute'}</Button>
      <span>We share this only with the booking participants and ZuriLofts resolution team.</span>
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
    return <div className="op-dispute-loading" role="status"><Spinner size="lg" /><span>Loading your reports...</span></div>;
  }

  if (error) return <Alert color="failure">{error}</Alert>;
  if (!selected) return <CreateDisputeForm bookings={bookings} onCreated={onRefresh} />;

  return <div className="op-dispute">
    <header className="op-dispute-head">
      <div>
        <h2>Report an issue</h2>
        <p>Booking {bookingReference(selected.bookingId)} {booking?.property?.title ? `- ${booking.property.title}` : ''}</p>
      </div>
      <div className="op-dispute-head-actions">
        {disputes.length > 1 && <Select aria-label="Select dispute" value={selected.id} onChange={(event) => setSelectedId(event.target.value)} className="op-dispute-picker">
          {disputes.map((dispute) => <option key={dispute.id} value={dispute.id}>{bookingReference(dispute.bookingId)} - {CATEGORY_LABELS[dispute.category] || dispute.category}</option>)}
        </Select>}
        <Badge color={status.color} icon={StatusIcon}>{status.label}</Badge>
      </div>
    </header>

    <div className="op-dispute-divider" />

    <div className="op-dispute-body">
      <div className="op-dispute-left">
        <div className="op-dispute-field">
          <Label htmlFor="dispute-category-current">Issue category</Label>
          <Select id="dispute-category-current" value={selected.category} disabled>
            {DISPUTE_CATEGORIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </div>

        <div className="op-dispute-description">
          <span className="op-dispute-label">Issue summary</span>
          <p>{selected.description}</p>
        </div>

        <div className="op-dispute-field">
          <span className="op-dispute-label">Evidence</span>
          {(selected.evidence || []).length > 0 ? <div className="op-dispute-evidence-list">
            {selected.evidence.map((item) => <EvidenceItem key={item.id} disputeId={selected.id} evidence={item} />)}
          </div> : <p className="op-dispute-hint">No evidence has been added yet.</p>}
          {!closed && <Button color="light" fullSized disabled={uploading} onClick={() => evidenceInputRef.current?.click()} className="op-dispute-add-evidence">
            {uploading ? <Spinner size="sm" /> : <><Plus size={16} strokeWidth={1.8} aria-hidden="true" />Add evidence</>}
          </Button>}
          <input ref={evidenceInputRef} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={uploadEvidence} />
        </div>

        <p className="op-dispute-privacy"><Paperclip size={14} strokeWidth={1.8} aria-hidden="true" />Your information is shared only with participants and the ZuriLofts resolution team.</p>
      </div>

      <div className="op-dispute-right">
        <div className="op-dispute-thread-head">
          <div><h3>Resolution thread</h3><p>Messages and recorded status events</p></div>
          {closed && <Badge color={selected.status === 'RESOLVED' ? 'success' : 'gray'}>{selected.resolution || status.label}</Badge>}
        </div>
        <div className="op-dispute-thread">
          {thread.map((item) => item.type === 'message'
            ? <ThreadMessage key={`message-${item.id}`} message={item} currentUserId={user?.id} />
            : <ThreadEvent key={`event-${item.action}-${item.createdAt}`} event={item} />)}
        </div>

        {actionError && <Alert color="failure">{actionError}</Alert>}
        {notice && <Alert color="success">{notice}</Alert>}

        {closed ? <div className="op-dispute-closed"><CheckCircle2 size={18} strokeWidth={1.8} aria-hidden="true" /><span>This dispute is closed. The recorded resolution remains available above.</span></div> : <form className="op-dispute-composer" onSubmit={sendMessage}>
          <Textarea aria-label="Add a message to this dispute" placeholder="Add a message to this dispute..." value={message} onChange={(event) => setMessage(event.target.value)} rows={1} maxLength={2000} required />
          <Button type="submit" disabled={sending || !message.trim()} className="op-trust-button-primary">{sending ? <Spinner size="sm" /> : <><Send size={15} strokeWidth={1.8} aria-hidden="true" />Send</>}</Button>
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
