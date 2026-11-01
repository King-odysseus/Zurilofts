import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ChevronLeft } from 'lucide-react';
import { Button, TextInput } from 'flowbite-react';
import { heroImage } from '../assets/images.js';
import { formatPrice } from '../utils/currency.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import apiClient from '../api/client.js';

function SkeletonCard() {
  return <span />;
}

function PropertyItem({ item, onRemove }) {
  const { t } = useLanguage();
  const property = item.property || {};
  const image = property.images?.[0] || heroImage;
  const meta = [
    property.location || 'Nairobi',
    property.bedrooms ? t(property.bedrooms === 1 ? 'saved.bedsCountOne' : 'saved.bedsCountOther', { count: property.bedrooms }) : null,
    property.type ? property.type.charAt(0).toUpperCase() + property.type.slice(1) : null,
  ].filter(Boolean).join(' · ');

  return (
    <article className="opg-shortlist-row opg-shortlist-row-managed">
      <Link className="opg-shortlist-row-image" to={`/property/${property.id}`}>
        <img src={image} alt={property.title || t('saved.stayAlt')} />
      </Link>
      <div className="opg-shortlist-row-copy">
        <Link to={`/property/${property.id}`}><h3>{property.title || t('saved.untitledStay')}</h3></Link>
        <p>{meta}</p>
        {item.note && <p className="opg-shortlist-note">&ldquo;{item.note}&rdquo;</p>}
      </div>
      <div className="opg-shortlist-price">
        <strong>{formatPrice(property.price) ?? '-'}</strong>
        <span>{t('saved.perNight')}</span>
      </div>
      <Button className="opg-saved-remove" onClick={() => onRemove(item.propertyId)}>{t('saved.remove')}</Button>
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
  const { t } = useLanguage();
  return (
    <div className="opg-delete-backdrop">
      <div className="opg-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-shortlist-title">
        <h2 id="delete-shortlist-title">{t('saved.deleteShortlistTitle')}</h2>
        <p>{t('saved.deleteShortlistBody')}</p>
        <div className="opg-shortlist-actions">
          <Button className="opg-saved-secondary" onClick={onCancel}>{t('saved.cancel')}</Button>
          <Button color="failure" onClick={onConfirm}>{t('saved.deleteShortlist')}</Button>
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
  const { t } = useLanguage();
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
      setError(t('saved.loadOneFailed'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
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
      setError(t('saved.renameFailed'));
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
      setError(t('saved.removeFailed'));
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/shortlists/${id}`);
      navigate('/shortlists', { replace: true });
    } catch {
      setError(t('saved.deleteFailed'));
    }
  };

  const itemCount = shortlist?._count?.items ?? shortlist?.items?.length ?? 0;

  return (
    <main className="opg-saved-page">
      <div className="opg-saved-container">
        <Link className="opg-shortlist-back" to="/shortlists">
          <ChevronLeft strokeWidth={1.8} aria-hidden="true" />
          {t('saved.backToMyLists')}
        </Link>

        {loading ? (
          <div className="opg-saved-loading mt-6"><SkeletonCard /><SkeletonCard /></div>
        ) : error && !shortlist ? (
          <div className="opg-saved-error mt-6">
            <p>{error}</p>
            <Button className="opg-saved-action mt-4" onClick={fetchShortlist}>{t('saved.tryAgain')}</Button>
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
                    <Button className="opg-saved-action" onClick={handleRename}>{t('saved.save')}</Button>
                    <Button className="opg-saved-secondary" onClick={() => setRenaming(false)}>{t('saved.cancel')}</Button>
                  </div>
                ) : <h1>{shortlist.name}</h1>}
                <p>{t(itemCount === 1 ? 'saved.staysInShortlistOne' : 'saved.staysInShortlistOther', { count: itemCount })}</p>
              </div>
              <div className="opg-shortlist-actions">
                <Button className="opg-saved-action" onClick={handleShare}>{copied ? t('saved.linkCopied') : t('saved.share')}</Button>
                {!renaming && <Button className="opg-saved-secondary" onClick={() => setRenaming(true)}>{t('saved.rename')}</Button>}
              </div>
            </header>

            {error && <div className="opg-saved-error mt-6"><p>{error}</p></div>}

            {(!shortlist.items || shortlist.items.length === 0) ? (
              <div className="opg-saved-empty mt-6">
                <div>
                  <h2>{t('saved.noSavedPropertiesTitle')}</h2>
                  <p>{t('saved.noSavedPropertiesBody')}</p>
                  <Link className="opg-saved-action" to="/properties">{t('saved.browseStays')}</Link>
                </div>
              </div>
            ) : (
              /* The row list keeps a 12px grid gap from the stylesheet; space-y-3
                  adds 12px more so the bordered rows sit 24px apart. */
              <section className="opg-shortlist-rows space-y-3" aria-label={t('saved.shortlistAria', { name: shortlist.name })}>
                {shortlist.items.map((item) => (
                  <PropertyItem key={item.id} item={item} onRemove={handleRemoveItem} />
                ))}
              </section>
            )}

            <div className="opg-shortlist-delete-row">
              <Button color="failure" onClick={() => setShowDelete(true)}>{t('saved.deleteThisShortlist')}</Button>
            </div>

            {showDelete && <DeleteConfirm onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />}
          </>
        ) : null}
      </div>
    </main>
  );
}
