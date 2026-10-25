import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from 'flowbite-react';
import { Search, Star } from 'lucide-react';
import apiClient from '../api/client.js';
import SelectMenu from '../components/SelectMenu.jsx';

function StarRow({ rating, size = 'sm' }) {
  const iconSize = size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconSize} ${star <= rating ? 'text-primary-600' : 'text-silver'}`}
          fill="currentColor"
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function SearchIcon() {
  return <Search strokeWidth={1.8} aria-hidden="true" />;
}

function formatDate(value, includeTime = false) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString('en-GB', includeTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

function AdminFeedback() {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await apiClient.get('/admin/reviews', { params: { limit: 100 } });
        setReviews(response.data.data || []);
        setSummary(response.data.summary || { averageRating: 0, totalReviews: 0 });
      } catch (requestError) {
        setError(requestError.response?.data?.error || 'Failed to load feedback');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const visibleReviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reviews.filter((review) => {
      if (ratingFilter && Number(review.rating) !== Number(ratingFilter)) return false;
      if (!query) return true;
      return [
        review.property?.title,
        review.property?.location,
        review.user?.firstName,
        review.user?.lastName,
        review.user?.email,
        review.publicComment,
        review.privateNote,
      ].filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [reviews, ratingFilter, search]);

  const metrics = useMemo(() => ({
    publicReviews: visibleReviews.filter((review) => review.publicComment?.trim()).length,
    privateNotes: visibleReviews.filter((review) => review.privateNote?.trim()).length,
    fiveStar: visibleReviews.filter((review) => Number(review.rating) === 5).length,
  }), [visibleReviews]);

  return (
    <div className="space-y-6" data-openpencil-frame="0:7343">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">ZURILOFTS · ADMIN · CONTENT</p>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Guest feedback</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">Review public ratings, guest comments, and private operational notes after completed stays.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm"><span className="text-[11px] font-semibold uppercase tracking-wide text-muted">AVERAGE RATING</span><strong className="mt-2 block text-2xl font-bold text-navy">{Number(summary.averageRating || 0).toFixed(2)}</strong><div className="mt-1"><StarRow rating={Math.round(summary.averageRating || 0)} size="lg" /></div><small className="mt-1 block text-xs text-muted">Across all completed-stay reviews</small></article>
        <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm"><span className="text-[11px] font-semibold uppercase tracking-wide text-muted">TOTAL REVIEWS</span><strong className="mt-2 block text-2xl font-bold text-navy">{summary.totalReviews || 0}</strong><small className="mt-1 block text-xs text-muted">Published rating records</small></article>
        <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm"><span className="text-[11px] font-semibold uppercase tracking-wide text-muted">FIVE-STAR REVIEWS</span><strong className="mt-2 block text-2xl font-bold text-navy">{metrics.fiveStar}</strong><small className="mt-1 block text-xs text-muted">Highest-rated guest experiences</small></article>
        <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm"><span className="text-[11px] font-semibold uppercase tracking-wide text-muted">PRIVATE NOTES</span><strong className="mt-2 block text-2xl font-bold text-navy">{metrics.privateNotes}</strong><small className="mt-1 block text-xs text-muted">Operational notes never shown publicly</small></article>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-elevated shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><SearchIcon /></span>
            <TextInput type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search property, guest or review" aria-label="Search guest feedback" className="pl-9" />
          </div>
          <SelectMenu
            ariaLabel="Filter feedback by rating"
            value={ratingFilter}
            onChange={(next) => setRatingFilter(next)}
            wrapperClassName="sm:w-44"
            options={[
              { value: '', label: 'All ratings' },
              ...[5, 4, 3, 2, 1].map((rating) => ({ value: String(rating), label: `${rating} star${rating === 1 ? '' : 's'}` })),
            ]}
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Spinner size="lg" />
            <strong className="text-sm font-semibold text-navy">Loading guest feedback</strong>
            <p className="text-xs text-muted">Checking ratings, public reviews, and private stay notes.</p>
          </div>
        ) : error ? (
          <Alert color="failure" className="m-5">
            <strong className="block">Feedback could not be loaded</strong>
            <p>{error}</p>
          </Alert>
        ) : visibleReviews.length === 0 ? (
          <Alert color="info" className="m-5">
            <span aria-hidden="true"><SearchIcon /></span>
            <strong className="block">No feedback found</strong>
            <p>Adjust the rating filter or search terms.</p>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table hoverable aria-label="Guest feedback">
              <TableHead>
                <TableRow>
                  <TableHeadCell>PROPERTY</TableHeadCell>
                  <TableHeadCell>GUEST</TableHeadCell>
                  <TableHeadCell>RATING</TableHeadCell>
                  <TableHeadCell>PUBLIC REVIEW</TableHeadCell>
                  <TableHeadCell>DATE</TableHeadCell>
                  <TableHeadCell>ACTION</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell><div className="flex flex-col gap-1"><strong className="text-sm font-semibold text-navy">{review.property?.title || 'Property unavailable'}</strong><span className="text-xs text-muted">{review.property?.location || 'Location not recorded'}</span></div></TableCell>
                    <TableCell><div className="flex flex-col gap-1"><strong className="text-sm font-semibold text-navy">{review.user?.firstName} {review.user?.lastName}</strong><span className="text-xs text-muted">{review.user?.email || 'Email not available'}</span></div></TableCell>
                    <TableCell><div className="flex flex-col gap-1"><StarRow rating={Number(review.rating) || 0} /><small className="text-xs text-muted">{review.rating}/5</small></div></TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-charcoal">{review.publicComment || 'No public review was submitted.'}</p>
                        <span className="text-xs text-muted">{review.privateNote ? 'Includes a private operational note' : 'No private note supplied'}</span>
                      </div>
                    </TableCell>
                    <TableCell><div className="flex flex-col gap-1"><small className="text-[11px] font-semibold uppercase tracking-wide text-muted">SUBMITTED</small><strong className="text-sm font-semibold text-navy">{formatDate(review.createdAt)}</strong><span className="text-xs text-muted">{review.privateNote ? 'Private note attached' : 'Public only'}</span></div></TableCell>
                    <TableCell><div className="flex flex-wrap items-center gap-2"><Button size="xs" color="light" onClick={() => setSelected(review)}>View</Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Modal show={Boolean(selected)} onClose={() => setSelected(null)} size="lg" dismissible>
        {selected && (
          <>
            <ModalHeader>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">GUEST REVIEW · {selected.rating}/5</span>
              <span className="block text-base font-semibold text-navy">{selected.property?.title || 'Guest feedback'}</span>
            </ModalHeader>
            <ModalBody>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Guest</span><strong className="mt-1 block text-sm font-semibold text-navy">{selected.user?.firstName} {selected.user?.lastName}</strong><small className="block text-xs text-muted">{selected.user?.email}</small></div>
                <div><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Stay location</span><strong className="mt-1 block text-sm font-semibold text-navy">{selected.property?.location || 'Not recorded'}</strong><small className="block text-xs text-muted">{formatDate(selected.createdAt, true)}</small></div>
                <div><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Rating</span><div className="mt-1"><StarRow rating={Number(selected.rating) || 0} size="lg" /></div><small className="block text-xs text-muted">{selected.rating} out of 5</small></div>
              </div>
              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div><span className="text-[11px] font-semibold uppercase tracking-wide text-muted">PUBLIC REVIEW</span><p className="mt-1 text-sm leading-relaxed text-charcoal">{selected.publicComment || 'No public review was submitted.'}</p></div>
                <div className="rounded-lg border border-border bg-surface p-3"><span className="text-[11px] font-semibold uppercase tracking-wide text-muted">PRIVATE OPERATIONAL NOTE</span><p className="mt-1 text-sm leading-relaxed text-charcoal">{selected.privateNote || 'No private note was supplied.'}</p></div>
              </section>
            </ModalBody>
            <ModalFooter>
              <Button color="light" onClick={() => setSelected(null)}>Close</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}

export default AdminFeedback;
