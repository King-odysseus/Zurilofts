import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
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
    const resolvedDisputes = disputes.filter((item) => item.status === 'RESOLVED' || item.status === 'DISMISSED');
    const documents = pendingVerifications.reduce((total, item) => total + (item.documents?.length || 0), 0);
    const resolutionRate = disputes.length ? Math.round((resolvedDisputes.length / disputes.length) * 100) : 0;
    return {
      pendingVerifications,
      documents,
      openDisputes,
      resolvedDisputes,
      resolutionRate,
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
    <div className="op-admin-overview op-admin-trust" data-openpencil-frame="0:7228">
      <div className="op-admin-trust-hero">
        <div>
          <p className="op-admin-eyebrow">ZURILOFTS · ADMIN · TRUST</p>
          <h1>Verification and disputes</h1>
          <p>Identity checks, document review and guest or host dispute resolution.</p>
        </div>
        <Button color="light" disabled={refreshing} onClick={() => load(true)} className="op-admin-trust-refresh">
          <RefreshCw className={refreshing ? 'is-spinning' : ''} strokeWidth={1.8} aria-hidden="true" />
          {refreshing ? 'Refreshing' : 'Refresh queue'}
        </Button>
      </div>

      {error && <div className="op-admin-error" role="alert">{error}</div>}

      <div className="op-admin-metrics op-admin-trust-metrics">
        <article><span>VERIFICATIONS</span><strong>{summary.pendingVerifications.length}</strong><small>Awaiting a decision</small></article>
        <article><span>DOCUMENTS</span><strong>{summary.documents}</strong><small>Files in the review queue</small></article>
        <article><span>OPEN DISPUTES</span><strong>{summary.openDisputes.length}</strong><small>Open or under review</small></article>
        <article><span>RESOLVED</span><strong>{summary.resolvedDisputes.length}</strong><small>{summary.resolutionRate}% of loaded cases</small></article>
      </div>

      <div className="op-admin-trust-grid">
        <section className="op-admin-trust-panel" aria-labelledby="verification-queue-title">
          <div className="op-admin-trust-panel-head">
            <div>
              <h2 id="verification-queue-title">Verification queue</h2>
              <p>Submitted identity checks with document evidence attached.</p>
            </div>
            <Badge color="info">{summary.pendingVerifications.length} open</Badge>
          </div>

          {loading ? (
            <div className="op-admin-trust-empty">
              <span className="op-admin-booking-spinner" aria-hidden="true" />
              <strong>Loading verification queue</strong>
              <p>Fetching submitted checks and encrypted document metadata.</p>
            </div>
          ) : summary.pendingVerifications.length === 0 ? (
            <div className="op-admin-trust-empty">
              <UserRoundCheck strokeWidth={1.6} aria-hidden="true" />
              <strong>No identity checks are waiting</strong>
              <p>New submissions will appear here as soon as they are sent for review.</p>
            </div>
          ) : (
            <div className="op-admin-trust-list">
              {summary.pendingVerifications.map((verification) => (
                <article className="op-admin-trust-row" key={verification.id}>
                  <span className="op-admin-trust-avatar" aria-hidden="true">{initials(verification.user)}</span>
                  <div className="op-admin-trust-row-copy">
                    <strong>{displayName(verification.user, verification.fullName)} <small>· {verification.user?.role === 'HOST' ? 'Host' : 'Guest'}</small></strong>
                    <span>{verification.idType?.replaceAll('_', ' ') || 'Identity document'} · {verification.documents?.length || 0} files · {formatDate(verification.submittedAt || verification.updatedAt)}</span>
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

        <aside className="op-admin-trust-panel op-admin-dispute-panel" aria-labelledby="dispute-queue-title">
          <div className="op-admin-trust-panel-head">
            <div>
              <h2 id="dispute-queue-title">Dispute queue</h2>
              <p>Booking-linked cases needing mediation.</p>
            </div>
          </div>
          <div className="op-admin-dispute-summary">
            {Object.entries(summary.disputeCounts).map(([status, count]) => (
              <div key={status}>
                <span>{DISPUTE_META[status]?.label || status}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          <div className="op-admin-dispute-open-list">
            {summary.openDisputes.slice(0, 4).map((dispute) => (
              <button type="button" key={dispute.id} onClick={() => { setSelectedDispute(dispute); setDisputeNote(''); setResolutionNote(dispute.resolution || ''); setError(''); }}>
                <span><strong>{disputeTitle(dispute)}</strong><small>{displayName(dispute.booking?.user, 'Guest')} · {dispute.category?.replaceAll('_', ' ')}</small></span>
                <Badge color={DISPUTE_META[dispute.status]?.tone || 'gray'}>{DISPUTE_META[dispute.status]?.label || dispute.status}</Badge>
              </button>
            ))}
            {!loading && summary.openDisputes.length === 0 && <p>No open disputes need mediation.</p>}
          </div>
          {summary.openDisputes.length > 4 && <p className="op-admin-dispute-more">{summary.openDisputes.length - 4} more open cases are available in the current queue.</p>}
        </aside>
      </div>

      <Modal show={Boolean(selectedVerification)} onClose={closeVerification} size="4xl" dismissible className="op-admin-trust-modal">
        {selectedVerification && (
          <>
            <ModalHeader>Identity verification · {displayName(selectedVerification.user, selectedVerification.fullName)}</ModalHeader>
            <ModalBody>
              <div className="op-admin-trust-detail">
                <section>
                  <span className="op-admin-trust-detail-icon" aria-hidden="true"><ShieldCheck strokeWidth={1.8} /></span>
                  <div>
                    <small>Applicant</small>
                    <strong>{displayName(selectedVerification.user, selectedVerification.fullName)}</strong>
                    <span>{selectedVerification.user?.email || 'Email not available'}</span>
                  </div>
                  <Badge color={VERIFICATION_META[selectedVerification.status]?.tone || 'gray'}>
                    {VERIFICATION_META[selectedVerification.status]?.label || selectedVerification.status}
                  </Badge>
                </section>

                <div className="op-admin-trust-detail-grid">
                  <p><span>Legal name</span><strong>{selectedVerification.fullName || 'Not supplied'}</strong></p>
                  <p><span>Date of birth</span><strong>{selectedVerification.dateOfBirth || 'Not supplied'}</strong></p>
                  <p><span>ID type</span><strong>{selectedVerification.idType?.replaceAll('_', ' ') || 'Not supplied'}</strong></p>
                  <p><span>ID number</span><strong>{selectedVerification.idNumber || 'Not supplied'}</strong></p>
                  <p><span>Submitted</span><strong>{formatDate(selectedVerification.submittedAt, true)}</strong></p>
                  <p><span>Account role</span><strong>{selectedVerification.user?.role || 'USER'}</strong></p>
                </div>

                <section className="op-admin-trust-documents">
                  <div className="op-admin-trust-section-head">
                    <div><h3>Encrypted documents</h3><p>Each file is decrypted only for this authorised review.</p></div>
                    <span>{selectedVerification.documents?.length || 0} files</span>
                  </div>
                  {selectedVerification.documents?.length ? (
                    <div className="op-admin-trust-document-list">
                      {selectedVerification.documents.map((document) => (
                        <Button key={document.id} color="light" disabled={busy === document.id} onClick={() => downloadDocument(document)}>
                          <FileText strokeWidth={1.8} aria-hidden="true" />
                          <span>
                            <strong>{DOCUMENT_LABELS[document.kind] || document.kind}</strong>
                            <small>{document.originalName}</small>
                          </span>
                        </Button>
                      ))}
                    </div>
                  ) : <p className="op-admin-trust-muted">No documents are attached to this verification.</p>}
                </section>

                {selectedVerification.status === 'SUBMITTED' && (
                  <div className="op-admin-trust-decision">
                    <Label htmlFor="verification-review-note">Reason for rejection</Label>
                    <Textarea
                      id="verification-review-note"
                      rows={3}
                      maxLength={1000}
                      value={verificationNote}
                      onChange={(event) => setVerificationNote(event.target.value)}
                      placeholder="Required if the applicant must correct or resubmit their details."
                    />
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter className="op-admin-trust-modal-footer">
              <Button color="light" onClick={closeVerification} disabled={Boolean(busy)}>Close</Button>
              {selectedVerification.status === 'SUBMITTED' && (
                <>
                  <Button color="failure" onClick={() => reviewVerification('reject')} disabled={Boolean(busy)}>
                    {busy === 'reject' ? 'Sending back...' : 'Request changes'}
                  </Button>
                  <Button className="op-admin-bronze-button" onClick={() => reviewVerification('approve')} disabled={Boolean(busy)}>
                    {busy === 'approve' ? 'Approving...' : <><BadgeCheck strokeWidth={1.8} aria-hidden="true" />Approve identity</>}
                  </Button>
                </>
              )}
            </ModalFooter>
          </>
        )}
      </Modal>

      <Modal show={Boolean(selectedDispute)} onClose={closeDispute} size="5xl" dismissible className="op-admin-trust-modal">
        {selectedDispute && (
          <>
            <ModalHeader>{disputeTitle(selectedDispute)} · dispute case</ModalHeader>
            <ModalBody>
              <div className="op-admin-dispute-detail">
                <div className="op-admin-dispute-detail-head">
                  <span className="op-admin-trust-detail-icon is-alert" aria-hidden="true"><AlertTriangle strokeWidth={1.8} /></span>
                  <div>
                    <small>{selectedDispute.category?.replaceAll('_', ' ') || 'Booking issue'}</small>
                    <strong>{disputeTitle(selectedDispute)}</strong>
                    <span>Raised by {displayName(selectedDispute.booking?.user, 'Guest')} · {formatDate(selectedDispute.createdAt, true)}</span>
                  </div>
                  <Badge color={DISPUTE_META[selectedDispute.status]?.tone || 'gray'}>
                    {DISPUTE_META[selectedDispute.status]?.label || selectedDispute.status}
                  </Badge>
                </div>

                <div className="op-admin-dispute-detail-grid">
                  <section className="op-admin-dispute-case">
                    <h3>Issue summary</h3>
                    <p>{selectedDispute.description || 'No description was supplied.'}</p>
                    <div className="op-admin-dispute-evidence-list">
                      <div className="op-admin-trust-section-head"><div><h3>Evidence</h3><p>Secure participant uploads.</p></div></div>
                      {selectedDispute.evidence?.length ? selectedDispute.evidence.map((evidence) => (
                        <Button key={evidence.id} color="light" disabled={busy === evidence.id} onClick={() => downloadEvidence(evidence)}>
                          <FileText strokeWidth={1.8} aria-hidden="true" />
                          <span><strong>{evidence.originalName}</strong><small>Uploaded {formatDate(evidence.createdAt, true)}</small></span>
                        </Button>
                      )) : <p className="op-admin-trust-muted">No evidence has been added.</p>}
                    </div>
                  </section>

                  <section className="op-admin-dispute-thread">
                    <div className="op-admin-trust-section-head"><div><h3>Resolution thread</h3><p>Messages visible to the guest, host and admin team.</p></div></div>
                    <div className="op-admin-dispute-timeline">
                      {(selectedDispute.timeline || []).map((entry, index) => (
                        <div key={`${entry.createdAt}-${entry.action}-${index}`}>
                          <span aria-hidden="true" />
                          <p><strong>{entry.action?.replaceAll('_', ' ') || 'Status updated'}</strong><small>{formatDate(entry.createdAt, true)}</small></p>
                          {entry.note && <blockquote>{entry.note}</blockquote>}
                        </div>
                      ))}
                      <div>
                        <span aria-hidden="true" />
                        <p><strong>Dispute opened</strong><small>{formatDate(selectedDispute.createdAt, true)}</small></p>
                      </div>
                    </div>
                    {selectedDispute.messages?.length > 0 && (
                      <div className="op-admin-dispute-messages">
                        {selectedDispute.messages.map((message) => (
                          <article key={message.id} className={message.senderRole === 'ADMIN' ? 'is-admin' : ''}>
                            <span>{message.senderRole}</span>
                            <p>{message.body}</p>
                            <small>{formatDate(message.createdAt, true)}</small>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <div className="op-admin-dispute-actions">
                  <div>
                    <Label htmlFor="dispute-resolution">Resolution summary</Label>
                    <TextInput
                      id="dispute-resolution"
                      value={resolutionNote}
                      onChange={(event) => setResolutionNote(event.target.value)}
                      placeholder="Required when resolving the case"
                      disabled={selectedDispute.status === 'RESOLVED' || selectedDispute.status === 'DISMISSED'}
                    />
                  </div>
                  <div className="op-admin-dispute-action-buttons">
                    <Button color="light" disabled={busy || selectedDispute.status !== 'OPEN'} onClick={() => updateDisputeStatus('UNDER_REVIEW')}>
                      {busy === 'UNDER_REVIEW' ? 'Updating...' : 'Move to review'}
                    </Button>
                    <Button color="light" disabled={busy || selectedDispute.status === 'RESOLVED' || selectedDispute.status === 'DISMISSED'} onClick={() => updateDisputeStatus('DISMISSED')}>Dismiss</Button>
                    <Button className="op-admin-bronze-button" disabled={busy || selectedDispute.status === 'RESOLVED' || selectedDispute.status === 'DISMISSED'} onClick={() => updateDisputeStatus('RESOLVED')}>
                      {busy === 'RESOLVED' ? 'Resolving...' : <><CheckCircle2 strokeWidth={1.8} aria-hidden="true" />Resolve case</>}
                    </Button>
                  </div>
                </div>

                <section className="op-admin-dispute-notes">
                  <div className="op-admin-trust-section-head"><div><h3>Private admin notes</h3><p>Never shown to the guest or host.</p></div></div>
                  {selectedDispute.notes?.length > 0 && (
                    <div className="op-admin-dispute-note-list">
                      {selectedDispute.notes.map((note) => (
                        <p key={note.id}><strong>{note.body}</strong><small>{formatDate(note.createdAt, true)}</small></p>
                      ))}
                    </div>
                  )}
                  <div className="op-admin-dispute-note-compose">
                    <Textarea
                      rows={2}
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
            <ModalFooter className="op-admin-trust-modal-footer">
              <Button color="light" onClick={closeDispute} disabled={Boolean(busy)}>Close</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}

export default AdminTrustSafety;
