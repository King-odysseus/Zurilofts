import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
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
  return (
    <span className={`op-admin-feedback-stars is-${size}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={star <= rating ? 'is-filled' : ''} fill="currentColor" aria-hidden="true" />
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
    <div className="op-admin-overview op-admin-feedback" data-openpencil-frame="0:7343">
      <div className="op-admin-heading op-admin-feedback-heading">
        <div>
          <p className="op-admin-eyebrow">ZURILOFTS · ADMIN · CONTENT</p>
          <h1>Guest feedback</h1>
          <p>Review public ratings, guest comments, and private operational notes after completed stays.</p>
        </div>
      </div>

      <div className="op-admin-metrics op-admin-catalog-metrics">
        <article className="op-admin-feedback-rating-card"><span>AVERAGE RATING</span><strong>{Number(summary.averageRating || 0).toFixed(2)}</strong><StarRow rating={Math.round(summary.averageRating || 0)} size="lg" /><small>Across all completed-stay reviews</small></article>
        <article><span>TOTAL REVIEWS</span><strong>{summary.totalReviews || 0}</strong><small>Published rating records</small></article>
        <article><span>FIVE-STAR REVIEWS</span><strong>{metrics.fiveStar}</strong><small>Highest-rated guest experiences</small></article>
        <article><span>PRIVATE NOTES</span><strong>{metrics.privateNotes}</strong><small>Operational notes never shown publicly</small></article>
      </div>

      <section className="op-admin-catalog-board">
        <div className="op-admin-catalog-toolbar op-admin-feedback-toolbar">
          <div className="op-admin-catalog-search"><SearchIcon /><TextInput type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search property, guest or review" aria-label="Search guest feedback" /></div>
          <SelectMenu
            ariaLabel="Filter feedback by rating"
            value={ratingFilter}
            onChange={(next) => setRatingFilter(next)}
            className="op-admin-feedback-filter"
            options={[
              { value: '', label: 'All ratings' },
              ...[5, 4, 3, 2, 1].map((rating) => ({ value: String(rating), label: `${rating} star${rating === 1 ? '' : 's'}` })),
            ]}
          />
        </div>

        {loading ? (
          <div className="op-admin-catalog-empty"><span className="op-admin-booking-spinner" aria-hidden="true" /><strong>Loading guest feedback</strong><p>Checking ratings, public reviews, and private stay notes.</p></div>
        ) : error ? (
          <Alert color="failure" className="op-admin-catalog-empty"><strong>Feedback could not be loaded</strong><p>{error}</p></Alert>
        ) : visibleReviews.length === 0 ? (
          <Alert color="info" className="op-admin-catalog-empty"><span aria-hidden="true"><SearchIcon /></span><strong>No feedback found</strong><p>Adjust the rating filter or search terms.</p></Alert>
        ) : (
          <div className="op-admin-catalog-list">
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
                    <TableCell className="op-admin-feedback-property"><strong>{review.property?.title || 'Property unavailable'}</strong><span>{review.property?.location || 'Location not recorded'}</span></TableCell>
                    <TableCell className="op-admin-feedback-guest"><strong>{review.user?.firstName} {review.user?.lastName}</strong><span>{review.user?.email || 'Email not available'}</span></TableCell>
                    <TableCell className="op-admin-catalog-cell"><StarRow rating={Number(review.rating) || 0} /><small className="op-admin-feedback-score">{review.rating}/5</small></TableCell>
                    <TableCell className="op-admin-feedback-copy">
                      <p>{review.publicComment || 'No public review was submitted.'}</p>
                      <span>{review.privateNote ? 'Includes a private operational note' : 'No private note supplied'}</span>
                    </TableCell>
                    <TableCell className="op-admin-catalog-cell"><small>SUBMITTED</small><strong>{formatDate(review.createdAt)}</strong><span>{review.privateNote ? 'Private note attached' : 'Public only'}</span></TableCell>
                    <TableCell className="op-admin-catalog-actions"><Button size="xs" color="light" onClick={() => setSelected(review)}>View</Button></TableCell>
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
              <span className="block op-admin-eyebrow">GUEST REVIEW · {selected.rating}/5</span>
              <span className="block">{selected.property?.title || 'Guest feedback'}</span>
            </ModalHeader>
            <ModalBody>
              <div className="op-admin-feedback-dialog-meta">
                <div><span>Guest</span><strong>{selected.user?.firstName} {selected.user?.lastName}</strong><small>{selected.user?.email}</small></div>
                <div><span>Stay location</span><strong>{selected.property?.location || 'Not recorded'}</strong><small>{formatDate(selected.createdAt, true)}</small></div>
                <div><span>Rating</span><StarRow rating={Number(selected.rating) || 0} size="lg" /><small>{selected.rating} out of 5</small></div>
              </div>
              <section className="op-admin-feedback-note"><div><span>PUBLIC REVIEW</span><p>{selected.publicComment || 'No public review was submitted.'}</p></div><div className="is-private"><span>PRIVATE OPERATIONAL NOTE</span><p>{selected.privateNote || 'No private note was supplied.'}</p></div></section>
            </ModalBody>
            <ModalFooter className="op-admin-dialog-actions"><Button color="light" onClick={() => setSelected(null)}>Close</Button></ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}

export default AdminFeedback;
