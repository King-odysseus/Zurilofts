import PropTypes from 'prop-types';
import { Building2, MapPin, Star } from 'lucide-react';

/**
 * PropertyTrustPanel - a slim confidence strip that surfaces only verified
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
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
      <span className="shrink-0 text-muted" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

TrustBadge.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

function PropertyTrustPanel({ rating = 0, reviewCount = 0, type = '', location = '' }) {
  const hasReviews = typeof rating === 'number' && rating > 0;
  const typeLabel = TYPE_LABELS[type] || type || 'Property';
  // The badge already renders the Star icon, so the value stays a plain number:
  // appending the star glyph put two stars side by side.
  const ratingDisplay = hasReviews ? `${rating}` : 'New';
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
          <Star className="h-5 w-5" fill="currentColor" aria-hidden="true" />
        }
        label="Guest rating"
        value={`${ratingDisplay} · ${reviewDisplay}`}
      />

      {/* Property type */}
      <TrustBadge
        icon={
          <Building2 className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        }
        label="Property type"
        value={typeLabel}
      />

      {/* Location */}
      {location && (
        <TrustBadge
          icon={
            <MapPin className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
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

export default PropertyTrustPanel;
