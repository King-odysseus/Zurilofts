import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/client.js";

export default function SaveToShortlistButton({ propertyId }) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [shortlists, setShortlists] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const fetchShortlists = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await apiClient.get("/shortlists");
      const list = res.data.data || [];
      setShortlists(list);
      // Determine which shortlists already have this property
      const saved = new Set();
      for (const sl of list) {
        try {
          const detail = await apiClient.get(`/shortlists/${sl.id}`);
          const has = (detail.data.data.items || []).some(
            (item) => item.propertyId === propertyId
          );
          if (has) saved.add(sl.id);
        } catch { /* ignore */ }
      }
      setSavedIds(saved);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [isAuthenticated, propertyId]);

  useEffect(() => {
    if (open) fetchShortlists();
  }, [open, fetchShortlists]);

  const toggleShortlist = async (shortlistId) => {
    try {
      if (savedIds.has(shortlistId)) {
        await apiClient.delete(`/shortlists/${shortlistId}/items/${propertyId}`);
        setSavedIds((prev) => { const next = new Set(prev); next.delete(shortlistId); return next; });
      } else {
        await apiClient.post(`/shortlists/${shortlistId}/items`, { propertyId });
        setSavedIds((prev) => new Set(prev).add(shortlistId));
      }
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await apiClient.post("/shortlists", { name: newName.trim() });
      const sl = res.data.data;
      await apiClient.post(`/shortlists/${sl.id}/items`, { propertyId });
      setShortlists((prev) => [sl, ...prev]);
      setSavedIds((prev) => new Set(prev).add(sl.id));
      setNewName("");
      setShowCreate(false);
    } catch { /* ignore */ }
  };

  if (!isAuthenticated) return null;

  const isSaved = savedIds.size > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={isSaved ? "Saved to shortlist" : "Save to shortlist"}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
          isSaved
            ? "bg-[#C49A6C] text-white"
            : "border-2 border-[#0B0B45] text-[#0B0B45] hover:bg-[#0B0B45] hover:text-white"
        }`}
      >
        <svg className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        {isSaved ? `Saved (${savedIds.size})` : "Save"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white rounded-xl border border-[#D9D9D9] shadow-lg p-3">
            <h4 className="text-sm font-semibold text-[#0B0B45] mb-2">Save to shortlist</h4>

            {loading ? (
              <p className="text-xs text-[#6b7280] py-2">Loading...</p>
            ) : shortlists.length === 0 ? (
              <p className="text-xs text-[#6b7280] py-2">No shortlists yet.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto mb-2">
                {shortlists.map((sl) => (
                  <label
                    key={sl.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#D9D9D9]/20 cursor-pointer text-sm text-[#1f2937]"
                  >
                    <input
                      type="checkbox"
                      checked={savedIds.has(sl.id)}
                      onChange={() => toggleShortlist(sl.id)}
                      className="rounded border-[#D9D9D9] text-[#C49A6C] focus:ring-[#C49A6C]"
                    />
                    {sl.name}
                  </label>
                ))}
              </div>
            )}

            {showCreate ? (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Shortlist name"
                  className="flex-1 rounded-lg border border-[#D9D9D9] px-2 py-1 text-xs text-[#1f2937] focus:outline-none focus-visible:border-[#C49A6C] focus-visible:ring-1 focus-visible:ring-[#C49A6C]"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(false); }}
                />
                <button onClick={handleCreate} className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#C49A6C] text-white">Add</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-[#C49A6C] hover:bg-[#C49A6C]/10 transition-colors"
              >
                + Create new shortlist
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

SaveToShortlistButton.propTypes = {
  propertyId: PropTypes.string.isRequired,
};
