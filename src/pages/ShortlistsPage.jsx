import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Button, Label, TextInput } from 'flowbite-react';
import SavedStaysHeader from '../components/SavedStaysHeader.jsx';
import { heroImage } from '../assets/images.js';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';

function SkeletonCard() {
  return <div className="opg-saved-loading"><span /></div>;
}

function EmptyState({ onCreateClick }) {
  return (
    <div className="opg-saved-empty">
      <div>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4.32 6.32a4.5 4.5 0 000 6.36L12 20.36l7.68-7.68a4.5 4.5 0 00-6.36-6.36L12 7.64l-1.32-1.32a4.5 4.5 0 00-6.36 0z" /></svg>
        <h2>No shortlists yet</h2>
        <p>Create a collection to keep trip ideas together and share them with the people you travel with.</p>
        <Button className="opg-saved-action" onClick={onCreateClick}>Create your first shortlist</Button>
      </div>
    </div>
  );
}

EmptyState.propTypes = {
  onCreateClick: PropTypes.func.isRequired,
};

function CreateForm({ onSubmit, onCancel, saving = false }) {
  const [name, setName] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <form className="opg-saved-create-form" onSubmit={handleSubmit}>
      <Label htmlFor="shortlist-name" className="opg-saved-field-label">Shortlist name</Label>
      <TextInput
        id="shortlist-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Weekend getaways"
        maxLength={80}
        autoFocus
      />
      <div className="opg-shortlist-actions">
        <Button type="submit" className="opg-saved-action" disabled={!name.trim() || saving}>
          {saving ? 'Creating...' : 'Create'}
        </Button>
        <Button type="button" className="opg-saved-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

CreateForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  saving: PropTypes.bool,
};

function ShortlistCard({ shortlist, onDelete, onRename }) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(shortlist.name);
  const [copied, setCopied] = useState(false);
  const images = (shortlist.previewImages?.length ? shortlist.previewImages : [heroImage]).slice(0, 4);
  const itemCount = shortlist._count?.items || 0;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${shortlist.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRenameSubmit = (event) => {
    event.preventDefault();
    if (newName.trim() && newName.trim() !== shortlist.name) onRename(shortlist.id, newName.trim());
    setRenaming(false);
  };

  return (
    <article className="opg-saved-collection">
      <Link to={`/shortlists/${shortlist.id}`} className="opg-saved-collage" aria-label={`Open ${shortlist.name}`}>
        {images.map((image, index) => <img key={`${image}-${index}`} src={image} alt="" aria-hidden="true" />)}
      </Link>
      <div className="opg-saved-collection-copy">
        {renaming ? (
          <form onSubmit={handleRenameSubmit}>
            <TextInput
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onBlur={handleRenameSubmit}
              sizing="sm"
              autoFocus
            />
          </form>
        ) : (
          <Link to={`/shortlists/${shortlist.id}`}>
            <h3>{shortlist.name}</h3>
          </Link>
        )}
        <p>{itemCount} {itemCount === 1 ? 'stay' : 'stays'} · Updated {new Date(shortlist.updatedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</p>
      </div>
      <div className="opg-shortlist-card-actions">
        <Button size="xs" className="opg-saved-action" onClick={handleCopyLink}>{copied ? 'Copied' : 'Share'}</Button>
        <Button size="xs" className="opg-saved-secondary" onClick={() => { setNewName(shortlist.name); setRenaming(true); }}>Rename</Button>
        <Button size="xs" color="failure" onClick={() => onDelete(shortlist.id)}>Delete</Button>
      </div>
    </article>
  );
}

ShortlistCard.propTypes = {
  shortlist: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    token: PropTypes.string.isRequired,
    updatedAt: PropTypes.string.isRequired,
    previewImages: PropTypes.arrayOf(PropTypes.string),
    _count: PropTypes.shape({ items: PropTypes.number }),
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  onRename: PropTypes.func.isRequired,
};

export default function ShortlistsPage() {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [shortlists, setShortlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(searchParams.get('new') === '1');
  const [saving, setSaving] = useState(false);

  const fetchShortlists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/shortlists');
      setShortlists(response.data.data || []);
    } catch {
      setError('Could not load your shortlists. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'My Shortlists | ZuriLofts';
    if (isAuthenticated) fetchShortlists();
  }, [isAuthenticated, fetchShortlists]);

  const handleCreate = async (name) => {
    setSaving(true);
    try {
      await apiClient.post('/shortlists', { name });
      setShowCreate(false);
      await fetchShortlists();
    } catch {
      setError('Could not create shortlist.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this shortlist? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/shortlists/${id}`);
      await fetchShortlists();
    } catch {
      setError('Could not delete shortlist.');
    }
  };

  const handleRename = async (id, name) => {
    try {
      await apiClient.patch(`/shortlists/${id}`, { name });
      await fetchShortlists();
    } catch {
      setError('Could not rename shortlist.');
    }
  };

  return (
    <main className="opg-saved-page">
      <div className="opg-saved-container">
        <SavedStaysHeader
          activeTab="lists"
          title="Saved stays"
          subtitle="Organise your favourite stays into shareable collections."
          actionLabel={shortlists.length > 0 && !showCreate ? 'New shortlist' : ''}
          onAction={() => setShowCreate(true)}
        />

        {showCreate && <CreateForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />}

        {error && (
          <div className="opg-saved-error">
            <p>{error}</p>
            <Button className="opg-saved-action mt-4" onClick={fetchShortlists}>Try again</Button>
          </div>
        )}

        {loading ? (
          <div className="opg-saved-collections"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
        ) : !error && shortlists.length === 0 && !showCreate ? (
          <EmptyState onCreateClick={() => setShowCreate(true)} />
        ) : (
          <div className="opg-saved-collections opg-shortlists-grid">
            {shortlists.map((shortlist) => (
              <ShortlistCard key={shortlist.id} shortlist={shortlist} onDelete={handleDelete} onRename={handleRename} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
