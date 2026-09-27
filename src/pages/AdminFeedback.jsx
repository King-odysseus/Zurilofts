import { useState, useEffect } from 'react';
import apiClient from '../api/client.js';

function StarRow({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'text-[#C49A6C]' : 'text-[#E5E7EB]'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function AdminFeedback() {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get('/admin/reviews', { params: { limit: 100 } });
        setReviews(res.data.data || []);
        setSummary(res.data.summary || { averageRating: 0, totalReviews: 0 });
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load feedback');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="w-full">
      <div className="mb-6 rounded-2xl border border-[#E3E8EF] bg-white px-5 py-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)] sm:px-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#C49A6C]">Workspace / Voice of guest</p>
      <h1 className="text-2xl font-bold text-[#0B1F42] mb-1">Guest Feedback</h1>
      <p className="text-[#5B6B82]">Star ratings, public reviews, and private notes from guests. Private notes are never shown publicly.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-[#E3E8EF] bg-white p-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
          <span className="text-sm text-[#5B6B82]">Average Rating</span>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-2xl font-bold text-[#0B1F42]">{summary.averageRating || 0}</p>
            <StarRow rating={Math.round(summary.averageRating)} />
          </div>
        </div>
        <div className="rounded-2xl border border-[#E3E8EF] bg-white p-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
          <span className="text-sm text-[#5B6B82]">Total Reviews</span>
          <p className="mt-2 text-2xl font-bold text-[#0B1F42]">{summary.totalReviews || 0}</p>
        </div>
        <div className="rounded-2xl border border-[#E3E8EF] bg-white p-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
          <span className="text-sm text-[#5B6B82]">Private Notes</span>
          <p className="mt-2 text-2xl font-bold text-[#0B1F42]">{reviews.filter((review) => review.privateNote).length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C49A6C] border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#F1C9C9] bg-[#FDECEC] p-4 text-sm text-[#B42318]">{error}</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-[#E3E8EF] bg-white p-12 text-center shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
          <h3 className="mb-1 text-lg font-bold text-[#0B1F42]">No feedback yet</h3>
          <p className="text-[#5B6B82]">Guest reviews will appear here after completed stays.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E3E8EF] bg-white shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F7F4EF]">
                <tr className="text-left">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#5B6B82]">Property</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#5B6B82]">Guest</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#5B6B82]">Rating</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#5B6B82]">Public review</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#5B6B82]">Private note</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#5B6B82]">Date</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-t border-[#E3E8EF] align-top hover:bg-[#F7F4EF]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#0B1F42]">{r.property?.title}</p>
                      <p className="text-xs text-[#5B6B82]">{r.property?.location}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#0B1F42]">{r.user?.firstName} {r.user?.lastName}</p>
                      <p className="text-xs text-[#5B6B82]">{r.user?.email}</p>
                    </td>
                    <td className="px-4 py-3"><StarRow rating={r.rating} /></td>
                    <td className="max-w-md px-4 py-3 text-[#0B1F42]">
                      {r.publicComment
                        ? <span>{r.publicComment}</span>
                        : <span className="italic text-[#94A3B8]">No public review</span>}
                    </td>
                    <td className="max-w-md px-4 py-3 text-[#0B1F42]">
                      {r.privateNote
                        ? <span>{r.privateNote}</span>
                        : <span className="italic text-[#94A3B8]">No note</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#5B6B82]">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminFeedback;
