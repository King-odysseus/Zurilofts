import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthContext.jsx';

const STORAGE_KEY = 'zurilofts_nav_mode';

const ModeContext = createContext(null);

function readStoredMode() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'hosting' ? 'hosting' : 'travelling';
  } catch {
    // Safari private mode throws on storage access - degrade to default
    return 'travelling';
  }
}

export function ModeProvider({ children }) {
  const { user } = useAuth();

  const canHost = user?.role === 'HOST' || user?.role === 'ADMIN';

  const [mode, setModeState] = useState(() => readStoredMode());

  // Auth restores asynchronously, so `canHost` is false on first render even for
  // a host. Re-sync whenever it settles: restore the stored mode once we know the
  // user can host, and force travelling otherwise. Without the restore branch a
  // host would be reset to travelling on every reload.
  useEffect(() => {
    setModeState(canHost ? readStoredMode() : 'travelling');
  }, [canHost]);

  const setMode = useCallback((next) => {
    const value = next === 'hosting' ? 'hosting' : 'travelling';
    setModeState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore storage failures - keep in-memory mode
    }
  }, []);

  const value = {
    mode: canHost ? mode : 'travelling',
    setMode,
    canHost,
  };

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

ModeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useMode = () => {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};

export default ModeContext;
