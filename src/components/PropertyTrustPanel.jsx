import PropTypes from 'prop-types';

/**
 * PropertyTrustPanel — a slim confidence strip that surfaces only verified
 * facts from the property API. No invented badges, verifications, or guarantees.
 *
 * Props:
 *  - rating      : average star rating (number)
 *  - reviewCount : total reviews (number)
 *  - type        : property type e.g. "apartment", "studio", "penthouse"
 *  - location    : human-readable location string
 */

const TYPE_LABELS = {
  apartment: 'Apartment',
  studio: 'Studio',
  penthouse: 'Penthouse',
};

function TrustBadge({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 bg-[#0B0B45]/[0.03] rounded-xl px-4 py-3">
      <span className="text-[#C49A6C] shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="text-xs text-[#6b7280] uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-[#0B0B45]">{value}</p>
      </div>
    </div>
  );
}

TrustBadge.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

function PropertyTrustPanel({ rating, reviewCount, type, location }) {
  const hasReviews = typeof rating === 'number' && rating > 0;
  const typeLabel = TYPE_LABELS[type] || type || 'Property';
  const ratingDisplay = hasReviews ? `${rating} ★` : 'New';
  const reviewDisplay = hasReviews
    ? reviewCount === 1
      ? '1 review'
      : `${reviewCount} reviews`
    : 'No reviews yet';

  return (
    <section
      className="flex flex-wrap gap-3"
      aria-label="Property overview"
    >
      {/* Rating */}
      <TrustBadge
        icon={
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        }
        label="Guest rating"
        value={`${ratingDisplay} · ${reviewDisplay}`}
      />

      {/* Property type */}
      <TrustBadge
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }
        label="Property type"
        value={typeLabel}
      />

      {/* Location */}
      {location && (
        <TrustBadge
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          label="Location"
          value={location}
        />
      )}
    </section>
  );
}

PropertyTrustPanel.propTypes = {
  rating: PropTypes.number,
  reviewCount: PropTypes.number,
  type: PropTypes.string,
  location: PropTypes.string,
};

PropertyTrustPanel.defaultProps = {
  rating: 0,
  reviewCount: 0,
  type: '',
  location: '',
};

export default PropertyTrustPanel;
