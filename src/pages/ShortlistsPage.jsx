import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/client.js";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

function SkeletonCard() {
  return (
    <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-5">
      <div className="h-5 w-2/3 bg-[#E5E7EB]/40 rounded animate-pulse mb-3" />
      <div className="h-4 w-1/3 bg-[#E5E7EB]/40 rounded animate-pulse mb-4" />
      <div className="flex gap-2">
        <div className="h-11 w-20 bg-[#E5E7EB]/40 rounded-lg animate-pulse" />
        <div className="h-11 w-20 bg-[#E5E7EB]/40 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

function EmptyState({ onCreateClick }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F7F7F5] border border-[#E5E7EB] flex items-center justify-center">
        <svg className="w-8 h-8 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-[#222222] mb-1">No shortlists yet</h3>
      <p className="text-sm text-[#6b7280] max-w-sm mx-auto mb-6">
        Save your favourite properties into collections and share them with friends or travel partners.
      </p>
      <button
        type="button"
        onClick={onCreateClick}
        className="inline-flex items-center justify-center min-h-[44px] bg-[#C49A6C] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#B8895C] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
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
    <form onSubmit={handleSubmit} className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-5 mb-6">
      <label htmlFor="shortlist-name" className="block text-sm font-medium text-[#222222] mb-2">
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
        className="w-full min-h-[44px] rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#222222] placeholder-[#6b7280] focus:outline-none focus:border-[#2563EB] focus-visible:ring-4 focus-visible:ring-[#2563EB]/20 mb-4"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
        >
          {saving ? "Creating..." : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-semibold bg-white border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
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
    <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-all duration-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        {renaming ? (
          <form onSubmit={handleRenameSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 min-h-[44px] rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#222222] focus:outline-none focus:border-[#2563EB] focus-visible:ring-4 focus-visible:ring-[#2563EB]/20"
              autoFocus
              onBlur={() => setRenaming(false)}
            />
          </form>
        ) : (
          <Link
            to={`/shortlists/${shortlist.id}`}
            className="text-base font-semibold text-[#222222] hover:text-[#2563EB] transition-colors truncate"
          >
            {shortlist.name}
          </Link>
        )}
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#2563EB]/10 text-[#2563EB] flex-shrink-0">
          {shortlist._count?.items ?? 0} {itemLabel}
        </span>
      </div>

      <p className="text-xs text-[#6b7280] mb-4">
        Updated {new Date(shortlist.updatedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          to={`/shortlists/${shortlist.id}`}
          className="inline-flex items-center min-h-[44px] px-4 rounded-lg text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
        >
          Open
        </Link>
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center min-h-[44px] px-4 rounded-lg text-sm font-semibold bg-white border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
        >
          {copied ? "Copied!" : "Share"}
        </button>
        <button
          type="button"
          onClick={() => { setNewName(shortlist.name); setRenaming(true); }}
          className="inline-flex items-center min-h-[44px] px-4 rounded-lg text-sm font-semibold bg-white border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
        >
          Rename
        </button>
        <button
          type="button"
          onClick={() => onDelete(shortlist.id)}
          className="inline-flex items-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ml-auto"
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
    <div className="min-h-screen bg-[#F7F7F5]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 sm:px-6 shadow-sm flex items-center justify-between gap-3 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#222222]">My Shortlists</h1>
          {shortlists.length > 0 && !showCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 sm:px-6 py-2.5 rounded-lg text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New shortlist
            </button>
          )}
        </div>
        <div className="mt-5 flex items-center gap-5 border-b border-[#E5E7EB]" role="tablist" aria-label="Saved stays">
          <Link to="/favourites" role="tab" aria-selected="false" className="border-b-2 border-transparent px-1 pb-3 text-sm font-semibold text-[#6b7280] hover:text-[#222222]">All saved</Link>
          <Link to="/shortlists" role="tab" aria-selected="true" className="border-b-2 border-[#2563EB] px-1 pb-3 text-sm font-semibold text-[#2563EB]">My lists ({shortlists.length})</Link>
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
