import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Checkbox, Label, Spinner, Textarea } from 'flowbite-react';
import { ArrowLeft, FileText } from 'lucide-react';
import apiClient from '../api/client.js';
import SelectMenu from '../components/SelectMenu.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

// The dropdown speaks in outcomes ("Verified", "Need more information") while the
// API speaks in states (APPROVED, CHANGES_REQUESTED). Keeping the mapping here
// means the reviewer never has to know the token names.
const STATUS_CHOICES = [
  { value: 'APPROVED', label: 'Verified - approve this host' },
  // An application that has already been decided can be put back into the queue,
  // held under investigation, or have its verification suspended. None of them
  // touches the account's role, so the host keeps their dashboard while the
  // question is answered.
  { value: 'SUBMITTED', label: 'Pending review - put back in the queue' },
  { value: 'UNDER_INVESTIGATION', label: 'Under investigation - hold the account' },
  { value: 'SUSPENDED', label: 'Verification suspended - take the badge away for now' },
  { value: 'CHANGES_REQUESTED', label: 'Need more information - return to host' },
  { value: 'REJECTED', label: 'Not approved - reject application' },
];

// Common gaps in an application, offered as checkboxes so a returned
// application tells the host exactly what to fix instead of "please retry".
const INFO_ITEMS = [
  'A clearer photo of the identity document (front and back)',
  'A copy of the KRA PIN certificate',
  'Proof of ownership or authority over the property',
  'A copy of the business registration certificate',
  'Bank or M-PESA details that match the applicant name',
  'Corrected personal details (name, date of birth, nationality)',
];

const STATUS_META = {
  DRAFT: { labelKey: 'adminlisting.statusDraft', color: 'gray' },
  SUBMITTED: { labelKey: 'admin.awaitingReview', color: 'warning' },
  UNDER_INVESTIGATION: { labelKey: 'admin.underInvestigation', color: 'failure' },
  SUSPENDED: { labelKey: 'admin.verificationSuspended', color: 'failure' },
  CHANGES_REQUESTED: { labelKey: 'admin.changesRequested', color: 'warning' },
  APPROVED: { labelKey: 'admin.verificationApproved', color: 'success' },
  REJECTED: { labelKey: 'adminlisting.statusRejected', color: 'failure' },
};

const DOCUMENT_LABELS = {
  IDENTITY_FRONT: 'Identity - front/details',
  IDENTITY_BACK: 'Identity - reverse',
  PROPERTY_AUTHORITY: 'Property authority',
  BUSINESS_REGISTRATION: 'Business registration',
};

// The API stores the document type token; the applicant form shows a human label.
const IDENTITY_LABELS = {
  NATIONAL_ID: 'Kenyan national ID',
  PASSPORT: 'Passport',
  ALIEN_ID: 'Alien ID',
};

// The server stores one plain-text reason (max 2000 characters) and shows it to
// the host, so the checklist and the note are folded into that single message.
function composeRequestNote(items, note) {
  const lines = ['We need a little more information before we can verify your host account.'];
  if (items.length > 0) lines.push('', 'Please provide:', ...items.map((item) => `- ${item}`));
  lines.push('', note.trim());
  lines.push('', 'Reply in the message box on your host application page, upload any missing files, then resubmit the application.');
  return lines.join('\n').slice(0, 2000);
}

function formatDate(value, includeTime = false) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-GB', includeTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFileSize(size) {
  const bytes = Number(size) || 0;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function StatusBadge({ status, t }) {
  const meta = STATUS_META[status];
  if (!meta) return <Badge color="gray">{String(status || '-').replace(/_/g, ' ')}</Badge>;
  return <Badge color={meta.color}>{t(meta.labelKey)}</Badge>;
}

