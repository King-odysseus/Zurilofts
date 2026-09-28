import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalHeader,
  Select,
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
    <div className="op-admin-overview op-admin-governance" data-openpencil-frame="0:7458">
      <div className="op-admin-trust-hero">
        <div>
          <p className="op-admin-eyebrow">ZURILOFTS · ADMIN · GOVERNANCE</p>
          <h1>Governance and audit</h1>
          <p>Admin access, recorded reviews and operational history across the platform.</p>
        </div>
        <Button color="light" disabled={refreshing} onClick={() => load(true)} className="op-admin-trust-refresh">
          <RefreshCw className={refreshing ? 'is-spinning' : ''} strokeWidth={1.8} aria-hidden="true" />
          {refreshing ? 'Refreshing' : 'Refresh records'}
        </Button>
      </div>

      {error && <div className="op-admin-error" role="alert">{error}</div>}

      <div className="op-admin-metrics op-admin-governance-metrics">
        <article><span>ADMIN USERS</span><strong>{adminUsers.length}</strong><small>Accounts with admin access</small></article>
        <article><span>RECORDED ACTIVITY</span><strong>{events.length}</strong><small>Available audit records</small></article>
        <article><span>OPEN CASES</span><strong>{openCases}</strong><small>Disputes needing attention</small></article>
        <article><span>REVIEWS TODAY</span><strong>{reviewsToday}</strong><small>Applications and identities</small></article>
      </div>

      <div className="op-admin-governance-grid">
        <section className="op-admin-trust-panel op-admin-governance-audit" aria-labelledby="audit-log-title">
          <div className="op-admin-trust-panel-head">
            <div>
              <h2 id="audit-log-title">Audit activity</h2>
              <p>Recorded application, identity and dispute actions, newest first.</p>
            </div>
            <Badge color="info">{filteredEvents.length} records</Badge>
          </div>

          <div className="op-admin-governance-toolbar">
            <div className="op-admin-governance-search">
              <Search strokeWidth={1.8} aria-hidden="true" />
              <TextInput
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search action, record or actor"
                aria-label="Search governance activity"
              />
            </div>
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter audit activity by type">
              {EVENT_TYPES.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </Select>
          </div>

          {loading ? (
            <div className="op-admin-trust-empty">
              <span className="op-admin-booking-spinner" aria-hidden="true" />
              <strong>Loading governance records</strong>
              <p>Fetching account, application, verification and dispute history.</p>
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className="op-admin-trust-empty">
              <ScrollText strokeWidth={1.6} aria-hidden="true" />
              <strong>No activity matches this view</strong>
              <p>Try another record type or clear the search.</p>
            </div>
          ) : (
            <div className="op-admin-governance-list">
              {visibleEvents.map((event) => {
                const meta = EVENT_META[event.type];
                const EventIcon = meta.icon;
                return (
                  <article className="op-admin-governance-row" key={event.id}>
                    <span className={`op-admin-governance-icon is-${meta.tone}`} aria-hidden="true"><EventIcon strokeWidth={1.8} /></span>
                    <div className="op-admin-governance-copy">
                      <strong>{event.title}</strong>
                      <span>{event.meta} · {formatDate(event.createdAt, true)}</span>
                    </div>
                    <Badge color={meta.tone}>{meta.label}</Badge>
                    <Button size="xs" color="light" onClick={() => setSelectedEvent(event)}>
                      <Eye strokeWidth={1.8} aria-hidden="true" />Detail
                    </Button>
                  </article>
                );
              })}
            </div>
          )}

          <div className="op-admin-governance-footer">
            <span>Showing {filteredEvents.length === 0 ? 0 : (page - 1) * 8 + 1}–{Math.min(page * 8, filteredEvents.length)} of {filteredEvents.length}</span>
            <div>
              <Button color="light" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                <ChevronLeft strokeWidth={1.8} aria-hidden="true" />Previous
              </Button>
              <Button color="light" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
                Next<ChevronRight strokeWidth={1.8} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>

        <aside className="op-admin-trust-panel op-admin-governance-roles" aria-labelledby="roles-title">
          <div className="op-admin-trust-panel-head">
            <div>
              <h2 id="roles-title">Roles and permissions</h2>
              <p>Actual account distribution in the loaded workspace data.</p>
            </div>
          </div>
          <div className="op-admin-governance-role-list">
            {Object.entries(roleCounts).map(([role, count]) => (
              <div key={role}>
                <span>{role === 'GUEST' ? 'Guests' : role === 'HOST' ? 'Hosts' : role === 'ADMIN' ? 'Administrators' : 'Suspended accounts'}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          <div className="op-admin-governance-role-note">
            <ShieldCheck strokeWidth={1.8} aria-hidden="true" />
            <div>
              <strong>Admin access is privilege-gated</strong>
              <p>Every admin endpoint is protected by the server-side role check. Host privileges remain application-controlled.</p>
            </div>
          </div>
        </aside>
      </div>

      <Modal show={Boolean(selectedEvent)} onClose={() => setSelectedEvent(null)} size="lg" dismissible className="op-admin-trust-modal">
        {selectedEvent && (
          <>
            <ModalHeader>{EVENT_META[selectedEvent.type].label} record</ModalHeader>
            <ModalBody>
              <div className="op-admin-governance-detail">
                <div className={`op-admin-governance-icon is-${EVENT_META[selectedEvent.type].tone}`} aria-hidden="true">
                  {(() => { const Icon = EVENT_META[selectedEvent.type].icon; return <Icon strokeWidth={1.8} />; })()}
                </div>
                <div>
                  <Badge color={EVENT_META[selectedEvent.type].tone}>{EVENT_META[selectedEvent.type].label}</Badge>
                  <h3>{selectedEvent.title}</h3>
                  <p>{selectedEvent.meta}</p>
                </div>
              </div>
              <div className="op-admin-governance-detail-grid">
                <p><span>Recorded</span><strong>{formatDate(selectedEvent.createdAt, true)}</strong></p>
                <p><span>Actor ID</span><strong>{selectedEvent.actorId || 'Not recorded'}</strong></p>
                <p><span>Record ID</span><strong>{selectedEvent.record}</strong></p>
              </div>
            </ModalBody>
            <div className="op-admin-governance-modal-actions">
              <Button color="light" onClick={() => setSelectedEvent(null)}>Close</Button>
              <Button as={Link} to={selectedEvent.to} className="op-admin-bronze-button">Open related workspace</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export default AdminGovernance;
