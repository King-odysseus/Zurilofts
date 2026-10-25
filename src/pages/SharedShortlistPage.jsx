import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Star, UserRound } from 'lucide-react';
import { Alert, Button } from 'flowbite-react';
import apiClient from '../api/client.js';
import Spinner from '../components/Spinner.jsx';
import { heroImage } from '../assets/images.js';
import { useAuth } from '../context/AuthContext.jsx';

function SharedShortlistRow({ item }) {
  const property = item.property || {};
  const image = property.images?.[0] || heroImage;
  const meta = [
    property.location || 'Nairobi',
    property.bedrooms ? `${property.bedrooms} ${property.bedrooms === 1 ? 'bed' : 'beds'}` : null,
    property.type ? property.type.charAt(0).toUpperCase() + property.type.slice(1) : null,
  ].filter(Boolean).join(' · ');

  return (
    <Link className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border bg-white p-4 text-navy shadow-sm transition-shadow hover:shadow-md sm:grid-cols-[132px_minmax(0,1fr)_auto] sm:gap-5" to={`/property/${property.id}`}>
      <img className="h-[72px] w-24 rounded-lg object-cover sm:h-20 sm:w-[120px]" src={image} alt={property.title || 'Stay'} />
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold text-navy">{property.title || 'ZuriLofts stay'}</h3>
        <p className="mt-1 truncate text-xs text-muted">{meta}</p>
        {property.rating > 0 && (
          <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-navy">
            <Star className="h-3.5 w-3.5 text-primary" fill="currentColor" aria-hidden="true" />
            {Number(property.rating).toFixed(2)}
            {property.reviews > 0 && ` (${property.reviews})`}
          </span>
        )}
      </div>
      <div className="col-start-2 text-left sm:col-start-auto sm:text-right sm:pr-3">
        <strong className="block text-base font-bold text-navy">KSh {property.price?.toLocaleString() || '-'}</strong>
        <span className="mt-1 block text-xs text-muted">per night</span>
      </div>
    </Link>
  );
}

SharedShortlistRow.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    property: PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
      location: PropTypes.string,
      price: PropTypes.number,
      rating: PropTypes.number,
      reviews: PropTypes.number,
      type: PropTypes.string,
      bedrooms: PropTypes.number,
      images: PropTypes.arrayOf(PropTypes.string),
    }),
  }).isRequired,
};

export default function SharedShortlistPage() {
  const { token: routeToken } = useParams();
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const token = routeToken || pathname.split('/')[2];
  const [shortlist, setShortlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Shared Shortlist | ZuriLofts';
    let cancelled = false;
    async function fetchShortlist() {
      try {
        setLoading(true);
        const response = await apiClient.get(`/shortlists/shared/${token}`);
        if (!cancelled) setShortlist(response.data.data);
      } catch {
        if (!cancelled) setError('This shortlist could not be found or is no longer available.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchShortlist();
    return () => { cancelled = true; };
  }, [token]);

  const itemCount = shortlist?.items?.length || 0;
  const ownerName = shortlist?.owner?.firstName;

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center"><Spinner /></div>
        ) : error ? (
          <Alert color="failure">
            <h2 className="text-lg font-bold text-navy">Shortlist unavailable</h2>
            <p>{error}</p>
            <Button as={Link} to="/properties" className="mt-4 self-start">Browse stays</Button>
          </Alert>
        ) : shortlist ? (
          <>
            <header className="pb-8">
              <p className="flex gap-2 text-sm text-muted">
                <Link className="text-muted hover:text-navy" to="/">Home</Link>
                <span aria-hidden="true">/</span>
                Shared shortlist
              </p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600">Shared shortlist</p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{shortlist.name}</h1>
              <p className="mt-2 text-sm text-muted">
                {itemCount} {itemCount === 1 ? 'stay' : 'stays'}{ownerName ? ` · Shared by ${ownerName}` : ''}
              </p>
            </header>

            {!isAuthenticated && (
              <aside className="mb-10 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-primary-50 px-5 py-4">
                <UserRound className="h-6 w-6 shrink-0 text-primary" strokeWidth={1.7} aria-hidden="true" />
                <p className="min-w-0 flex-1 text-sm text-navy">Sign in to save this shortlist to your account and keep it in sync across devices.</p>
                <Button as={Link} to={`/login?returnUrl=${encodeURIComponent(pathname)}`} size="sm">Sign in</Button>
              </aside>
            )}

            {itemCount === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
                <h2 className="text-lg font-bold text-navy">No stays in this shortlist</h2>
                <p className="max-w-md text-sm text-muted">This collection has been shared, but no properties have been added yet.</p>
              </div>
            ) : (
              <section className="mt-6 grid gap-3" aria-label={`${shortlist.name} stays`}>
                {shortlist.items.map((item) => <SharedShortlistRow key={item.id} item={item} />)}
              </section>
            )}

            <p className="mt-12 border-t border-border pt-6 text-center text-xs text-muted">
              Created with <Link className="font-semibold text-primary-700" to="/">ZuriLofts</Link> · premium short-let apartments in Nairobi
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
