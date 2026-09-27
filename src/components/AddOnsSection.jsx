import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';

/** Category label map - matches the server enum. */
const CATEGORY_LABELS = {
  transport: 'Transport',
  catering: 'Catering',
  housekeeping: 'Housekeeping',
  concierge: 'Concierge',
};

/** Safely coerce a value to an array, no matter what the API sends. */
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * AddOnsSection - "Enhance your stay" display-only section on the property
 * page. Renders nothing when the property has no add-ons assigned.
 *
 * Props:
 *  - propertyId : id of the property whose add-ons to fetch (string)
 */
function AddOnsSection({ propertyId }) {
  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchAddOns() {
      try {
        const res = await apiClient.get(`/properties/${propertyId}/addons`);
        if (!cancelled) setAddOns(safeArray(res.data.data));
      } catch {
        // Non-fatal - the section simply renders nothing on failure.
        if (!cancelled) setAddOns([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAddOns();
    return () => { cancelled = true; };
  }, [propertyId]);

  // Render nothing while loading or when there are no add-ons - no empty heading.
  if (loading || addOns.length === 0) return null;

  return (
    <section className="mb-8 md:mb-10" aria-labelledby="addons-heading">
      <h2 id="addons-heading" className="mb-4 text-xl font-bold text-[#0B1F42] sm:text-2xl">
        Enhance your stay
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {addOns.map((addOn) => (
          <div
            key={addOn.id}
            className="flex flex-col rounded-2xl border border-[#E3E8EF] bg-white p-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)]"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-semibold text-[#0B1F42]">{addOn.name}</h3>
              <span className="shrink-0 rounded-full bg-[#FDE8D8] px-3 py-1 text-xs font-semibold text-[#9A4A1D]">
                {CATEGORY_LABELS[addOn.category] || addOn.category}
              </span>
            </div>
            <p className="flex-1 text-sm text-[#5B6B82]">{addOn.description}</p>
            <p className="mt-3 font-bold text-[#0B1F42]">
              KES {addOn.price != null ? addOn.price.toLocaleString() : '-'}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

AddOnsSection.propTypes = {
  propertyId: PropTypes.string.isRequired,
};

export default AddOnsSection;
