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
      <h2 id="addons-heading" className="text-xl sm:text-2xl font-bold text-[#0B0B45] mb-4">
        Enhance your stay
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {addOns.map((addOn) => (
          <div
            key={addOn.id}
            className="bg-white rounded-2xl border border-[#D9D9D9] p-5 flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-semibold text-[#0B0B45]">{addOn.name}</h3>
              <span className="shrink-0 bg-[#C49A6C]/10 text-[#0B0B45] text-xs font-semibold px-3 py-1 rounded-full">
                {CATEGORY_LABELS[addOn.category] || addOn.category}
              </span>
            </div>
            <p className="text-sm text-[#6b7280] flex-1">{addOn.description}</p>
            <p className="mt-3 font-bold text-[#0B0B45]">
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
