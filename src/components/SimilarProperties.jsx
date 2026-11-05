import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';
import PropertyCardRow from './PropertyCardRow';
import LoadFailed from './LoadFailed.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

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
  const { t } = useLanguage();
  const [similar, setSimilar] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const { id, location, type } = property;

  useEffect(() => {
    let cancelled = false;
    // A retry keeps the failure on screen until it succeeds: this strip has no
    // loading view, so clearing it here would flash the empty message instead.

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
        setFailed(false);
        setSimilar(matches.slice(0, 4));
      } catch {
        // An empty strip is a claim about the catalogue; a failed request is not.
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, location, type, reloadToken]);

  if (!loaded) return null;

  if (failed) {
    return (
      <section className="mx-auto w-full max-w-[1344px] px-4 md:px-6" aria-label={t('stays.similarTitle')}>
        <h2 className="mb-6 text-2xl font-bold text-navy md:text-3xl">{t('stays.similarTitle')}</h2>
        <LoadFailed
          message="We could not load other stays nearby."
          onRetry={() => setReloadToken((token) => token + 1)}
        />
      </section>
    );
  }

  return (
    <PropertyCardRow
      title={t('stays.similarTitle')}
      properties={similar}
      emptyMessage={t('stays.similarEmpty')}
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
