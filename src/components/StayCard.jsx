import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { firstImage } from '../utils/images.js';

/**
 * The single guest property card, used everywhere a guest sees listings: the
 * Stays grid ("Stays in Nairobi" and /properties), the Similar properties strip
 * and Saved stays. Its presentation lives in guest-discovery.css (.opg-stay-*),
 * which tailwind.css imports globally.
 *
 * Keep this as the ONE card implementation. Earlier the Similar properties and
 * Saved stays surfaces rendered a second, Tailwind-based card that had drifted:
 * 4:3 photo instead of 282/182, a bordered white surface, a MapPin + capacity
 * line, "per night" printed above the price and a "KES" prefix instead of "KSh".
 * Two implementations meant the same property looked like two different cards
 * depending on the page, so callers should not fork this markup again.
 */
function StayCard({ stay }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const image = firstImage(stay);
  const location = stay.neighborhood || stay.location || 'Nairobi';
  const details = [
    location,
    stay.guests && `${stay.guests} guests`,
    stay.bedrooms != null && `${stay.bedrooms} bed${stay.bedrooms === 1 ? '' : 's'}`,
  ].filter(Boolean);

  return <article className="opg-stay-card">
    <Link to={`/property/${stay.id}`} className="opg-stay-image" aria-label={`View ${stay.title}`}>
      {image ? <img src={image} alt={stay.title} loading="lazy" /> : <span className="opg-image-fallback">Photo coming soon</span>}
      {stay.featured && <span className="opg-card-badge">Featured</span>}
    </Link>
    <button type="button" className="opg-heart" aria-label={isFavorite(stay.id) ? 'Remove from saved stays' : 'Save stay'} aria-pressed={isFavorite(stay.id)} onClick={() => isAuthenticated ? toggleFavorite(stay.id) : navigate('/login')}>{isFavorite(stay.id) ? '♥' : '♡'}</button>
    <Link to={`/property/${stay.id}`} className="opg-stay-content"><h3>{stay.title}</h3><p>{details.join(' · ')}</p><div className="opg-price"><strong>{stay.price != null ? `KSh ${Number(stay.price).toLocaleString()}` : 'Price on request'}</strong>{stay.price != null && <span>per night</span>}{stay.rating != null && <span className="opg-rating">★ {Number(stay.rating).toFixed(2)}</span>}</div></Link>
  </article>;
}

StayCard.propTypes = {
  stay: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    location: PropTypes.string,
    neighborhood: PropTypes.string,
    guests: PropTypes.number,
    bedrooms: PropTypes.number,
    price: PropTypes.number,
    rating: PropTypes.number,
    featured: PropTypes.bool,
    images: PropTypes.arrayOf(PropTypes.string),
    imagesJson: PropTypes.string,
    coverImage: PropTypes.string,
  }).isRequired,
};

export default StayCard;
