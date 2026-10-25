import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Badge } from 'flowbite-react';
import { Heart, Star } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { firstImage } from '../utils/images.js';

/**
 * The single guest property card, used everywhere a guest sees listings: the
 * Stays grid ("Stays in Nairobi" and /properties), the Similar properties strip
 * and Saved stays.
 *
 * Keep this as the ONE card implementation. A forked card on the Similar
 * properties and Saved stays surfaces is exactly how the same property ended up
 * looking like two different cards depending on the page.
 */
function StayCard({ stay }) {
  const { isFavorite, toggleFavorite } = useFavorites();

  const image = firstImage(stay);
  const location = stay.neighborhood || stay.location || 'Nairobi';
  const details = [
    location,
    stay.guests && `${stay.guests} guests`,
    stay.bedrooms != null && `${stay.bedrooms} bed${stay.bedrooms === 1 ? '' : 's'}`,
  ].filter(Boolean);

  const isGuestFavourite = Number(stay.rating) >= 4.8;
  const saved = isFavorite(stay.id);

  return <article className="group relative overflow-hidden rounded-xl border border-border bg-elevated shadow-sm transition-shadow hover:shadow-md">
    <Link to={`/property/${stay.id}`} className="relative block overflow-hidden" aria-label={`View ${stay.title}`}>
      {image
        ? <img src={image} alt={stay.title} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        : <span className="grid aspect-[4/3] w-full place-items-center bg-surface text-xs text-muted">Photo coming soon</span>}
      {isGuestFavourite
        ? <Badge color="success" className="absolute left-3 top-3">Guest favourite</Badge>
        : stay.featured && <Badge color="warning" className="absolute left-3 top-3">Featured</Badge>}
    </Link>

    {/* Guests without a session get a no-op from FavoritesContext, which keeps
        this control out of the auth flow. */}
    <button
      type="button"
      className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-navy shadow-sm backdrop-blur transition-colors hover:bg-white"
      aria-label={saved ? 'Remove from saved stays' : 'Save stay'}
      aria-pressed={saved}
      onClick={() => toggleFavorite(stay.id)}
    >
      <Heart className="h-4 w-4" strokeWidth={2} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>

    <Link to={`/property/${stay.id}`} className="block space-y-1 p-4">
      <h3 className="truncate text-base font-semibold text-navy">{stay.title}</h3>
      <p className="flex items-center gap-1 text-xs text-muted"><span className="truncate">{details.join(' · ')}</span></p>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="flex items-baseline gap-1.5">
          <span className="text-base font-bold text-navy tabular-nums">
            {stay.price != null ? `KSh ${Number(stay.price).toLocaleString()}` : 'Price on request'}
          </span>
          {stay.price != null && <span className="text-xs text-muted">per night</span>}
        </span>
        {stay.rating != null && <span className="flex items-center gap-1 text-xs font-semibold text-navy">
          <Star className="h-3 w-3 text-primary" strokeWidth={2} fill="currentColor" aria-hidden="true" />
          {Number(stay.rating).toFixed(2)}
        </span>}
      </div>
    </Link>
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
