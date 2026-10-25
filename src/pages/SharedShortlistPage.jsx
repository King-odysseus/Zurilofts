import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Star, UserRound } from 'lucide-react';
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
    <Link className="opg-shortlist-row" to={`/property/${property.id}`}>
      <img src={image} alt={property.title || 'Stay'} />
      <div className="opg-shortlist-row-copy">
        <h3>{property.title || 'ZuriLofts stay'}</h3>
        <p>{meta}</p>
        {property.rating > 0 && (
          <span className="opg-shortlist-rating">
            <Star fill="currentColor" aria-hidden="true" />
            {Number(property.rating).toFixed(2)}
            {property.reviews > 0 && ` (${property.reviews})`}
          </span>
        )}
      </div>
      <div className="opg-shortlist-price">
        <strong>KSh {property.price?.toLocaleString() || '-'}</strong>
        <span>per night</span>
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
    <main className="opg-saved-page opg-shared-shortlist">
      <div className="opg-saved-container">
        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center"><Spinner /></div>
        ) : error ? (
          <div className="opg-saved-empty">
            <div>
              <h2>Shortlist unavailable</h2>
              <p>{error}</p>
              <Link className="opg-saved-action" to="/properties">Browse stays</Link>
            </div>
          </div>
        ) : shortlist ? (
          <>
            <header className="opg-shortlist-intro">
              <p className="opg-shortlist-breadcrumb"><Link to="/">Home</Link><span>/</span>Shared shortlist</p>
              <p className="opg-shortlist-eyebrow">Shared shortlist</p>
              <h1>{shortlist.name}</h1>
              <p className="opg-shortlist-meta">
                {itemCount} {itemCount === 1 ? 'stay' : 'stays'}{ownerName ? ` · Shared by ${ownerName}` : ''}
              </p>
            </header>

            {!isAuthenticated && (
              <aside className="opg-saved-auth">
                <UserRound strokeWidth={1.7} aria-hidden="true" />
                <p>Sign in to save this shortlist to your account and keep it in sync across devices.</p>
                <Link to={`/login?returnUrl=${encodeURIComponent(pathname)}`}>Sign in</Link>
              </aside>
            )}

            {itemCount === 0 ? (
              <div className="opg-saved-empty mt-6">
                <div>
                  <h2>No stays in this shortlist</h2>
                  <p>This collection has been shared, but no properties have been added yet.</p>
                </div>
              </div>
            ) : (
              <section className="opg-shortlist-rows" aria-label={`${shortlist.name} stays`}>
                {shortlist.items.map((item) => <SharedShortlistRow key={item.id} item={item} />)}
              </section>
            )}

            <p className="opg-shortlist-created">
              Created with <Link to="/">ZuriLofts</Link> · premium short-let apartments in Nairobi
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
