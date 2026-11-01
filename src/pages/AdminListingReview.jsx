import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Label, Modal, ModalBody, ModalFooter, ModalHeader, Textarea } from 'flowbite-react';
import { ExternalLink, House, Search } from 'lucide-react';
import apiClient from '../api/client.js';
import SelectMenu from '../components/SelectMenu.jsx';
import AdminPageHeader from '../components/admin/AdminPageHeader.jsx';
import AdminPagination from '../components/admin/AdminPagination.jsx';
import EmptyState from '../components/admin/EmptyState.jsx';
import MetricCard from '../components/admin/MetricCard.jsx';
import Panel, { PanelFooter, PanelHead } from '../components/admin/Panel.jsx';
import { StateBadge } from '../components/admin/StatusBadge.jsx';
import usePagedResource from '../hooks/usePagedResource.js';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'PENDING_REVIEW', label: 'Awaiting review' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ALL', label: 'All listings' },
];

// Statuses that get a headline count. Each needs its own request because the
// list endpoint returns one status at a time; four `limit: 1` calls are cheap
// and give real platform totals instead of counting the page on screen.
const COUNTED_STATUSES = ['PENDING_REVIEW', 'PUBLISHED', 'SUSPENDED', 'REJECTED'];

/** Which decisions make sense for a listing in a given state. */
function decisionsFor(status) {
  if (status === 'PENDING_REVIEW') return ['reject', 'approve'];
  if (status === 'PUBLISHED') return ['suspend'];
  if (status === 'SUSPENDED') return ['unsuspend'];
  if (status === 'REJECTED') return ['approve'];
  return [];
}

