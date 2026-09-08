import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../api/client.js';
import Dropdown from '../components/Dropdown.jsx';

const LISTING_STATUS_STYLES = {
  DRAFT: 'bg-gray-50 text-gray-600 border-gray-200',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  PUBLISHED: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
};

const LISTING_STATUS_DOTS = {
  DRAFT: 'bg-gray-400',
  PENDING_REVIEW: 'bg-amber-500',
  PUBLISHED: 'bg-green-500',
  REJECTED: 'bg-red-500',
  SUSPENDED: 'bg-red-500',
};

const LISTING_STATUS_LABELS = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending review',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

function StatusPill({ status }) {
  const style = LISTING_STATUS_STYLES[status] || LISTING_STATUS_STYLES.DRAFT;
  const dot = LISTING_STATUS_DOTS[status] || LISTING_STATUS_DOTS.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {LISTING_STATUS_LABELS[status] || status || 'Draft'}
    </span>
  );
}

function AvailabilityToggle({ available, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
        available ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${available ? 'bg-green-500' : 'bg-red-500'}`} />
      {available ? 'Available' : 'Unavailable'}
    </button>
  );
}

function AdminProperties() {
  const location = useLocation();
  // This component is shared between the admin control centre (/admin/*) and the
  // host workspace (/host/*). Build links against the active base so a host never
  // lands on an /admin/* URL.
  const base = location.pathname.startsWith('/host') ? '/host' : '/admin';
  const isAdminView = base === '/admin';
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedProperty, setSelectedProperty] = useState(null);

  const visibleProperties = isAdminView || !statusFilter
    ? properties
    : properties.filter((property) => (statusFilter === 'IN_REVIEW' ? property.status === 'PENDING_REVIEW' : property.status === statusFilter));

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function fetchProperties() {
    setLoading(true);
    try {
      // Admin sees every listing platform-wide (independent host review queue);
      // the host workspace only ever sees the caller's own listings.
      const res = isAdminView
        ? await apiClient.get('/admin/properties', { params: { limit: 100, status: statusFilter || undefined } })
        : await apiClient.get('/properties/mine', { params: { limit: 100 } });
      setProperties(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this property?')) return;
    setDeleting(id);
    try {
      await apiClient.delete(`/properties/${id}`);
      setProperties((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert('Failed to delete property');
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleAvailable(property) {
    try {
      await apiClient.put(`/properties/${property.id}`, { available: !property.available });
      setProperties((prev) =>
        prev.map((p) => (p.id === property.id ? { ...p, available: !p.available } : p))
      );
    } catch {
      alert('Failed to update property');
    }
  }

  const [submitting, setSubmitting] = useState(null);

  async function handleSubmitForReview(property) {
    setSubmitting(property.id);
    try {
      const res = await apiClient.post(`/properties/${property.id}/submit`);
      setProperties((prev) => prev.map((p) => (p.id === property.id ? res.data.data : p)));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit listing for review');
    } finally {
      setSubmitting(null);
    }
  }

  // Admin-only moderation: approve/reject a pending listing, or suspend/unsuspend
  // a published one. Independent of the host's own account verification.
  async function handleReview(property, action) {
    let note;
    if (action === 'reject') {
      note = prompt('Reason for rejecting this listing (shown to the host):');
      if (!note || !note.trim()) return;
    } else if (action === 'suspend') {
      note = prompt('Reason for suspending this listing (optional, shown to the host):') || undefined;
    }
    setSubmitting(property.id);
    try {
      const res = await apiClient.patch(`/admin/properties/${property.id}/review`, { action, note });
      setProperties((prev) => prev.map((p) => (p.id === property.id ? res.data.data : p)));
      setSelectedProperty(res.data.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update listing status');
    } finally {
      setSubmitting(null);
    }
  }

  const secondaryBtn = 'inline-flex items-center justify-center gap-1.5 min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const successBtn = 'inline-flex items-center justify-center gap-1.5 min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const dangerBtn = 'inline-flex items-center justify-center gap-1.5 min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div>
      <div className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 sm:px-6 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222222]">{isAdminView ? 'Properties' : 'Your listings'}</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            {isAdminView ? 'Review and manage every listing across the platform.' : 'Manage your listings, availability and review status.'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isAdminView && (
            <Dropdown
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PENDING_REVIEW', label: 'Pending review' },
                { value: 'PUBLISHED', label: 'Published' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'SUSPENDED', label: 'Suspended' },
              ]}
              triggerClassName="min-h-[44px] px-4 rounded-xl bg-white border border-[#E5E7EB] text-sm text-[#222222] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
              placeholder="All statuses"
              ariaLabel="Filter by status"
            />
          )}
          <div className="flex rounded-xl border border-[#E5E7EB] bg-white p-1" role="group" aria-label="Listings view">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              title="Grid view"
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#2563EB] text-white' : 'text-[#6b7280] hover:text-[#222222]'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" /></svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              title="Table view"
              className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-[#2563EB] text-white' : 'text-[#6b7280] hover:text-[#222222]'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
          <Link
            to={`${base}/properties/new`}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-lg bg-[#C49A6C] text-white font-semibold text-sm hover:bg-[#B8895C] transition-all active:translate-y-px"
          >
            {isAdminView ? '+ Add Property' : '+ Add listing'}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          ['Total listings', properties.length],
          ['Published', properties.filter((p) => p.status === 'PUBLISHED').length],
          ['Pending review', properties.filter((p) => p.status === 'PENDING_REVIEW').length],
          ['Unavailable', properties.filter((p) => p.available === false).length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">{label}</p>
            <p className="mt-2 text-2xl font-bold text-[#222222]">{value}</p>
          </div>
        ))}
      </div>

      {!isAdminView && (
        <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] pb-3" role="tablist" aria-label="Listing status">
          {[['', `All (${properties.length})`], ['PUBLISHED', `Published (${properties.filter((p) => p.status === 'PUBLISHED').length})`], ['DRAFT', `Drafts (${properties.filter((p) => p.status === 'DRAFT').length})`], ['IN_REVIEW', `In review (${properties.filter((p) => p.status === 'PENDING_REVIEW').length})`]].map(([value, label]) => (
            <button key={value || 'all'} type="button" role="tab" aria-selected={statusFilter === value} onClick={() => setStatusFilter(value)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${statusFilter === value ? 'border-b-2 border-[#2563EB] text-[#2563EB]' : 'text-[#6b7280] hover:text-[#222222]'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b7280]">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm">Loading properties…</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F7F7F5] border-b border-[#E5E7EB]">
                <tr>
                  <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Property</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Location</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Type</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Price/Night</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Availability</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Listing status</th>
                  <th className="text-right py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleProperties.map((p) => (
                  <tr key={p.id} className="border-b border-[#E5E7EB]/60 last:border-0 hover:bg-[#F7F7F5]">
                    <td className="py-3 px-4 align-top">
                      <div className="flex items-center space-x-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="w-12 h-12 object-cover rounded-lg" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#F7F7F5] border border-[#E5E7EB] flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <Link to={`/property/${p.id}`} className="font-semibold text-[#222222] hover:text-[#2563EB]">{p.title}</Link>
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top text-[#6b7280]">{p.location}</td>
                    <td className="py-3 px-4 align-top capitalize text-[#222222]">{p.type}</td>
                    <td className="py-3 px-4 align-top font-semibold text-[#222222]">KES {p.price.toLocaleString()}</td>
                    <td className="py-3 px-4 align-top">
                      <AvailabilityToggle available={p.available} onClick={() => handleToggleAvailable(p)} />
                    </td>
                    <td className="py-3 px-4 align-top">
                      <StatusPill status={p.status} />
                      {(p.status === 'REJECTED' || p.status === 'SUSPENDED') && p.listingReviewNote && (
                        <p className="text-xs text-red-600 mt-1 max-w-[200px]">{p.listingReviewNote}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {!isAdminView && (p.status === 'DRAFT' || p.status === 'REJECTED') && (
                          <button
                            onClick={() => handleSubmitForReview(p)}
                            disabled={submitting === p.id}
                            className="inline-flex items-center justify-center min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submitting === p.id ? '...' : 'Submit for review'}
                          </button>
                        )}
                        {isAdminView && p.status === 'PENDING_REVIEW' && (
                          <>
                            <button onClick={() => setSelectedProperty(p)} className={secondaryBtn}>Review</button>
                            <button onClick={() => handleReview(p, 'approve')} disabled={submitting === p.id} className={successBtn}>Approve</button>
                            <button onClick={() => handleReview(p, 'reject')} disabled={submitting === p.id} className={dangerBtn}>Reject</button>
                          </>
                        )}
                        {isAdminView && p.status === 'PUBLISHED' && (
                          <button onClick={() => handleReview(p, 'suspend')} disabled={submitting === p.id} className={dangerBtn}>Suspend</button>
                        )}
                        {isAdminView && p.status === 'SUSPENDED' && (
                          <button onClick={() => handleReview(p, 'unsuspend')} disabled={submitting === p.id} className={successBtn}>Unsuspend</button>
                        )}
                        <Link to={`${base}/properties/${p.id}/calendar`} className={secondaryBtn}>Calendar</Link>
                        <Link to={`${base}/properties/${p.id}/edit`} className={secondaryBtn}>Edit</Link>
                        <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className={dangerBtn}>
                          {deleting === p.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibleProperties.length === 0 && (
            <div className="text-center py-16 text-[#6b7280]">
              <p className="text-sm">{isAdminView ? 'No listings match this status.' : 'No properties found. Add your first property!'}</p>
            </div>
          )}
        </div>
      ) : visibleProperties.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm text-center py-16 text-[#6b7280]">
          <p className="text-sm">{isAdminView ? 'No listings match this status.' : 'No properties found. Add your first property!'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {visibleProperties.map((p) => (
            <article key={p.id} className="bg-white rounded-[14px] border border-[#E5E7EB] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <Link to={`/property/${p.id}`} className="block aspect-[4/3] bg-[#F7F7F5]">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#6b7280] text-sm">No image yet</div>
                )}
              </Link>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/property/${p.id}`} className="block font-bold text-[#222222] hover:text-[#2563EB] truncate">{p.title}</Link>
                    <p className="text-sm text-[#6b7280] mt-1 truncate">{p.location}</p>
                  </div>
                  <StatusPill status={p.status} />
                </div>
                <div className="flex items-end justify-between mt-5 pt-4 border-t border-[#E5E7EB]">
                  <div>
                    <p className="text-xs text-[#6b7280] capitalize">{p.type || 'Apartment'}</p>
                    <p className="font-bold text-[#222222] mt-1">KES {p.price?.toLocaleString()} <span className="font-normal text-xs text-[#6b7280]">/ night</span></p>
                  </div>
                  <AvailabilityToggle available={p.available} onClick={() => handleToggleAvailable(p)} />
                </div>
                {(p.status === 'REJECTED' || p.status === 'SUSPENDED') && p.listingReviewNote && (
                  <p className="text-xs text-red-600 mt-3">{p.listingReviewNote}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-5">
                  {!isAdminView && (p.status === 'DRAFT' || p.status === 'REJECTED') && (
                    <button onClick={() => handleSubmitForReview(p)} disabled={submitting === p.id} className="inline-flex items-center justify-center min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {submitting === p.id ? 'Submitting…' : 'Submit for review'}
                    </button>
                  )}
                  {isAdminView && p.status === 'PENDING_REVIEW' && <>
                    <button onClick={() => setSelectedProperty(p)} className={secondaryBtn}>Review</button>
                    <button onClick={() => handleReview(p, 'approve')} disabled={submitting === p.id} className={successBtn}>Approve</button>
                    <button onClick={() => handleReview(p, 'reject')} disabled={submitting === p.id} className={dangerBtn}>Reject</button>
                  </>}
                  {isAdminView && p.status === 'PUBLISHED' && <button onClick={() => handleReview(p, 'suspend')} disabled={submitting === p.id} className={dangerBtn}>Suspend</button>}
                  {isAdminView && p.status === 'SUSPENDED' && <button onClick={() => handleReview(p, 'unsuspend')} disabled={submitting === p.id} className={successBtn}>Unsuspend</button>}
                  <Link to={`${base}/properties/${p.id}/calendar`} className={secondaryBtn}>Calendar</Link>
                  <Link to={`${base}/properties/${p.id}/edit`} className={secondaryBtn}>Edit</Link>
                  <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className={dangerBtn}>{deleting === p.id ? 'Deleting…' : 'Delete'}</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {isAdminView && selectedProperty && (
        <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setSelectedProperty(null)}>
          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-[#E5E7EB] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Listing review</p>
                <h2 className="mt-1 text-xl font-bold text-[#222222]">{selectedProperty.title}</h2>
              </div>
              <button type="button" onClick={() => setSelectedProperty(null)} className="rounded-lg p-2 text-xl leading-none text-[#6b7280] hover:bg-[#F7F7F5]" aria-label="Close review panel">×</button>
            </div>
            {selectedProperty.images?.[0] && <img src={selectedProperty.images[0]} alt="" className="mt-5 aspect-[4/3] w-full rounded-[14px] object-cover" />}
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4"><span className="text-[#6b7280]">Location</span><span className="font-semibold text-[#222222]">{selectedProperty.location}</span></div>
              <div className="flex items-center justify-between gap-4"><span className="text-[#6b7280]">Host</span><span className="font-semibold text-[#222222]">{selectedProperty.host?.firstName || selectedProperty.owner?.firstName || 'Host'}</span></div>
              <div className="flex items-center justify-between gap-4"><span className="text-[#6b7280]">Type</span><span className="font-semibold capitalize text-[#222222]">{selectedProperty.type || 'Apartment'}</span></div>
              <div className="flex items-center justify-between gap-4"><span className="text-[#6b7280]">Price/night</span><span className="font-semibold text-[#222222]">KES {selectedProperty.price?.toLocaleString()}</span></div>
              <div className="flex items-center justify-between gap-4"><span className="text-[#6b7280]">Status</span><StatusPill status={selectedProperty.status} /></div>
            </div>
            {selectedProperty.description && <p className="mt-5 rounded-[14px] bg-[#F7F7F5] p-4 text-sm leading-6 text-[#222222]">{selectedProperty.description}</p>}
            <div className="mt-6 flex flex-wrap gap-2 border-t border-[#E5E7EB] pt-5">
              {selectedProperty.status === 'PENDING_REVIEW' && <>
                <button onClick={() => handleReview(selectedProperty, 'approve')} disabled={submitting === selectedProperty.id} className={successBtn}>Approve</button>
                <button onClick={() => handleReview(selectedProperty, 'reject')} disabled={submitting === selectedProperty.id} className={dangerBtn}>Reject</button>
              </>}
              <Link to={`/property/${selectedProperty.id}`} className={secondaryBtn}>Open listing</Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default AdminProperties;
