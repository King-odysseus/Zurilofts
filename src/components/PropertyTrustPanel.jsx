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
    <div className="flex items-center gap-2 rounded-2xl bg-[#F7F4EF] px-4 py-3">
      <span className="text-[#C49A6C] shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-[#5B6B82]">{label}</p>
        <p className="text-sm font-semibold text-[#0B1F42]">{value}</p>
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
          <Star className="w-5 h-5" fill="currentColor" aria-hidden="true" />
        }
        label="Guest rating"
        value={`${ratingDisplay} · ${reviewDisplay}`}
      />

      {/* Property type */}
      <TrustBadge
        icon={
          <Building2 className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
        }
        label="Property type"
        value={typeLabel}
      />

      {/* Location */}
      {location && (
        <TrustBadge
          icon={
            <MapPin className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
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
