import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

/**
 * Flatter editorial property card with navy/gold/cream palette and subtle motion.
 *
 * Visuals: cream surface, navy headings, bronze accents, thin border. Hover
 * applies a gentle lift + shadow increase - lighter than the old neumorphic
 * translate-y-2 + scale-110 zoom.
 *
 * Behaviour preserved exactly: favourite toggle, variant badge, bed-variant
 * link, rating badge, location, bed/bath/area stats, nightly price, CTA.
 *
 * All optional fields guard against null/undefined.
 */
function PropertyCard({ property }) {
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
    bedrooms,
    bathrooms,
    area,
    badge,
    variantLabel,
    variant,
  } = property;

  const isLiked = id ? isFavorite(id) : false;
  const propertyHref = id
    ? `/property/${id}${variant ? `?variant=${variant}` : ''}`
    : '/properties';

  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (id) toggleFavorite(id);
  };

  // Safely format price - guard against null/undefined
  const formattedPrice = price != null ? price.toLocaleString() : null;

  return (
    <article className="group relative bg-white border border-[#D9D9D9]/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#0B0B45]/5 hover:border-[#C49A6C]/25 h-full flex flex-col">
      <Link
        to={propertyHref}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C]"
        aria-label={`View ${title || 'property'}`}
      >
        <span className="sr-only">View {title || 'property'}</span>
      </Link>

      {/* Image area */}
      <div className="relative aspect-[4/3] overflow-hidden flex-shrink-0 bg-[#D9D9D9]/20">
        {image ? (
          <img
            src={image}
            alt={title || 'Property image'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" aria-hidden="true">
            <svg className="w-12 h-12 text-[#D9D9D9]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Gradient overlay - visible on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B45]/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />

        {/* Badges: Featured + variant */}
        {badge && (
          <span className="absolute top-2.5 left-2.5 bg-[#C49A6C] text-white text-[10px] font-bold px-3 py-1 rounded-full">
            {badge}
          </span>
        )}
        {variantLabel && (
          <span
            className={`absolute ${badge ? 'top-9' : 'top-2.5'} left-2.5 bg-[#0B0B45] text-white text-[10px] font-bold px-3 py-1 rounded-full`}
          >
            {variantLabel}
          </span>
        )}

        {/* Favourite toggle */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          className="absolute z-20 top-2.5 right-2.5 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C49A6C]"
          aria-label={isLiked ? 'Remove from favourites' : 'Add to favourites'}
        >
          <svg
            className={`w-4 h-4 transition-colors duration-200 ${isLiked ? 'text-red-500 fill-current' : 'text-[#6b7280] hover:text-red-400'}`}
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title + Rating */}
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 className="text-sm font-semibold text-[#0B0B45] leading-snug line-clamp-1">
            {title || 'Property'}
          </h3>
          {rating != null && (
            <div className="flex items-center gap-1 flex-shrink-0" aria-label={`Rated ${rating} out of 5`}>
              <svg className="w-3.5 h-3.5 text-[#C49A6C] fill-current" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-bold text-[#0B0B45]">
                {typeof rating === 'number' ? rating.toFixed(1) : rating}
              </span>
              {reviewCount != null && reviewCount > 0 && (
                <span className="text-xs text-[#6b7280]">({reviewCount})</span>
              )}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center text-[#6b7280] mb-2.5">
          <svg className="w-3.5 h-3.5 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs truncate">{location || 'TBA'}</span>
        </div>

        {/* Stats row - beds, baths, area */}
        <div className="flex items-center justify-between mb-3 py-2.5 border-y border-[#D9D9D9]/60">
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center text-[#0B0B45] mb-0.5">
              <svg className="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs font-semibold">{bedrooms != null ? bedrooms : '-'}</span>
            </div>
            <span className="text-[10px] text-[#6b7280]">{bedrooms === 1 ? 'Bed' : 'Beds'}</span>
          </div>
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center text-[#0B0B45] mb-0.5">
              <svg className="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-xs font-semibold">{bathrooms != null ? bathrooms : '-'}</span>
            </div>
            <span className="text-[10px] text-[#6b7280]">{bathrooms === 1 ? 'Bath' : 'Baths'}</span>
          </div>
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center text-[#0B0B45] mb-0.5">
              <svg className="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span className="text-xs font-semibold">{area != null ? area : '-'}</span>
            </div>
            <span className="text-[10px] text-[#6b7280]">Sqft</span>
          </div>
        </div>

        {/* Price + CTA - pinned to bottom */}
        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="text-[10px] text-[#6b7280]">per night</span>
            <div className="text-lg font-bold text-[#C49A6C]">
              {formattedPrice ? `KES ${formattedPrice}` : 'KES -'}
            </div>
          </div>
          <span className="bg-[#0B0B45] text-white font-semibold px-3.5 py-1.5 rounded-full text-xs transition-colors duration-200 group-hover:bg-[#C49A6C]">
            Book Now
          </span>
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
    area: PropTypes.number,
    badge: PropTypes.string,
    variantLabel: PropTypes.string,
    variant: PropTypes.string,
  }).isRequired,
};

export default PropertyCard;
