import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import { consumePostAuthMode, rememberNavMode } from '../utils/authIntent.js';

function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useAuth();
  const navigate = useNavigate();
  const called = useRef(false);
  const [status, setStatus] = useState('checking');
  const [destination, setDestination] = useState('/');

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    async function processOAuth() {
      const token = searchParams.get('token');
      if (!token) {
        setStatus('failed');
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
        setDestination(dest);
        setStatus('success');
        window.setTimeout(() => navigate(dest, { replace: true }), 700);
      } else {
        setStatus('failed');
      }
    }

    processOAuth();
  }, [searchParams, handleOAuthCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5]">
      <div className="mx-4 w-full max-w-lg rounded-[14px] border border-[#E5E7EB] bg-white p-8 text-center shadow-sm" role="status" aria-live="polite">
        {status === 'checking' && <>
          <div className="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#222222] font-semibold text-lg">Finishing sign-in</p>
          <p className="text-[#6b7280] text-sm mt-1">Please wait while we complete your sign-in.</p>
        </>}
        {status === 'success' && <>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700" aria-hidden="true">✓</div>
          <p className="text-[#222222] font-semibold text-lg">You’re signed in</p>
          <p className="text-[#6b7280] text-sm mt-1">Taking you to your account…</p>
          <Link to={destination} className="mt-5 inline-flex min-h-[44px] items-center rounded-lg bg-[#C49A6C] px-5 text-sm font-semibold text-white hover:bg-[#B8895C]">Continue</Link>
        </>}
        {status === 'failed' && <>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl text-red-700" aria-hidden="true">!</div>
          <p className="text-[#222222] font-semibold text-lg">Sign-in could not be completed</p>
          <p className="text-[#6b7280] text-sm mt-1">The sign-in link is missing or no longer valid. Please try again.</p>
          <Link to="/login?error=oauth_failed" className="mt-5 inline-flex min-h-[44px] items-center rounded-lg bg-[#C49A6C] px-5 text-sm font-semibold text-white hover:bg-[#B8895C]">Return to sign in</Link>
        </>}
      </div>
    </div>
  );
}

export default OAuthCallback;
