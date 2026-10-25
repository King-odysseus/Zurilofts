import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { UserRound } from 'lucide-react';
import { Button } from 'flowbite-react';
import SavedStaysHeader from '../components/SavedStaysHeader.jsx';
import StayCard from '../components/StayCard.jsx';
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
  const isSingle = previewImages.length === 1;

  return (
    <Link className="overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md" to={to}>
      <span className="grid grid-cols-2 gap-0.5">
        {previewImages.map((image, index) => (
          <img
            key={`${image}-${index}`}
            src={image}
            alt=""
            aria-hidden="true"
            className={isSingle ? 'col-span-2 h-56 w-full object-cover' : 'h-28 w-full object-cover'}
          />
        ))}
      </span>
      <span className="block space-y-1 p-4">
        <h3 className="block text-base font-semibold text-navy">{title}</h3>
        <p className="block text-xs text-muted">{meta}</p>
      </span>
      <span className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <span className="text-sm font-medium text-primary-700">{linkLabel}</span>
      </span>
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
    <main className="min-h-screen bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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
          <section className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-primary-50 px-5 py-4" aria-label="Sign in to save stays">
            <UserRound className="h-6 w-6 shrink-0 text-primary" strokeWidth={1.7} aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm text-navy">Sign in to save stays to your account and keep your lists in sync across devices.</p>
            <Button as={Link} to="/login?returnUrl=/favourites" size="sm">Sign in</Button>
          </section>
        ) : loadingShared ? (
          <div className="flex min-h-[320px] items-center justify-center"><Spinner /></div>
        ) : (
          <>
            {!sharedIds && (
              <section className="mt-8" aria-labelledby="saved-collections-heading">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 id="saved-collections-heading" className="text-lg font-bold text-navy">Your collections</h2>
                    <p className="text-xs text-muted">Favourites and lists, ready for your next trip.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
                <h2 className="text-lg font-bold text-navy">No stays in this wishlist</h2>
                <p className="max-w-md text-sm text-muted">The shared link is valid, but there are no properties to display.</p>
              </div>
            )}

            {displayProperties.length > 0 && (
              <section className="mt-8" id="saved-stays" aria-labelledby="saved-stays-heading">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 id="saved-stays-heading" className="text-lg font-bold text-navy">{sharedIds ? 'Shared stays' : 'Saved stays'}</h2>
                    <p className="text-xs text-muted">{displayProperties.length} {displayProperties.length === 1 ? 'property' : 'properties'} saved</p>
                  </div>
                  {!sharedIds && favorites.length > 0 && (
                    <Button type="button" color="light" size="sm" onClick={handleShare}>
                      {copied ? 'Link copied' : 'Share wishlist'}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
