import PropTypes from 'prop-types';
import PropertyCard from './PropertyCard';
import { firstImage } from '../utils/images.js';

/**
 * Reusable horizontally scrollable card strip.
 *
 * Renders at most 6 `PropertyCard`s in a snap-scrolling row. The scrollbar is
 * hidden but keyboard and touch scrolling still work. Renders nothing at all
 * when `properties` is empty and no `emptyMessage` is provided, so callers can
 * mount it unconditionally without introducing stray headings or layout gaps.
 */
function PropertyCardRow({ title, properties, emptyMessage, align = 'left' }) {
  const cards = Array.isArray(properties) ? properties.slice(0, 6) : [];
  const centered = align === 'center';

  if (cards.length === 0 && !emptyMessage) return null;

  return (
    <section className="mx-auto w-full max-w-[1344px] px-4 md:px-6" aria-label={title}>
      <h2 className={`mb-6 text-2xl font-bold text-[#0B1F42] md:text-3xl ${centered ? 'text-center' : ''}`}>{title}</h2>

      {cards.length === 0 ? (
        <p className={`text-[#5B6B82] ${centered ? 'text-center' : ''}`}>{emptyMessage}</p>
      ) : (
        <div className={`flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 no-scrollbar ${centered ? 'lg:justify-center' : ''}`}>
          {cards.map((property) => (
            <div key={property.id} className="snap-start flex-shrink-0 w-64 sm:w-72">
              <PropertyCard property={{ ...property, image: firstImage(property) }} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

PropertyCardRow.propTypes = {
  title: PropTypes.string.isRequired,
  properties: PropTypes.arrayOf(
    PropTypes.shape({
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
    })
  ),
  emptyMessage: PropTypes.string,
  align: PropTypes.oneOf(['left', 'center']),
};

export default PropertyCardRow;
