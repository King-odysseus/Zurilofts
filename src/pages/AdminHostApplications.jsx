import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Badge,
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Textarea,
  TextInput,
} from 'flowbite-react';
import { FileText, Search } from 'lucide-react';
import apiClient from '../api/client.js';
import SelectMenu from '../components/SelectMenu.jsx';
import AdminPagination from '../components/admin/AdminPagination.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

// Keys rather than words: both the filter menu and the status pill resolve
// them at render time, so one state reads the same in either language.
const STATUS_OPTIONS = [
  { value: '', labelKey: 'admin.allApplications' },
  { value: 'SUBMITTED', labelKey: 'admin.awaitingReview' },
  { value: 'CHANGES_REQUESTED', labelKey: 'admin.changesRequested' },
  { value: 'APPROVED', labelKey: 'admin.verificationApproved' },
  { value: 'REJECTED', labelKey: 'adminlisting.statusRejected' },
  { value: 'DRAFT', labelKey: 'adminlisting.statusDraft' },
];

const STATUS_META = {
  DRAFT: { labelKey: 'adminlisting.statusDraft', tone: 'neutral' },
  SUBMITTED: { labelKey: 'admin.awaitingReview', tone: 'pending' },
  CHANGES_REQUESTED: { labelKey: 'admin.changesRequested', tone: 'warning' },
  APPROVED: { labelKey: 'admin.verificationApproved', tone: 'success' },
  REJECTED: { labelKey: 'adminlisting.statusRejected', tone: 'danger' },
};

// Status tones are semantic; the Badge palette names them differently.
const BADGE_COLORS = { neutral: 'gray', pending: 'warning', warning: 'warning', success: 'success', danger: 'failure' };

// Server page size for the queue. The endpoint caps at 100; asking explicitly
// keeps every page reachable through the controls instead of silently
// truncating the list at one fetch.
const PAGE_SIZE = 20;

const DOCUMENT_LABELS = {
  IDENTITY_FRONT: 'Identity - front/details',
  IDENTITY_BACK: 'Identity - reverse',
  PROPERTY_AUTHORITY: 'Property authority',
  BUSINESS_REGISTRATION: 'Business registration',
};

