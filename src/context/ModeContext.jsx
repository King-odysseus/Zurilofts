import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthContext.jsx';
import { NAV_MODE_STORAGE_KEY, rememberNavMode } from '../utils/authIntent.js';

const ModeContext = createContext(null);

function readStoredMode() {
  try {
    const stored = window.localStorage.getItem(NAV_MODE_STORAGE_KEY);
    return stored === 'hosting' ? 'hosting' : 'travelling';
  } catch {
    // Safari private mode throws on storage access - degrade to default
    return 'travelling';
  }
}

export function ModeProvider({ children }) {
  const { user } = useAuth();

  const canHost = user?.role === 'HOST' || user?.role === 'ADMIN';
  const canSelectHosting = Boolean(user);

  const [mode, setModeState] = useState(() => readStoredMode());

  // Every authenticated account may enter Hosting mode. For unapproved users it
  // opens host onboarding; only HOST/ADMIN accounts receive dashboard access.
  useEffect(() => {
    setModeState(canSelectHosting ? readStoredMode() : 'travelling');
  }, [canSelectHosting]);

  const setMode = useCallback((next) => {
    const value = next === 'hosting' ? 'hosting' : 'travelling';
    setModeState(value);
    rememberNavMode(value);
  }, []);

  const value = {
    mode: canSelectHosting ? mode : 'travelling',
    setMode,
    canHost,
    canSelectHosting,
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
