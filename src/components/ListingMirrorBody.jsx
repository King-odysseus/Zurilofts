import { useState } from 'react';
import PropTypes from 'prop-types';
import { Bath, Building2, Check, House, MapPin, Ruler, Star, Users } from 'lucide-react';
import Lightbox from './Lightbox.jsx';
import { formatPrice } from '../utils/currency.js';
import { googleMapsDirectionsUrl, googleMapsSearchUrl } from '../utils/googleMaps.js';

/**
 * Read-only mirror of the traveller listing content, for the host and admin
 * workspaces.
 *
 * This is deliberately not the traveller page: it carries no booking panel, no
 * availability picker, no add-on checkout and no review feed, because none of
 * those belong to someone looking at their own listing or moderating it. It
 * renders the same facts a guest reads (photos, title, place, description,
 * amenities, nearby, location) and hands each workspace its own action panel in
 * place of the booking box, so the two sides stay recognisably related without
 * ever being the same screen.
 */

const TYPE_LABELS = { apartment: 'Apartment', studio: 'Studio', penthouse: 'Penthouse' };

// Same typographic rhythm for every block, so a long and a short listing still
// read as one page.
const SECTION_HEADING = 'mb-3 text-lg font-semibold text-navy';
const MUTED = 'text-sm leading-relaxed text-muted';

