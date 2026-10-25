import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Label, Modal, ModalBody, ModalFooter, ModalHeader, Textarea } from 'flowbite-react';
import { ExternalLink, House } from 'lucide-react';
import apiClient from '../api/client.js';
import SelectMenu from '../components/SelectMenu.jsx';

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
  return <div className="space-y-6" data-openpencil-frame="0:7015">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">ZURILOFTS · ADMIN · APPROVALS</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Listing approvals</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">Approve, reject or suspend what hosts submit. Hosts create and edit their own listings.</p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">PENDING</span>
        <strong className="mt-2 block text-2xl font-bold text-navy">{count('PENDING_REVIEW')}</strong>
        <small className="mt-1 block text-xs text-muted">Awaiting review</small>
      </article>
      <article className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">APPROVED</span>
        <strong className="mt-2 block text-2xl font-bold text-navy">{count('PUBLISHED')}</strong>
        <small className="mt-1 block text-xs text-muted">Published stays</small>
      </article>
      <article className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">SUSPENDED</span>
        <strong className="mt-2 block text-2xl font-bold text-navy">{count('SUSPENDED')}</strong>
        <small className="mt-1 block text-xs text-muted">Hidden from guests</small>
      </article>
      <article className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">REJECTED</span>
        <strong className="mt-2 block text-2xl font-bold text-navy">{count('REJECTED')}</strong>
        <small className="mt-1 block text-xs text-muted">Need changes</small>
      </article>
    </div>

    <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-navy">Review queue</h2>
        <span className="text-xs text-muted">{count('PENDING_REVIEW')} pending</span>
      </div>
      <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:gap-3">
        <label htmlFor="listing-review-filter" className="text-xs font-semibold uppercase tracking-wide text-muted">Show</label>
        <SelectMenu
          id="listing-review-filter"
          ariaLabel="Filter listings by status"
          wrapperClassName="w-full sm:w-[240px]"
          value={filter}
          onChange={(next) => setFilter(next)}
          options={statuses.map((status) => ({ value: status, label: status === 'ALL' ? 'All listings' : status.replaceAll('_', ' ').toLowerCase() }))}
        />
      </div>
      {error && <p role="alert" className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading ? <p className="px-5 py-12 text-center text-sm text-muted">Loading listings…</p> : visible.length ? visible.map((listing) => <div className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between" key={listing.id}>
        {listing.images?.[0] ? <img src={listing.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-navy"><House className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" /></span>}
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-semibold text-navy">{listing.title}</strong>
          <small className="mt-1 block text-xs text-muted">{listing.location || listing.neighborhood || 'Location pending'} · {listing.images?.length || 0} photos · {listing.type || 'Stay'}</small>
        </div>
        <span className="whitespace-nowrap text-xs font-semibold capitalize text-navy">{listing.status?.replaceAll('_', ' ').toLowerCase()}</span>
        <Link to={`/property/${listing.id}`} className="text-sm font-semibold text-primary-600 hover:underline">Preview</Link>
        {listing.status === 'PENDING_REVIEW' && <Button size="xs" type="button" onClick={() => { setReviewing(listing); setNote(''); }}>Decide</Button>}
      </div>) : <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
        <strong className="text-sm font-semibold text-navy">No listings in this view</strong>
        <p className="text-sm text-muted">Try another status.</p>
      </div>}
    </section>

    {reviewing && <Modal show onClose={() => setReviewing(null)} size="lg" dismissible>
      <ModalHeader>Review {reviewing.title}</ModalHeader>
      <ModalBody>
        <p className="text-sm text-charcoal">Check the listing details and photos before making a decision.</p>
        <Link to={`/property/${reviewing.id}`} target="_blank" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline">
          Preview stay <ExternalLink className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </Link>
        <div className="mt-4">
          <Label htmlFor="review-note" value="Reason or note (required for rejection)" />
          <Textarea id="review-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="light" type="button" onClick={() => setReviewing(null)}>Cancel</Button>
        <Button color="failure" type="button" disabled={busy} onClick={() => review(reviewing, 'reject')}>Reject</Button>
        <Button type="button" disabled={busy} onClick={() => review(reviewing, 'approve')}>Approve</Button>
      </ModalFooter>
    </Modal>}
  </div>;
}
