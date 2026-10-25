import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalHeader,
  Spinner,
  TextInput,
} from 'flowbite-react';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  Flag,
  RefreshCw,
  ScrollText,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import apiClient from '../api/client.js';
import SelectMenu from '../components/SelectMenu.jsx';

const EVENT_TYPES = [
  { value: '', label: 'All recorded activity' },
  { value: 'APPLICATION', label: 'Host applications' },
  { value: 'VERIFICATION', label: 'Identity verification' },
  { value: 'DISPUTE', label: 'Disputes' },
  { value: 'ACCOUNT', label: 'Admin accounts' },
];

const EVENT_META = {
  APPLICATION: { label: 'Application', tone: 'info', icon: ClipboardCheck },
  VERIFICATION: { label: 'Verification', tone: 'warning', icon: ShieldCheck },
  DISPUTE: { label: 'Dispute', tone: 'failure', icon: Flag },
  ACCOUNT: { label: 'Account', tone: 'gray', icon: Users },
};

// Shared surface styles so the audit panel and the roles aside stay identical.
const PANEL = 'overflow-hidden rounded-xl border border-border bg-white shadow-sm';
const PANEL_HEAD = 'flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between';
const PANEL_TITLE = 'text-base font-semibold text-navy';
const PANEL_SUBTITLE = 'text-xs text-muted';
const METRIC_CARD = 'rounded-xl border border-border bg-white p-5 shadow-sm';
const METRIC_LABEL = 'text-[11px] font-semibold uppercase tracking-wide text-muted';
const METRIC_VALUE = 'mt-2 block text-2xl font-bold text-navy';
const METRIC_NOTE = 'mt-1 block text-xs text-muted';
const ICON_TILE = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-navy';
const LIST_ROW = 'flex flex-col gap-3 border-b border-border px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between';
const EMPTY_STATE = 'flex flex-col items-center gap-2 px-5 py-12 text-center';

function formatDate(value, withTime = false) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-GB', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

function userLabel(user) {
  const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  return name || user?.email || 'Unknown user';
}

