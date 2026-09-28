import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
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
            <svg fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.07 3.29c.13.4.5.68.95.69h3.46c.97 0 1.37 1.24.59 1.81l-2.8 2.03a1 1 0 00-.36 1.12l1.07 3.29c.3.92-.76 1.69-1.54 1.12l-2.8-2.03a1 1 0 00-1.18 0l-2.8 2.03c-.78.57-1.84-.2-1.54-1.12l1.07-3.29a1 1 0 00-.36-1.12L2.98 8.72c-.78-.57-.38-1.81.59-1.81h3.46a1 1 0 00.95-.69l1.07-3.29z" /></svg>
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
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" /></svg>
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
