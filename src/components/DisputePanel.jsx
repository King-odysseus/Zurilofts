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
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import SelectMenu from './SelectMenu.jsx';

const DISPUTE_CATEGORIES = [
  { value: 'PROPERTY_CONDITION', label: 'trust.categoryProperty' },
  { value: 'PAYMENT', label: 'trust.categoryPayment' },
  { value: 'CONDUCT', label: 'trust.categoryConduct' },
  { value: 'CANCELLATION', label: 'trust.categoryCancellation' },
  { value: 'OTHER', label: 'trust.categoryOther' },
];

const CATEGORY_LABELS = Object.fromEntries(DISPUTE_CATEGORIES.map((category) => [category.value, category.label]));

const STATUS_META = {
  OPEN: { label: 'trust.statusOpenAwaiting', color: 'warning', icon: Clock3 },
  UNDER_REVIEW: { label: 'trust.statusUnderReview', color: 'info', icon: LifeBuoy },
  RESOLVED: { label: 'trust.statusResolved', color: 'success', icon: CheckCircle2 },
  DISMISSED: { label: 'Dismissed', color: 'gray', icon: XCircle },
};

const EVENT_LABELS = {
  OPENED: 'trust.eventOpened',
  EVIDENCE_ADDED: 'trust.eventEvidence',
  STATUS_CHANGED: 'trust.eventStatus',
  RESOLVED: 'trust.eventResolved',
  DISMISSED: 'trust.eventDismissed',
  NOTE_ADDED: 'trust.eventNote',
};

function bookingReference(id = '') {
  return `ZL-${id.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase() || 'NEW'}`;
}

