import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { UserRound } from 'lucide-react';
import SavedStaysHeader from '../components/SavedStaysHeader.jsx';
import StayCard from '../components/StayCard.jsx';
import Spinner from '../components/Spinner.jsx';
import { heroImage } from '../assets/images.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import apiClient from '../api/client.js';
import LoadFailed from '../components/LoadFailed.jsx';

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
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { favorites } = useFavorites();
  const [searchParams] = useSearchParams();
  const sharedIds = searchParams.get('list');
  const [sharedProperties, setSharedProperties] = useState([]);
  const [shortlists, setShortlists] = useState([]);
  const [loadingShared, setLoadingShared] = useState(Boolean(sharedIds));
  const [copied, setCopied] = useState(false);
  // Kept apart from the lists themselves: an empty list is an answer, a rejected
  // request is not, and the empty-wishlist panel used to claim both as empty.
  const [sharedFailed, setSharedFailed] = useState(false);
  const [shortlistsFailed, setShortlistsFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!sharedIds) return;
    setLoadingShared(true);
    setSharedFailed(false);
    apiClient
      .get('/properties/bulk', { params: { ids: sharedIds } })
      .then((res) => setSharedProperties(res.data.data || []))
      .catch(() => setSharedFailed(true))
      .finally(() => setLoadingShared(false));
  }, [sharedIds, reloadToken]);

  useEffect(() => {
    if (!isAuthenticated || sharedIds) return;
    setShortlistsFailed(false);
    apiClient
      .get('/shortlists')
      .then((res) => setShortlists(res.data.data || []))
      .catch(() => setShortlistsFailed(true));
  }, [isAuthenticated, sharedIds, reloadToken]);

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
      window.prompt(t('saved.copyLinkPrompt'), url);
    }
  };

  const favouriteImages = favorites.map(getPropertyImage);
  const shortlistCards = shortlists.slice(0, 2);

  return (
    <main className="opg-saved-page">
      <div className="opg-saved-container">
        <SavedStaysHeader
          activeTab="saved"
          title={sharedIds ? t('saved.sharedWishlist') : t('saved.savedStays')}
          subtitle={sharedIds
            ? sharedFailed
              ? 'We could not load these stays.'
              : t(sharedProperties.length === 1 ? 'saved.sharedWithYouOne' : 'saved.sharedWithYouOther', { count: sharedProperties.length })
            : t('saved.subtitle')}
          actionLabel={sharedIds ? '' : t('saved.createShortlist')}
          actionTo="/shortlists?new=1"
          showTabs={!sharedIds}
        />

        {!isAuthenticated && !sharedIds ? (
          // The stylesheet spaces sibling sections itself, but this card is the
          // first block under the heading and had no gap at all.
          <section className="opg-saved-auth mt-6" aria-label={t('saved.signInToSaveAria')}>
            <UserRound strokeWidth={1.7} aria-hidden="true" />
            <p>{t('saved.signInToSaveBody')}</p>
            <Link to="/login?returnUrl=/favourites">{t('saved.signIn')}</Link>
          </section>
        ) : loadingShared ? (
          <div className="flex min-h-[320px] items-center justify-center"><Spinner /></div>
        ) : (
          <>
            {!sharedIds && (
              <section className="opg-saved-section" aria-labelledby="saved-collections-heading">
                <div className="opg-saved-section-title">
                  <div>
                    <h2 id="saved-collections-heading">{t('saved.yourCollections')}</h2>
                    <p>{t('saved.collectionsHint')}</p>
                  </div>
                </div>
                {/* Stylesheet gaps here are 14px above the cards and 16px between them, both under the 20px floor. mt-5 collapses with the title's 14px to render 20px, and !gap-5 outranks the 16px. */}
                {shortlistsFailed && (
                  <LoadFailed
                    className="mb-5"
                    message="Your collections could not be loaded."
                    onRetry={() => setReloadToken((token) => token + 1)}
                  />
                )}
                <div className="opg-saved-collections mt-5 !gap-5">
                  <CollectionCard
                    title={t('saved.favourites')}
                    meta={t(favorites.length === 1 ? 'saved.staysSavedOne' : 'saved.staysSavedOther', { count: favorites.length })}
                    images={favouriteImages}
                    linkLabel={favorites.length ? t('saved.browseFavourites') : t('saved.findAStay')}
                    to={favorites.length ? '/favourites#saved-stays' : '/stays'}
                  />
                  {shortlistCards.map((shortlist) => (
                    <CollectionCard
                      key={shortlist.id}
                      title={shortlist.name}
                      meta={t(shortlist._count?.items === 1 ? 'saved.staysSavedOne' : 'saved.staysSavedOther', { count: shortlist._count?.items || 0 })}
                      images={shortlist.previewImages || []}
                      linkLabel={t('saved.openShortlist')}
                      to={`/shortlists/${shortlist.id}`}
                    />
                  ))}
                </div>
              </section>
            )}

            {sharedIds && sharedFailed && (
              <div className="opg-saved-empty mt-6">
                <LoadFailed
                  align="center"
                  message="This wishlist could not be loaded. The link may still be fine, so try again."
                  onRetry={() => setReloadToken((token) => token + 1)}
                />
              </div>
            )}

            {sharedIds && !sharedFailed && sharedProperties.length === 0 && (
              <div className="opg-saved-empty mt-6">
                <div>
                  <h2>{t('saved.emptyWishlistTitle')}</h2>
                  <p>{t('saved.emptyWishlistBody')}</p>
                </div>
              </div>
            )}

            {displayProperties.length > 0 && (
              <section className="opg-saved-section" id="saved-stays" aria-labelledby="saved-stays-heading">
                <div className="opg-saved-section-title">
                  <div>
                    <h2 id="saved-stays-heading">{sharedIds ? t('saved.sharedStays') : t('saved.savedStays')}</h2>
                    <p>{t(displayProperties.length === 1 ? 'saved.propertiesSavedOne' : 'saved.propertiesSavedOther', { count: displayProperties.length })}</p>
                  </div>
                  {!sharedIds && favorites.length > 0 && (
                    <button type="button" className="opg-saved-action opg-saved-secondary" onClick={handleShare}>
                      {copied ? t('saved.linkCopied') : t('saved.shareWishlist')}
                    </button>
                  )}
                </div>
                <div className="opg-saved-grid">
                  {displayProperties.map((property) => (
                    <StayCard key={property.id} stay={property} />
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
