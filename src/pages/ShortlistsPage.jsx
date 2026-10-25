import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Heart } from 'lucide-react';
import { Alert, Button, Label, TextInput } from 'flowbite-react';
import SavedStaysHeader from '../components/SavedStaysHeader.jsx';
import { heroImage } from '../assets/images.js';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';

function SkeletonCard() {
  return <div className="h-52 animate-pulse rounded-xl border border-border bg-white" />;
}

function EmptyState({ onCreateClick }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
      <Heart className="h-9 w-9 text-muted" strokeWidth={1.6} aria-hidden="true" />
      <h2 className="text-lg font-bold text-navy">No shortlists yet</h2>
      <p className="max-w-md text-sm text-muted">Create a collection to keep trip ideas together and share them with the people you travel with.</p>
      <Button onClick={onCreateClick}>Create your first shortlist</Button>
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
    <form className="mt-6 rounded-xl border border-border bg-white p-5" onSubmit={handleSubmit}>
      <Label htmlFor="shortlist-name" className="mb-2 block">Shortlist name</Label>
      <TextInput
        id="shortlist-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Weekend getaways"
        maxLength={80}
        autoFocus
      />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!name.trim() || saving}>
          {saving ? 'Creating...' : 'Create'}
        </Button>
        <Button type="button" color="light" onClick={onCancel} disabled={saving}>
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
  const isSingleImage = images.length === 1;
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
    <article className="overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link to={`/shortlists/${shortlist.id}`} className="grid grid-cols-2 gap-0.5" aria-label={`Open ${shortlist.name}`}>
        {images.map((image, index) => (
          <img key={`${image}-${index}`} src={image} alt="" aria-hidden="true" className={isSingleImage ? 'col-span-2 h-56 w-full object-cover' : 'h-28 w-full object-cover'} />
        ))}
      </Link>
      <div className="space-y-1 p-4">
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
            <h3 className="text-base font-semibold text-navy">{shortlist.name}</h3>
          </Link>
        )}
        <p className="text-xs text-muted">{itemCount} {itemCount === 1 ? 'stay' : 'stays'} · Updated {new Date(shortlist.updatedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
        <Button size="xs" onClick={handleCopyLink}>{copied ? 'Copied' : 'Share'}</Button>
        <Button size="xs" color="light" onClick={() => { setNewName(shortlist.name); setRenaming(true); }}>Rename</Button>
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
    <main className="min-h-screen bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <SavedStaysHeader
          activeTab="lists"
          title="Saved stays"
          subtitle="Organise your favourite stays into shareable collections."
          actionLabel={shortlists.length > 0 && !showCreate ? 'New shortlist' : ''}
          onAction={() => setShowCreate(true)}
        />

        {showCreate && <CreateForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />}

        {error && (
          <Alert color="failure" className="mt-6">
            <p>{error}</p>
            <Button className="mt-4" onClick={fetchShortlists}>Try again</Button>
          </Alert>
        )}

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : !error && shortlists.length === 0 && !showCreate ? (
          <EmptyState onCreateClick={() => setShowCreate(true)} />
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shortlists.map((shortlist) => (
              <ShortlistCard key={shortlist.id} shortlist={shortlist} onDelete={handleDelete} onRename={handleRename} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
