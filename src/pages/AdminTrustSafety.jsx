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
import { useLanguage } from '../context/LanguageContext.jsx';

const VERIFICATION_META = {
  UNVERIFIED: { label: 'admin.verificationNotStarted', tone: 'gray' },
  SUBMITTED: { label: 'admin.verificationInReview', tone: 'warning' },
  APPROVED: { label: 'admin.verificationApproved', tone: 'success' },
  REJECTED: { label: 'admin.verificationChanges', tone: 'failure' },
};

/**
 * Which slice of the verification queue is on screen. The queue used to show only
 * cases waiting on a first decision, which left an already-verified account
 * unreachable: an admin who needs to withdraw a badge or ask a verified person
 * for more information cannot act on a record they cannot open.
 */
const VERIFICATION_FILTERS = [
  { status: 'SUBMITTED', label: 'In review' },
  { status: 'APPROVED', label: 'Verified' },
  { status: 'REJECTED', label: 'Changes requested' },
];

const DISPUTE_META = {
  OPEN: { label: 'admin.disputeOpen', tone: 'warning' },
  UNDER_REVIEW: { label: 'admin.disputeUnderReview', tone: 'info' },
  RESOLVED: { label: 'admin.disputeResolved', tone: 'success' },
  DISMISSED: { label: 'admin.disputeDismissed', tone: 'gray' },
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
  const { t } = useLanguage();
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
  const [verificationFilter, setVerificationFilter] = useState('SUBMITTED');
  const [truncated, setTruncated] = useState({ verifications: false, disputes: false });

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
      // Both queues are fetched one page deep. If the platform holds more than
      // that, older cases are absent from this screen, and the page says so
      // rather than looking like an empty queue.
      setTruncated({
        verifications: (verificationResponse.data?.pagination?.total ?? 0) > 100,
        disputes: (disputeResponse.data?.pagination?.total ?? 0) > 100,
      });
    } catch (cause) {
      setError(cause.response?.data?.error || 'The trust and safety queues could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => {
    const openDisputes = disputes.filter((item) => item.status === 'OPEN' || item.status === 'UNDER_REVIEW');
    return {
      visibleVerifications: verifications.filter((item) => item.status === verificationFilter),
      countFor: (status) => verifications.filter((item) => item.status === status).length,
      openDisputes,
      disputeCounts: {
        OPEN: disputes.filter((item) => item.status === 'OPEN').length,
        UNDER_REVIEW: disputes.filter((item) => item.status === 'UNDER_REVIEW').length,
        RESOLVED: disputes.filter((item) => item.status === 'RESOLVED').length,
        DISMISSED: disputes.filter((item) => item.status === 'DISMISSED').length,
      },
    };
  }, [disputes, verifications, verificationFilter]);

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
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{t('admin.trustTitle')}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{t('admin.trustDescription')}</p>
        </div>
        <Button color="light" disabled={refreshing} onClick={() => load(true)}>
          <RefreshCw className={refreshing ? 'animate-spin' : ''} strokeWidth={1.8} aria-hidden="true" />
          {refreshing ? 'Refreshing' : 'Refresh queue'}
        </Button>
      </div>

      {error && <Alert color="failure" role="alert" className="text-center">{error}</Alert>}

      {(truncated.verifications || truncated.disputes) && (
        <p className="rounded-lg border border-[#FEDF89] bg-[#FFFAEB] px-4 py-3 text-center text-xs leading-relaxed text-[#B54708] dark:border-[#B54708]/40 dark:bg-[#B54708]/15 dark:text-[#FEDF89]" role="note">
          {truncated.verifications && truncated.disputes
            ? 'Both queues hold more than 100 records, so older identity checks and disputes are not listed here.'
            : truncated.verifications
              ? 'There are more than 100 identity checks, so older ones are not listed here.'
              : 'There are more than 100 disputes, so older ones are not listed here.'}
          {' '}Resolve the open cases below to bring the rest into view.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <section className="overflow-hidden rounded-xl bg-elevated shadow-md" aria-labelledby="verification-queue-title">
          <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="verification-queue-title" className="text-base font-semibold text-navy">{t('admin.verificationQueue')}</h2>
              <p className="text-xs text-muted">{t('admin.verificationQueueHint')}</p>
            </div>
            <Badge color="info">{t('admin.openCount', { count: summary.countFor(verificationFilter) })}</Badge>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3" role="tablist" aria-label="Verification status">
            {VERIFICATION_FILTERS.map(({ status, label }) => (
              <Button
                key={status}
                size="xs"
                role="tab"
                aria-selected={verificationFilter === status}
                color={verificationFilter === status ? 'primary' : 'light'}
                onClick={() => setVerificationFilter(status)}
              >
                {label} ({summary.countFor(status)})
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <Spinner size="lg" aria-hidden="true" />
              <strong className="text-sm font-semibold text-navy">{t('admin.loadingVerification')}</strong>
              <p className="text-xs text-muted">{t('admin.loadingVerificationHint')}</p>
            </div>
          ) : summary.visibleVerifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <UserRoundCheck className="text-primary-600" strokeWidth={1.6} aria-hidden="true" />
              <strong className="text-sm font-semibold text-navy">
                {verificationFilter === 'APPROVED' ? 'No verified identities yet' : t('admin.noVerificationWaiting')}
              </strong>
              <p className="text-xs text-muted">
                {verificationFilter === 'APPROVED'
                  ? 'Identities you approve will be listed here, so you can ask for more information later.'
                  : t('admin.noVerificationHint')}
              </p>
            </div>
          ) : (
            <div>
              {summary.visibleVerifications.map((verification) => (
                <article className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between" key={verification.id}>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary/15 text-xs font-bold text-navy" aria-hidden="true">{initials(verification.user)}</span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-semibold text-navy">{displayName(verification.user, verification.fullName)} <small className="text-xs font-normal text-muted">· {verification.user?.role === 'HOST' ? 'Host' : 'Guest'}</small></strong>
                    <span className="block truncate text-xs text-muted">{verification.idType?.replaceAll('_', ' ') || 'Identity document'} · {verification.documents?.length || 0} files · {formatDate(verification.submittedAt || verification.updatedAt)}</span>
                  </div>
                  <Badge color={VERIFICATION_META[verification.status]?.tone || 'gray'}>
                    {t(VERIFICATION_META[verification.status]?.label || verification.status)}
                  </Badge>
                  <Button size="xs" onClick={() => { setSelectedVerification(verification); setVerificationNote(''); setError(''); }}>{t('admin.review')}</Button>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="overflow-hidden rounded-xl bg-elevated shadow-md" aria-labelledby="dispute-queue-title">
          <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="dispute-queue-title" className="text-base font-semibold text-navy">{t('admin.disputes')}</h2>
              <p className="text-xs text-muted">{t('admin.disputesHint')}</p>
            </div>
            <Badge color="warning">{t('admin.openCount', { count: summary.openDisputes.length })}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 border-b border-border px-5 py-4 sm:grid-cols-4">
            {Object.entries(summary.disputeCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 shadow-sm">
                <span className="text-xs text-muted">{t(DISPUTE_META[status]?.label || status)}</span>
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
                <Badge color={DISPUTE_META[dispute.status]?.tone || 'gray'}>{t(DISPUTE_META[dispute.status]?.label || dispute.status)}</Badge>
              </button>
            ))}
            {!loading && summary.openDisputes.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">{t('admin.noOpenDisputes')}</p>}
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
                <section className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-sm sm:flex-row sm:items-center">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary/15 text-primary-600 dark:text-primary-300" aria-hidden="true"><ShieldCheck strokeWidth={1.8} /></span>
                  <div className="min-w-0 flex-1">
                    <small className="block text-[11px] font-semibold uppercase tracking-wide text-primary-600">{t('admin.applicant')}</small>
                    <strong className="block truncate text-sm font-semibold text-navy">{displayName(selectedVerification.user, selectedVerification.fullName)}</strong>
                    <span className="block truncate text-xs text-muted">{selectedVerification.user?.email || 'Email not available'}</span>
                  </div>
                  <Badge color={VERIFICATION_META[selectedVerification.status]?.tone || 'gray'}>
                    {t(VERIFICATION_META[selectedVerification.status]?.label || selectedVerification.status)}
                  </Badge>
                </section>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <p className="rounded-xl bg-elevated shadow-md p-3">
                    <span className="block text-xs text-muted">{t('admin.legalName')}</span>
                    <strong className="mt-0.5 block truncate text-sm font-medium text-navy">{selectedVerification.fullName || 'Not supplied'}</strong>
                  </p>
                  <p className="rounded-xl bg-elevated shadow-md p-3">
                    <span className="block text-xs text-muted">{t('admin.dateOfBirth')}</span>
                    <strong className="mt-0.5 block truncate text-sm font-medium text-navy">{selectedVerification.dateOfBirth || 'Not supplied'}</strong>
                  </p>
                  <p className="rounded-xl bg-elevated shadow-md p-3">
                    <span className="block text-xs text-muted">{t('admin.idType')}</span>
                    <strong className="mt-0.5 block truncate text-sm font-medium text-navy">{selectedVerification.idType?.replaceAll('_', ' ') || 'Not supplied'}</strong>
                  </p>
                  <p className="rounded-xl bg-elevated shadow-md p-3">
                    <span className="block text-xs text-muted">{t('admin.idNumber')}</span>
                    <strong className="mt-0.5 block truncate text-sm font-medium text-navy">{selectedVerification.idNumber || 'Not supplied'}</strong>
                  </p>
                  <p className="rounded-xl bg-elevated shadow-md p-3">
                    <span className="block text-xs text-muted">{t('admin.submitted')}</span>
                    <strong className="mt-0.5 block truncate text-sm font-medium text-navy">{formatDate(selectedVerification.submittedAt, true)}</strong>
                  </p>
                  <p className="rounded-xl bg-elevated shadow-md p-3">
                    <span className="block text-xs text-muted">{t('admin.accountRole')}</span>
                    <strong className="mt-0.5 block truncate text-sm font-medium text-navy">{selectedVerification.user?.role || 'USER'}</strong>
                  </p>
                </div>

                <section className="rounded-xl bg-surface p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-navy">{t('admin.encryptedDocuments')}</h3>
                      <p className="mt-1 text-xs text-muted">{t('admin.decryptedForReview')}</p>
                    </div>
                    <span className="text-xs text-muted">{selectedVerification.documents?.length || 0} files</span>
                  </div>
                  {selectedVerification.documents?.length ? (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  ) : <p className="mt-3 text-xs text-muted">{t('admin.noDocumentsAttached')}</p>}
                </section>

                <section className="space-y-3 rounded-xl bg-surface p-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-semibold text-navy">{t('admin.decision')}</h3>
                    <p className="mt-1 text-xs text-muted">{t('admin.approvingUnlocks')}</p>
                  </div>
                  {['SUBMITTED', 'APPROVED'].includes(selectedVerification.status) && (
                    <div className="space-y-1">
                      <Label htmlFor="verification-review-note">{t('admin.reasonForRejection')}</Label>
                      <Textarea
                        id="verification-review-note"
                        rows={3}
                        maxLength={2000}
                        value={verificationNote}
                        onChange={(event) => setVerificationNote(event.target.value)}
                        placeholder={t('admin.rejectionPlaceholder')}
                      />
                      {selectedVerification.status === 'APPROVED' && (
                        <p className="text-xs text-muted">
                          Sending this back removes the verified badge straight away and tells the account holder
                          what you need from them. Their details and documents stay on file, so they only replace
                          what is wrong.
                        </p>
                      )}
                    </div>
                  )}
                  {selectedVerification.reviewNote && <p className="text-xs text-muted">Current note: {selectedVerification.reviewNote}</p>}
                </section>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="light" onClick={closeVerification} disabled={Boolean(busy)}>{t('common.close')}</Button>
              {selectedVerification.status === 'APPROVED' && (
                <Button color="failure" onClick={() => reviewVerification('reject')} disabled={Boolean(busy)}>
                  {busy === 'reject' ? 'Sending back...' : 'Request more information'}
                </Button>
              )}
              {selectedVerification.status === 'SUBMITTED' && (
                <>
                  <Button color="failure" onClick={() => reviewVerification('reject')} disabled={Boolean(busy)}>
                    {busy === 'reject' ? 'Sending back...' : 'Request changes'}
                  </Button>
                  <Button onClick={() => reviewVerification('approve')} disabled={Boolean(busy)}>
                    {busy === 'approve' ? 'Approving...' : <><BadgeCheck strokeWidth={1.8} aria-hidden="true" />{t('admin.approveIdentity')}</>}
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
                <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-sm sm:flex-row sm:items-center">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary/15 text-primary-600 dark:text-primary-300" aria-hidden="true"><AlertTriangle strokeWidth={1.8} /></span>
                  <div className="min-w-0 flex-1">
                    <small className="block text-[11px] font-semibold uppercase tracking-wide text-primary-600">{selectedDispute.category?.replaceAll('_', ' ') || 'Booking issue'}</small>
                    <strong className="block truncate text-sm font-semibold text-navy">{disputeTitle(selectedDispute)}</strong>
                    <span className="block truncate text-xs text-muted">Raised by {selectedDispute.raisedByRole === 'HOST' ? 'host' : 'guest'} · {formatDate(selectedDispute.createdAt, true)}</span>
                  </div>
                  <Badge color={DISPUTE_META[selectedDispute.status]?.tone || 'gray'}>
                    {t(DISPUTE_META[selectedDispute.status]?.label || selectedDispute.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <section className="rounded-xl bg-surface p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-navy">{t('admin.issueSummary')}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-charcoal">{selectedDispute.description || 'No description was supplied.'}</p>

                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-navy">{t('admin.evidence')}</h3>
                      <p className="mt-1 text-xs text-muted">{t('admin.secureUploads')}</p>
                      {selectedDispute.evidence?.length ? (
                        <div className="mt-3 space-y-3">
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
                      ) : <p className="mt-2 text-xs text-muted">{t('admin.noEvidence')}</p>}
                    </div>

                    <div className="mt-5">
                      <h3 className="text-sm font-semibold text-navy">{t('admin.timeline')}</h3>
                      <div className="mt-3 space-y-3">
                        {(selectedDispute.timeline || []).map((entry, index) => (
                          <div key={`${entry.createdAt}-${entry.action}-${index}`} className="flex items-start gap-3">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-hidden="true" />
                            <div className="min-w-0">
                              <p className="flex items-baseline justify-between gap-3 text-sm text-navy">
                                <strong className="font-semibold">{entry.action?.replaceAll('_', ' ') || 'Status updated'}</strong>
                                <small className="text-xs text-muted">{formatDate(entry.createdAt, true)}</small>
                              </p>
                              {entry.note && <blockquote className="mt-1 rounded-xl bg-elevated shadow-md px-3 py-2 text-xs text-muted">{entry.note}</blockquote>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl bg-surface p-4 shadow-sm">
                    <div>
                      <h3 className="text-sm font-semibold text-navy">{t('admin.conversation')}</h3>
                      <p className="mt-1 text-xs text-muted">{t('admin.conversationHint')}</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      {selectedDispute.messages?.length ? selectedDispute.messages.map((message) => (
                        <article key={message.id} className={`rounded-xl p-3 shadow-sm ${message.senderRole === 'ADMIN' ? 'bg-primary-50 dark:bg-primary/15' : 'bg-elevated'}`}>
                          <span className="block text-[11px] font-semibold uppercase tracking-wide text-primary-600">{message.senderRole}</span>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-charcoal">{message.body}</p>
                          <small className="mt-1 block text-xs text-muted">{formatDate(message.createdAt, true)}</small>
                        </article>
                      )) : <p className="text-xs text-muted">{t('admin.noDisputeMessages')}</p>}
                    </div>
                  </section>
                </div>

                <div className="flex flex-col gap-5 rounded-xl bg-surface p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
                  <div className="w-full space-y-1 lg:max-w-md">
                    <Label htmlFor="dispute-resolution">{t('admin.resolutionSummary')}</Label>
                    <TextInput
                      id="dispute-resolution"
                      value={resolutionNote}
                      onChange={(event) => setResolutionNote(event.target.value)}
                      placeholder={t('admin.resolutionPlaceholder')}
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
                      {busy === 'RESOLVED' ? 'Resolving...' : <><CheckCircle2 strokeWidth={1.8} aria-hidden="true" />{t('admin.resolveCase')}</>}
                    </Button>
                  </div>
                </div>

                <section className="rounded-xl bg-surface p-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-semibold text-navy">{t('admin.privateNotes')}</h3>
                    <p className="mt-1 text-xs text-muted">{t('admin.privateNotesHint')}</p>
                  </div>
                  {selectedDispute.notes?.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {selectedDispute.notes.map((note) => (
                        <p key={note.id} className="rounded-xl bg-elevated shadow-md p-3">
                          <strong className="block text-sm font-medium text-navy">{note.body}</strong>
                          <small className="mt-1 block text-xs text-muted">{formatDate(note.createdAt, true)}</small>
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
                    <Textarea
                      rows={2}
                      maxLength={2000}
                      value={disputeNote}
                      onChange={(event) => setDisputeNote(event.target.value)}
                      placeholder={t('admin.privateNotePlaceholder')}
                      aria-label={t('admin.privateNoteLabel')}
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
              <Button color="light" onClick={closeDispute} disabled={Boolean(busy)}>{t('common.close')}</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}

export default AdminTrustSafety;
