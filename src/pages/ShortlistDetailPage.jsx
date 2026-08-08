import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/client.js";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#D9D9D9]/50 rounded-2xl shadow-md overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-40 lg:w-48 h-32 sm:h-28 bg-[#D9D9D9]/40 animate-pulse" />
        <div className="flex-1 p-4 space-y-2">
          <div className="h-5 w-2/3 bg-[#D9D9D9]/40 rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-[#D9D9D9]/40 rounded animate-pulse" />
          <div className="h-4 w-1/4 bg-[#D9D9D9]/40 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function PropertyItem({ item, onRemove }) {
  const p = item.property || {};
  const image = p.images?.[0];

  return (
    <div className="group bg-white border border-[#D9D9D9]/50 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200">
      <div className="flex flex-col sm:flex-row">
        <Link to={`/property/${p.id}`} className="sm:w-40 lg:w-48 flex-shrink-0 overflow-hidden">
          <img
            src={image || "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80"}
            alt={p.title}
            className="w-full h-32 sm:h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div>
            <Link
              to={`/property/${p.id}`}
              className="text-sm font-semibold text-[#1f2937] hover:text-[#C49A6C] transition-colors line-clamp-1"
            >
              {p.title}
            </Link>
            <p className="text-xs text-[#6b7280] mt-0.5 flex items-center gap-1">
              <svg className="w-3 h-3 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {p.location || "Nairobi"}
            </p>
            {item.note && (
              <p className="text-xs text-[#6b7280] mt-1 italic">&ldquo;{item.note}&rdquo;</p>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D9D9D9]/30">
            <span className="text-sm font-semibold text-[#0B0B45]">
              KES {p.price?.toLocaleString()}
              <span className="text-xs font-normal text-[#6b7280]"> /night</span>
            </span>
            <button
              type="button"
              onClick={() => onRemove(item.propertyId)}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
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
      images: PropTypes.arrayOf(PropTypes.string),
    }),
  }).isRequired,
  onRemove: PropTypes.func.isRequired,
};

function DeleteConfirm({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full">
        <h3 className="text-lg font-semibold text-[#0B0B45] mb-2">Delete shortlist?</h3>
        <p className="text-sm text-[#6b7280] mb-5">This will permanently delete this shortlist and all its saved properties. This cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-sm font-semibold border-2 border-[#0B0B45] text-[#0B0B45] hover:bg-[#0B0B45] hover:text-white transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-all duration-200"
          >
            Delete
          </button>
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [shortlist, setShortlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const fetchShortlist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/shortlists/${id}`);
      setShortlist(res.data.data);
      setNewName(res.data.data.name);
    } catch (err) {
      setError("Could not load this shortlist.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    document.title = "Shortlist | ZuriLofts";
    if (isAuthenticated) fetchShortlist();
  }, [isAuthenticated, fetchShortlist]);

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === shortlist.name) {
      setRenaming(false);
      return;
    }
    try {
      await apiClient.patch(`/shortlists/${id}`, { name: newName.trim() });
      setShortlist((prev) => ({ ...prev, name: newName.trim() }));
    } catch {
      setError("Could not rename shortlist.");
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
      setShortlist((prev) => ({
        ...prev,
        items: prev.items.filter((i) => i.propertyId !== propertyId),
        _count: { items: prev._count.items - 1 },
      }));
    } catch {
      setError("Could not remove property.");
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/shortlists/${id}`);
      navigate("/shortlists", { replace: true });
    } catch {
      setError("Could not delete shortlist.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {loading ? (
          <div className="space-y-4">
            <div className="h-8 w-48 bg-[#D9D9D9]/40 rounded animate-pulse mb-4" />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-[#6b7280] mb-4">{error}</p>
            <button
              onClick={fetchShortlist}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200"
            >
              Try again
            </button>
          </div>
        ) : shortlist ? (
          <>
            {/* Back link */}
            <Link
              to="/shortlists"
              className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#C49A6C] transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to shortlists
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="flex-1 min-w-0">
                {renaming ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 rounded-xl border border-[#D9D9D9] px-3 py-2 text-lg font-bold text-[#0B0B45] focus:outline-none focus-visible:border-[#C49A6C] focus-visible:ring-2 focus-visible:ring-[#C49A6C]"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }}
                    />
                    <button onClick={handleRename} className="px-3 py-2 rounded-full text-sm font-semibold bg-[#C49A6C] text-white">Save</button>
                    <button onClick={() => setRenaming(false)} className="px-3 py-2 rounded-full text-sm font-semibold border-2 border-[#0B0B45] text-[#0B0B45]">Cancel</button>
                  </div>
                ) : (
                  <h1 className="text-2xl font-bold text-[#0B0B45] truncate">{shortlist.name}</h1>
                )}
                <p className="text-sm text-[#6b7280] mt-0.5">
                  {shortlist._count?.items ?? shortlist.items?.length ?? 0} {shortlist._count?.items === 1 || shortlist.items?.length === 1 ? "property" : "properties"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleShare}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 border-[#0B0B45] text-[#0B0B45] hover:bg-[#0B0B45] hover:text-white transition-all duration-200"
                >
                  {copied ? "Copied!" : "Share"}
                </button>
                <button
                  onClick={() => setRenaming(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-[#6b7280] hover:text-[#1f2937] hover:bg-[#D9D9D9]/30 transition-all duration-200"
                >
                  Rename
                </button>
              </div>
            </div>

            {/* Items */}
            {(!shortlist.items || shortlist.items.length === 0) ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#D9D9D9]/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#0B0B45] mb-1">No saved properties</h3>
                <p className="text-[#6b7280] max-w-sm mx-auto mb-6">
                  Browse properties and save them to this shortlist.
                </p>
                <Link
                  to="/properties"
                  className="inline-flex items-center px-5 py-2.5 rounded-full font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200"
                >
                  Browse properties
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {shortlist.items.map((item) => (
                  <PropertyItem key={item.id} item={item} onRemove={handleRemoveItem} />
                ))}
              </div>
            )}

            {/* Delete */}
            <div className="mt-8 pt-6 border-t border-[#D9D9D9]">
              <button
                onClick={() => setShowDelete(true)}
                className="px-4 py-2 rounded-full text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
              >
                Delete this shortlist
              </button>
            </div>

            {showDelete && (
              <DeleteConfirm
                onConfirm={handleDelete}
                onCancel={() => setShowDelete(false)}
              />
            )}
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
