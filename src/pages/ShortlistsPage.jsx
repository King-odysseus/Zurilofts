import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/client.js";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[#E3E8EF] bg-white p-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
      <div className="mb-3 h-5 w-2/3 animate-pulse rounded bg-[#EAF0F4]" />
      <div className="mb-4 h-4 w-1/3 animate-pulse rounded bg-[#F1F4F7]" />
      <div className="flex gap-2">
        <div className="h-11 w-20 animate-pulse rounded-[10px] bg-[#EAF0F4]" />
        <div className="h-11 w-20 animate-pulse rounded-[10px] bg-[#EAF0F4]" />
      </div>
    </div>
  );
}

function EmptyState({ onCreateClick }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#E3E8EF] bg-[#F7F4EF]">
        <svg className="h-8 w-8 text-[#5B6B82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      <h3 className="mb-1 text-lg font-bold text-[#0B1F42]">No shortlists yet</h3>
      <p className="mx-auto mb-6 max-w-sm text-sm text-[#5B6B82]">
        Save your favourite properties into collections and share them with friends or travel partners.
      </p>
      <button
        type="button"
        onClick={onCreateClick}
        className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#0B1F42] px-6 py-2.5 font-semibold text-white transition-all duration-200 hover:bg-[#07072E]"
      >
        Create your first shortlist
      </button>
    </div>
  );
}

EmptyState.propTypes = {
  onCreateClick: PropTypes.func.isRequired,
};

