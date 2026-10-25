import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ChevronLeft } from 'lucide-react';
import { Button, TextInput } from 'flowbite-react';
import { heroImage } from '../assets/images.js';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';

function SkeletonCard() {
  return <span />;
}

function PropertyItem({ item, onRemove }) {
  const property = item.property || {};
  const image = property.images?.[0] || heroImage;
  const meta = [
    property.location || 'Nairobi',
    property.bedrooms ? `${property.bedrooms} ${property.bedrooms === 1 ? 'bed' : 'beds'}` : null,
    property.type ? property.type.charAt(0).toUpperCase() + property.type.slice(1) : null,
  ].filter(Boolean).join(' · ');

  return (
    <article className="opg-shortlist-row opg-shortlist-row-managed">
      <Link className="opg-shortlist-row-image" to={`/property/${property.id}`}>
        <img src={image} alt={property.title || 'Stay'} />
      </Link>
      <div className="opg-shortlist-row-copy">
        <Link to={`/property/${property.id}`}><h3>{property.title || 'ZuriLofts stay'}</h3></Link>
        <p>{meta}</p>
        {item.note && <p className="opg-shortlist-note">&ldquo;{item.note}&rdquo;</p>}
      </div>
      <div className="opg-shortlist-price">
        <strong>KSh {property.price?.toLocaleString() || '-'}</strong>
        <span>per night</span>
      </div>
      <Button className="opg-saved-remove" onClick={() => onRemove(item.propertyId)}>Remove</Button>
    </article>
  );
}

PropertyItem.propTypes = {
  item: PropTypes.shape({
    propertyId: PropTypes.string.isRequired,
    note: PropTypes.string,
    property: PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
      location: PropTypes.string,
      price: PropTypes.number,
      type: PropTypes.string,
      bedrooms: PropTypes.number,
      images: PropTypes.arrayOf(PropTypes.string),
    }),
  }).isRequired,
  onRemove: PropTypes.func.isRequired,
};

function DeleteConfirm({ onConfirm, onCancel }) {
  return (
    <div className="opg-delete-backdrop">
      <div className="opg-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-shortlist-title">
        <h2 id="delete-shortlist-title">Delete shortlist?</h2>
        <p>This permanently deletes the collection and removes it from every shared link. The stays themselves are not deleted.</p>
        <div className="opg-shortlist-actions">
          <Button className="opg-saved-secondary" onClick={onCancel}>Cancel</Button>
          <Button color="failure" onClick={onConfirm}>Delete shortlist</Button>
        </div>
      </div>
    </div>
  );
}

DeleteConfirm.propTypes = {
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default function ShortlistDetailPage() {
  const { id: routeId } = useParams();
  const { pathname } = useLocation();
  const id = routeId || pathname.split('/')[2];
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [shortlist, setShortlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const fetchShortlist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/shortlists/${id}`);
      setShortlist(response.data.data);
      setNewName(response.data.data.name);
    } catch {
      setError('Could not load this shortlist.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    document.title = 'Shortlist | ZuriLofts';
    if (isAuthenticated) fetchShortlist();
  }, [isAuthenticated, fetchShortlist]);

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === shortlist.name) {
      setRenaming(false);
      return;
    }
    try {
      await apiClient.patch(`/shortlists/${id}`, { name: newName.trim() });
      setShortlist((previous) => ({ ...previous, name: newName.trim() }));
    } catch {
      setError('Could not rename shortlist.');
    }
    setRenaming(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${shortlist.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveItem = async (propertyId) => {
    try {
      await apiClient.delete(`/shortlists/${id}/items/${propertyId}`);
      setShortlist((previous) => ({
        ...previous,
        items: previous.items.filter((item) => item.propertyId !== propertyId),
        _count: { items: Math.max(0, (previous._count?.items || previous.items.length) - 1) },
      }));
    } catch {
      setError('Could not remove property.');
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/shortlists/${id}`);
      navigate('/shortlists', { replace: true });
    } catch {
      setError('Could not delete shortlist.');
    }
  };

  const itemCount = shortlist?._count?.items ?? shortlist?.items?.length ?? 0;

  return (
    <main className="opg-saved-page">
      <div className="opg-saved-container">
        <Link className="opg-shortlist-back" to="/shortlists">
          <ChevronLeft strokeWidth={1.8} aria-hidden="true" />
          Back to My lists
        </Link>

        {loading ? (
          <div className="opg-saved-loading mt-6"><SkeletonCard /><SkeletonCard /></div>
        ) : error && !shortlist ? (
          <div className="opg-saved-error">
            <p>{error}</p>
            <Button className="opg-saved-action mt-4" onClick={fetchShortlist}>Try again</Button>
          </div>
        ) : shortlist ? (
          <>
            <header className="opg-saved-header opg-shortlist-detail-header">
              <div className="opg-saved-heading">
                {renaming ? (
                  <div className="opg-shortlist-rename">
                    <TextInput
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      onKeyDown={(event) => { if (event.key === 'Enter') handleRename(); if (event.key === 'Escape') setRenaming(false); }}
                      autoFocus
                    />
                    <Button className="opg-saved-action" onClick={handleRename}>Save</Button>
                    <Button className="opg-saved-secondary" onClick={() => setRenaming(false)}>Cancel</Button>
                  </div>
                ) : <h1>{shortlist.name}</h1>}
                <p>{itemCount} {itemCount === 1 ? 'stay' : 'stays'} in this shortlist.</p>
              </div>
              <div className="opg-shortlist-actions">
                <Button className="opg-saved-action" onClick={handleShare}>{copied ? 'Link copied' : 'Share'}</Button>
                {!renaming && <Button className="opg-saved-secondary" onClick={() => setRenaming(true)}>Rename</Button>}
              </div>
            </header>

            {error && <div className="opg-saved-error mt-6"><p>{error}</p></div>}

            {(!shortlist.items || shortlist.items.length === 0) ? (
              <div className="opg-saved-empty mt-6">
                <div>
                  <h2>No saved properties</h2>
                  <p>Browse stays and add them to this shortlist from any property page.</p>
                  <Link className="opg-saved-action" to="/properties">Browse stays</Link>
                </div>
              </div>
            ) : (
              <section className="opg-shortlist-rows" aria-label={`${shortlist.name} stays`}>
                {shortlist.items.map((item) => (
                  <PropertyItem key={item.id} item={item} onRemove={handleRemoveItem} />
                ))}
              </section>
            )}

            <div className="opg-shortlist-delete-row">
              <Button color="failure" onClick={() => setShowDelete(true)}>Delete this shortlist</Button>
            </div>

            {showDelete && <DeleteConfirm onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />}
          </>
        ) : null}
      </div>
    </main>
  );
}
