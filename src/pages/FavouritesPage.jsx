import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import SavedStaysHeader from '../components/SavedStaysHeader.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import Spinner from '../components/Spinner.jsx';
import { heroImage } from '../assets/images.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import apiClient from '../api/client.js';

function getPropertyImage(property) {
  return property?.image || property?.images?.[0] || '';
}

function CollectionCard({ title, meta, images, linkLabel, to }) {
  const previewImages = (images.filter(Boolean).length ? images.filter(Boolean) : [heroImage]).slice(0, 4);

  return (
    <Link className="opg-saved-collection" to={to}>
      <span className={`opg-saved-collage ${previewImages.length === 1 ? 'is-single' : ''}`}>
        {previewImages.map((image, index) => (
          <img key={`${image}-${index}`} src={image} alt="" aria-hidden="true" />
        ))}
      </span>
      <span className="opg-saved-collection-copy">
        <h3>{title}</h3>
        <p>{meta}</p>
      </span>
      <span className="opg-saved-collection-link">{linkLabel}</span>
    </Link>
  );
}

CollectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  meta: PropTypes.string.isRequired,
  images: PropTypes.arrayOf(PropTypes.string).isRequired,
  linkLabel: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
};

function FavouritesPage() {
  const { isAuthenticated } = useAuth();
  const { favorites } = useFavorites();
  const [searchParams] = useSearchParams();
  const sharedIds = searchParams.get('list');
  const [sharedProperties, setSharedProperties] = useState([]);
  const [shortlists, setShortlists] = useState([]);
  const [loadingShared, setLoadingShared] = useState(Boolean(sharedIds));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sharedIds) return;
    setLoadingShared(true);
    apiClient
      .get('/properties/bulk', { params: { ids: sharedIds } })
      .then((res) => setSharedProperties(res.data.data || []))
      .catch(() => setSharedProperties([]))
      .finally(() => setLoadingShared(false));
  }, [sharedIds]);

  useEffect(() => {
    if (!isAuthenticated || sharedIds) return;
    apiClient
      .get('/shortlists')
      .then((res) => setShortlists(res.data.data || []))
      .catch(() => setShortlists([]));
  }, [isAuthenticated, sharedIds]);

  const displayProperties = sharedIds ? sharedProperties : favorites;

  const handleShare = async () => {
    if (favorites.length === 0) return;
    const ids = favorites.map((property) => property.id).join(',');
    const url = `${window.location.origin}/favourites?list=${ids}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Copy this link to share your wishlist:', url);
    }
  };

  const favouriteImages = favorites.map(getPropertyImage);
  const shortlistCards = shortlists.slice(0, 2);

  return (
    <main className="opg-saved-page">
      <div className="opg-saved-container">
        <SavedStaysHeader
          activeTab="saved"
          title={sharedIds ? 'Shared wishlist' : 'Saved stays'}
          subtitle={sharedIds
            ? `${sharedProperties.length} ${sharedProperties.length === 1 ? 'stay' : 'stays'} shared with you.`
            : 'Your favourites and stay collections in one place.'}
          actionLabel={sharedIds ? '' : 'Create shortlist'}
          actionTo="/shortlists?new=1"
          showTabs={!sharedIds}
        />

        {!isAuthenticated && !sharedIds ? (
          <section className="opg-saved-auth" aria-label="Sign in to save stays">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" /></svg>
            <p>Sign in to save stays to your account and keep your lists in sync across devices.</p>
            <Link to="/login?returnUrl=/favourites">Sign in</Link>
          </section>
        ) : loadingShared ? (
          <div className="flex min-h-[320px] items-center justify-center"><Spinner /></div>
        ) : (
          <>
            {!sharedIds && (
              <section className="opg-saved-section" aria-labelledby="saved-collections-heading">
                <div className="opg-saved-section-title">
                  <div>
                    <h2 id="saved-collections-heading">Your collections</h2>
                    <p>Favourites and lists, ready for your next trip.</p>
                  </div>
                </div>
                <div className="opg-saved-collections">
                  <CollectionCard
                    title="Favourites"
                    meta={`${favorites.length} ${favorites.length === 1 ? 'stay' : 'stays'} saved`}
                    images={favouriteImages}
                    linkLabel={favorites.length ? 'Browse favourites' : 'Find a stay'}
                    to={favorites.length ? '/favourites#saved-stays' : '/properties'}
                  />
                  {shortlistCards.map((shortlist) => (
                    <CollectionCard
                      key={shortlist.id}
                      title={shortlist.name}
                      meta={`${shortlist._count?.items || 0} ${shortlist._count?.items === 1 ? 'stay' : 'stays'} saved`}
                      images={shortlist.previewImages || []}
                      linkLabel="Open shortlist"
                      to={`/shortlists/${shortlist.id}`}
                    />
                  ))}
                </div>
              </section>
            )}

            {sharedIds && sharedProperties.length === 0 && (
              <div className="opg-saved-empty">
                <div>
                  <h2>No stays in this wishlist</h2>
                  <p>The shared link is valid, but there are no properties to display.</p>
                </div>
              </div>
            )}

            {displayProperties.length > 0 && (
              <section className="opg-saved-section" id="saved-stays" aria-labelledby="saved-stays-heading">
                <div className="opg-saved-section-title">
                  <div>
                    <h2 id="saved-stays-heading">{sharedIds ? 'Shared stays' : 'Saved stays'}</h2>
                    <p>{displayProperties.length} {displayProperties.length === 1 ? 'property' : 'properties'} saved</p>
                  </div>
                  {!sharedIds && favorites.length > 0 && (
                    <button type="button" className="opg-saved-action opg-saved-secondary" onClick={handleShare}>
                      {copied ? 'Link copied' : 'Share wishlist'}
                    </button>
                  )}
                </div>
                <div className="opg-saved-grid">
                  {displayProperties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default FavouritesPage;