function AdminGovernance() {
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const responses = await Promise.all([
        apiClient.get('/admin/users', { params: { limit: 100 } }),
        apiClient.get('/admin/host-applications', { params: { limit: 100 } }),
        apiClient.get('/admin/identity-verifications', { params: { limit: 100 } }),
        apiClient.get('/admin/disputes', { params: { limit: 100 } }),
      ]);
      setUsers(responses[0].data.data || []);
      setApplications(responses[1].data.data || []);
      setVerifications(responses[2].data.data || []);
      setDisputes(responses[3].data.data || []);
    } catch (cause) {
      setError(cause.response?.data?.error || 'Governance records could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [query, typeFilter]);

  const events = useMemo(() => {
    const applicationEvents = applications.flatMap((application) => (application.auditLogs || []).map((entry) => ({
      id: `application-${entry.id}`,
      type: 'APPLICATION',
      title: `${String(entry.action || 'Application updated').replaceAll('_', ' ')} · ${application.businessName || application.legalName || userLabel(application.user)}`,
      meta: entry.note || `Application status: ${String(application.status || '').replaceAll('_', ' ').toLowerCase()}`,
      actorId: entry.actorId || null,
      createdAt: entry.createdAt,
      record: application.id,
      to: '/admin/host-applications',
    })));

    const verificationEvents = verifications.filter((verification) => verification.reviewedAt).map((verification) => ({
      id: `verification-${verification.id}`,
      type: 'VERIFICATION',
      title: `${verification.status === 'APPROVED' ? 'Identity approved' : 'Identity changes requested'} · ${userLabel(verification.user)}`,
      meta: verification.reviewNote || `Current status: ${String(verification.status || '').replaceAll('_', ' ').toLowerCase()}`,
      actorId: verification.reviewedBy || null,
      createdAt: verification.reviewedAt,
      record: verification.id,
      to: '/admin/trust-safety',
    }));

    const disputeEvents = disputes.flatMap((dispute) => (dispute.auditLogs || []).map((entry) => ({
      id: `dispute-${entry.id}`,
      type: 'DISPUTE',
      title: `${String(entry.action || 'Dispute updated').replaceAll('_', ' ')} · ${dispute.booking?.property?.title || 'Booking dispute'}`,
      meta: entry.note || `Current status: ${String(dispute.status || '').replaceAll('_', ' ').toLowerCase()}`,
      actorId: entry.actorId || null,
      createdAt: entry.createdAt,
      record: dispute.id,
      to: '/admin/trust-safety',
    })));

    const accountEvents = users.filter((user) => user.role === 'ADMIN').map((user) => ({
      id: `account-${user.id}`,
      type: 'ACCOUNT',
      title: `Admin account created · ${userLabel(user)}`,
      meta: user.email || 'Email not supplied',
      actorId: null,
      createdAt: user.createdAt,
      record: user.id,
      to: '/admin/users',
    }));

    return [...applicationEvents, ...verificationEvents, ...disputeEvents, ...accountEvents]
      .filter((event) => event.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [applications, disputes, users, verifications]);

  const filteredEvents = useMemo(() => {
    const term = query.trim().toLowerCase();
    return events.filter((event) => {
      if (typeFilter && event.type !== typeFilter) return false;
      if (!term) return true;
      return [event.title, event.meta, event.actorId, event.record].filter(Boolean).join(' ').toLowerCase().includes(term);
    });
  }, [events, query, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / 8));
  const visibleEvents = filteredEvents.slice((page - 1) * 8, page * 8);

  const adminUsers = users.filter((user) => user.role === 'ADMIN');
  const reviewsToday = [...verifications, ...applications]
    .filter((record) => record.reviewedAt && new Date(record.reviewedAt).toDateString() === new Date().toDateString())
    .length;
  const openCases = disputes.filter((dispute) => dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW').length;
  const roleCounts = {
    GUEST: users.filter((user) => user.role === 'USER').length,
    HOST: users.filter((user) => user.role === 'HOST').length,
    ADMIN: adminUsers.length,
    SUSPENDED: users.filter((user) => user.suspended).length,
  };

  return (
    <div className="space-y-6" data-openpencil-frame="0:7458">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">ZURILOFTS · ADMIN · GOVERNANCE</p>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Governance and audit</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">Admin access, recorded reviews and operational history across the platform.</p>
        </div>
        <Button color="light" disabled={refreshing} onClick={() => load(true)}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.8} aria-hidden="true" />
          {refreshing ? 'Refreshing' : 'Refresh records'}
        </Button>
      </div>

      {error && <Alert color="failure" role="alert">{error}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className={METRIC_CARD}>
          <span className={METRIC_LABEL}>ADMIN USERS</span>
          <strong className={METRIC_VALUE}>{adminUsers.length}</strong>
          <small className={METRIC_NOTE}>Accounts with admin access</small>
        </article>
        <article className={METRIC_CARD}>
          <span className={METRIC_LABEL}>RECORDED ACTIVITY</span>
          <strong className={METRIC_VALUE}>{events.length}</strong>
          <small className={METRIC_NOTE}>Available audit records</small>
        </article>
        <article className={METRIC_CARD}>
          <span className={METRIC_LABEL}>OPEN CASES</span>
          <strong className={METRIC_VALUE}>{openCases}</strong>
          <small className={METRIC_NOTE}>Disputes needing attention</small>
        </article>
        <article className={METRIC_CARD}>
          <span className={METRIC_LABEL}>REVIEWS TODAY</span>
          <strong className={METRIC_VALUE}>{reviewsToday}</strong>
          <small className={METRIC_NOTE}>Applications and identities</small>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className={`${PANEL} lg:col-span-2`} aria-labelledby="audit-log-title">
          <div className={PANEL_HEAD}>
            <div>
              <h2 id="audit-log-title" className={PANEL_TITLE}>Audit activity</h2>
              <p className={PANEL_SUBTITLE}>Recorded application, identity and dispute actions, newest first.</p>
            </div>
            <Badge color="info">{filteredEvents.length} records</Badge>
          </div>

          <div className="flex flex-col gap-3 border-b border-border px-5 py-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.8} aria-hidden="true" />
              <TextInput
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search action, record or actor"
                aria-label="Search governance activity"
                className="pl-9"
              />
            </div>
            <SelectMenu value={typeFilter} onChange={(next) => setTypeFilter(next)} ariaLabel="Filter audit activity by type" options={EVENT_TYPES} wrapperClassName="w-full sm:w-56" />
          </div>

          {loading ? (
            <div className={EMPTY_STATE}>
              <Spinner size="lg" aria-hidden="true" />
              <strong className="text-sm font-semibold text-navy">Loading governance records</strong>
              <p className="text-xs text-muted">Fetching account, application, verification and dispute history.</p>
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className={EMPTY_STATE}>
              <ScrollText className="h-6 w-6 text-muted" strokeWidth={1.6} aria-hidden="true" />
              <strong className="text-sm font-semibold text-navy">No activity matches this view</strong>
              <p className="text-xs text-muted">Try another record type or clear the search.</p>
            </div>
          ) : (
            <div>
              {visibleEvents.map((event) => {
                const meta = EVENT_META[event.type];
                const EventIcon = meta.icon;
                return (
                  <article className={LIST_ROW} key={event.id}>
                    <span className={ICON_TILE} aria-hidden="true"><EventIcon strokeWidth={1.8} /></span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-semibold text-navy">{event.title}</strong>
                      <span className="block text-xs text-muted">{event.meta} · {formatDate(event.createdAt, true)}</span>
                    </div>
                    <Badge color={meta.tone}>{meta.label}</Badge>
                    <Button size="xs" color="light" onClick={() => setSelectedEvent(event)}>
                      <Eye className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />Detail
                    </Button>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted">Showing {filteredEvents.length === 0 ? 0 : (page - 1) * 8 + 1}-{Math.min(page * 8, filteredEvents.length)} of {filteredEvents.length}</span>
            <div className="flex items-center gap-2">
              <Button color="light" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                <ChevronLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />Previous
              </Button>
              <Button color="light" size="sm" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
                Next<ChevronRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>

        <aside className={PANEL} aria-labelledby="roles-title">
          <div className={PANEL_HEAD}>
            <div>
              <h2 id="roles-title" className={PANEL_TITLE}>Roles and permissions</h2>
              <p className={PANEL_SUBTITLE}>Actual account distribution in the loaded workspace data.</p>
            </div>
          </div>
          <div>
            {Object.entries(roleCounts).map(([role, count]) => (
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 last:border-0" key={role}>
                <span className="text-sm text-charcoal">{role === 'GUEST' ? 'Guests' : role === 'HOST' ? 'Hosts' : role === 'ADMIN' ? 'Administrators' : 'Suspended accounts'}</span>
                <strong className="text-sm font-semibold text-navy">{count}</strong>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3 border-t border-border bg-surface px-5 py-4">
            <span className={ICON_TILE} aria-hidden="true"><ShieldCheck strokeWidth={1.8} /></span>
            <div>
              <strong className="block text-sm font-semibold text-navy">Admin access is privilege-gated</strong>
              <p className="mt-1 text-xs leading-relaxed text-muted">Every admin endpoint is protected by the server-side role check. Host privileges remain application-controlled.</p>
            </div>
          </div>
        </aside>
      </div>

      <Modal show={Boolean(selectedEvent)} onClose={() => setSelectedEvent(null)} size="lg" dismissible>
        {selectedEvent && (
          <>
            <ModalHeader>{EVENT_META[selectedEvent.type].label} record</ModalHeader>
            <ModalBody>
              <div className="flex items-start gap-3">
                <span className={ICON_TILE} aria-hidden="true">
                  {(() => { const Icon = EVENT_META[selectedEvent.type].icon; return <Icon strokeWidth={1.8} />; })()}
                </span>
                <div className="min-w-0">
                  <Badge color={EVENT_META[selectedEvent.type].tone}>{EVENT_META[selectedEvent.type].label}</Badge>
                  <h3 className="mt-2 text-base font-semibold text-navy">{selectedEvent.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-charcoal">{selectedEvent.meta}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <p>
                  <span className={METRIC_LABEL}>Recorded</span>
                  <strong className="mt-1 block text-sm font-semibold text-navy">{formatDate(selectedEvent.createdAt, true)}</strong>
                </p>
                <p>
                  <span className={METRIC_LABEL}>Actor ID</span>
                  <strong className="mt-1 block break-all text-sm font-semibold text-navy">{selectedEvent.actorId || 'Not recorded'}</strong>
                </p>
                <p>
                  <span className={METRIC_LABEL}>Record ID</span>
                  <strong className="mt-1 block break-all text-sm font-semibold text-navy">{selectedEvent.record}</strong>
                </p>
              </div>
            </ModalBody>
            <div className="flex flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
              <Button color="light" onClick={() => setSelectedEvent(null)}>Close</Button>
              <Button as={Link} to={selectedEvent.to}>Open related workspace</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export default AdminGovernance;
