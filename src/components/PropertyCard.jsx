import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

function PropertyCard({ property }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const { id, image, title, location, price, rating, bedrooms, bathrooms, area, badge, variantLabel } = property;
  const isLiked = id ? isFavorite(id) : false;

  const handleToggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (id) toggleFavorite(id);
  };

  return (
    <div className="group neu-card neu-card-hover transition-all duration-300 hover:-translate-y-2 overflow-hidden">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {badge && (
          <span className="absolute top-4 left-4 bg-[#C49A6C] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
            {badge}
          </span>
        )}
        {variantLabel && (
          <span className={`absolute ${badge ? 'top-12' : 'top-4'} left-4 bg-[#262262] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md`}>
            {variantLabel}
          </span>
        )}

        <button
          onClick={handleToggleFavorite}
          className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-200"
          aria-label={isLiked ? 'Remove from favourites' : 'Add to favourites'}
        >
          <svg
            className={`w-5 h-5 transition-colors duration-200 ${isLiked ? 'text-red-500 fill-current' : 'text-[#6b7280] hover:text-red-400'}`}
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-base font-semibold text-[#1f2937] leading-tight pr-2">{title}</h3>
          <div className="flex items-center space-x-1 flex-shrink-0 bg-[#C49A6C]/10 px-2 py-1 rounded-lg">
            <svg className="w-4 h-4 text-[#C49A6C] fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-bold text-[#1f2937]">{rating}</span>
          </div>
        </div>

        <div className="flex items-center text-[#6b7280] mb-3">
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm truncate">{location}</span>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between mb-3 py-3 border-y border-[#D9D9D9]">
          {[
            { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', value: bedrooms, label: 'Beds' },
            { icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', value: bathrooms, label: 'Baths' },
            { icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4', value: area, label: 'Sqft' },
          ].map(({ icon, value, label }, i, arr) => (
            <div key={label} className="flex-1 flex flex-col items-center">
              <div className="flex items-center text-[#6b7280] mb-1">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
                <span className="text-xs">{value}</span>
              </div>
              <span className="text-xs text-[#6b7280]">{label}</span>
            </div>
          ))}
        </div>

        {/* Price and CTA */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-[#6b7280]">per night</span>
            <div className="text-xl font-bold text-[#C49A6C]">KES {price.toLocaleString()}</div>
          </div>
          <button className="bg-[#C49A6C] text-white font-semibold px-4 py-2 rounded-full hover:bg-[#b8895c] hover:shadow-lg transition-all duration-200 text-sm">
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
}

PropertyCard.propTypes = {
  property: PropTypes.shape({
    id: PropTypes.string,
    image: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    rating: PropTypes.number.isRequired,
    bedrooms: PropTypes.number.isRequired,
    bathrooms: PropTypes.number.isRequired,
    area: PropTypes.number.isRequired,
    badge: PropTypes.string,
  }).isRequired,
};

export default PropertyCard;