function CreateForm({ onSubmit, onCancel, saving }) {
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-[#E3E8EF] bg-white p-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
      <label htmlFor="shortlist-name" className="mb-2 block text-sm font-medium text-[#0B1F42]">
        Shortlist name
      </label>
      <input
        id="shortlist-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Weekend getaways, Honeymoon picks"
        maxLength={80}
        autoFocus
        className="mb-4 min-h-[44px] w-full rounded-[10px] border-0 bg-[#F7F4EF] px-4 py-2.5 text-sm text-[#0B1F42] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#0B1F42] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#07072E] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[#E3E8EF] bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1F42] transition-all duration-200 hover:bg-[#F7F4EF]"
        >
          Cancel
        </button>
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${shortlist.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (newName.trim() && newName.trim() !== shortlist.name) {
      onRename(shortlist.id, newName.trim());
    }
    setRenaming(false);
  };

  const itemLabel = shortlist._count?.items === 1 ? "property" : "properties";
  const previews = shortlist.previewImages || [];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E3E8EF] bg-white shadow-[0_4px_16px_rgba(11,31,66,0.04)] transition-all duration-200 hover:shadow-md">
      {/* Image collage - a deliberate placeholder for an empty/imageless
          shortlist, not a broken grid of missing images. */}
      <Link to={`/shortlists/${shortlist.id}`} className="block aspect-[16/7] overflow-hidden bg-[#F7F7F5]">
        {previews.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-8 w-8 text-[#E5E7EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        ) : previews.length === 1 ? (
          <img src={previews[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full grid-cols-2 gap-0.5">
            <img src={previews[0]} alt="" className="h-full w-full object-cover" />
            <div className="grid h-full grid-rows-2 gap-0.5">
              {previews.slice(1, 3).map((src, i) => (
                <img key={i} src={src} alt="" className="h-full w-full object-cover" />
              ))}
              {previews.length < 3 && <div className="bg-[#F7F7F5]" />}
            </div>
          </div>
        )}
      </Link>

      <div className="p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        {renaming ? (
          <form onSubmit={handleRenameSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="min-h-[44px] flex-1 rounded-[10px] border border-[#E3E8EF] bg-white px-3 py-2 text-sm text-[#0B1F42] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C]"
              autoFocus
              onBlur={() => setRenaming(false)}
            />
          </form>
        ) : (
          <Link
            to={`/shortlists/${shortlist.id}`}
            className="truncate text-base font-semibold text-[#0B1F42] transition-colors hover:text-[#C49A6C]"
          >
            {shortlist.name}
          </Link>
        )}
        <span className="inline-flex flex-shrink-0 items-center rounded-full bg-[#FDE8D8] px-2.5 py-1 text-xs font-semibold text-[#9A4A1D]">
          {shortlist._count?.items ?? 0} {itemLabel}
        </span>
      </div>

      <p className="mb-4 text-xs text-[#5B6B82]">
        Updated {new Date(shortlist.updatedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          to={`/shortlists/${shortlist.id}`}
          className="inline-flex min-h-[44px] items-center rounded-[10px] bg-[#0B1F42] px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#07072E]"
        >
          Open
        </Link>
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex min-h-[44px] items-center rounded-[10px] border border-[#E3E8EF] bg-white px-4 text-sm font-semibold text-[#0B1F42] transition-all duration-200 hover:bg-[#F7F4EF]"
        >
          {copied ? "Copied!" : "Share"}
        </button>
        <button
          type="button"
          onClick={() => { setNewName(shortlist.name); setRenaming(true); }}
          className="inline-flex min-h-[44px] items-center rounded-[10px] border border-[#E3E8EF] bg-white px-4 text-sm font-semibold text-[#0B1F42] transition-all duration-200 hover:bg-[#F7F4EF]"
        >
          Rename
        </button>
        <button
          type="button"
          onClick={() => onDelete(shortlist.id)}
          className="ml-auto inline-flex min-h-[44px] items-center rounded-[10px] px-4 text-sm font-semibold text-[#B42318] transition-colors duration-200 hover:bg-[#FDECEC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C]"
        >
          Delete
        </button>
      </div>
      </div>
    </div>
  );
}

ShortlistCard.propTypes = {
  shortlist: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    token: PropTypes.string.isRequired,
    updatedAt: PropTypes.string.isRequired,
    _count: PropTypes.shape({
      items: PropTypes.number,
    }),
    previewImages: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  onRename: PropTypes.func.isRequired,
};

export default function ShortlistsPage() {
  const { isAuthenticated } = useAuth();
  const [shortlists, setShortlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchShortlists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/shortlists");
      setShortlists(res.data.data || []);
    } catch (err) {
      setError("Could not load your shortlists. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "My Shortlists | ZuriLofts";
    if (isAuthenticated) fetchShortlists();
  }, [isAuthenticated, fetchShortlists]);

  const handleCreate = async (name) => {
    setSaving(true);
    try {
      await apiClient.post("/shortlists", { name });
      setShowCreate(false);
      await fetchShortlists();
    } catch {
      setError("Could not create shortlist.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this shortlist? This cannot be undone.")) return;
    try {
      await apiClient.delete(`/shortlists/${id}`);
      await fetchShortlists();
    } catch {
      setError("Could not delete shortlist.");
    }
  };

  const handleRename = async (id, name) => {
    try {
      await apiClient.patch(`/shortlists/${id}`, { name });
      await fetchShortlists();
    } catch {
      setError("Could not rename shortlist.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-[#E3E8EF] bg-white px-5 py-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)] sm:px-6">
          <h1 className="text-2xl font-bold text-[#0B1F42] sm:text-3xl">My Shortlists</h1>
          {shortlists.length > 0 && !showCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-[#0B1F42] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#07072E] sm:px-6"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New shortlist
            </button>
          )}
        </div>
        <div className="mt-5 flex items-center gap-5 border-b border-[#E5E7EB]" role="tablist" aria-label="Saved stays">
          <Link to="/favourites" role="tab" aria-selected="false" className="border-b-2 border-transparent px-1 pb-3 text-sm font-semibold text-[#5B6B82] hover:text-[#0B1F42]">All saved</Link>
          <Link to="/shortlists" role="tab" aria-selected="true" className="border-b-2 border-[#C49A6C] px-1 pb-3 text-sm font-semibold text-[#0B1F42]">My lists ({shortlists.length})</Link>
        </div>
        <p className="text-sm text-[#6b7280] mb-8">Save and organize your favourite properties into shareable collections.</p>

        {showCreate && (
          <CreateForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-[#6b7280] mb-4">{error}</p>
            <button
              type="button"
              onClick={fetchShortlists}
              className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : !error && shortlists.length === 0 && !showCreate ? (
          <EmptyState onCreateClick={() => setShowCreate(true)} />
        ) : (
          <div className="space-y-4">
            {shortlists.map((s) => (
              <ShortlistCard key={s.id} shortlist={s} onDelete={handleDelete} onRename={handleRename} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
