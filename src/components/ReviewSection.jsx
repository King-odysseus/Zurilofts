import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client.js';

function StarRating({ rating, size = 'sm' }) {
  const sz = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sz} ${star <= rating ? 'text-[#C49A6C]' : 'text-[#D9D9D9]'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewSection({ propertyId }) {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) return;
    setLoading(true);
    apiClient
      .get(`/properties/${propertyId}/reviews`)
      .then((res) => {
        const d = res.data.data;
        setReviews(d.reviews || []);
        setSummary(d.summary || null);
      })
      .catch(() => {
        setReviews([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) {
    return (
      <section className="mt-12 pt-8 border-t border-[#D9D9D9]">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-[#D9D9D9]/50 rounded" />
          <div className="h-4 w-32 bg-[#D9D9D9]/30 rounded" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-[#D9D9D9]/20 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!summary || summary.totalReviews === 0) {
    return (
      <section className="mt-12 pt-8 border-t border-[#D9D9D9]">
        <h2 className="text-2xl font-bold text-[#0B0B45] mb-2">Guest Reviews</h2>
        <p className="text-[#6b7280] mb-4">No reviews yet. Be the first to share your experience.</p>
        <Link
          to="/bookings"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C49A6C] hover:text-[#b8895c] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Write a Review
        </Link>
      </section>
    );
  }

  const maxCount = Math.max(...summary.distribution.map((d) => d.count), 1);

  return (
    <section className="mt-12 pt-8 border-t border-[#D9D9D9]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B0B45] mb-1">Guest Reviews</h2>
          <div className="flex items-center gap-3">
            <StarRating rating={Math.round(summary.averageRating)} size="lg" />
            <span className="text-lg font-bold text-[#0B0B45]">
              {summary.averageRating}
            </span>
            <span className="text-[#6b7280] text-sm">
              · {summary.totalReviews} review{summary.totalReviews !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <Link
          to="/bookings"
          className="inline-flex items-center gap-1.5 self-start px-4 py-2 border-2 border-[#C49A6C] text-[#C49A6C] rounded-full text-sm font-semibold hover:bg-[#C49A6C] hover:text-white transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Write a Review
        </Link>
      </div>

      {/* Star distribution histogram */}
      <div className="bg-white rounded-2xl border border-[#D9D9D9] p-4 md:p-6 mb-6">
        <div className="space-y-2">
          {summary.distribution.map((d) => (
            <div key={d.stars} className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#1f2937] w-6 text-right">{d.stars}</span>
              <svg className="w-4 h-4 text-[#C49A6C] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <div className="flex-1 h-3 bg-[#D9D9D9]/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C49A6C] rounded-full transition-all duration-500"
                  style={{ width: `${maxCount > 0 ? (d.count / maxCount) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm text-[#6b7280] w-8 text-right">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review cards */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white rounded-2xl border border-[#D9D9D9] shadow-sm p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-semibold text-[#0B0B45] text-sm">
                  {review.user?.firstName} {review.user?.lastName?.[0]}.
                </span>
                {review.satisfaction && (
                  <span className="ml-2 text-sm" title={review.satisfaction}>
                    {review.satisfaction === 'happy' ? '😊' : review.satisfaction === 'neutral' ? '😐' : '😞'}
                  </span>
                )}
              </div>
              <span className="text-xs text-[#6b7280]">
                {new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <StarRating rating={review.rating} />
            {review.privateNote && (
              <p className="mt-2 text-sm text-[#1f2937] leading-relaxed">{review.privateNote}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default ReviewSection;
