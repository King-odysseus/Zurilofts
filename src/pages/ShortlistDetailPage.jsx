import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ChevronLeft } from 'lucide-react';
import { Alert, Button, Modal, ModalBody, ModalFooter, ModalHeader, TextInput } from 'flowbite-react';
import { heroImage } from '../assets/images.js';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';

function SkeletonCard() {
  return <div className="h-[104px] animate-pulse rounded-xl border border-border bg-white" />;
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
    <article className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:grid-cols-[132px_minmax(0,1fr)_auto_auto] sm:gap-5">
      <Link className="block" to={`/property/${property.id}`}>
        <img className="h-[72px] w-24 rounded-lg object-cover sm:h-20 sm:w-[120px]" src={image} alt={property.title || 'Stay'} />
      </Link>
      <div className="min-w-0">
        <Link to={`/property/${property.id}`}>
          <h3 className="truncate text-base font-semibold text-navy">{property.title || 'ZuriLofts stay'}</h3>
        </Link>
        <p className="mt-1 truncate text-xs text-muted">{meta}</p>
        {item.note && <p className="mt-1 text-xs italic text-primary-700">&ldquo;{item.note}&rdquo;</p>}
      </div>
      <div className="col-start-2 text-left sm:col-start-auto sm:text-right sm:pr-3">
        <strong className="block text-base font-bold text-navy">KSh {property.price?.toLocaleString() || '-'}</strong>
        <span className="mt-1 block text-xs text-muted">per night</span>
      </div>
      <Button className="col-start-2 justify-self-start sm:col-start-auto" size="sm" color="light" onClick={() => onRemove(item.propertyId)}>Remove</Button>
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
    <Modal show onClose={onCancel} size="md" dismissible>
      <ModalHeader>Delete shortlist?</ModalHeader>
      <ModalBody>
        <p className="text-sm leading-relaxed text-muted">This permanently deletes the collection and removes it from every shared link. The stays themselves are not deleted.</p>
      </ModalBody>
      <ModalFooter className="justify-end">
        <Button color="light" onClick={onCancel}>Cancel</Button>
        <Button color="failure" onClick={onConfirm}>Delete shortlist</Button>
      </ModalFooter>
    </Modal>
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
    <main className="min-h-screen bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-navy" to="/shortlists">
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          Back to My lists
        </Link>

        {loading ? (
          <div className="mt-6 grid gap-3"><SkeletonCard /><SkeletonCard /></div>
        ) : error && !shortlist ? (
          <Alert color="failure" className="mt-6">
            <p>{error}</p>
            <Button className="mt-4" onClick={fetchShortlist}>Try again</Button>
          </Alert>
        ) : shortlist ? (
          <>
            <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                {renaming ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-[220px] flex-1">
                      <TextInput
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        onKeyDown={(event) => { if (event.key === 'Enter') handleRename(); if (event.key === 'Escape') setRenaming(false); }}
                        autoFocus
                      />
                    </div>
                    <Button size="sm" onClick={handleRename}>Save</Button>
                    <Button size="sm" color="light" onClick={() => setRenaming(false)}>Cancel</Button>
                  </div>
                ) : <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{shortlist.name}</h1>}
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{itemCount} {itemCount === 1 ? 'stay' : 'stays'} in this shortlist.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={handleShare}>{copied ? 'Link copied' : 'Share'}</Button>
                {!renaming && <Button size="sm" color="light" onClick={() => setRenaming(true)}>Rename</Button>}
              </div>
            </header>

            {error && <Alert color="failure" className="mt-6"><p>{error}</p></Alert>}

            {(!shortlist.items || shortlist.items.length === 0) ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
                <h2 className="text-lg font-bold text-navy">No saved properties</h2>
                <p className="max-w-md text-sm text-muted">Browse stays and add them to this shortlist from any property page.</p>
                <Button as={Link} to="/properties">Browse stays</Button>
              </div>
            ) : (
              <section className="mt-6 grid gap-3" aria-label={`${shortlist.name} stays`}>
                {shortlist.items.map((item) => (
                  <PropertyItem key={item.id} item={item} onRemove={handleRemoveItem} />
                ))}
              </section>
            )}

            <div className="mt-10 border-t border-border pt-6">
              <Button color="failure" onClick={() => setShowDelete(true)}>Delete this shortlist</Button>
            </div>

            {showDelete && <DeleteConfirm onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />}
          </>
        ) : null}
      </div>
    </main>
  );
}
