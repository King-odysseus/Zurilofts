import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]); // full property objects
  const [ids, setIds] = useState(() => new Set());

  const refreshFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavorites([]);
      setIds(new Set());
      return;
    }
    try {
      const res = await apiClient.get('/favorites');
      const props = res.data.data || [];
      setFavorites(props);
      setIds(new Set(props.map((p) => p.id)));
    } catch {
      /* ignore — keep current state */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  const isFavorite = useCallback((id) => ids.has(id), [ids]);

  const toggleFavorite = useCallback(
    async (propertyOrId) => {
      if (!isAuthenticated) return false;
      const id = typeof propertyOrId === 'string' ? propertyOrId : propertyOrId.id;
      const currently = ids.has(id);
      // optimistic update
      setIds((prev) => {
        const next = new Set(prev);
        if (currently) next.delete(id);
        else next.add(id);
        return next;
      });
      try {
        if (currently) await apiClient.delete(`/favorites/${id}`);
        else await apiClient.post('/favorites', { propertyId: id });
        refreshFavorites();
        return !currently;
      } catch {
        // revert on failure
        setIds((prev) => {
          const next = new Set(prev);
          if (currently) next.add(id);
          else next.delete(id);
          return next;
        });
        return currently;
      }
    },
    [ids, isAuthenticated, refreshFavorites]
  );

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, refreshFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
}

export default FavoritesContext;
