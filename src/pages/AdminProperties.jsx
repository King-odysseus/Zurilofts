import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../api/client.js';

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
    } catch {
      // silent
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
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update listing status');
    } finally {
      setSubmitting(null);
    }
  }

  const LISTING_STATUS_STYLES = {
    DRAFT: 'bg-[#D9D9D9]/40 text-[#1f2937]',
    PENDING_REVIEW: 'bg-amber-100 text-amber-800',
    PUBLISHED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    SUSPENDED: 'bg-red-100 text-red-700',
  };

  const LISTING_STATUS_LABELS = {
    DRAFT: 'Draft',
    PENDING_REVIEW: 'Pending review',
    PUBLISHED: 'Published',
    REJECTED: 'Rejected',
    SUSPENDED: 'Suspended',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-[#0B0B45]">Properties</h1>
        <div className="flex items-center gap-3">
          {isAdminView && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-[#D9D9D9] text-sm px-3 py-2 text-[#1f2937]"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_REVIEW">Pending review</option>
              <option value="PUBLISHED">Published</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          )}
          <Link
            to={`${base}/properties/new`}
            className="bg-[#C49A6C] text-white px-5 py-2.5 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200 text-sm"
          >
            + Add Property
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-[#D9D9D9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8f9fa] border-b border-[#D9D9D9]">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Property</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Location</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Price/Night</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Availability</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Listing status</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr key={p.id} className="border-b border-[#D9D9D9]/50 hover:bg-[#f8f9fa]">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="w-12 h-12 object-cover rounded-lg" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#D9D9D9]/30 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-[#D9D9D9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <Link to={`/property/${p.id}`} className="font-semibold text-[#0B0B45] hover:text-[#C49A6C]">{p.title}</Link>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#6b7280]">{p.location}</td>
                    <td className="py-3 px-4 capitalize">{p.type}</td>
                    <td className="py-3 px-4 font-semibold">KES {p.price.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleAvailable(p)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          p.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {p.available ? 'Available' : 'Unavailable'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${LISTING_STATUS_STYLES[p.status] || 'bg-[#D9D9D9]/40 text-[#1f2937]'}`}>
                        {LISTING_STATUS_LABELS[p.status] || p.status || 'Draft'}
                      </span>
                      {(p.status === 'REJECTED' || p.status === 'SUSPENDED') && p.listingReviewNote && (
                        <p className="text-xs text-red-600 mt-1 max-w-[200px]">{p.listingReviewNote}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {!isAdminView && (p.status === 'DRAFT' || p.status === 'REJECTED') && (
                          <button
                            onClick={() => handleSubmitForReview(p)}
                            disabled={submitting === p.id}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-colors disabled:opacity-50"
                          >
                            {submitting === p.id ? '...' : 'Submit for review'}
                          </button>
                        )}
                        {isAdminView && p.status === 'PENDING_REVIEW' && (
                          <>
                            <button
                              onClick={() => handleReview(p, 'approve')}
                              disabled={submitting === p.id}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(p, 'reject')}
                              disabled={submitting === p.id}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {isAdminView && p.status === 'PUBLISHED' && (
                          <button
                            onClick={() => handleReview(p, 'suspend')}
                            disabled={submitting === p.id}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        )}
                        {isAdminView && p.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleReview(p, 'unsuspend')}
                            disabled={submitting === p.id}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            Unsuspend
                          </button>
                        )}
                        <Link
                          to={`${base}/properties/${p.id}/calendar`}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#D9D9D9] text-[#6b7280] hover:border-[#C49A6C] hover:text-[#C49A6C] transition-colors"
                        >
                          Calendar
                        </Link>
                        <Link
                          to={`${base}/properties/${p.id}/edit`}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#D9D9D9] text-[#6b7280] hover:border-[#C49A6C] hover:text-[#C49A6C] transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {deleting === p.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {properties.length === 0 && (
            <div className="text-center py-12 text-[#6b7280]">No properties found. Add your first property!</div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminProperties;
