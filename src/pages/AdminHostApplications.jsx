import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from 'flowbite-react';
import { Search } from 'lucide-react';
import apiClient from '../api/client.js';
import SelectMenu from '../components/SelectMenu.jsx';
import AdminPagination from '../components/admin/AdminPagination.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

// Keys rather than words: both the filter menu and the status pill resolve
// them at render time, so one state reads the same in either language.
const STATUS_OPTIONS = [
  { value: '', labelKey: 'admin.allApplications' },
  { value: 'SUBMITTED', labelKey: 'admin.awaitingReview' },
  { value: 'UNDER_INVESTIGATION', labelKey: 'admin.underInvestigation' },
  { value: 'CHANGES_REQUESTED', labelKey: 'admin.changesRequested' },
  { value: 'APPROVED', labelKey: 'admin.verificationApproved' },
  { value: 'REJECTED', labelKey: 'adminlisting.statusRejected' },
  { value: 'DRAFT', labelKey: 'adminlisting.statusDraft' },
];

const STATUS_META = {
  DRAFT: { labelKey: 'adminlisting.statusDraft', tone: 'neutral' },
  SUBMITTED: { labelKey: 'admin.awaitingReview', tone: 'pending' },
  UNDER_INVESTIGATION: { labelKey: 'admin.underInvestigation', tone: 'danger' },
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
                        <strong className="block text-sm font-medium text-navy">{application.businessName || 'Individual host'}</strong>
                        <span className="mt-0.5 block text-xs text-muted">{application.businessType ? String(application.businessType).replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Type not set'}</span>
                      </TableCell>
                      <TableCell>
                        <strong className="block text-sm font-medium text-navy">{application.city || 'Area not set'}</strong>
                        <span className="mt-0.5 block text-xs text-muted">{application.propertyCount ? `${application.propertyCount} propert${application.propertyCount === 1 ? 'y' : 'ies'}` : 'Count not set'}</span>
                      </TableCell>
                      <TableCell>
                        <strong className="block text-right text-sm font-medium text-navy">
                          <span className="tabular-nums">{application.documents?.length || 0} encrypted</span>
                        </strong>
                        <span className="mt-0.5 block text-right text-xs text-muted">{application.documents?.length ? 'Ready to inspect' : 'No files uploaded'}</span>
                      </TableCell>
                      <TableCell>
                        <strong className="block text-sm font-medium text-navy">{formatDate(application.updatedAt || application.submittedAt)}</strong>
                        <span className="mt-0.5 block text-xs text-muted">{application.reviewedAt ? `Reviewed ${formatDate(application.reviewedAt)}` : 'Not reviewed yet'}</span>
                      </TableCell>
                      <TableCell><Badge color={BADGE_COLORS[meta.tone] || 'gray'}>{statusLabel}</Badge></TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          {/* The whole application is reviewed on its own page, so
                              a long record never has to fit inside a dialog. */}
                          <Button as={Link} to={`/admin/host-applications/${application.id}`} size="xs">Review</Button>
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
    </div>
  );
}

export default AdminHostApplications;
