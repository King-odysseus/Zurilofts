import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { Heart } from "lucide-react";
import { Button, Checkbox, Label, TextInput } from "flowbite-react";
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
        } catch (err) { console.error(err); }
      }
      setSavedIds(saved);
    } catch (err) { console.error(err); }
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
    } catch (err) { console.error(err); }
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
    } catch (err) { console.error(err); }
  };

  if (!isAuthenticated) return null;

  const isSaved = savedIds.size > 0;

  return (
    <div className="relative">
      {/* Saved state reads as a filled brand pill; unsaved as a light outline. */}
      <Button
        type="button"
        color={isSaved ? undefined : "light"}
        size="sm"
        onClick={() => setOpen(!open)}
        aria-label={isSaved ? "Saved to shortlist" : "Save to shortlist"}
      >
        <Heart className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} strokeWidth={2} aria-hidden="true" />
        {isSaved ? `Saved (${savedIds.size})` : "Save"}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-white p-3 shadow-lg">
            <h4 className="mb-2 text-sm font-semibold text-navy">Save to shortlist</h4>

            {loading ? (
              <p className="py-2 text-xs text-muted">Loading...</p>
            ) : shortlists.length === 0 ? (
              <p className="py-2 text-xs text-muted">No shortlists yet.</p>
            ) : (
              <div className="mb-2 max-h-48 space-y-1 overflow-y-auto">
                {shortlists.map((sl) => (
                  <Label
                    key={sl.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface"
                  >
                    <Checkbox
                      checked={savedIds.has(sl.id)}
                      onChange={() => toggleShortlist(sl.id)}
                    />
                    {sl.name}
                  </Label>
                ))}
              </div>
            )}

            {showCreate ? (
              <div className="flex items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <TextInput
                    type="text"
                    sizing="sm"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Shortlist name"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(false); }}
                  />
                </div>
                <Button size="xs" onClick={handleCreate}>Add</Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
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