// One vertical block per part of the application. Nothing here sits beside
// anything else: a single column keeps a long application readable on a laptop
// and on a phone without a separate layout for each.
function Panel({ title, hint, children }) {
  return (
    <section className="rounded-xl bg-elevated p-5 shadow-sm">
      <h2 className="text-base font-semibold text-navy">{title}</h2>
      {hint && <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Label above value, so each field also reads top to bottom.
function Field({ label, value }) {
  const shown = value === null || value === undefined || value === '' ? '-' : String(value);
  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-navy">{shown}</dd>
    </div>
  );
}

export default function AdminHostApplicationReview() {
  const { t } = useLanguage();
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [chosenStatus, setChosenStatus] = useState('');
  const [note, setNote] = useState('');
  const [neededItems, setNeededItems] = useState([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('success');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    apiClient.get(`/admin/host-applications/${id}`)
      .then((response) => { if (!cancelled) setApplication(response.data.data); })
      .catch((error) => { if (!cancelled) setLoadError(error.response?.data?.error || 'Could not load this application.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  function resetDecision() {
    setChosenStatus('');
    setNote('');
    setNeededItems([]);
  }

  function toggleItem(item) {
    setNeededItems((current) => (current.includes(item)
      ? current.filter((entry) => entry !== item)
      : [...current, item]));
  }

  async function applyDecision() {
    if (!application) return;
    // Every outcome except approval is read by the host as the reason for it, so
    // each needs a sentence they can act on. Approval needs none: the outcome is
    // the message.
    if (chosenStatus && chosenStatus !== 'APPROVED' && !note.trim()) {
      setMessage('Add a reason before saving: the host reads it on their application page.');
      setMessageTone('error');
      return;
    }
    if (!chosenStatus) return;

    setBusy(chosenStatus);
    setMessage('');
    try {
      if (chosenStatus === 'CHANGES_REQUESTED') {
        await apiClient.post(`/admin/host-applications/${application.id}/request-changes`, {
          reason: composeRequestNote(neededItems, note),
        });
        setMessage('Sent back to the host. They have been messaged with what is needed, and can now reply and upload the missing files.');
      } else if (chosenStatus === 'REJECTED') {
        await apiClient.post(`/admin/host-applications/${application.id}/reject`, { reason: note.trim() });
        setMessage('Application rejected. The host has been messaged with the reason.');
      } else if (chosenStatus === 'SUBMITTED' || chosenStatus === 'UNDER_INVESTIGATION' || chosenStatus === 'SUSPENDED') {
        await apiClient.post(`/admin/host-applications/${application.id}/status`, {
          status: chosenStatus,
          reason: note.trim(),
        });
        setMessage({
          UNDER_INVESTIGATION: 'Held under investigation. The verified badge is off their account, what you wrote has been messaged to them, and their dashboard keeps working.',
          SUSPENDED: 'Verification suspended. The badge is off their account, what you wrote has been messaged to them, and their dashboard, listings and earnings keep working.',
          SUBMITTED: 'Back in the review queue. The verified badge is off their account, and they have been messaged with the reason.',
        }[chosenStatus]);
      } else {
        await apiClient.post(`/admin/host-applications/${application.id}/approve`, {});
        setMessage('Host verified. They have been messaged, and their account now carries the verified badge.');
      }
      setMessageTone('success');
      resetDecision();
      const refreshed = await apiClient.get(`/admin/host-applications/${id}`);
      setApplication(refreshed.data.data);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Could not save this decision.');
      setMessageTone('error');
    } finally {
      setBusy('');
    }
  }

  async function downloadDocument(document) {
    if (!application) return;
    setBusy(document.id);
    setMessage('');
    try {
      const response = await apiClient.get(`/admin/host-applications/${application.id}/documents/${document.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.originalName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Could not download the document.');
      setMessageTone('error');
    } finally {
      setBusy('');
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-2 rounded-xl bg-elevated px-5 py-16 text-center shadow-sm" role="status">
          <Spinner size="lg" aria-hidden="true" />
          <strong className="text-sm font-semibold text-navy">Loading application</strong>
          <p className="text-xs text-muted">Fetching the submitted details and documents.</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="space-y-6">
        <Link to="/admin/host-applications" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          Back to host applications
        </Link>
        <section className="rounded-xl bg-elevated p-8 text-center shadow-sm">
          <strong className="block text-base font-semibold text-navy">This application is not available</strong>
          <p role="alert" className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">
            {loadError || 'It may have been removed, or you may not have access to it.'}
          </p>
        </section>
      </div>
    );
  }

  // A verified host can still be sent back into review, held under
  // investigation, asked for more information, or have the verification
  // withdrawn, because the facts behind a verification go stale. The application
  // row is never removed or hidden here, so the host stays visible on this page
  // throughout - which is the point: the admin works from this screen while the
  // question is open.
  const isVerified = application.status === 'APPROVED';
  const canDecide = isVerified
    || application.status === 'SUBMITTED'
    || application.status === 'UNDER_INVESTIGATION';
  // The status the application already holds is not offered, because setting it
  // again would only send the same notice twice. For a verified host that also
  // hides "approve", which they no longer need.
  const statusChoices = STATUS_CHOICES.filter((choice) => choice.value !== application.status);
  const decisionLabel = {
    APPROVED: 'Mark as verified',
    SUBMITTED: 'Put back in the queue',
    UNDER_INVESTIGATION: 'Place under investigation',
    SUSPENDED: 'Suspend verification',
    CHANGES_REQUESTED: 'Return to host',
    REJECTED: 'Reject application',
  }[chosenStatus] || 'Save decision';
  const busyLabel = {
    APPROVED: 'Verifying...',
    SUBMITTED: 'Saving...',
    UNDER_INVESTIGATION: 'Holding...',
    SUSPENDED: 'Suspending...',
    CHANGES_REQUESTED: 'Returning...',
    REJECTED: 'Rejecting...',
  }[busy];
  const applicantName = application.legalName
    || `${application.user?.firstName || ''} ${application.user?.lastName || ''}`.trim()
    || 'Unnamed applicant';

  return (
    <div className="space-y-6">
      <Link to="/admin/host-applications" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        Back to host applications
      </Link>

      <header className="rounded-xl bg-elevated p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">Host application review</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy">{applicantName}</h1>
        <p className="mt-1 text-sm text-muted">{application.contactEmail || application.user?.email || 'Email not provided'}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={application.status} t={t} />
          <span className="text-xs text-muted">Submitted {formatDate(application.submittedAt)}</span>
        </div>
      </header>

      {message && <Alert color={messageTone === 'error' ? 'failure' : 'success'} role="status">{message}</Alert>}
      {loadError && <Alert color="failure">{loadError}</Alert>}

      <Panel title={t('admin.identityAndContact')}>
        <dl>
          <Field label={t('hostsetup.legalName')} value={application.legalName} />
          <Field label={t('hostsetup.dateOfBirth')} value={application.dateOfBirth} />
          <Field label={t('hostsetup.nationality')} value={application.nationality} />
          <Field label={t('hostsetup.identityDocument')} value={IDENTITY_LABELS[application.identityType] || application.identityType} />
          <Field label={t('hostsetup.kraPin')} value={application.kraPin} />
          <Field label={t('hostsetup.contactPhone')} value={application.contactPhone} />
          <Field label={t('hostsetup.contactEmail')} value={application.contactEmail} />
          <Field label={t('hostsetup.preferredPayout')} value={application.preferredPayoutMethod} />
          {application.preferredPayoutMethod === 'mpesa' ? (
            <Field label={t('hostsetup.mpesaNumber')} value={application.payoutMpesaPhone} />
          ) : (
            <>
              <Field label={t('hostsetup.bank')} value={application.payoutBankName} />
              <Field label={t('hostsetup.bankCode')} value={application.payoutBankCode} />
              <Field label={t('hostsetup.bankAccount')} value={application.payoutBankAccountNo} />
            </>
          )}
        </dl>
      </Panel>

      <Panel title={t('admin.businessSection')}>
        <dl>
          <Field label={t('admin.businessName')} value={application.businessName} />
          <Field label={t('admin.businessType')} value={application.businessType} />
          <Field label={t('admin.registration')} value={application.companyRegistrationNo} />
          <Field
            label={t('admin.applicantAccount')}
            value={`${application.user?.firstName || ''} ${application.user?.lastName || ''}`.trim() || application.user?.email}
          />
        </dl>
      </Panel>

      <Panel title={t('admin.hostingPlan')}>
        <dl>
          <Field label={t('admin.primaryArea')} value={application.city} />
          <Field label={t('hostsetup.propertyLocations')} value={application.propertyLocations} />
          <Field label={t('admin.propertyCountField')} value={application.propertyCount} />
          <Field label={t('admin.relationshipField')} value={application.propertyRelationship} />
          <Field label={t('admin.propertyTypesField')} value={application.propertyTypes?.join(', ')} />
          <Field label={t('admin.yearsHostingField')} value={application.yearsHosting} />
        </dl>
      </Panel>

      <Panel title={t('admin.experience')} hint="Notes the applicant supplied about their hosting experience.">
        <p className="text-sm leading-relaxed text-charcoal">
          {application.experience || 'No hosting notes were supplied.'}
        </p>
      </Panel>

      <Panel
        title={t('admin.encryptedDocuments')}
        hint={application.documents?.length
          ? `${t('admin.decryptedForReview')} ${application.documents.length} file(s) on record.`
          : t('admin.decryptedForReview')}
      >
        {application.documents?.length ? (
          <ul className="space-y-2">
            {application.documents.map((document) => (
              <li key={document.id}>
                <Button color="light" className="w-full justify-start" onClick={() => downloadDocument(document)} disabled={busy === document.id}>
                  <FileText strokeWidth={1.6} aria-hidden="true" />
                  <span className="flex min-w-0 flex-col items-start leading-tight">
                    <strong className="w-full truncate text-xs font-semibold text-navy">{DOCUMENT_LABELS[document.kind] || document.kind}</strong>
                    <small className="w-full truncate text-[11px] font-normal text-muted">{document.originalName} · {formatFileSize(document.size)}</small>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-surface px-4 py-6 text-center text-sm text-muted">{t('admin.noDocumentsUploaded')}</p>
        )}
      </Panel>

      {application.reviewNote && (
        <Panel title={t('admin.reviewerNote')} hint="Shared with the applicant.">
          <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal">{application.reviewNote}</p>
        </Panel>
      )}

      {application.applicantResponse && (
        <Panel title="Host's reply" hint={`Sent ${formatDate(application.updatedAt, true)} with their resubmission.`}>
          <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal">{application.applicantResponse}</p>
        </Panel>
      )}

      <Panel
        title="Status and decision"
        hint={canDecide
          ? (isVerified
            ? 'This host is verified. Pending review, under investigation or suspended takes the badge off their account as soon as you save, and their dashboard, listings and earnings keep working. They are told why. Blocking the account itself is done from the users page.'
            : 'Pick a status, then add what the host needs to know. The host sees this message on their host application page.')
          : 'This application has already been decided. A new decision becomes available only after the host resubmits.'}
      >
        {canDecide ? (
          <div className="space-y-5">
            <div>
              <Label htmlFor="host-application-status">Application status</Label>
              <SelectMenu
                id="host-application-status"
                ariaLabel="Application status"
                value={chosenStatus}
                onChange={setChosenStatus}
                placeholder="Choose a status"
                options={statusChoices}
                wrapperClassName="mt-1"
              />
            </div>

            {chosenStatus === 'CHANGES_REQUESTED' && (
              <div className="space-y-4 rounded-xl bg-surface p-4">
                <div>
                  <h3 className="text-sm font-semibold text-navy">What more information is needed</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Tick everything that is missing, then describe it in your own words. The host gets a reply box and
                    the document uploads on their application page.
                  </p>
                </div>
                <ul className="space-y-2">
                  {INFO_ITEMS.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Checkbox
                        id={`needed-${item.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
                        checked={neededItems.includes(item)}
                        onChange={() => toggleItem(item)}
                      />
                      <Label
                        htmlFor={`needed-${item.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
                        className="text-sm font-normal text-charcoal"
                      >
                        {item}
                      </Label>
                    </li>
                  ))}
                </ul>
                <div>
                  <Label htmlFor="host-application-note">Message to the host</Label>
                  <Textarea
                    id="host-application-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={4}
                    maxLength={1200}
                    className="mt-1"
                    placeholder="Explain what is missing and how the host can provide it."
                  />
                </div>
                {(note.trim() || neededItems.length > 0) && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">What the host will see</h4>
                    <p className="mt-2 whitespace-pre-line rounded-lg bg-elevated p-3 text-sm leading-relaxed text-charcoal shadow-sm">
                      {composeRequestNote(neededItems, note)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {['REJECTED', 'SUBMITTED', 'UNDER_INVESTIGATION', 'SUSPENDED'].includes(chosenStatus) && (
              <div className="space-y-3 rounded-xl bg-surface p-4">
                <div>
                  <Label htmlFor="host-application-note">
                    {chosenStatus === 'REJECTED'
                      ? 'Reason for rejection'
                      : chosenStatus === 'UNDER_INVESTIGATION'
                        ? 'What is being investigated'
                        : chosenStatus === 'SUSPENDED'
                          ? 'Why the verification is suspended'
                          : 'Why it is going back into the queue'}
                  </Label>
                  <p className="mt-1 text-xs text-muted">Required, and shown to the host.</p>
                </div>
                <Textarea
                  id="host-application-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  maxLength={1200}
                  placeholder={chosenStatus === 'REJECTED'
                    ? 'Say why this application cannot be approved.'
                    : chosenStatus === 'UNDER_INVESTIGATION'
                      ? 'Say what is being looked into, for example: a guest complaint about a cancelled stay.'
                      : chosenStatus === 'SUSPENDED'
                        ? 'Say why verification is suspended, for example: the identity document does not match the account holder.'
                        : 'Say why it is back in the queue, for example: new payout details to check.'}
                />
                {chosenStatus !== 'REJECTED' && (
                  <p className="text-xs leading-relaxed text-muted">
                    The verified badge comes off their account as soon as you save, and returns only if the application
                    is approved again. Their dashboard, listings and earnings keep working, and the message tells them
                    so.
                  </p>
                )}
              </div>
            )}

            {chosenStatus === 'APPROVED' && (
              <Alert color="info">
                Verifying makes this account a host straight away. If they are signed in, the new role applies the
                next time they sign in.
              </Alert>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={applyDecision} disabled={!chosenStatus || Boolean(busy)}>
                {busyLabel || decisionLabel}
              </Button>
              <Button color="light" onClick={resetDecision} disabled={Boolean(busy)}>Clear</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={application.status} t={t} />
            <span className="text-sm text-muted">
              {application.reviewedAt ? `Decided ${formatDate(application.reviewedAt, true)}` : 'No decision recorded yet.'}
            </span>
          </div>
        )}
      </Panel>

      {application.auditLogs?.length > 0 && (
        <Panel title="Review history" hint="Immutable actions recorded for this application.">
          <ol className="space-y-3">
            {application.auditLogs.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm text-navy">
                    <strong className="font-semibold">{String(entry.action).replace(/_/g, ' ')}</strong>
                    <small className="ml-1 text-xs text-muted">{formatDate(entry.createdAt, true)}</small>
                  </p>
                  {entry.note && <blockquote className="mt-1 border-l-2 border-border pl-3 text-xs text-muted">{entry.note}</blockquote>}
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}

Panel.propTypes = {
  title: PropTypes.string.isRequired,
  hint: PropTypes.string,
  children: PropTypes.node.isRequired,
};

Field.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.array]),
};

StatusBadge.propTypes = {
  status: PropTypes.string,
  t: PropTypes.func.isRequired,
};