function formatEventDate(value, t, lang) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('trust.justNow');
  const locale = lang === 'sw' ? 'sw-KE' : 'en-KE';
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const day = sameDay ? t('booking.today') : date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  return `${day}, ${date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
}

function formatBytes(value, t) {
  if (!Number.isFinite(value) || value <= 0) return t('trust.fileFallback');
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(error, fallback) {
  return error.response?.data?.error || error.response?.data?.message || fallback;
}

function EvidenceItem({ disputeId, evidence }) {
  const { t, lang } = useLanguage();
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
      setError(errorMessage(err, t('trust.evidenceOpenFailed')));
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
      <small>{formatBytes(evidence.size, t)} - {formatEventDate(evidence.createdAt, t, lang)}</small>
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
  const { t, lang } = useLanguage();
  const isMine = message.senderId === currentUserId;
  const sender = isMine
    ? t('messages.you')
    : message.senderRole === 'ADMIN'
      ? t('messages.supportName')
      : message.senderRole === 'HOST'
        ? t('host.badge')
        : t('common.guest');
  return <article className={`op-dispute-message${isMine ? ' is-mine' : ''}`}>
    <div className="op-dispute-message-head">
      <MessageSquareText size={14} strokeWidth={1.8} aria-hidden="true" />
      <strong>{sender}</strong>
      <time dateTime={message.createdAt}>{formatEventDate(message.createdAt, t, lang)}</time>
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
  const { t, lang } = useLanguage();
  const label = t(EVENT_LABELS[event.action] || 'trust.eventDisputeUpdated');
  const categoryKey = CATEGORY_LABELS[event.category] || CATEGORY_LABELS[event.note];
  const note = event.action === 'OPENED' ? (categoryKey ? t(categoryKey) : event.note) : event.note;
  return <div className="op-dispute-event">
    <span className="op-dispute-event-dot" aria-hidden="true" />
    <div><strong>{label}</strong><small>{formatEventDate(event.createdAt, t, lang)}{note ? ` - ${note}` : ''}</small></div>
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
  const { t } = useLanguage();
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
      setError(t('trust.describeMinChars'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiClient.post('/disputes', { bookingId, category, description: description.trim() });
      setDescription('');
      await onCreated();
    } catch (err) {
      setError(errorMessage(err, t('trust.disputeOpenFailed')));
    } finally {
      setSaving(false);
    }
  }

  if (availableBookings.length === 0) {
    return <div className="op-dispute-empty">
      <span><ShieldAlert size={22} strokeWidth={1.8} aria-hidden="true" /></span>
      <h3>{t('trust.noEligibleBooking')}</h3>
      <p>{t('trust.disputeNeedsBooking')}</p>
      <Button color="light" href="/trips">{t('trust.goToTrips')}</Button>
    </div>;
  }

  return <form className="op-dispute-create" onSubmit={submit}>
    <div className="op-dispute-create-intro">
      <span><ShieldAlert size={20} strokeWidth={1.8} aria-hidden="true" /></span>
      <div><strong>{t('trust.startWithBooking')}</strong><p>{t('trust.disputeStaysTogether')}</p></div>
    </div>
    <div className="op-dispute-create-grid">
      <div className="op-dispute-field">
        <Label htmlFor="dispute-booking">{t('trust.booking')}</Label>
        <SelectMenu
          id="dispute-booking"
          ariaLabel={t('trust.booking')}
          value={bookingId}
          onChange={(next) => setBookingId(next)}
          options={availableBookings.map((booking) => ({
            value: booking.id,
            label: `${bookingReference(booking.id)} - ${booking.property?.title || t('trust.stayBooking')}`,
          }))}
        />
      </div>
      <div className="op-dispute-field">
        <Label htmlFor="dispute-category">{t('trust.issueCategory')}</Label>
        <SelectMenu
          id="dispute-category"
          ariaLabel={t('trust.issueCategory')}
          value={category}
          onChange={(next) => setCategory(next)}
          options={DISPUTE_CATEGORIES.map((c) => ({ ...c, label: t(c.label) }))}
        />
      </div>
    </div>
    <div className="op-dispute-field">
      <Label htmlFor="dispute-description">{t('trust.whatHappened')}</Label>
      <Textarea id="dispute-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t('trust.describeIssuePlaceholder')} maxLength={4000} required />
    </div>
    {error && <Alert color="failure">{error}</Alert>}
    <div className="op-dispute-create-actions">
      <Button type="submit" disabled={saving} className="op-trust-button-primary">{saving ? <Spinner size="sm" /> : t('trust.openDisputeOne')}</Button>
      <span>{t('trust.disputeSharedWith')}</span>
    </div>
  </form>;
}

CreateDisputeForm.propTypes = {
  bookings: PropTypes.arrayOf(PropTypes.object).isRequired,
  onCreated: PropTypes.func.isRequired,
};

function DisputePanel({ disputes, bookings, loading = false, error = '', onRefresh }) {
  const { t } = useLanguage();
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
      setNotice(t('trust.messageSent'));
      await onRefresh();
    } catch (err) {
      setActionError(errorMessage(err, t('trust.messageSendFailed')));
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
      setNotice(t('trust.evidenceUploaded'));
      await onRefresh();
    } catch (err) {
      setActionError(errorMessage(err, t('trust.evidenceUploadFailed')));
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <div className="op-dispute-loading" role="status"><Spinner size="lg" /><span>{t('trust.loadingReports')}</span></div>;
  }

  if (error) return <Alert color="failure">{error}</Alert>;
  if (!selected) return <CreateDisputeForm bookings={bookings} onCreated={onRefresh} />;

  return <div className="op-dispute">
    <header className="op-dispute-head">
      <div>
        <h2>{t('trust.reportAnIssue')}</h2>
        <p>{t('trust.booking')} {bookingReference(selected.bookingId)} {booking?.property?.title ? `- ${booking.property.title}` : ''}</p>
      </div>
      <div className="op-dispute-head-actions">
        {disputes.length > 1 && <SelectMenu
          ariaLabel={t('trust.selectDispute')}
          value={selected.id}
          onChange={(next) => setSelectedId(next)}
          className="op-dispute-picker"
          options={disputes.map((dispute) => ({
            value: dispute.id,
            label: `${bookingReference(dispute.bookingId)} - ${t(CATEGORY_LABELS[dispute.category]) || dispute.category}`,
          }))}
        />}
        <Badge color={status.color} icon={StatusIcon}>{t(status.label)}</Badge>
      </div>
    </header>

    <div className="op-dispute-divider" />

    <div className="op-dispute-body">
      <div className="op-dispute-left">
        <div className="op-dispute-field">
          <Label htmlFor="dispute-category-current">{t('trust.issueCategory')}</Label>
          {/* Read-only: a category is fixed once the dispute is opened, so the
              handler exists only because SelectMenu requires one. */}
          <SelectMenu
            id="dispute-category-current"
            ariaLabel={t('trust.issueCategory')}
            value={selected.category}
            onChange={() => {}}
            disabled
            options={DISPUTE_CATEGORIES.map((c) => ({ ...c, label: t(c.label) }))}
          />
        </div>

        <div className="op-dispute-description">
          <span className="op-dispute-label">{t('trust.issueSummary')}</span>
          <p>{selected.description}</p>
        </div>

        <div className="op-dispute-field">
          <span className="op-dispute-label">{t('trust.evidence')}</span>
          {(selected.evidence || []).length > 0 ? <div className="op-dispute-evidence-list">
            {selected.evidence.map((item) => <EvidenceItem key={item.id} disputeId={selected.id} evidence={item} />)}
          </div> : <p className="op-dispute-hint">{t('trust.noEvidenceYet')}</p>}
          {!closed && <Button color="light" fullSized disabled={uploading} onClick={() => evidenceInputRef.current?.click()} className="op-dispute-add-evidence">
            {uploading ? <Spinner size="sm" /> : <><Plus size={16} strokeWidth={1.8} aria-hidden="true" />{t('trust.addEvidence')}</>}
          </Button>}
          <input ref={evidenceInputRef} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={uploadEvidence} />
        </div>

        <p className="op-dispute-privacy"><Paperclip size={14} strokeWidth={1.8} aria-hidden="true" />{t('trust.disputePrivacy')}</p>
      </div>

      <div className="op-dispute-right">
        <div className="op-dispute-thread-head">
          <div><h3>{t('trust.resolutionThread')}</h3><p>{t('trust.messagesAndEvents')}</p></div>
          {closed && <Badge color={selected.status === 'RESOLVED' ? 'success' : 'gray'}>{selected.resolution || t(status.label)}</Badge>}
        </div>
        <div className="op-dispute-thread">
          {thread.map((item) => item.type === 'message'
            ? <ThreadMessage key={`message-${item.id}`} message={item} currentUserId={user?.id} />
            : <ThreadEvent key={`event-${item.action}-${item.createdAt}`} event={item} />)}
        </div>

        {actionError && <Alert color="failure">{actionError}</Alert>}
        {notice && <Alert color="success">{notice}</Alert>}

        {closed ? <div className="op-dispute-closed"><CheckCircle2 size={18} strokeWidth={1.8} aria-hidden="true" /><span>{t('trust.disputeClosed')}</span></div> : <form className="op-dispute-composer" onSubmit={sendMessage}>
          <Textarea aria-label={t('trust.addMessageLabel')} placeholder={t('trust.addMessagePlaceholder')} value={message} onChange={(event) => setMessage(event.target.value)} rows={1} maxLength={2000} required />
          <Button type="submit" disabled={sending || !message.trim()} className="op-trust-button-primary">{sending ? <Spinner size="sm" /> : <><Send size={15} strokeWidth={1.8} aria-hidden="true" />{t('trust.send')}</>}</Button>
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
