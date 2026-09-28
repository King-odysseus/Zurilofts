import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { House, ShieldCheck, Star } from 'lucide-react';

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
          <House className="w-4 h-4 text-[#C49A6C]" strokeWidth={2} aria-hidden="true" />
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
              <Star className="w-4 h-4 text-[#C49A6C] mt-0.5 shrink-0" fill="currentColor" aria-hidden="true" />
              <span>
                <span className="font-semibold text-[#0B1F42]">{rating}</span> rating &middot; {reviewLabel}
              </span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#C49A6C] mt-0.5 shrink-0" strokeWidth={2} aria-hidden="true" />
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
