import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthContext.jsx';
import { rememberNavMode, readNavMode } from '../utils/authIntent.js';
import ModeTransition from '../components/ModeTransition.jsx';

const ModeContext = createContext(null);

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

  // The remembered side is read per account (see readNavMode): two people can
  // share a browser without inheriting each other's header.
  const [mode, setModeState] = useState(() => readNavMode(user?.id));
  // A switch is announced with a short overlay, so changing sides is something
  // the person watches happen instead of something they discover after the page
  // has already changed around them.
  const [transition, setTransition] = useState(null);
  const transitionCount = useRef(0);

  // Only HOST accounts and hosting-intent USERs may enter Hosting mode. For
  // an unapproved (pending) applicant the workspace opens so they can prepare
  // draft listings; publishing and payouts still require an approved HOST
  // account. ADMINS are forced back to travelling mode - they use /admin.
  useEffect(() => {
    setModeState(canSelectHosting ? readNavMode(user?.id) : 'travelling');
  }, [canSelectHosting, user?.id]);

  const setMode = useCallback((next, options = {}) => {
    const value = next === 'hosting' ? 'hosting' : 'travelling';
    // Re-selecting the side you are already on is not a switch, so it gets no
    // overlay. Route-driven syncs also announce, because arriving in the host
    // workspace from a travel page is exactly the silent jump we want to show.
    // `announce: true` forces the overlay: a deliberate click always changes the
    // screen, even when the stored side already equals the one being entered.
    const shouldAnnounce = options.announce === true || (mode !== value && options.announce !== false);
    if (shouldAnnounce) {
      transitionCount.current += 1;
      setTransition({ to: value, id: transitionCount.current });
    }
    setModeState(value);
    rememberNavMode(value, user?.id);
  }, [mode, user?.id]);

  // The overlay is a moment, not a state: drop it once it has played.
  useEffect(() => {
    if (!transition) return undefined;
    const timer = setTimeout(() => setTransition(null), 1500);
    return () => clearTimeout(timer);
  }, [transition]);

  const value = {
    mode: canSelectHosting ? mode : 'travelling',
    setMode,
    modeTransition: transition,
    canHost,
    canSelectHosting,
  };

  return (
    <ModeContext.Provider value={value}>
      {children}
      <ModeTransition transition={transition} />
    </ModeContext.Provider>
  );
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
