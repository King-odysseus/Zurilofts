import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * BookingSummaryCard - a focused booking sidebar that shows only what the
 * property API actually supplies. No invented guarantees, fees, or policies.
 *
 * Props:
 *  - price        : nightly rate in KES (number)
 *  - bookingHref  : target route for the booking flow (string)
 *  - rating       : average star rating (number, e.g. 4.2)
 *  - reviewCount  : total number of reviews (number)
 *  - variantLabel : human-readable bed variant label, or null for base listing
 *  - addOns       : optional array of selected add-ons to show as line items,
 *                   each { id, name, quantity, price } (price in KES)
 */
function BookingSummaryCard({ price, bookingHref, rating, reviewCount, variantLabel, addOns }) {
  const hasReviews = typeof rating === 'number' && rating > 0;
  const reviewLabel =
    reviewCount === 1 ? '1 review' : `${reviewCount || 0} reviews`;

  const addOnItems = Array.isArray(addOns) ? addOns : [];
  const addOnsTotal = addOnItems.reduce((sum, a) => sum + (a.quantity * (a.price || 0)), 0);

  return (
    <div className="sticky top-24 rounded-2xl border border-[#E3E8EF] bg-white p-5 shadow-[0_8px_28px_rgba(11,31,66,0.08)] md:p-6" role="complementary" aria-label="Booking summary">
      {/* Price */}
      <div className="mb-5">
        <span className="text-3xl font-bold text-[#0B1F42]">
          KES {price != null ? price.toLocaleString() : '-'}
        </span>
        <span className="text-[#5B6B82]"> / night</span>
      </div>

      {/* Bed variant chip - only when arriving from a variant card */}
      {variantLabel && (
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-[#FDE8D8] px-3 py-1.5 text-sm font-medium text-[#0B1F42]">
          <svg className="w-4 h-4 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
          </svg>
          {variantLabel}
        </div>
      )}

      {/* Selected add-ons - only when provided */}
      {addOnItems.length > 0 && (
        <div className="mb-5 border-t border-[#E3E8EF] pt-5">
          <h4 className="mb-3 font-semibold text-[#0B1F42]">Add-ons</h4>
          <div className="space-y-2 text-sm">
            {addOnItems.map((a) => (
              <div key={a.id} className="flex justify-between text-[#5B6B82]">
                <span>{a.name} x {a.quantity}</span>
                <span>KES {(a.quantity * (a.price || 0)).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-[#E3E8EF] pt-2 font-semibold text-[#0B1F42]">
              <span>Add-ons total</span>
              <span>KES {addOnsTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Booking CTA */}
      <Link
        to={bookingHref}
        className="block min-h-[48px] w-full rounded-[10px] bg-[#C49A6C] py-4 text-center font-bold text-white transition-colors duration-200 hover:bg-[#B8895C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C] active:bg-[#9A744A]"
        aria-label={`Book ${variantLabel ? variantLabel + ' option' : 'this property'} for KES ${price != null ? price.toLocaleString() : '-'} per night`}
      >
        Book Now
      </Link>

      <p className="mt-4 text-center text-sm text-[#5B6B82]">
        You won&apos;t be charged yet
      </p>

      {/* Trust context - only facts from the API */}
      <div className="mt-6 border-t border-[#E3E8EF] pt-6">
        <h4 className="mb-3 font-semibold text-[#0B1F42]">About this listing</h4>
        <ul className="space-y-2 text-sm text-[#5B6B82]">
          {hasReviews && (
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[#C49A6C] mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>
                <span className="font-semibold text-[#0B1F42]">{rating}</span> rating &middot; {reviewLabel}
              </span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-[#C49A6C] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Secure booking via Paystack</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

BookingSummaryCard.propTypes = {
  price: PropTypes.number.isRequired,
  bookingHref: PropTypes.string.isRequired,
  rating: PropTypes.number,
  reviewCount: PropTypes.number,
  variantLabel: PropTypes.string,
  addOns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      quantity: PropTypes.number.isRequired,
      price: PropTypes.number.isRequired,
    })
  ),
};

BookingSummaryCard.defaultProps = {
  rating: 0,
  reviewCount: 0,
  variantLabel: null,
  addOns: [],
};

export default BookingSummaryCard;
