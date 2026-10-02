import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Heart, Image as ImageIcon, MapPin, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

/**
 * Neutral, Airbnb-inspired property card: white surface, charcoal text, blue
 * as the sole interactive accent. Bronze/navy are reserved for the Featured
 * badge and bed-variant tag, matching the design system's brand-accent rules.
 *
 * Behaviour preserved exactly: favourite toggle, variant badge, bed-variant
 * link, rating badge, location, nightly price, and card navigation CTA.
 *
 * All optional fields guard against null/undefined.
 */
function PropertyCard({ property, cardVariant = 'default' }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const {
    id,
    image,
    title,
    location,
    price,
    rating,
    reviewCount,
    badge,
    variantLabel,
    variant,
    bedrooms,
    bathrooms,
  } = property;

  const isLiked = id ? isFavorite(id) : false;
  const resultsCard = cardVariant === 'results';
  const propertyHref = id
    ? `/property/${id}${variant ? `?variant=${variant}` : ''}`
    : '/properties';

  const handleToggleFavorite = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (id) toggleFavorite(id);
  };

  // Safely format price - guard against null/undefined
  const formattedPrice = price != null ? price.toLocaleString() : null;

  // Compact capacity summary - only what's actually known, never fabricated.
  const capacityParts = [];
  if (bedrooms != null) capacityParts.push(`${bedrooms} bed${bedrooms === 1 ? '' : 's'}`);
  if (bathrooms != null) capacityParts.push(`${bathrooms} bath${bathrooms === 1 ? '' : 's'}`);
  const capacityLabel = capacityParts.join(' · ');

  if (resultsCard) {
    const resultsMeta = [location, property.guests ? `${property.guests} guests` : null, bedrooms != null ? `${bedrooms} bed${bedrooms === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ');
    return (
      <article className="group relative min-w-0">
        <Link to={propertyHref} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B6D]">
          <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-[#E7EDF4]">
            {image ? <img src={image} alt={title || 'Property image'} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /> : <div className="h-full w-full bg-[#E7EDF4]" />}
            <button type="button" onClick={handleToggleFavorite} className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#0B1F42] transition hover:scale-105 hover:bg-white" aria-label={isLiked ? 'Remove from favourites' : 'Add to favourites'}>
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={1.6} aria-hidden="true" />
            </button>
          </div>
          <div className="pt-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-[17px] font-semibold leading-5 text-[#0B1F42]">{title || 'Property'}</h3>
              {rating != null && <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#33415C]"><span className="text-[#C89B6D]">★</span>{Number(rating).toFixed(2)}</span>}
            </div>
            <p className="mt-1 truncate text-[13px] font-medium text-[#5B6B82]">{resultsMeta || 'Nairobi'}</p>
            <div className="mt-3 flex items-baseline gap-2"><span className="text-[17px] font-semibold text-[#0B1F42]">{formattedPrice ? `KSh ${formattedPrice}` : 'KSh -'}</span><span className="text-xs text-[#64748B]">per night</span></div>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className={`group relative flex h-full flex-col overflow-hidden bg-white transition-all duration-200 ${resultsCard ? 'rounded-2xl shadow-none' : 'rounded-2xl border border-[#E3E8EF] shadow-[0_4px_16px_rgba(11,31,66,0.04)] hover:-translate-y-1 hover:shadow-md'}`}>
      <Link
        to={propertyHref}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C]"
        aria-label={`View ${title || 'property'}`}
      >
        <span className="sr-only">View {title || 'property'}</span>
      </Link>

      {/* Image area */}
      <div className={`relative overflow-hidden flex-shrink-0 bg-[#F7F4EF] ${resultsCard ? 'aspect-[3/2]' : 'aspect-[4/3]'}`}>
        {image ? (
          <img
            src={image}
            alt={title || 'Property image'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" aria-hidden="true">
            <ImageIcon className="w-12 h-12 text-[#E3E8EF]" strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}

        {/* Gradient overlay - visible on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />

        {/* Badges: Featured + variant */}
        {badge && (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-[#C49A6C] px-3 py-1 text-xs font-bold text-white">
            {badge}
          </span>
        )}
        {variantLabel && (
          <span
            className={`absolute ${badge ? 'top-9' : 'top-2.5'} left-2.5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#0B1F42] backdrop-blur-sm`}
          >
            {variantLabel}
          </span>
        )}

        {/* Favourite toggle */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          className="absolute right-1.5 top-1.5 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C49A6C]"
          aria-label={isLiked ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Heart className={`w-5 h-5 transition-colors duration-200 ${isLiked ? 'text-red-500 fill-current' : 'text-[#5B6B82] hover:text-red-400'}`} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {/* Content */}
      <div className={`flex flex-1 flex-col ${resultsCard ? 'pt-3' : 'p-4'}`}>
        {/* Title + Rating */}
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 className={`${resultsCard ? 'text-[17px]' : 'text-sm'} font-semibold leading-snug text-[#0B1F42] line-clamp-1`}>
            {title || 'Property'}
          </h3>
          {rating != null && (
            <div className="flex items-center gap-1 flex-shrink-0" aria-label={`Rated ${rating} out of 5`}>
              <Star className="w-3.5 h-3.5 text-amber-500 fill-current" aria-hidden="true" />
              <span className="text-xs font-bold text-[#0B1F42]">
                {typeof rating === 'number' ? rating.toFixed(1) : rating}
              </span>
              {reviewCount != null && reviewCount > 0 && (
                <span className="text-xs text-[#5B6B82]">({reviewCount})</span>
              )}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="mb-1 flex items-center text-[#5B6B82]">
          <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
          <span className="text-xs truncate">{location || 'TBA'}</span>
        </div>

        {/* Capacity - only rendered when at least one figure is known */}
        {capacityLabel && (
          <p className="mb-2.5 text-xs text-[#5B6B82]">{capacityLabel}</p>
        )}

        {/* The card itself is the property link (see the overlay Link above),
            so price is transparent detail rather than a duplicate "Book Now" CTA. */}
        <div className="mt-auto">
            <span className="text-xs text-[#5B6B82]">per night</span>
          <div className={`${resultsCard ? 'text-[17px] font-semibold text-[#0B1F42]' : 'text-lg font-bold text-[#0B1F42]'}`}>
            {formattedPrice ? `KES ${formattedPrice}` : 'KES -'}
          </div>
        </div>
      </div>
    </article>
  );
}

PropertyCard.propTypes = {
  property: PropTypes.shape({
    id: PropTypes.string,
    image: PropTypes.string,
    title: PropTypes.string,
    location: PropTypes.string,
    price: PropTypes.number,
    rating: PropTypes.number,
    reviewCount: PropTypes.number,
    bedrooms: PropTypes.number,
    bathrooms: PropTypes.number,
    guests: PropTypes.number,
    area: PropTypes.number,
    badge: PropTypes.string,
    variantLabel: PropTypes.string,
    variant: PropTypes.string,
  }).isRequired,
  cardVariant: PropTypes.string,
};


export default PropertyCard;
