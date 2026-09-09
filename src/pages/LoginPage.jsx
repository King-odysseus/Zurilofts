import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import logoImg from '../assets/zurilofts-logo.png';
import { zuriImages } from '../assets/images';
import { googleOAuthUrl } from '../utils/authUrls.js';

// Use a consistent background image with a dark overlay
const bgImage = zuriImages[14]; // Ely Homes Photography (15 of 20)

function getDashboardPath(user) {
  if (user?.role === 'ADMIN') return '/admin';
  // A plain USER who has hosting intent (any HostApplication, any status)
  // lands in their dashboard too, not the application form - see HostRoute.
  if (user?.role === 'HOST' || user?.hostApplicationStatus != null) return '/host/today';
  return '/';
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { user, login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleHref = googleOAuthUrl();

  useEffect(() => {
    if (isAuthenticated && !isLoading && user) {
      const returnTo = searchParams.get('returnUrl')
        || getDashboardPath(user);
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate, searchParams]);

  useEffect(() => {
    if (searchParams.get('error')) {
      setLocalError('Google sign-in failed. Please try again.');
    }
  }, [searchParams]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setLocalError('');
    const result = await login(email, password);
    if (!result.success) {
      setLocalError(result.message);
    }
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Compact white header - no full-screen dark photo behind the form */}
      <header className="flex h-16 flex-shrink-0 items-center border-b border-[#E5E7EB] px-4 md:px-6">
        <Link to="/" className="inline-flex items-center gap-2" aria-label="ZuriLofts home">
          <img src={logoImg} alt="ZuriLofts" className="h-9 w-auto" />
        </Link>
      </header>

      <div className="grid flex-1 lg:grid-cols-2">
        {/* Photo panel - desktop only, reduced/omitted on mobile per spec */}
        <div className="relative hidden lg:block">
          <img src={bgImage} alt="" className="h-full w-full object-cover" />
        </div>

        {/* Light form panel */}
        <div className="flex flex-1 items-center justify-center px-4 py-12 md:px-8">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-[#222222]">Welcome back</h1>
            <p className="mt-2 text-sm text-[#6b7280]">Sign in, then choose Traveling or Hosting</p>

            {/* Error */}
            {(localError || error) && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {localError || error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-[#222222]">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="ui-input w-full py-3 text-base"
                  required
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-[#222222]">Password</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="ui-input w-full py-3 pr-12 text-base"
                    required
                  />
                  <PasswordToggle
                    shown={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[44px] rounded-full bg-[#C49A6C] py-3 font-semibold text-white transition-all duration-200 hover:bg-[#B8895C] disabled:opacity-50"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="h-px flex-1 bg-[#E5E7EB]"></div>
              <span className="px-4 text-sm text-[#6b7280]">or</span>
              <div className="h-px flex-1 bg-[#E5E7EB]"></div>
            </div>

            {/* Google OAuth */}
            <a
              href={googleHref}
              className="flex min-h-[44px] w-full items-center justify-center rounded-full border border-[#E5E7EB] bg-white py-3 font-semibold text-[#222222] transition-all duration-200 hover:bg-[#F7F7F5]"
            >
              <svg className="mr-2 w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </a>

            <Link
              to="/properties"
              className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-full py-3 text-sm font-semibold text-[#6b7280] transition-all duration-200 hover:text-[#2563EB]"
            >
              Continue Browsing Properties
            </Link>

            <p className="mt-6 text-center text-sm text-[#6b7280]">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-[#2563EB] transition-colors hover:text-[#1D4ED8]">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Eye toggle button shown inside a password field
function PasswordToggle({ shown, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? 'Hide password' : 'Show password'}
      className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#6b7280] hover:text-[#2563EB] transition-colors"
    >
      {shown ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}

export default LoginPage;
