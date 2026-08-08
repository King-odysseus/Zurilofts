import PropTypes from 'prop-types';
import PropertyCard from './PropertyCard';

/**
 * Reusable horizontally scrollable card strip.
 *
 * Renders at most 6 `PropertyCard`s in a snap-scrolling row. The scrollbar is
 * hidden but keyboard and touch scrolling still work. Renders nothing at all
 * when `properties` is empty and no `emptyMessage` is provided, so callers can
 * mount it unconditionally without introducing stray headings or layout gaps.
 */
function PropertyCardRow({ title, properties, emptyMessage }) {
  const cards = Array.isArray(properties) ? properties.slice(0, 6) : [];

  if (cards.length === 0 && !emptyMessage) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6" aria-label={title}>
      <h2 className="text-2xl md:text-3xl font-bold text-[#0B0B45] mb-6">{title}</h2>

      {cards.length === 0 ? (
        <p className="text-[#6b7280]">{emptyMessage}</p>
      ) : (
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 no-scrollbar">
          {cards.map((property) => (
            <div key={property.id} className="snap-start flex-shrink-0 w-64 sm:w-72">
              <PropertyCard property={property} />
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
};

export default PropertyCardRow;
