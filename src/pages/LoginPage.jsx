import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import logoImg from '../assets/zurilofts-logo.png';
import { zuriImages } from '../assets/images';

// Use a consistent background image with a dark overlay
const bgImage = zuriImages[14]; // Ely Homes Photography (15 of 20)

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const returnTo = searchParams.get('returnUrl') || '/';
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, searchParams]);

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
    <div className="min-h-screen flex items-center justify-center px-4 py-16 relative">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img src={bgImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#262262]/70"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="neu-card auth-card p-8 bg-white/95 backdrop-blur-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-6">
              <img src={logoImg} alt="ZuriLofts" className="h-20 w-auto mx-auto" />
            </Link>
            <h1 className="text-2xl font-bold text-[#262262]">Welcome Back</h1>
            <p className="text-[#6b7280] mt-2">Sign in to your account</p>
          </div>

          {/* Error */}
          {(localError || error) && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
              {localError || error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#1f2937] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="neu-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1f2937] mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="neu-input w-full px-4 py-3 pr-12 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
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
              className="w-full bg-[#C49A6C] text-white font-semibold py-3 rounded-full hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-[#D9D9D9]"></div>
            <span className="px-4 text-sm text-[#6b7280]">or</span>
            <div className="flex-1 h-px bg-[#D9D9D9]"></div>
          </div>

          {/* Google OAuth */}
          <a
            href={`${API_BASE}/auth/google`}
            className="flex items-center justify-center w-full py-3 rounded-full border-2 border-[#D9D9D9] text-[#1f2937] font-semibold hover:border-[#C49A6C] hover:bg-[#C49A6C]/5 transition-all duration-200"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </a>

          <Link
            to="/properties"
            className="flex items-center justify-center w-full py-3 mt-4 rounded-full border-2 border-[#D9D9D9] text-[#6b7280] font-semibold hover:border-[#C49A6C] hover:text-[#C49A6C] transition-all duration-200 text-sm"
          >
            Continue Browsing Properties
          </Link>

          <p className="text-center text-sm text-[#6b7280] mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-[#C49A6C] font-semibold hover:text-[#262262] transition-colors">
              Sign up
            </Link>
          </p>
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
      className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#6b7280] hover:text-[#262262] transition-colors"
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
