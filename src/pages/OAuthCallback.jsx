import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

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
        const dest = result.user?.role === 'HOST' || result.user?.role === 'ADMIN' ? '/admin' : '/';
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
