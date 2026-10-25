import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Textarea,
  TextInput,
} from 'flowbite-react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  FileText,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';
import apiClient from '../api/client.js';

const VERIFICATION_META = {
  UNVERIFIED: { label: 'Not started', tone: 'gray' },
  SUBMITTED: { label: 'In review', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Changes needed', tone: 'failure' },
};

const DISPUTE_META = {
  OPEN: { label: 'Open', tone: 'warning' },
  UNDER_REVIEW: { label: 'In review', tone: 'info' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
  DISMISSED: { label: 'Dismissed', tone: 'gray' },
};

const DOCUMENT_LABELS = {
  ID_FRONT: 'Identity front',
  ID_BACK: 'Identity back',
  SELFIE: 'Selfie',
};

function displayName(user, fallback = 'Unnamed applicant') {
  const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  return name || user?.email || fallback;
}

function initials(user) {
  const value = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.trim();
  return value.toUpperCase() || 'ZL';
}

function formatDate(value, withTime = false) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-GB', withTime
    ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

function disputeTitle(dispute) {
  return dispute.booking?.property?.title || `Booking ${String(dispute.bookingId || '').slice(-8) || 'dispute'}`;
}

function AdminTrustSafety() {
  const [verifications, setVerifications] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [verificationNote, setVerificationNote] = useState('');
  const [disputeNote, setDisputeNote] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [verificationResponse, disputeResponse] = await Promise.all([
        apiClient.get('/admin/identity-verifications', { params: { limit: 100 } }),
        apiClient.get('/admin/disputes', { params: { limit: 100 } }),
      ]);
      setVerifications(verificationResponse.data.data || []);
      setDisputes(disputeResponse.data.data || []);
    } catch (cause) {
      setError(cause.response?.data?.error || 'The trust and safety queues could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => {
    const pendingVerifications = verifications.filter((item) => item.status === 'SUBMITTED');
    const openDisputes = disputes.filter((item) => item.status === 'OPEN' || item.status === 'UNDER_REVIEW');
    return {
      pendingVerifications,
      openDisputes,
      disputeCounts: {
        OPEN: disputes.filter((item) => item.status === 'OPEN').length,
        UNDER_REVIEW: disputes.filter((item) => item.status === 'UNDER_REVIEW').length,
        RESOLVED: disputes.filter((item) => item.status === 'RESOLVED').length,
        DISMISSED: disputes.filter((item) => item.status === 'DISMISSED').length,
      },
    };
  }, [disputes, verifications]);

  function closeVerification() {
    if (busy) return;
    setSelectedVerification(null);
    setVerificationNote('');
  }

  function closeDispute() {
    if (busy) return;
    setSelectedDispute(null);
    setDisputeNote('');
    setResolutionNote('');
  }

  async function reviewVerification(action) {
    if (!selectedVerification) return;
    if (action === 'reject' && !verificationNote.trim()) {
      setError('Add a clear reason before sending this verification back.');
      return;
    }
    setBusy(action);
    setError('');
    try {
      const response = await apiClient.post(
        `/admin/identity-verifications/${selectedVerification.id}/${action}`,
        action === 'reject' ? { reason: verificationNote.trim() } : {},
      );
      const updated = response.data.data;
      setVerifications((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedVerification(null);
      setVerificationNote('');
    } catch (cause) {
      setError(cause.response?.data?.error || 'The verification decision could not be saved.');
    } finally {
      setBusy('');
    }
  }

  async function downloadDocument(document) {
    if (!selectedVerification || !document) return;
    setBusy(document.id);
    setError('');
    try {
      const response = await apiClient.get(
        `/admin/identity-verifications/${selectedVerification.id}/documents/${document.id}`,
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.originalName || 'identity-document';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause.response?.data?.error || 'The document could not be opened.');
    } finally {
      setBusy('');
    }
  }

  async function downloadEvidence(evidence) {
    if (!selectedDispute || !evidence) return;
    setBusy(evidence.id);
    setError('');
    try {
      const response = await apiClient.get(
        `/admin/disputes/${selectedDispute.id}/evidence/${evidence.id}`,
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = evidence.originalName || 'dispute-evidence';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause.response?.data?.error || 'The evidence file could not be opened.');
    } finally {
      setBusy('');
    }
  }

  async function updateDisputeStatus(status) {
    if (!selectedDispute) return;
    if (status === 'RESOLVED' && !resolutionNote.trim()) {
      setError('Add a resolution summary before resolving this dispute.');
      return;
    }
    setBusy(status);
    setError('');
    try {
      const response = await apiClient.patch(`/admin/disputes/${selectedDispute.id}/status`, {
        status,
        ...(status === 'RESOLVED' ? { resolution: resolutionNote.trim() } : {}),
      });
      const updated = response.data.data;
      setSelectedDispute(updated);
      setDisputes((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (status === 'RESOLVED' || status === 'DISMISSED') setResolutionNote(updated.resolution || '');
    } catch (cause) {
      setError(cause.response?.data?.error || 'The dispute status could not be updated.');
    } finally {
      setBusy('');
    }
  }

  async function addPrivateNote() {
    if (!selectedDispute || !disputeNote.trim()) return;
    setBusy('note');
    setError('');
    try {
      const response = await apiClient.post(`/admin/disputes/${selectedDispute.id}/notes`, { body: disputeNote.trim() });
      setSelectedDispute((current) => ({
        ...current,
        notes: [...(current.notes || []), response.data.data],
      }));
      setDisputeNote('');
    } catch (cause) {
      setError(cause.response?.data?.error || 'The private note could not be saved.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-6" data-openpencil-frame="0:7228">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">ZURILOFTS · ADMIN · TRUST</p>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Verification and disputes</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">Identity checks, document review and guest or host dispute resolution.</p>
        </div>
        <Button color="light" disabled={refreshing} onClick={() => load(true)}>
          <RefreshCw className={refreshing ? 'animate-spin' : ''} strokeWidth={1.8} aria-hidden="true" />
          {refreshing ? 'Refreshing' : 'Refresh queue'}
        </Button>
      </div>

      {error && <Alert color="failure" role="alert">{error}</Alert>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm" aria-labelledby="verification-queue-title">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="verification-queue-title" className="text-base font-semibold text-navy">Verification queue</h2>
              <p className="text-xs text-muted">Submitted identity checks with document evidence attached.</p>
            </div>
            <Badge color="info">{summary.pendingVerifications.length} open</Badge>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <Spinner size="lg" aria-hidden="true" />
              <strong className="text-sm font-semibold text-navy">Loading verification queue</strong>
              <p className="text-xs text-muted">Fetching submitted checks and encrypted document metadata.</p>
            </div>
          ) : summary.pendingVerifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <UserRoundCheck className="text-primary-600" strokeWidth={1.6} aria-hidden="true" />
              <strong className="text-sm font-semibold text-navy">No identity checks are waiting</strong>
              <p className="text-xs text-muted">New submissions will appear here as soon as they are sent for review.</p>
            </div>
          ) : (
            <div>
              {summary.pendingVerifications.map((verification) => (
                <article className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between" key={verification.id}>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-navy" aria-hidden="true">{initials(verification.user)}</span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-semibold text-navy">{displayName(verification.user, verification.fullName)} <small className="text-xs font-normal text-muted">· {verification.user?.role === 'HOST' ? 'Host' : 'Guest'}</small></strong>
                    <span className="block truncate text-xs text-muted">{verification.idType?.replaceAll('_', ' ') || 'Identity document'} · {verification.documents?.length || 0} files · {formatDate(verification.submittedAt || verification.updatedAt)}</span>
                  </div>
                  <Badge color={VERIFICATION_META[verification.status]?.tone || 'gray'}>
                    {VERIFICATION_META[verification.status]?.label || verification.status}
                  </Badge>
                  <Button size="xs" onClick={() => { setSelectedVerification(verification); setVerificationNote(''); setError(''); }}>Review</Button>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="overflow-hidden rounded-xl border border-border bg-white shadow-sm" aria-labelledby="dispute-queue-title">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="dispute-queue-title" className="text-base font-semibold text-navy">Disputes</h2>
              <p className="text-xs text-muted">Booking-linked cases needing mediation.</p>
            </div>
            <Badge color="warning">{summary.openDisputes.length} open</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-border px-5 py-4 sm:grid-cols-4">
            {Object.entries(summary.disputeCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                <span className="text-xs text-muted">{DISPUTE_META[status]?.label || status}</span>
                <strong className="text-sm font-semibold text-navy">{count}</strong>
              </div>
            ))}
          </div>

          <div>
            {summary.openDisputes.slice(0, 4).map((dispute) => (
              <button type="button" key={dispute.id} onClick={() => { setSelectedDispute(dispute); setDisputeNote(''); setResolutionNote(dispute.resolution || ''); setError(''); }} className="flex w-full items-center justify-between gap-3 border-b border-border px-5 py-4 text-left last:border-0 hover:bg-surface">
                <span className="min-w-0">
                  <strong className="block truncate text-sm font-semibold text-navy">{disputeTitle(dispute)}</strong>
                  <small className="block truncate text-xs text-muted">{displayName(dispute.booking?.user, 'Guest')} · {dispute.category?.replaceAll('_', ' ')}</small>
                </span>
                <Badge color={DISPUTE_META[dispute.status]?.tone || 'gray'}>{DISPUTE_META[dispute.status]?.label || dispute.status}</Badge>
              </button>
            ))}
            {!loading && summary.openDisputes.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">No open disputes need mediation.</p>}
            {summary.openDisputes.length > 4 && <p className="border-t border-border px-5 py-3 text-xs text-muted">{summary.openDisputes.length - 4} more open cases are available in the current queue.</p>}
          </div>
        </aside>
      </div>

      <Modal show={Boolean(selectedVerification)} onClose={closeVerification} size="4xl" dismissible>
        {selectedVerification && (
          <>
            <ModalHeader>Identity verification · {displayName(selectedVerification.user, selectedVerification.fullName)}</ModalHeader>
            <ModalBody>
              <div className="space-y-5">
                <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600" aria-hidden="true"><ShieldCheck strokeWidth={1.8} /></span>
                  <div className="min-w-0 flex-1">
                    <small className="block text-[11px] font-semibold uppercase tracking-wide text-primary-600">Applicant</small>
                    <strong className="block truncate text-sm font-semibold text-navy">{displayName(selectedVerification.user, selectedVerification.fullName)}</strong>
                    <span className="block truncate text-xs text-muted">{selectedVerification.user?.email || 'Email not available'}</span>
                  </div>
                  <Badge color={VERIFICATION_META[selectedVerification.status]?.tone || 'gray'}>
                    {VERIFICATION_META[selectedVerification.status]?.label || selectedVerification.status}
                  </Badge>
                </section>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <p className="rounded-xl border border-border bg-white p-3">
                    <span className="block text-xs text-muted">Legal name</span>
                    <strong className="mt-0.5 block truncate text-sm font-medium text-navy">{selectedVerification.fullName || 'Not supplied'}</strong>
                  </p>
                  <p className="rounded-xl border border-border bg-white p-3">
                    <span className="block text-xs text-muted">Date of birth</span>
                    <strong className="mt-0.5 block truncate text-sm font-medium text-navy">{selectedVerification.dateOfBirth || 'Not supplied'}</strong>
                  </p>
                  <p className="rounded-xl border border-border bg-white p-3">
                    <span className="block text-xs text-muted">ID type</span>
                    <strong className="mt-0.5 block truncate text-sm font-medium text-navy">{selectedVerification.idType?.replaceAll('_', ' ') || 'Not supplied'}</strong>
                  </p>
                  <p className="rounded-xl border border-border bg-white p-3">
                    <span className="block text-xs text-muted">ID number</span>
                    <strong className="mt-0.5 block truncate text-sm font-medium text-navy">{selectedVerification.idNumber || 'Not supplied'}</strong>
                  </p>
                  <p className="rounded-xl border border-border bg-white p-3">
                    <span className="block text-xs text-muted">Submitted</span>
                    <strong className="mt-0.5 block truncate text-sm font-medium text-navy">{formatDate(selectedVerification.submittedAt, true)}</strong>
                  </p>
                  <p className="rounded-xl border border-border bg-white p-3">
                    <span className="block text-xs text-muted">Account role</span>
                    <strong className="mt-0.5 block truncate text-sm font-medium text-navy">{selectedVerification.user?.role || 'USER'}</strong>
                  </p>
                </div>

                <section className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-navy">Encrypted documents</h3>
                      <p className="mt-1 text-xs text-muted">Each file is decrypted only for this authorised review.</p>
                    </div>
                    <span className="text-xs text-muted">{selectedVerification.documents?.length || 0} files</span>
                  </div>
                  {selectedVerification.documents?.length ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {selectedVerification.documents.map((document) => (
                        <Button key={document.id} color="light" disabled={busy === document.id} onClick={() => downloadDocument(document)}>
                          <FileText strokeWidth={1.8} aria-hidden="true" />
                          <span className="flex min-w-0 flex-col items-start text-left leading-tight">
                            <strong className="w-full truncate text-xs font-semibold text-navy">{DOCUMENT_LABELS[document.kind] || document.kind}</strong>
                            <small className="w-full truncate text-[11px] font-normal text-muted">{document.originalName}</small>
                          </span>
                        </Button>
                      ))}
                    </div>
                  ) : <p className="mt-3 text-xs text-muted">No documents are attached to this verification.</p>}
                </section>

                <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-navy">Decision</h3>
                    <p className="mt-1 text-xs text-muted">Approving unlocks payment on any pending bookings for this guest.</p>
                  </div>
                  {selectedVerification.status === 'SUBMITTED' && (
                    <div className="space-y-1">
                      <Label htmlFor="verification-review-note">Reason for rejection</Label>
                      <Textarea
                        id="verification-review-note"
                        rows={3}
                        maxLength={2000}
                        value={verificationNote}
                        onChange={(event) => setVerificationNote(event.target.value)}
                        placeholder="Required when the applicant must correct or resubmit their details."
                      />
                    </div>
                  )}
                  {selectedVerification.reviewNote && <p className="text-xs text-muted">Current note: {selectedVerification.reviewNote}</p>}
                </section>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="light" onClick={closeVerification} disabled={Boolean(busy)}>Close</Button>
              {selectedVerification.status === 'SUBMITTED' && (
                <>
                  <Button color="failure" onClick={() => reviewVerification('reject')} disabled={Boolean(busy)}>
                    {busy === 'reject' ? 'Sending back...' : 'Request changes'}
                  </Button>
                  <Button onClick={() => reviewVerification('approve')} disabled={Boolean(busy)}>
                    {busy === 'approve' ? 'Approving...' : <><BadgeCheck strokeWidth={1.8} aria-hidden="true" />Approve identity</>}
                  </Button>
                </>
              )}
            </ModalFooter>
          </>
        )}
      </Modal>

      <Modal show={Boolean(selectedDispute)} onClose={closeDispute} size="5xl" dismissible>
        {selectedDispute && (
          <>
            <ModalHeader>{disputeTitle(selectedDispute)} · dispute case</ModalHeader>
            <ModalBody>
              <div className="space-y-5">
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600" aria-hidden="true"><AlertTriangle strokeWidth={1.8} /></span>
                  <div className="min-w-0 flex-1">
                    <small className="block text-[11px] font-semibold uppercase tracking-wide text-primary-600">{selectedDispute.category?.replaceAll('_', ' ') || 'Booking issue'}</small>
                    <strong className="block truncate text-sm font-semibold text-navy">{disputeTitle(selectedDispute)}</strong>
                    <span className="block truncate text-xs text-muted">Raised by {selectedDispute.raisedByRole === 'HOST' ? 'host' : 'guest'} · {formatDate(selectedDispute.createdAt, true)}</span>
                  </div>
                  <Badge color={DISPUTE_META[selectedDispute.status]?.tone || 'gray'}>
                    {DISPUTE_META[selectedDispute.status]?.label || selectedDispute.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <section className="rounded-xl border border-border bg-surface p-4">
                    <h3 className="text-sm font-semibold text-navy">Issue summary</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-charcoal">{selectedDispute.description || 'No description was supplied.'}</p>

                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-navy">Evidence</h3>
                      <p className="mt-1 text-xs text-muted">Secure participant uploads.</p>
                      {selectedDispute.evidence?.length ? (
                        <div className="mt-2 space-y-2">
                          {selectedDispute.evidence.map((evidence) => (
                            <Button key={evidence.id} color="light" disabled={busy === evidence.id} onClick={() => downloadEvidence(evidence)}>
                              <FileText strokeWidth={1.8} aria-hidden="true" />
                              <span className="flex min-w-0 flex-col items-start text-left leading-tight">
                                <strong className="w-full truncate text-xs font-semibold text-navy">{evidence.originalName}</strong>
                                <small className="w-full truncate text-[11px] font-normal text-muted">Uploaded {formatDate(evidence.createdAt, true)}</small>
                              </span>
                            </Button>
                          ))}
                        </div>
                      ) : <p className="mt-2 text-xs text-muted">No evidence has been added.</p>}
                    </div>

                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-navy">Timeline</h3>
                      <div className="mt-2 space-y-3">
                        {(selectedDispute.timeline || []).map((entry, index) => (
                          <div key={`${entry.createdAt}-${entry.action}-${index}`} className="flex items-start gap-3">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-hidden="true" />
                            <div className="min-w-0">
                              <p className="flex items-baseline justify-between gap-3 text-sm text-navy">
                                <strong className="font-semibold">{entry.action?.replaceAll('_', ' ') || 'Status updated'}</strong>
                                <small className="text-xs text-muted">{formatDate(entry.createdAt, true)}</small>
                              </p>
                              {entry.note && <blockquote className="mt-1 rounded-xl border border-border bg-white px-3 py-2 text-xs text-muted">{entry.note}</blockquote>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-border bg-surface p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-navy">Conversation</h3>
                      <p className="mt-1 text-xs text-muted">Messages visible to the guest, host and admin team.</p>
                    </div>
                    <div className="mt-3 space-y-2">
                      {selectedDispute.messages?.length ? selectedDispute.messages.map((message) => (
                        <article key={message.id} className={`rounded-xl border border-border p-3 ${message.senderRole === 'ADMIN' ? 'bg-primary-50' : 'bg-white'}`}>
                          <span className="block text-[11px] font-semibold uppercase tracking-wide text-primary-600">{message.senderRole}</span>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-charcoal">{message.body}</p>
                          <small className="mt-1 block text-xs text-muted">{formatDate(message.createdAt, true)}</small>
                        </article>
                      )) : <p className="text-xs text-muted">No messages have been exchanged on this dispute yet.</p>}
                    </div>
                  </section>
                </div>

                <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="w-full space-y-1 lg:max-w-md">
                    <Label htmlFor="dispute-resolution">Resolution summary</Label>
                    <TextInput
                      id="dispute-resolution"
                      value={resolutionNote}
                      onChange={(event) => setResolutionNote(event.target.value)}
                      placeholder="Required when resolving the case"
                      disabled={selectedDispute.status === 'RESOLVED' || selectedDispute.status === 'DISMISSED'}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button color="light" disabled={Boolean(busy) || selectedDispute.status !== 'OPEN'} onClick={() => updateDisputeStatus('UNDER_REVIEW')}>
                      {busy === 'UNDER_REVIEW' ? 'Updating...' : 'Move to review'}
                    </Button>
                    <Button color="light" disabled={Boolean(busy) || selectedDispute.status === 'RESOLVED' || selectedDispute.status === 'DISMISSED'} onClick={() => updateDisputeStatus('DISMISSED')}>
                      {busy === 'DISMISSED' ? 'Dismissing...' : 'Dismiss'}
                    </Button>
                    <Button disabled={Boolean(busy) || selectedDispute.status === 'RESOLVED' || selectedDispute.status === 'DISMISSED'} onClick={() => updateDisputeStatus('RESOLVED')}>
                      {busy === 'RESOLVED' ? 'Resolving...' : <><CheckCircle2 strokeWidth={1.8} aria-hidden="true" />Resolve case</>}
                    </Button>
                  </div>
                </div>

                <section className="rounded-xl border border-border bg-surface p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-navy">Private admin notes</h3>
                    <p className="mt-1 text-xs text-muted">Never shown to the guest or host.</p>
                  </div>
                  {selectedDispute.notes?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {selectedDispute.notes.map((note) => (
                        <p key={note.id} className="rounded-xl border border-border bg-white p-3">
                          <strong className="block text-sm font-medium text-navy">{note.body}</strong>
                          <small className="mt-1 block text-xs text-muted">{formatDate(note.createdAt, true)}</small>
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
                    <Textarea
                      rows={2}
                      maxLength={2000}
                      value={disputeNote}
                      onChange={(event) => setDisputeNote(event.target.value)}
                      placeholder="Add context for the resolution team"
                      aria-label="Private admin note"
                    />
                    <Button onClick={addPrivateNote} disabled={busy === 'note' || !disputeNote.trim()}>
                      <MessageSquareText strokeWidth={1.8} aria-hidden="true" />
                      {busy === 'note' ? 'Saving...' : 'Add note'}
                    </Button>
                  </div>
                </section>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="light" onClick={closeDispute} disabled={Boolean(busy)}>Close</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}

export default AdminTrustSafety;
