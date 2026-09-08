import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import Spinner from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import apiClient from '../api/client.js';

function FavouritesPage() {
  const { isAuthenticated } = useAuth();
  const { favorites } = useFavorites();
  const [searchParams] = useSearchParams();
  const sharedIds = searchParams.get('list');

  const [sharedProperties, setSharedProperties] = useState([]);
  const [loadingShared, setLoadingShared] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch shared wishlist properties
  useEffect(() => {
    if (!sharedIds) return;
    setLoadingShared(true);
    apiClient
      .get('/properties/bulk', { params: { ids: sharedIds } })
      .then((res) => setSharedProperties(res.data.data || []))
      .catch(() => setSharedProperties([]))
      .finally(() => setLoadingShared(false));
  }, [sharedIds]);

  const displayProperties = sharedIds ? sharedProperties : favorites;

  const handleShare = async () => {
    if (favorites.length === 0) return;
    const ids = favorites.map((p) => p.id).join(',');
    const url = `${window.location.origin}/favourites?list=${ids}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: show the URL in an alert
      prompt('Copy this link to share your wishlist:', url);
    }
  };

  // Unauthenticated state
  if (!isAuthenticated && !sharedIds) {
    return (
      <div className="min-h-screen bg-[#F7F7F5]">
        <Navbar />
        <div className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md mx-auto px-6 text-center">
            <div className="w-20 h-20 bg-[#C49A6C]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#222222] mb-2">Sign in to save favourites</h1>
            <p className="text-sm text-[#6b7280] mb-8">
              Create an account or sign in to save your favourite properties and access them anytime.
            </p>
            <div className="space-y-3">
              <Link
                to="/login?returnUrl=/favourites"
                className="inline-flex items-center justify-center w-full min-h-[44px] bg-[#2563EB] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#1D4ED8] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center w-full min-h-[44px] bg-white border border-[#E5E7EB] text-[#222222] px-6 py-2.5 rounded-lg font-semibold hover:bg-[#F7F7F5] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Shared wishlist banner
  const SharedBanner = sharedIds && (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 mb-8 text-center">
      <p className="text-sm font-semibold text-[#222222] inline-flex items-center gap-2">
        <svg className="w-4 h-4 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Shared wishlist via ZuriLofts
      </p>
      <p className="text-sm text-[#6b7280] mt-1">
        {sharedProperties.length} propert{sharedProperties.length !== 1 ? 'ies' : 'y'} saved
      </p>
    </div>
  );

  // Loading shared
  if (loadingShared) {
    return (
      <div className="min-h-screen bg-[#F7F7F5]">
        <Navbar />
        <div className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
          <Spinner />
        </div>
        <Footer />
      </div>
    );
  }

  // Empty state (own favourites)
  if (isAuthenticated && !sharedIds && favorites.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F7F5]">
        <Navbar />
        <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-bold text-[#222222] mb-2">My Favourites</h1>
          <p className="text-sm text-[#6b7280] mb-8">Properties you&apos;ve saved for later.</p>
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-[#C49A6C]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#222222] mb-2">No favourites yet</h3>
              <p className="text-sm text-[#6b7280] mb-6">
                Tap the heart icon on any property to save it here for quick access later.
              </p>
              <Link
                to="/properties"
                className="inline-flex items-center justify-center min-h-[44px] bg-[#2563EB] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#1D4ED8] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                Browse Properties
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <Navbar />
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#222222] mb-2">
              {sharedIds ? 'Shared Wishlist' : 'My Favourites'}
            </h1>
            <p className="text-sm text-[#6b7280]">
              <span className="font-semibold text-[#222222]">{displayProperties.length}</span>{' '}
              propert{displayProperties.length !== 1 ? 'ies' : 'y'} saved
            </p>
          </div>
          {!sharedIds && favorites.length > 0 && (
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] bg-white border border-[#E5E7EB] text-[#222222] px-6 py-2.5 rounded-lg font-semibold hover:bg-[#F7F7F5] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share Wishlist
                </>
              )}
            </button>
          )}
        </div>

        {SharedBanner}

        {/* Empty shared list */}
        {sharedIds && sharedProperties.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-[#6b7280]">No properties found for this wishlist.</p>
          </div>
        )}

        {displayProperties.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayProperties.map((property) => (
              <Link key={property.id} to={`/property/${property.id}`} className="no-underline">
                <PropertyCard property={property} />
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default FavouritesPage;