function initials(application) {
  const name = application.legalName || `${application.user?.firstName || ''} ${application.user?.lastName || ''}`;
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'HA';
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

function statusMeta(status) {
  return STATUS_META[status] || { label: String(status || '-').replace(/_/g, ' '), tone: 'neutral' };
}

function SearchIcon() {
  return <Search strokeWidth={1.8} aria-hidden="true" />;
}

function AdminHostApplications() {
  const { t } = useLanguage();
  const [applications, setApplications] = useState([]);
  const [status, setStatus] = useState('SUBMITTED');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('success');
  // Paging state. Without it the queue fetched 100 rows once and older
  // applications simply vanished from view as new ones arrived.
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await apiClient.get('/admin/host-applications', {
        params: { ...(status ? { status } : {}), ...(debouncedSearch ? { search: debouncedSearch } : {}), page, limit: PAGE_SIZE },
      });
      setApplications(response.data.data || []);
      setPagination(response.data.pagination || { page, limit: PAGE_SIZE, total: response.data.data?.length || 0, totalPages: 1 });
    } catch (error) {
      setMessage(error.response?.data?.error || 'Could not load host applications.');
      setMessageTone('error');
    } finally {
      setLoading(false);
    }
  }, [status, page, debouncedSearch]);

  // The endpoint supports a server-side search, so the term must not filter the
  // loaded page in the browser: that would hide matches on every other page.
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const visibleApplications = useMemo(() => applications, [applications]);

  const viewTotals = useMemo(() => {
    const documents = visibleApplications.reduce((total, application) => total + (application.documents?.length || 0), 0);
    const locations = new Set(visibleApplications.map((application) => application.city).filter(Boolean));
    const latest = visibleApplications
      .map((application) => application.updatedAt || application.submittedAt || application.createdAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0];
    return { documents, locations: locations.size, latest };
  }, [visibleApplications]);

  async function openApplication(id) {
    setBusy(id);
    setMessage('');
    setNote('');
    try {
      const response = await apiClient.get(`/admin/host-applications/${id}`);
      setSelected(response.data.data);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Could not load the application.');
      setMessageTone('error');
    } finally {
      setBusy('');
    }
  }

  function closeApplication() {
    if (busy) return;
    setSelected(null);
    setNote('');
  }

  async function review(action) {
    if (!selected) return;
    if ((action === 'request-changes' || action === 'reject') && !note.trim()) {
      setMessage('Enter a reviewer note first.');
      setMessageTone('error');
      return;
    }
    setBusy(action);
    setMessage('');
    try {
      await apiClient.post(`/admin/host-applications/${selected.id}/${action}`, action === 'approve' ? {} : { reason: note.trim() });
      setMessage(action === 'approve' ? 'Host approved. They can now create properties.' : 'Application updated.');
      setMessageTone('success');
      setSelected(null);
      setNote('');
      await load();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Could not update the application.');
      setMessageTone('error');
    } finally {
      setBusy('');
    }
  }

  async function downloadDocument(document) {
    if (!selected) return;
    setBusy(document.id);
    setMessage('');
    try {
      const response = await apiClient.get(`/admin/host-applications/${selected.id}/documents/${document.id}`, { responseType: 'blob' });
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Host applications</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{t('admin.applicationsDescription')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl bg-elevated shadow-md p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.matchingApplications').toUpperCase()}</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{pagination.total}</strong>
          <small className="mt-1 block text-xs text-muted">{t('admin.acrossAllPagesFilters')}</small>
        </article>
        <article className="rounded-xl bg-elevated shadow-md p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.encryptedFiles').toUpperCase()}</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{viewTotals.documents}</strong>
          <small className="mt-1 block text-xs text-muted">{t('admin.documentsOnPage')}</small>
        </article>
        <article className="rounded-xl bg-elevated shadow-md p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.locations').toUpperCase()}</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{viewTotals.locations}</strong>
          <small className="mt-1 block text-xs text-muted">{t('admin.distinctAreas')}</small>
        </article>
        <article className="rounded-xl bg-elevated shadow-md p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.lastUpdate').toUpperCase()}</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{formatDate(viewTotals.latest)}</strong>
          <small className="mt-1 block text-xs text-muted">{t('admin.recentActivity')}</small>
        </article>
      </div>

      <section className="overflow-hidden rounded-xl bg-elevated shadow-md">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm [&_input]:border-0 [&_input]:bg-surface [&_input]:pl-9">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.8} aria-hidden="true" />
            <TextInput
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('admin.searchApplicant')}
              aria-label={t('admin.searchApplicationsLabel')}
            />
          </div>
          <SelectMenu
            ariaLabel={t('a11y3.filterApplicationsByStatus')}
            value={status}
            onChange={(next) => { setStatus(next); setPage(1); }}
            wrapperClassName="sm:w-56"
            options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
          />
        </div>

        {message && <Alert color={messageTone === 'error' ? 'failure' : 'success'} className="mx-5 mt-5 text-center" role="status">{message}</Alert>}

        {loading ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Spinner size="lg" aria-hidden="true" />
            <strong className="text-sm font-semibold text-navy">{t('admin.loadingApplications')}</strong>
            <p className="text-xs text-muted">{t('admin.loadingApplicationsHint')}</p>
          </div>
        ) : visibleApplications.length === 0 ? (
          <Alert color="info" className="m-5 text-center">
            {/* Tailwind's preflight makes every svg a block element, so the icon
                ignored the centred text and stuck to the left edge of the banner. */}
            <span aria-hidden="true" className="flex justify-center"><SearchIcon /></span>
            <strong>{t('admin.noApplicationsInView')}</strong>
            <p>{t('admin.noApplicationsInViewHint')}</p>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table hoverable aria-label={t('admin.applicationsTitle')}>
              <TableHead>
                <TableRow>
                  <TableHeadCell>{t('admin.colApplicant').toUpperCase()}</TableHeadCell>
                  <TableHeadCell>{t('admin.colBusiness').toUpperCase()}</TableHeadCell>
                  <TableHeadCell>{t('admin.colHosting').toUpperCase()}</TableHeadCell>
                  <TableHeadCell><span className="block text-right">{t('admin.colDocuments').toUpperCase()}</span></TableHeadCell>
                  <TableHeadCell>{t('admin.colUpdated').toUpperCase()}</TableHeadCell>
                  <TableHeadCell>{t('common.status').toUpperCase()}</TableHeadCell>
                  <TableHeadCell><span className="block text-right">{t('admin.colAction').toUpperCase()}</span></TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleApplications.map((application) => {
                  const meta = statusMeta(application.status);
                  // A status the table does not know keeps its raw token, which is
                  // still readable, rather than showing a blank pill.
                  const statusLabel = meta.labelKey ? t(meta.labelKey) : meta.label;
                  return (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary/15 text-xs font-bold text-navy" aria-hidden="true">{initials(application)}</span>
                          <div className="min-w-0">
                            <strong className="block truncate text-sm font-semibold text-navy">{application.legalName || `${application.user?.firstName || ''} ${application.user?.lastName || ''}`.trim() || 'Unnamed applicant'}</strong>
                            <span className="block truncate text-xs text-muted">{application.contactEmail || application.user?.email || 'Email not provided'}</span>
                            <small className="block text-xs text-muted">{application.contactPhone || 'Phone not provided'}</small>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <small className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.colBusiness').toUpperCase()}</small>
                        <strong className="mt-0.5 block text-sm font-medium text-navy">{application.businessName || 'Individual host'}</strong>
                        <span className="mt-0.5 block text-xs text-muted">{application.businessType ? String(application.businessType).replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Type not set'}</span>
                      </TableCell>
                      <TableCell>
                        <small className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.colHosting').toUpperCase()}</small>
                        <strong className="mt-0.5 block text-sm font-medium text-navy">{application.city || 'Area not set'}</strong>
                        <span className="mt-0.5 block text-xs text-muted">{application.propertyCount ? `${application.propertyCount} propert${application.propertyCount === 1 ? 'y' : 'ies'}` : 'Count not set'}</span>
                      </TableCell>
                      <TableCell>
                        <small className="block text-right text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.colDocuments').toUpperCase()}</small>
                        <strong className="mt-0.5 block text-sm font-medium text-navy">
                          <span className="block text-right tabular-nums">{application.documents?.length || 0} encrypted</span>
                        </strong>
                        <span className="mt-0.5 block text-right text-xs text-muted">{application.documents?.length ? 'Ready to inspect' : 'No files uploaded'}</span>
                      </TableCell>
                      <TableCell>
                        <small className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.colUpdated').toUpperCase()}</small>
                        <strong className="mt-0.5 block text-sm font-medium text-navy">{formatDate(application.updatedAt || application.submittedAt)}</strong>
                        <span className="mt-0.5 block text-xs text-muted">{application.reviewedAt ? `Reviewed ${formatDate(application.reviewedAt)}` : 'Not reviewed yet'}</span>
                      </TableCell>
                      <TableCell><Badge color={BADGE_COLORS[meta.tone] || 'gray'}>{statusLabel}</Badge></TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button size="xs" onClick={() => openApplication(application.id)} disabled={busy === application.id}>
                            {busy === application.id ? 'Loading...' : 'Review'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && visibleApplications.length > 0 && (
          <div className="border-t border-border px-5 py-3">
            <AdminPagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              noun="application"
              onChange={setPage}
            />
          </div>
        )}
      </section>

      <Modal show={Boolean(selected)} onClose={closeApplication} size="2xl" dismissible>
        {selected && (
          <>
            <ModalHeader>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">HOST APPLICATION · {String(selected.status || '').replace(/_/g, ' ')}</span>
              <span className="mt-1 block text-lg font-semibold text-navy">{selected.legalName || 'Host application'}</span>
              <span className="mt-0.5 block text-xs font-normal text-muted">{selected.contactEmail || selected.user?.email}</span>
            </ModalHeader>
            <ModalBody className="space-y-5">
              {message && <Alert color={messageTone === 'error' ? 'failure' : 'success'} className="text-center" role="status">{message}</Alert>}

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <DetailSection title={t('admin.identityAndContact')}>
                  <Detail label={t('hostsetup.legalName')} value={selected.legalName} />
                  <Detail label={t('hostsetup.dateOfBirth')} value={selected.dateOfBirth} />
                  <Detail label={t('hostsetup.nationality')} value={selected.nationality} />
                  <Detail label={t('hostsetup.identityDocument')} value={selected.identityType} />
                  <Detail label={t('hostsetup.kraPin')} value={selected.kraPin} />
                  <Detail label={t('hostsetup.contactPhone')} value={selected.contactPhone} />
                  <Detail label={t('hostsetup.contactEmail')} value={selected.contactEmail} />
                  <Detail label={t('hostsetup.preferredPayout')} value={selected.preferredPayoutMethod} />
                  {selected.preferredPayoutMethod === 'mpesa' ? (
                    <Detail label={t('hostsetup.mpesaNumber')} value={selected.payoutMpesaPhone} />
                  ) : (
                    <>
                      <Detail label={t('hostsetup.bank')} value={selected.payoutBankName} />
                      <Detail label={t('hostsetup.bankCode')} value={selected.payoutBankCode} />
                      <Detail label={t('hostsetup.bankAccount')} value={selected.payoutBankAccountNo} />
                    </>
                  )}
                </DetailSection>

                <DetailSection title={t('admin.businessSection')}>
                  <Detail label={t('admin.businessName')} value={selected.businessName} />
                  <Detail label={t('admin.businessType')} value={selected.businessType} />
                  <Detail label={t('admin.registration')} value={selected.companyRegistrationNo} />
                  <Detail label={t('admin.applicantAccount')} value={`${selected.user?.firstName || ''} ${selected.user?.lastName || ''}`.trim() || selected.user?.email} />
                </DetailSection>

                <DetailSection title={t('admin.hostingPlan')}>
                  <Detail label={t('admin.primaryArea')} value={selected.city} />
                  <Detail label={t('hostsetup.propertyLocations')} value={selected.propertyLocations} />
                  <Detail label={t('admin.propertyCountField')} value={selected.propertyCount} />
                  <Detail label={t('admin.relationshipField')} value={selected.propertyRelationship} />
                  <Detail label={t('admin.propertyTypesField')} value={selected.propertyTypes?.join(', ')} />
                  <Detail label={t('admin.yearsHostingField')} value={selected.yearsHosting} />
                </DetailSection>
              </div>

              <section className="rounded-xl bg-surface p-4 shadow-sm">
                <div>
                  <h3 className="text-sm font-semibold text-navy">{t('admin.experience')}</h3>
                  <p className="mt-1 text-xs text-muted">{t('admin.applicantNotes')}</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-charcoal">{selected.experience || 'No additional hosting notes were supplied.'}</p>
              </section>

              <section className="rounded-xl bg-surface p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-navy">{t('admin.encryptedDocuments')}</h3>
                    <p className="mt-1 text-xs text-muted">{t('admin.decryptedForReview')}</p>
                  </div>
                  <span className="text-xs text-muted">{selected.documents?.length || 0} files</span>
                </div>
                {selected.documents?.length ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {selected.documents.map((document) => (
                      <Button key={document.id} color="light" onClick={() => downloadDocument(document)} disabled={busy === document.id}>
                        <FileText strokeWidth={1.6} aria-hidden="true" />
                        <span className="flex min-w-0 flex-col items-start leading-tight">
                          <strong className="w-full truncate text-xs font-semibold text-navy">{DOCUMENT_LABELS[document.kind] || document.kind}</strong>
                          <small className="w-full truncate text-[11px] font-normal text-muted">{document.originalName} · {formatFileSize(document.size)}</small>
                        </span>
                      </Button>
                    ))}
                  </div>
                ) : <div className="mt-3 rounded-xl bg-elevated shadow-md px-4 py-6 text-center text-sm text-muted">{t('admin.noDocumentsUploaded')}</div>}
              </section>

              {selected.status === 'SUBMITTED' && (
                <section className="space-y-3 rounded-xl bg-surface p-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-semibold text-navy">{t('admin.reviewDecision')}</h3>
                    <p className="mt-1 text-xs text-muted">{t('admin.reviewDecisionHint')}</p>
                  </div>
                  <Label htmlFor="host-application-note">{t('admin.reviewerNote')}</Label>
                  <Textarea
                    id="host-application-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder={t('a11y3.reviewerNotePlaceholder')}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button color="failure" onClick={() => review('reject')} disabled={Boolean(busy)}>Reject</Button>
                    <Button color="light" onClick={() => review('request-changes')} disabled={Boolean(busy)}>Request changes</Button>
                    <Button onClick={() => review('approve')} disabled={Boolean(busy)}>{busy === 'approve' ? 'Approving...' : 'Approve host'}</Button>
                  </div>
                </section>
              )}

              {selected.reviewNote && selected.status !== 'SUBMITTED' && (
                <section className="rounded-xl bg-surface p-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-semibold text-navy">{t('admin.reviewerNote')}</h3>
                    <p className="mt-1 text-xs text-muted">Shared with the applicant.</p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal">{selected.reviewNote}</p>
                </section>
              )}

              {selected.auditLogs?.length > 0 && (
                <section className="rounded-xl bg-surface p-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-semibold text-navy">Review history</h3>
                    <p className="mt-1 text-xs text-muted">Immutable actions recorded for this application.</p>
                  </div>
                  <div className="mt-3 space-y-3">
                    {selected.auditLogs.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-sm text-navy">
                            <strong className="font-semibold">{String(entry.action).replace(/_/g, ' ')}</strong>
                            <small className="ml-1 text-xs text-muted">{formatDate(entry.createdAt, true)}</small>
                          </p>
                          {entry.note && <blockquote className="mt-1 border-l-2 border-border pl-3 text-xs text-muted">{entry.note}</blockquote>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </ModalBody>
          </>
        )}
      </Modal>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="rounded-xl bg-surface p-4 shadow-sm">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <strong className="text-right text-sm font-medium text-navy">{value === null || value === undefined || value === '' ? '-' : String(value)}</strong>
    </div>
  );
}

DetailSection.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
Detail.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.array]) };

export default AdminHostApplications;
