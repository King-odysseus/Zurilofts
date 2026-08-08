import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/client.js";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import Spinner from "../components/Spinner.jsx";

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#D9D9D9]/50 rounded-2xl shadow-md p-5">
      <div className="h-5 w-2/3 bg-[#D9D9D9]/40 rounded animate-pulse mb-3" />
      <div className="h-4 w-1/3 bg-[#D9D9D9]/40 rounded animate-pulse mb-4" />
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-[#D9D9D9]/40 rounded-full animate-pulse" />
        <div className="h-8 w-20 bg-[#D9D9D9]/40 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

function EmptyState({ onCreateClick }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#D9D9D9]/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[#0B0B45] mb-1">No shortlists yet</h3>
      <p className="text-[#6b7280] max-w-sm mx-auto mb-6">
        Save your favourite properties into collections and share them with friends or travel partners.
      </p>
      <button
        type="button"
        onClick={onCreateClick}
        className="inline-flex items-center px-5 py-2.5 rounded-full font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200"
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
    <form onSubmit={handleSubmit} className="bg-white border border-[#D9D9D9]/50 rounded-2xl shadow-md p-5 mb-4">
      <label htmlFor="shortlist-name" className="block text-sm font-semibold text-[#0B0B45] mb-2">
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
        className="w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 text-sm text-[#1f2937] placeholder-[#6b7280] focus:outline-none focus-visible:border-[#C49A6C] focus-visible:ring-2 focus-visible:ring-[#C49A6C] mb-3"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="px-4 py-2 rounded-full text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Creating..." : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 rounded-full text-sm font-semibold border-2 border-[#0B0B45] text-[#0B0B45] hover:bg-[#0B0B45] hover:text-white transition-all duration-200"
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

  return (
    <div className="bg-white border border-[#D9D9D9]/50 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        {renaming ? (
          <form onSubmit={handleRenameSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 rounded-xl border border-[#D9D9D9] px-3 py-1.5 text-sm text-[#1f2937] focus:outline-none focus-visible:border-[#C49A6C] focus-visible:ring-2 focus-visible:ring-[#C49A6C]"
              autoFocus
              onBlur={() => setRenaming(false)}
            />
          </form>
        ) : (
          <Link
            to={`/shortlists/${shortlist.id}`}
            className="text-base font-semibold text-[#0B0B45] hover:text-[#C49A6C] transition-colors truncate"
          >
            {shortlist.name}
          </Link>
        )}
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#C49A6C]/10 text-[#C49A6C] flex-shrink-0">
          {shortlist._count?.items ?? 0} {itemLabel}
        </span>
      </div>

      <p className="text-xs text-[#6b7280] mb-4">
        Updated {new Date(shortlist.updatedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          to={`/shortlists/${shortlist.id}`}
          className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200"
        >
          Open
        </Link>
        <button
          type="button"
          onClick={handleCopyLink}
          className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 border-[#0B0B45] text-[#0B0B45] hover:bg-[#0B0B45] hover:text-white transition-all duration-200"
        >
          {copied ? "Copied!" : "Share"}
        </button>
        <button
          type="button"
          onClick={() => { setNewName(shortlist.name); setRenaming(true); }}
          className="px-3 py-1.5 rounded-full text-xs font-medium text-[#6b7280] hover:text-[#1f2937] hover:bg-[#D9D9D9]/30 transition-all duration-200"
        >
          Rename
        </button>
        <button
          type="button"
          onClick={() => onDelete(shortlist.id)}
          className="px-3 py-1.5 rounded-full text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 transition-all duration-200 ml-auto"
        >
          Delete
        </button>
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
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B0B45]">My Shortlists</h1>
          {shortlists.length > 0 && !showCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New shortlist
            </button>
          )}
        </div>
        <p className="text-[#6b7280] mb-8">Save and organize your favourite properties into shareable collections.</p>

        {showCreate && (
          <CreateForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-[#6b7280] mb-3">{error}</p>
            <button
              type="button"
              onClick={fetchShortlists}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200"
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
