import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Button } from 'flowbite-react';
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
function BookingSummaryCard({ price, bookingHref, rating = 0, reviewCount = 0, variantLabel = null, addOns = [] }) {
  const hasReviews = typeof rating === 'number' && rating > 0;
  const reviewLabel =
    reviewCount === 1 ? '1 review' : `${reviewCount || 0} reviews`;

  const addOnItems = Array.isArray(addOns) ? addOns : [];
  const addOnsTotal = addOnItems.reduce((sum, a) => sum + (a.quantity * (a.price || 0)), 0);

  return (
    <div className="h-fit rounded-xl border border-border bg-white p-5 shadow-sm lg:sticky lg:top-24 md:p-6" role="complementary" aria-label="Booking summary">
      {/* Price */}
      <div className="mb-5">
        <span className="text-3xl font-bold text-navy tabular-nums">
          KES {price != null ? price.toLocaleString() : '-'}
        </span>
        <span className="text-muted"> / night</span>
      </div>

      {/* Bed variant chip - only when arriving from a variant card */}
      {variantLabel && (
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-sm font-medium text-navy">
          <House className="h-4 w-4 text-primary" strokeWidth={2} aria-hidden="true" />
          {variantLabel}
        </div>
      )}

      {/* Selected add-ons - only when provided */}
      {addOnItems.length > 0 && (
        <div className="mb-5 border-t border-border pt-5">
          <h4 className="mb-3 font-semibold text-navy">Add-ons</h4>
          <div className="space-y-2 text-sm">
            {addOnItems.map((a) => (
              <div key={a.id} className="flex items-baseline justify-between gap-3 text-muted">
                <span>{a.name} x {a.quantity}</span>
                <span className="tabular-nums">KES {(a.quantity * (a.price || 0)).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2 font-semibold text-navy">
              <span>Add-ons total</span>
              <span className="tabular-nums">KES {addOnsTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Booking CTA */}
      <Button
        as={Link}
        to={bookingHref}
        fullSized
        aria-label={`Book ${variantLabel ? variantLabel + ' option' : 'this property'} for KES ${price != null ? price.toLocaleString() : '-'} per night`}
      >
        Book Now
      </Button>

      <p className="mt-4 text-center text-sm text-muted">
        You won&apos;t be charged yet
      </p>

      {/* Trust context - only facts from the API */}
      <div className="mt-6 border-t border-border pt-6">
        <h4 className="mb-3 font-semibold text-navy">About this listing</h4>
        <ul className="space-y-2 text-sm text-muted">
          {hasReviews && (
            <li className="flex items-start gap-2">
              <Star className="mt-0.5 h-4 w-4 shrink-0 text-primary" fill="currentColor" aria-hidden="true" />
              <span>
                <span className="font-semibold text-navy">{rating}</span> rating &middot; {reviewLabel}
              </span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />
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

export default BookingSummaryCard;
