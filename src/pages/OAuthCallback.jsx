import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { consumePostAuthMode, consumePostAuthPath, rememberNavMode } from '../utils/authIntent.js';

function OAuthCallback() {
  const { handleOAuthCallback } = useAuth();
  const navigate = useNavigate();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    async function processOAuth() {
      // No token is read from the URL: the callback route stores the session in
      // an httpOnly cookie, and that cookie is what signs the person in.
      const result = await handleOAuthCallback();
      if (result.success) {
        // A page that sent us to sign in wins over the usual landing screen.
        const returnTo = consumePostAuthPath();
        const requestedMode = consumePostAuthMode();
        rememberNavMode(requestedMode);
        const dest = returnTo
          || (result.user?.role === 'ADMIN'
            ? '/admin'
            : result.user?.role === 'HOST'
              ? '/host/today'
              : requestedMode === 'hosting'
                ? '/host/application'
                : '/');
        navigate(dest, { replace: true });
      } else {
        navigate('/login?error=oauth_failed', { replace: true });
      }
    }

    processOAuth();
  }, [handleOAuthCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#D9D9D9]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#C5A28C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#203565] font-semibold text-lg">Signing you in...</p>
        <p className="text-[#6b7280] text-sm mt-1">Please wait a moment</p>
      </div>
    </div>
  );
}

export default OAuthCallback;
