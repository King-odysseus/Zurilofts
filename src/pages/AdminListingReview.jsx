import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client.js';

const statuses = ['ALL', 'PENDING_REVIEW', 'PUBLISHED', 'DRAFT', 'REJECTED', 'SUSPENDED'];

export default function AdminListingReview() {
  const [listings, setListings] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient.get('/admin/properties', { params: { limit: 100 } })
      .then(({ data }) => { if (active) setListings(data.data || []); })
      .catch(() => { if (active) setError('Listings could not be loaded. Please refresh the page.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function review(listing, action) {
    if (action === 'reject' && !note.trim()) { setError('Add a reason before rejecting this listing.'); return; }
    setBusy(true); setError('');
    try {
      const { data } = await apiClient.patch(`/admin/properties/${listing.id}/review`, { action, ...(note.trim() ? { note: note.trim() } : {}) });
      setListings((current) => current.map((item) => item.id === listing.id ? data.data : item));
      setReviewing(null); setNote('');
    } catch (cause) {
      setError(cause.response?.data?.error || 'The review could not be saved.');
    } finally { setBusy(false); }
  }

  const visible = filter === 'ALL' ? listings : listings.filter((listing) => listing.status === filter);
  const count = (status) => listings.filter((listing) => listing.status === status).length;
  return <div className="op-admin-overview op-admin-listing-review" data-openpencil-frame="0:7015">
    <div className="op-admin-heading"><div><p className="op-admin-eyebrow">ZURILOFTS · ADMIN · LISTINGS</p><h1>Listing review</h1><p>Approve, reject and edit host listings before they reach guests.</p></div><Link className="op-admin-add-link" to="/admin/properties/new">+ Add stay</Link></div>
    <div className="op-admin-metrics"><article><span>PENDING</span><strong>{count('PENDING_REVIEW')}</strong><small>Awaiting review</small></article><article><span>APPROVED</span><strong>{count('PUBLISHED')}</strong><small>Published stays</small></article><article><span>DRAFTS</span><strong>{count('DRAFT')}</strong><small>In progress</small></article><article><span>REJECTED</span><strong>{count('REJECTED')}</strong><small>Need changes</small></article></div>
    <section className="op-admin-priority"><div className="op-admin-panel-heading"><h2>Review queue</h2><span>{count('PENDING_REVIEW')} pending</span></div>
      <div className="op-admin-review-filter"><label htmlFor="listing-review-filter">Show</label><select id="listing-review-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{status === 'ALL' ? 'All listings' : status.replaceAll('_', ' ').toLowerCase()}</option>)}</select></div>
      {error && <p role="alert" className="op-admin-error">{error}</p>}
      {loading ? <p className="op-admin-empty">Loading listings…</p> : visible.length ? visible.map((listing) => <div className="op-admin-priority-row op-admin-listing-row" key={listing.id}>
        {listing.images?.[0] ? <img src={listing.images[0]} alt="" /> : <span className="op-admin-image-empty">⌂</span>}
        <div><strong>{listing.title}</strong><small>{listing.location || listing.neighborhood || 'Location pending'} · {listing.images?.length || 0} photos · {listing.type || 'Stay'}</small></div>
        <span className="op-admin-urgent">{listing.status?.replaceAll('_', ' ').toLowerCase()}</span>
        <Link to={listing.status === 'PENDING_REVIEW' ? `/property/${listing.id}` : `/admin/properties/${listing.id}/edit`}>{listing.status === 'PENDING_REVIEW' ? 'Preview' : 'Open'}</Link>
        {listing.status === 'PENDING_REVIEW' && <button type="button" onClick={() => { setReviewing(listing); setNote(''); }}>Decide</button>}
      </div>) : <div className="op-admin-empty"><strong>No listings in this view</strong><p>Try another status or add a stay.</p></div>}
    </section>
    {reviewing && <div className="op-admin-review-backdrop" onClick={() => setReviewing(null)}><div className="op-admin-review-dialog" role="dialog" aria-modal="true" aria-labelledby="review-title" onClick={(event) => event.stopPropagation()}><h2 id="review-title">Review {reviewing.title}</h2><p>Check the listing details and photos before making a decision.</p><Link to={`/property/${reviewing.id}`} target="_blank">Preview stay ↗</Link><label htmlFor="review-note">Reason or note (required for rejection)</label><textarea id="review-note" value={note} onChange={(event) => setNote(event.target.value)} rows="3" /><div><button type="button" onClick={() => setReviewing(null)}>Cancel</button><button type="button" disabled={busy} onClick={() => review(reviewing, 'reject')}>Reject</button><button type="button" disabled={busy} onClick={() => review(reviewing, 'approve')}>Approve</button></div></div></div>}
  </div>;
}
