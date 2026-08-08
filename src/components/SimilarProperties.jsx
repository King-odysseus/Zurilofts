import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';
import PropertyCardRow from './PropertyCardRow';

/**
 * "Similar properties" strip shown at the bottom of the property detail page.
 *
 * INTERIM IMPLEMENTATION: the backend endpoint `GET /api/properties/:id/similar`
 * does not exist yet, so this derives similar properties client-side by
 * fetching the full `/api/properties` list and filtering to the same
 * location/type as the current property, excluding the current property's id,
 * limited to 4. Replace this with a call to the real endpoint when it lands.
 */
function SimilarProperties({ property }) {
  const [similar, setSimilar] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const { id, location, type } = property;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await apiClient.get('/properties');
        const all = res.data.data || [];
        if (cancelled) return;

        const matches = all.filter(
          (p) =>
            p.id !== id &&
            (p.location === location || p.type === type)
        );
        setSimilar(matches.slice(0, 4));
      } catch {
        if (!cancelled) setSimilar([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, location, type]);

  if (!loaded) return null;

  return (
    <PropertyCardRow
      title="Similar properties"
      properties={similar}
      emptyMessage="No similar properties found right now."
    />
  );
}

SimilarProperties.propTypes = {
  property: PropTypes.shape({
    id: PropTypes.string.isRequired,
    location: PropTypes.string,
    type: PropTypes.string,
  }).isRequired,
};

export default SimilarProperties;