function Fact({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 shrink-0 text-bronze" strokeWidth={1.8} aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-navy">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

Fact.propTypes = {
  icon: PropTypes.elementType.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  label: PropTypes.string.isRequired,
};

/** Only the facts this listing actually has: a row of "-" reads as broken data. */
function buildFacts(property, typeLabel) {
  const facts = [];

  if (property.bedrooms != null) {
    facts.push({ icon: House, value: property.bedrooms, label: property.bedrooms === 1 ? 'Bedroom' : 'Bedrooms' });
  }
  if (property.bathrooms != null) {
    facts.push({ icon: Bath, value: property.bathrooms, label: property.bathrooms === 1 ? 'Bathroom' : 'Bathrooms' });
  }
  if (property.maxGuests != null) {
    facts.push({ icon: Users, value: property.maxGuests, label: property.maxGuests === 1 ? 'Guest' : 'Guests' });
  }
  if (property.area != null) {
    facts.push({ icon: Ruler, value: `${property.area} sq ft`, label: 'Area' });
  }
  // The type is always present, so the row never collapses to nothing.
  facts.push({ icon: Building2, value: typeLabel, label: 'Type' });

  return facts;
}

function ListingMirrorBody({ property, sidePanel }) {
  const [featuredImage, setFeaturedImage] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const images = Array.isArray(property.images) ? property.images.filter(Boolean) : [];
  const amenities = Array.isArray(property.amenities) ? property.amenities.filter(Boolean) : [];
  const nearby = Array.isArray(property.nearby) ? property.nearby.filter(Boolean) : [];
  const typeLabel = TYPE_LABELS[property.type] || property.type || 'Property';
  const facts = buildFacts(property, typeLabel);
  const price = formatPrice(property.price);

  // The primary photo can be swapped with the thumbnails, so the supporting set
  // has to be recomputed each time rather than sliced once.
  const supporting = images
    .map((src, index) => ({ src, index }))
    .filter(({ index }) => index !== featuredImage)
    .slice(0, 4);

  return (
    <>
      {images.length > 0 ? (
        <section aria-label="Listing photos" className="mb-6">
          {images.length === 1 ? (
            <button
              type="button"
              onClick={() => setLightboxIndex(0)}
              className="block w-full overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <img
                src={images[0]}
                alt={`${property.title} - photo 1 of 1`}
                className="h-56 w-full object-cover sm:h-72 md:h-[400px]"
              />
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:grid-rows-2">
              <button
                type="button"
                onClick={() => setLightboxIndex(featuredImage)}
                className="relative col-span-2 row-span-2 overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <img
                  src={images[featuredImage]}
                  alt={`${property.title} - photo ${featuredImage + 1} of ${images.length}`}
                  className="h-56 w-full object-cover sm:h-72 md:h-full md:min-h-[380px]"
                />
              </button>
              {supporting.map(({ src, index }) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setFeaturedImage(index)}
                  className="overflow-hidden rounded-2xl border border-border"
                  aria-label={`Show photo ${index + 1}`}
                >
                  <img src={src} alt="" className="h-20 w-full object-cover sm:h-24 md:h-full" />
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="mb-6 grid h-40 place-items-center rounded-2xl border border-dashed border-border bg-surface text-sm text-muted">
          No photos on this listing yet
        </div>
      )}

      <header className="mb-6">
        <h1 className="text-2xl font-bold leading-tight text-navy sm:text-3xl">{property.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
          {property.location && (
            <a
              href={googleMapsSearchUrl({ lat: property.lat, lng: property.lng, label: property.location })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full hover:text-navy"
            >
              <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              {property.location}
            </a>
          )}
          {property.rating ? (
            <span className="inline-flex items-center gap-1 font-semibold text-navy">
              <Star className="h-4 w-4 text-amber-500" fill="currentColor" aria-hidden="true" />
              {property.rating}
              {property.reviewCount ? <span className="font-normal text-muted">({property.reviewCount} reviews)</span> : null}
            </span>
          ) : null}
          {price && (
            <span className="font-semibold text-navy">
              {price} <span className="font-normal text-muted">per night</span>
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
        <div className="lg:col-span-2">
          <section aria-label="Key facts" className="mb-6 flex flex-wrap gap-5 border-b border-border pb-6 sm:gap-8">
            {facts.map((fact) => <Fact key={fact.label} {...fact} />)}
          </section>

          <section aria-labelledby="mirror-about" className="mb-6">
            <h2 id="mirror-about" className={SECTION_HEADING}>About this {typeLabel.toLowerCase()}</h2>
            {property.description ? (
              <div className="space-y-3 text-sm leading-relaxed text-charcoal">
                {property.description
                  .replace(/<[^>]*>?/gm, '')
                  .split('\n')
                  .filter(Boolean)
                  .map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              </div>
            ) : (
              <p className={MUTED}>No description written yet.</p>
            )}
          </section>

          <section aria-labelledby="mirror-amenities" className="mb-6">
            <h2 id="mirror-amenities" className={SECTION_HEADING}>What this place offers</h2>
            {amenities.length > 0 ? (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {amenities.map((amenity, index) => (
                  <li key={index} className="flex items-center gap-2.5 text-sm text-charcoal">
                    <Check className="h-4 w-4 shrink-0 text-bronze" strokeWidth={2} aria-hidden="true" />
                    {amenity}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={MUTED}>No amenities listed yet.</p>
            )}
          </section>

          {nearby.length > 0 && (
            <section aria-labelledby="mirror-nearby" className="mb-6">
              <h2 id="mirror-nearby" className={SECTION_HEADING}>What&apos;s nearby</h2>
              <ul className="space-y-2">
                {nearby.map((item, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-sm text-charcoal">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(property.location || property.address) && (
            <section aria-labelledby="mirror-location" className="mb-6">
              <h2 id="mirror-location" className={SECTION_HEADING}>Where guests will be</h2>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    {property.location && <p className="text-sm font-semibold text-navy">{property.location}</p>}
                    {property.address && <p className="mt-1 break-words text-xs text-muted">{property.address}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={googleMapsSearchUrl({ lat: property.lat, lng: property.lng, label: property.address || property.location })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[40px] items-center rounded-full border border-border bg-elevated px-4 text-xs font-semibold text-navy hover:border-navy"
                    >
                      Open in Google Maps
                    </a>
                    <a
                      href={googleMapsDirectionsUrl({ lat: property.lat, lng: property.lng, label: property.address || property.location })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[40px] items-center rounded-full border border-border bg-elevated px-4 text-xs font-semibold text-navy hover:border-navy"
                    >
                      Get directions
                    </a>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside aria-label="Workspace actions" className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">{sidePanel}</div>
        </aside>
      </div>

      {lightboxIndex !== null && (
        <Lightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  );
}

const propertyShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string,
  location: PropTypes.string,
  address: PropTypes.string,
  lat: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  lng: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  type: PropTypes.string,
  bedrooms: PropTypes.number,
  bathrooms: PropTypes.number,
  maxGuests: PropTypes.number,
  area: PropTypes.number,
  description: PropTypes.string,
  price: PropTypes.number,
  rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  reviewCount: PropTypes.number,
  images: PropTypes.arrayOf(PropTypes.string),
  amenities: PropTypes.arrayOf(PropTypes.string),
  nearby: PropTypes.arrayOf(PropTypes.string),
});

ListingMirrorBody.propTypes = {
  property: propertyShape.isRequired,
  sidePanel: PropTypes.node,
};

export default ListingMirrorBody;
