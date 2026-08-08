// Recently-viewed properties, stored client-side in localStorage.
// No auth required and no server-side tracking - privacy-first approach
// recommended in the Phase 7 spec. Key: `zurilofts_recently_viewed`.
//
// Entries are `{ id, title, image, viewedAt }`, capped at MAX_ENTRIES (12)
// with FIFO eviction and most-recent-first ordering. Re-viewing an existing
// property moves it to the front rather than duplicating it.
//
// Every localStorage access is wrapped in try/catch because Safari private
// mode throws on write. On any failure we degrade to a no-op and return [],
// so storage can never break rendering.

import { firstImage } from './images.js';

const STORAGE_KEY = 'zurilofts_recently_viewed';
const MAX_ENTRIES = 12;

/** Read the stored list. Returns [] on any failure. */
function readStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Write the list. Silently no-ops on any failure. */
function writeStorage(entries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Safari private mode / quota exceeded - degrade gracefully.
  }
}

/**
 * Record a property view. Moves an existing entry to the front, otherwise
 * prepends a new one, then trims to MAX_ENTRIES (FIFO eviction).
 */
export function recordView(property) {
  if (!property || !property.id) return;

  const entry = {
    id: property.id,
    title: property.title || 'Property',
    image: firstImage(property) || '',
    viewedAt: Date.now(),
  };

  const current = readStorage();
  const withoutExisting = current.filter((item) => item.id !== entry.id);
  const next = [entry, ...withoutExisting].slice(0, MAX_ENTRIES);
  writeStorage(next);
}

/** Return the stored list, most-recent first. Returns [] on any failure. */
export function getRecentlyViewed() {
  return readStorage();
}

/** Clear all stored recently-viewed entries. */
export function clearRecentlyViewed() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore - nothing to clear on failure.
  }
}
