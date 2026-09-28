import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { NotebookPen, Star } from 'lucide-react';
import apiClient from '../api/client.js';

function StarRating({ rating, size = 'sm' }) {
  const sz = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`${sz} ${star <= rating ? 'text-[#C49A6C]' : 'text-[#C9D3DF]'}`} fill="currentColor" aria-hidden="true" />
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
      <section className="mt-12 border-t border-[#E3E8EF] pt-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-[#EAF0F4]" />
          <div className="h-4 w-32 rounded bg-[#F1F4F7]" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-[#F7F4EF]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!summary || summary.totalReviews === 0) {
    return (
      <section className="mt-12 border-t border-[#E3E8EF] pt-8">
        <h2 className="mb-2 text-2xl font-bold text-[#0B1F42]">Guest Reviews</h2>
        <p className="mb-4 text-[#5B6B82]">No reviews yet. Be the first to share your experience.</p>
        <Link
          to="/bookings"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C49A6C] hover:text-[#b8895c] transition-colors"
        >
          <NotebookPen className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          Write a Review
        </Link>
      </section>
    );
  }

  const maxCount = Math.max(...summary.distribution.map((d) => d.count), 1);

  return (
    <section className="mt-12 border-t border-[#E3E8EF] pt-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
      <h2 className="mb-1 text-2xl font-bold text-[#0B1F42]">Guest Reviews</h2>
          <div className="flex items-center gap-3">
            <StarRating rating={Math.round(summary.averageRating)} size="lg" />
            <span className="text-lg font-bold text-[#0B1F42]">
              {summary.averageRating}
            </span>
            <span className="text-sm text-[#5B6B82]">
              · {summary.totalReviews} review{summary.totalReviews !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <Link
          to="/bookings"
          className="inline-flex items-center gap-1.5 self-start px-4 py-2 border-2 border-[#C49A6C] text-[#C49A6C] rounded-full text-sm font-semibold hover:bg-[#C49A6C] hover:text-white transition-all duration-200"
        >
          <NotebookPen className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          Write a Review
        </Link>
      </div>

      {/* Star distribution histogram */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgb(38_34_98_/_0.06),0_6px_20px_-6px_rgb(38_34_98_/_0.10)] p-4 md:p-6 mb-6">
        <div className="space-y-2">
          {summary.distribution.map((d) => (
            <div key={d.stars} className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#1f2937] w-6 text-right">{d.stars}</span>
              <Star className="w-4 h-4 text-[#C49A6C] flex-shrink-0" fill="currentColor" aria-hidden="true" />
              <div className="flex-1 h-3 overflow-hidden rounded-full bg-[#EAF0F4]">
                <div
                  className="h-full bg-[#C49A6C] rounded-full transition-all duration-500"
                  style={{ width: `${maxCount > 0 ? (d.count / maxCount) * 100 : 0}%` }}
                />
              </div>
              <span className="w-8 text-right text-sm text-[#5B6B82]">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review cards */}
      <div className="space-y-4">
        {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl border border-[#E3E8EF] bg-white p-4 shadow-[0_8px_28px_rgba(11,31,66,0.08)] md:p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-semibold text-[#0B1F42]">
                  {review.user?.firstName} {review.user?.lastName?.[0]}.
                </span>
              </div>
              <span className="text-xs text-[#5B6B82]">
                {new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <StarRating rating={review.rating} />
            {review.publicComment && (
              <p className="mt-2 text-sm leading-relaxed text-[#0B1F42]">{review.publicComment}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default ReviewSection;
