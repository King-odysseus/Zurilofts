import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from 'flowbite-react';
import { useAuth } from '../context/AuthContext.jsx';
import { consumePostAuthMode, rememberNavMode } from '../utils/authIntent.js';

function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useAuth();
  const navigate = useNavigate();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    async function processOAuth() {
      const token = searchParams.get('token');
      if (!token) {
        navigate('/login?error=oauth_failed', { replace: true });
        return;
      }

      const result = await handleOAuthCallback(token);
      if (result.success) {
        const requestedMode = consumePostAuthMode();
        rememberNavMode(requestedMode);
        const dest = result.user?.role === 'ADMIN'
          ? '/admin'
          : result.user?.role === 'HOST'
            ? '/host/today'
            : requestedMode === 'hosting'
              ? '/host/application'
              : '/';
        navigate(dest, { replace: true });
      } else {
        navigate('/login?error=oauth_failed', { replace: true });
      }
    }

    processOAuth();
  }, [searchParams, handleOAuthCallback, navigate]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
      <Spinner size="lg" aria-label="Signing you in" />
      <p className="text-lg font-semibold text-navy">Signing you in...</p>
      <p className="text-sm text-muted">Please wait a moment</p>
    </div>
  );
}

export default OAuthCallback;