const DECISION_LABELS = {
  approve: 'Approve',
  reject: 'Reject',
  suspend: 'Suspend',
  unsuspend: 'Restore',
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export default function AdminListingReview() {
  // The queue defaults to what actually needs a decision, not to a flat list of
  // everything the platform has ever hosted.
  const [filter, setFilter] = useState('PENDING_REVIEW');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [counts, setCounts] = useState({});
  const [countsFailed, setCountsFailed] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const params = useMemo(() => {
    const next = { sort: 'oldest' };
    if (filter !== 'ALL') next.status = filter;
    if (debouncedSearch) next.search = debouncedSearch;
    return next;
  }, [filter, debouncedSearch]);

  const { data: listings, pagination, setPage, loading, error, refetch } = usePagedResource(
    '/admin/properties',
    params,
    { limit: PAGE_SIZE },
  );

  const loadCounts = useCallback(async () => {
    try {
      const results = await Promise.all(COUNTED_STATUSES.map(async (status) => {
        const res = await apiClient.get('/admin/properties', { params: { status, limit: 1, page: 1 } });
        return [status, res.data?.pagination?.total ?? 0];
      }));
      setCounts(Object.fromEntries(results));
      setCountsFailed(false);
    } catch (cause) {
      // The queue must still work when only the summary fails, but a silent
      // zero would read as "nothing pending", so the failure is surfaced.
      console.error('Listing status totals failed:', cause);
      setCountsFailed(true);
    }
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, setPage]);

  async function review(listing, action) {
    if (action === 'reject' && !note.trim()) {
      setActionError('A reason is required to reject a listing.');
      return;
    }
    setBusy(true);
    setActionError('');
    try {
      await apiClient.patch(`/admin/properties/${listing.id}/review`, {
        action,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setReviewing(null);
      setNote('');
      // Refetch instead of patching the row locally: two admins working the
      // queue at once would otherwise overwrite each other with stale states.
      refetch();
      loadCounts();
    } catch (cause) {
      setActionError(cause.response?.data?.error || 'The review could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  const decisions = reviewing ? decisionsFor(reviewing.status) : [];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Listing approvals"
        description="Approve, reject or suspend what hosts submit. Hosts create and edit their own listings."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Awaiting review"
          value={counts.PENDING_REVIEW ?? '-'}
          note="Oldest submission first"
          tone={(counts.PENDING_REVIEW ?? 0) > 0 ? 'warning' : 'default'}
        />
        <MetricCard label="Published" value={counts.PUBLISHED ?? '-'} note="Live to guests" tone="positive" />
        <MetricCard label="Suspended" value={counts.SUSPENDED ?? '-'} note="Hidden from guests" />
        <MetricCard label="Rejected" value={counts.REJECTED ?? '-'} note="Sent back for changes" />
      </div>

      {countsFailed && (
        <p className="text-xs font-medium text-[#B42318]" role="alert">
          Status totals could not be refreshed. The queue below is still live.
        </p>
      )}

      <Panel>
        <PanelHead
          title="Review queue"
          subtitle={filter === 'ALL' ? 'Every listing, oldest first' : 'Oldest first, so the longest wait is at the top'}
          actions={(
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.8} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title or area"
                aria-label="Search listings by title or area"
                className="h-9 w-full rounded-lg border border-border bg-elevated pl-9 pr-3 text-sm text-charcoal placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-60"
              />
            </div>
          )}
        />

        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
          <label htmlFor="listing-review-filter" className="text-xs font-semibold uppercase tracking-wide text-muted">Show</label>
          <SelectMenu
            id="listing-review-filter"
            ariaLabel="Filter listings by status"
            wrapperClassName="w-full sm:w-[240px]"
            value={filter}
            onChange={(next) => { setFilter(next); setPage(1); }}
            options={STATUS_OPTIONS}
          />
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-muted">Loading listings...</div>
        ) : error ? (
          <EmptyState
            kind="error"
            title="Listings could not be loaded"
            description={error}
            action={<Button color="light" type="button" onClick={refetch}>Try again</Button>}
          />
        ) : listings.length === 0 ? (
          <EmptyState
            title={filter === 'PENDING_REVIEW' ? 'Nothing waiting for review' : 'No listings in this view'}
            description={filter === 'PENDING_REVIEW'
              ? 'Every submitted listing has been decided. New submissions appear here oldest first.'
              : 'Try another status, or clear the search.'}
          />
        ) : (
          <ul className="divide-y divide-border">
            {listings.map((listing) => (
              <li key={listing.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                {listing.images?.[0] ? (
                  <img src={listing.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-navy dark:bg-primary/15">
                    <House className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-semibold text-navy">{listing.title}</strong>
                  <small className="mt-1 block text-xs text-muted">
                    {listing.location || listing.neighborhood || 'Location pending'}
                    {' '} &middot; {listing.images?.length || 0} photos
                    {' '} &middot; submitted {formatDate(listing.submittedAt || listing.createdAt)}
                  </small>
                </div>
                <StateBadge state={listing.status} />
                <div className="flex items-center gap-3">
                  <Link
                    to={`/admin/properties/${listing.id}`}
                    className="text-sm font-semibold text-primary-600 hover:underline"
                  >
                    Preview
                  </Link>
                  {decisionsFor(listing.status).length > 0 && (
                    <Button size="xs" type="button" onClick={() => { setReviewing(listing); setNote(''); setActionError(''); }}>
                      Decide
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && !error && listings.length > 0 && (
          <PanelFooter>
            <AdminPagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              noun="listing"
              onChange={setPage}
            />
          </PanelFooter>
        )}
      </Panel>

      {reviewing && (
        <Modal show onClose={() => setReviewing(null)} size="lg" dismissible>
          <ModalHeader>Review {reviewing.title}</ModalHeader>
          <ModalBody className="space-y-4">
            <p className="text-sm text-charcoal">Check the listing details and photos before making a decision.</p>
            {/* A new tab on purpose: the decision modal and any note typed into
                it survive while the admin reads the full listing. */}
            <Link
              to={`/admin/properties/${reviewing.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline"
            >
              Open full listing <ExternalLink className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </Link>
            {actionError && <p className="text-sm font-medium text-[#B42318]" role="alert">{actionError}</p>}
            <div>
              <Label htmlFor="review-note" value="Reason or note (required for rejection)" />
              <Textarea id="review-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="light" type="button" onClick={() => setReviewing(null)}>Cancel</Button>
            {decisions.map((action) => (
              <Button
                key={action}
                type="button"
                color={action === 'reject' || action === 'suspend' ? 'failure' : 'success'}
                disabled={busy}
                onClick={() => review(reviewing, action)}
              >
                {busy ? 'Working...' : DECISION_LABELS[action]}
              </Button>
            ))}
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
