import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { NotebookPen, Star } from 'lucide-react';
import apiClient from '../api/client.js';
import LoadFailed from './LoadFailed.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTranslatedList } from '../i18n/useTranslated.js';

function StarRating({ rating, size = 'sm' }) {
  const { t } = useLanguage();
  const sz = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5" aria-label={t('stays.ratingOutOfFive', { rating })}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`${sz} ${star <= rating ? 'text-[#8A6B52]' : 'text-[#C9D3DF]'}`} fill="currentColor" aria-hidden="true" />
      ))}
    </div>
  );
}

function ReviewSection({ propertyId, onSummary }) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  // Guests write reviews in their own words, so the text goes through the hook
  // rather than the dictionary. Batched here, above the early returns, because a
  // hook cannot be called from inside the list it feeds.
  const comments = useTranslatedList(reviews.map((review) => review.publicComment ?? ''));

  useEffect(() => {
    if (!propertyId) return;
    setLoading(true);
    setFailed(false);
    apiClient
      .get(`/properties/${propertyId}/reviews`)
      .then((res) => {
        const d = res.data.data;
        setReviews(d.reviews || []);
        setSummary(d.summary || null);
        onSummary?.(d.summary ?? null);
      })
      .catch(() => {
        setReviews([]);
        setSummary(null);
        // undefined means "could not load", which is not the same as "no reviews".
        onSummary?.(undefined);
        // Kept apart from the empty state: a failed fetch left summary null, which
        // the empty branch below used to claim as "no reviews yet".
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [propertyId, onSummary, reloadToken]);

  if (loading) {
    return (
      <section className="mt-12 border-t border-[#E3E8EF] pt-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-[#EAF0F4]" />
          <div className="h-4 w-32 rounded bg-[#F1F4F7]" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (failed) {
    return (
      <section className="mt-12 border-t border-[#E3E8EF] pt-8">
        <h2 className="mb-2 text-2xl font-bold text-[#203565]">{t('stays.guestReviews')}</h2>
        <LoadFailed
          message="We could not load the reviews for this stay."
          onRetry={() => setReloadToken((token) => token + 1)}
        />
      </section>
    );
  }

  if (!summary || summary.totalReviews === 0) {
    return (
      <section className="mt-12 border-t border-[#E3E8EF] pt-8">
        <h2 className="mb-2 text-2xl font-bold text-[#203565]">{t('stays.guestReviews')}</h2>
        <p className="mb-4 text-[#5B6B82]">{t('stays.noReviewsShare')}</p>
        <Link
          to="/profile#bookings"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8A6B52] hover:text-[#203565] transition-colors"
        >
          <NotebookPen className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          {t('stays.writeReview')}
        </Link>
      </section>
    );
  }

  const maxCount = Math.max(...summary.distribution.map((d) => d.count), 1);

  return (
    <section className="mt-12 border-t border-[#E3E8EF] pt-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
      <h2 className="mb-1 text-2xl font-bold text-[#203565]">{t('stays.guestReviews')}</h2>
          <div className="flex items-center gap-3">
            <StarRating rating={Math.round(summary.averageRating)} size="lg" />
            <span className="text-lg font-bold text-[#203565]">
              {summary.averageRating}
            </span>
            <span className="text-sm text-[#5B6B82]">
              · {t(summary.totalReviews === 1 ? 'common.review_one' : 'common.review_other', { count: summary.totalReviews })}
            </span>
          </div>
        </div>
        <Link
          to="/profile#bookings"
          className="inline-flex items-center gap-1.5 self-start px-4 py-2 border-2 border-[#203565] text-[#203565] rounded-full text-sm font-semibold hover:bg-[#203565] hover:text-white transition-all duration-200"
        >
          <NotebookPen className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          {t('stays.writeReview')}
        </Link>
      </div>

      {['cleanliness', 'location', 'value'].some((key) => summary.subScores?.[key] != null) && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[['cleanliness', t('stays.cleanliness')], ['location', t('stays.location')], ['value', t('stays.value')]].map(([key, label]) => summary.subScores?.[key] != null && (
            <div key={key} className="rounded-2xl bg-elevated p-4 shadow-[0_1px_3px_rgb(38_34_98_/_0.06)]">
              <p className="text-xs font-semibold text-[#5B6B82]">{label}</p>
              <p className="text-lg font-bold text-[#203565]">{summary.subScores[key]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Star distribution histogram */}
      <div className="bg-elevated rounded-2xl shadow-[0_1px_3px_rgb(38_34_98_/_0.06),0_6px_20px_-6px_rgb(38_34_98_/_0.10)] p-4 md:p-6 mb-6">
        <div className="space-y-2">
          {summary.distribution.map((d) => (
            <div key={d.stars} className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#1f2937] w-6 text-right">{d.stars}</span>
              <Star className="w-4 h-4 text-[#8A6B52] flex-shrink-0" fill="currentColor" aria-hidden="true" />
              <div className="flex-1 h-3 overflow-hidden rounded-full bg-[#EAF0F4]">
                <div
                  className="h-full bg-[#143A80] rounded-full transition-all duration-500"
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
        {reviews.map((review, index) => (
        <div key={review.id} className="rounded-2xl bg-elevated p-4 shadow-[0_8px_28px_rgba(20,58,128,0.08)] md:p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-semibold text-[#203565]">
                  {review.user?.firstName} {review.user?.lastName?.[0]}.
                </span>
              </div>
              <span className="text-xs text-[#5B6B82]">
                {new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <StarRating rating={review.rating} />
            {review.publicComment && (
              <p className="mt-2 text-sm leading-relaxed text-[#203565]">{comments[index] ?? review.publicComment}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

ReviewSection.propTypes = {
  propertyId: PropTypes.string,
  onSummary: PropTypes.func,
};

export default ReviewSection;
