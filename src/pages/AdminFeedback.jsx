import { useEffect, useMemo, useState } from 'react';
import { Button, Select, TextInput } from 'flowbite-react';
import apiClient from '../api/client.js';

function StarRow({ rating, size = 'sm' }) {
  return (
    <span className={`op-admin-feedback-stars is-${size}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} className={star <= rating ? 'is-filled' : ''} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
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
          <Select aria-label="Filter feedback by rating" value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)} className="op-admin-feedback-filter">
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} star{rating === 1 ? '' : 's'}</option>)}
          </Select>
        </div>

        {loading ? (
          <div className="op-admin-catalog-empty"><span className="op-admin-booking-spinner" aria-hidden="true" /><strong>Loading guest feedback</strong><p>Checking ratings, public reviews, and private stay notes.</p></div>
        ) : error ? (
          <div className="op-admin-catalog-empty"><strong>Feedback could not be loaded</strong><p>{error}</p></div>
        ) : visibleReviews.length === 0 ? (
          <div className="op-admin-catalog-empty"><span aria-hidden="true"><SearchIcon /></span><strong>No feedback found</strong><p>Adjust the rating filter or search terms.</p></div>
        ) : (
          <div className="op-admin-catalog-list" role="table" aria-label="Guest feedback">
            <div className="op-admin-catalog-columns op-admin-feedback-columns" role="row">
              <span role="columnheader">PROPERTY</span><span role="columnheader">GUEST</span><span role="columnheader">RATING</span><span role="columnheader">PUBLIC REVIEW</span><span role="columnheader">DATE</span><span role="columnheader">ACTION</span>
            </div>
            {visibleReviews.map((review) => (
              <article key={review.id} className="op-admin-catalog-row op-admin-feedback-row op-admin-feedback-columns" role="row">
                <div className="op-admin-feedback-property" role="cell"><strong>{review.property?.title || 'Property unavailable'}</strong><span>{review.property?.location || 'Location not recorded'}</span></div>
                <div className="op-admin-feedback-guest" role="cell"><strong>{review.user?.firstName} {review.user?.lastName}</strong><span>{review.user?.email || 'Email not available'}</span></div>
                <div role="cell"><StarRow rating={Number(review.rating) || 0} /><small className="op-admin-feedback-score">{review.rating}/5</small></div>
                <div className="op-admin-feedback-copy" role="cell">
                  <p>{review.publicComment || 'No public review was submitted.'}</p>
                  <span>{review.privateNote ? 'Includes a private operational note' : 'No private note supplied'}</span>
                </div>
                <div className="op-admin-catalog-cell" role="cell"><small>SUBMITTED</small><strong>{formatDate(review.createdAt)}</strong><span>{review.privateNote ? 'Private note attached' : 'Public only'}</span></div>
                <div className="op-admin-catalog-actions" role="cell"><Button size="xs" color="light" onClick={() => setSelected(review)}>View</Button></div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="op-admin-dialog-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <div className="op-admin-edit-dialog op-admin-feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-detail-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="op-admin-dialog-heading"><div><p className="op-admin-eyebrow">GUEST REVIEW · {selected.rating}/5</p><h2 id="feedback-detail-title">{selected.property?.title || 'Guest feedback'}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Close feedback detail">&times;</button></div>
            <div className="op-admin-feedback-dialog-meta">
              <div><span>Guest</span><strong>{selected.user?.firstName} {selected.user?.lastName}</strong><small>{selected.user?.email}</small></div>
              <div><span>Stay location</span><strong>{selected.property?.location || 'Not recorded'}</strong><small>{formatDate(selected.createdAt, true)}</small></div>
              <div><span>Rating</span><StarRow rating={Number(selected.rating) || 0} size="lg" /><small>{selected.rating} out of 5</small></div>
            </div>
            <section className="op-admin-feedback-note"><div><span>PUBLIC REVIEW</span><p>{selected.publicComment || 'No public review was submitted.'}</p></div><div className="is-private"><span>PRIVATE OPERATIONAL NOTE</span><p>{selected.privateNote || 'No private note was supplied.'}</p></div></section>
            <div className="op-admin-dialog-actions"><Button color="light" onClick={() => setSelected(null)}>Close</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminFeedback;
