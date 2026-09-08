import { useState, useEffect } from 'react';
import apiClient from '../api/client.js';

function StarRow({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-[#2563EB]' : 'text-[#E5E7EB]'}`}
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
      <div className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 sm:px-6 shadow-sm mb-6">
      <h1 className="text-2xl font-bold text-[#222222] mb-1">Guest Feedback</h1>
      <p className="text-[#6b7280] mb-6">Star ratings, public reviews, and private notes from guests. Private notes are never shown publicly.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-[14px] p-5 shadow-sm">
          <span className="text-sm text-[#6b7280]">Average Rating</span>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-2xl font-bold text-[#222222]">{summary.averageRating || 0}</p>
            <StarRow rating={Math.round(summary.averageRating)} />
          </div>
        </div>
        <div className="bg-white rounded-[14px] p-5 shadow-sm">
          <span className="text-sm text-[#6b7280]">Total Reviews</span>
          <p className="text-2xl font-bold text-[#222222] mt-2">{summary.totalReviews || 0}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">{error}</div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-[14px] shadow-sm p-12 text-center">
          <h3 className="text-lg font-bold text-[#222222] mb-1">No feedback yet</h3>
          <p className="text-[#6b7280]">Guest reviews will appear here after completed stays.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[14px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas">
                <tr className="text-left">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Property</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Guest</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Rating</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Public review</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Private note</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Date</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-t border-[#E5E7EB] hover:bg-canvas align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#222222]">{r.property?.title}</p>
                      <p className="text-xs text-[#6b7280]">{r.property?.location}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#222222]">{r.user?.firstName} {r.user?.lastName}</p>
                      <p className="text-xs text-[#6b7280]">{r.user?.email}</p>
                    </td>
                    <td className="px-4 py-3"><StarRow rating={r.rating} /></td>
                    <td className="px-4 py-3 text-[#222222] max-w-md">
                      {r.publicComment
                        ? <span>{r.publicComment}</span>
                        : <span className="text-[#6b7280] italic">No public review</span>}
                    </td>
                    <td className="px-4 py-3 text-[#222222] max-w-md">
                      {r.privateNote
                        ? <span>{r.privateNote}</span>
                        : <span className="text-[#6b7280] italic">No note</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6b7280] whitespace-nowrap">
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
