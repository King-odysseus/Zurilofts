import { useState } from 'react';
import { formatPrice } from '../utils/currency.js';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Heart, Sparkles, Star, Trophy } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { firstImage, propertyImages } from '../utils/images.js';
import { formatStayDates, freeCancellationUntil, nightsBetween } from '../utils/stayDates.js';

/**
 * The single guest property card, used everywhere a guest sees listings: the
 * Stays grid ("Stays in Nairobi" and /properties), the Similar properties strip
 * and Saved stays.
 *
 * Keep this as the ONE card implementation. A forked card on the Similar
 * properties and Saved stays surfaces is exactly how the same property ended up
 * looking like two different cards depending on the page.
 *
 * The card is drawn flat - no border, no shadow - with the photo carrying the
 * shape and the words sitting directly under it, so a row of stays reads as a
 * set of photographs rather than a set of boxes. Every line states something
 * the listing actually holds: a stay with no dates picked says "per night"
 * instead of inventing a total for nights nobody chose.
 */

const TYPE_LABELS = { apartment: 'Apartment', studio: 'Studio', penthouse: 'Penthouse' };

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function StayCard({ stay, checkIn, checkOut }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [photoIndex, setPhotoIndex] = useState(0);

  const images = propertyImages(stay);
  const image = images[photoIndex] || firstImage(stay);
  const location = stay.neighborhood || stay.location || 'Nairobi';
  const typeLabel = TYPE_LABELS[String(stay.type || '').toLowerCase()];

  // Line one names what kind of home it is and where, line two the listing's own
  // name - the same two-part reading order a guest meets on the detail page.
  const headline = typeLabel ? `${typeLabel} in ${location}` : location;

  const facts = [
    stay.bedrooms != null && plural(stay.bedrooms, 'bedroom', 'bedrooms'),
    stay.bathrooms != null && plural(stay.bathrooms, 'bathroom', 'bathrooms'),
  ].filter(Boolean);

  const nights = nightsBetween(checkIn, checkOut);
  const stayDates = formatStayDates(checkIn, checkOut);
  const freeUntil = freeCancellationUntil(checkIn);

  const rating = Number(stay.rating) > 0 ? Number(stay.rating).toFixed(1) : null;
  const isGuestFavourite = Number(stay.rating) >= 4.8 && Number(stay.reviews) > 0;
  const saved = isFavorite(stay.id);

  return <article className="group relative min-w-0">
    <div className="relative">
      <Link to={`/property/${stay.id}`} className="block overflow-hidden rounded-2xl bg-surface" aria-label={`View ${stay.title}`}>
        {image
          ? <img src={image} alt={stay.title} loading="lazy" className="aspect-[3/2] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          : <span className="grid aspect-[3/2] w-full place-items-center text-xs text-muted">Photo coming soon</span>}
      </Link>

      {/* A white pill on the photo rather than a filled badge: the label sits on
          top of a photograph, and a tinted badge fights whatever is behind it. */}
      {(isGuestFavourite || stay.featured) && <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink shadow-sm">
        {isGuestFavourite
          ? <><Trophy className="h-3.5 w-3.5 text-bronze" strokeWidth={2} aria-hidden="true" />Guest favourite</>
          : <><Sparkles className="h-3.5 w-3.5 text-bronze" strokeWidth={2} aria-hidden="true" />Featured</>}
      </span>}

      {/* Guests without a session get a no-op from FavoritesContext, which keeps
          this control out of the auth flow. */}
      <button
        type="button"
        className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-ink shadow-sm transition-colors hover:bg-white"
        aria-label={saved ? 'Remove from saved stays' : 'Save stay'}
        aria-pressed={saved}
        onClick={() => toggleFavorite(stay.id)}
      >
        <Heart className="h-4 w-4" strokeWidth={2} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>

      {/* Dots move through the listing's own photos. They are siblings of the
          photo link, never inside it: a button nested in an anchor is announced
          as one control and swallows the tap. */}
      {images.length > 1 && <div className="absolute inset-x-0 bottom-2.5 z-10 flex justify-center gap-1.5">
        {images.slice(0, 5).map((photo, index) => <button
          key={photo}
          type="button"
          onClick={() => setPhotoIndex(index)}
          aria-label={`Show photo ${index + 1} of ${images.length}`}
          aria-current={index === photoIndex}
          className={`h-1.5 w-1.5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${index === photoIndex ? 'bg-white' : 'bg-white/55 hover:bg-white/80'}`}
        />)}
      </div>}
    </div>

    <Link to={`/property/${stay.id}`} className="mt-3 block">
      <div className="flex items-start justify-between gap-3">
        <h3 className="truncate text-[15px] font-semibold leading-tight text-ink">{headline}</h3>
        {/* A score is only worth showing once a guest has actually rated it. */}
        {rating && <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-ink">
          <Star className="h-3.5 w-3.5 text-ink" strokeWidth={2} fill="currentColor" aria-hidden="true" />
          {rating}
          {Number(stay.reviews) > 0 && <span className="font-normal text-ink">({stay.reviews})</span>}
        </span>}
      </div>

      <p className="truncate text-[13px] leading-snug text-muted">{stay.title}</p>
      {facts.length > 0 && <p className="truncate text-[13px] leading-snug text-muted">{facts.join(' · ')}</p>}
      {stayDates && <p className="text-[13px] leading-snug text-muted">{stayDates}</p>}

      <p className="mt-1 text-[15px] leading-snug text-ink">
        <span className="font-semibold">{formatPrice(stay.price) ?? 'Price on request'}</span>
        {/* Only a stay with dates can be priced as a total; without them the
            honest unit is the nightly rate. */}
        {stay.price != null && <span> {nights > 0 ? `for ${plural(nights, 'night', 'nights')}` : 'per night'}</span>}
      </p>

      {freeUntil && <span className="mt-1.5 inline-flex rounded-md bg-surface px-2 py-1 text-[11px] font-medium text-charcoal">
        Free cancellation until {freeUntil}
      </span>}
    </Link>
  </article>;
}

StayCard.propTypes = {
  stay: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    location: PropTypes.string,
    neighborhood: PropTypes.string,
    type: PropTypes.string,
    guests: PropTypes.number,
    bedrooms: PropTypes.number,
    bathrooms: PropTypes.number,
    price: PropTypes.number,
    rating: PropTypes.number,
    reviews: PropTypes.number,
    featured: PropTypes.bool,
    images: PropTypes.arrayOf(PropTypes.string),
    imagesJson: PropTypes.string,
    coverImage: PropTypes.string,
  }).isRequired,
  // Search dates, when the guest has picked them. They turn the last line into
  // a total for the nights actually chosen.
  checkIn: PropTypes.string,
  checkOut: PropTypes.string,
};

export default StayCard;
