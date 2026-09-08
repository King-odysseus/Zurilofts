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

  // A plain USER who has expressed hosting intent (any HostApplication, no
  // matter its status) may also enter the host workspace - only a verified
  // HOST account may publish listings or take payouts. ADMINS are excluded
  // from host mode entirely: they administer the platform through /admin and
  // are not treated as hosts.
  const canHost = user?.role === 'HOST' || user?.hostApplicationStatus != null;
  // Any authenticated non-admin account may choose hosting mode: HOST and
  // hosting-intent USERs open the host workspace, while a plain USER is routed
  // to Host Setup (/host/application) to begin an application. ADMINS (who use
  // /admin) and guests are excluded.
  const canSelectHosting = Boolean(user) && user.role !== 'ADMIN';

  const [mode, setModeState] = useState(() => readStoredMode());

  // Only HOST accounts and hosting-intent USERs may enter Hosting mode. For
  // an unapproved (pending) applicant the workspace opens so they can prepare
  // draft listings; publishing and payouts still require an approved HOST
  // account. ADMINS are forced back to travelling mode - they use /admin.
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
