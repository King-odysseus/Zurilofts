import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
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

        // A plain USER who picked "Hosting" during Google sign-up has not yet
        // filed a HostApplication (unlike email registration, which creates
        // the DRAFT eagerly) - do that now so they land straight in their
        // dashboard, matching the rest of the onboarding flow. Best-effort:
        // if it fails, HostApplicationPage still creates it on next visit.
        if (requestedMode === 'hosting' && result.user?.role === 'USER' && !result.user?.hostApplicationStatus) {
          try {
            await apiClient.post('/host-application');
          } catch (err) {
            console.error('Failed to create host application:', err);
          }
        }

        const dest = result.user?.role === 'ADMIN'
          ? '/admin'
          : result.user?.role === 'HOST' || requestedMode === 'hosting'
            ? '/host/today'
            : '/';
        navigate(dest, { replace: true });
      } else {
        navigate('/login?error=oauth_failed', { replace: true });
      }
    }

    processOAuth();
  }, [searchParams, handleOAuthCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#D9D9D9]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#0B0B45] font-semibold text-lg">Signing you in...</p>
        <p className="text-[#6b7280] text-sm mt-1">Please wait a moment</p>
      </div>
    </div>
  );
}

export default OAuthCallback;
