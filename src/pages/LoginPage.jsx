import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { googleOAuthUrl } from '../utils/authUrls.js';
import AuthShell from '../components/AuthShell.jsx';
import {
  AuthDivider,
  AuthError,
  AuthField,
  AuthGoogleButton,
  AuthHeading,
  AuthPasswordField,
  AuthSubmit,
  AuthSwitchLine,
} from '../components/AuthForm.jsx';

function getDashboardPath(user) {
  if (user?.role === 'ADMIN') return '/admin';
  if (user?.role === 'HOST') return '/host/today';
  return '/';
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const { user, login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleHref = googleOAuthUrl();

  useEffect(() => {
    if (isAuthenticated && !isLoading && user) {
      const returnTo = searchParams.get('returnUrl') || getDashboardPath(user);
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate, searchParams]);

  useEffect(() => {
    if (searchParams.get('error')) {
      setLocalError('Google sign-in failed. Please try again.');
    }
  }, [searchParams]);

  useEffect(() => () => clearError(), [clearError]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setLocalError('');
    const result = await login(email, password);
    if (!result.success) setLocalError(result.message);
    setSubmitting(false);
  }

  return (
    <AuthShell>
      <div className="space-y-5">
        <AuthHeading
          title="Welcome back"
          subtitle="Sign in to manage your stays, bookings and saved places."
        />
        <AuthError>{localError || error}</AuthError>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField
            id="login-email"
            label="Email address"
            icon={Mail}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <AuthPasswordField
            id="login-password"
            label="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
            <label htmlFor="remember-me" className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                id="remember-me"
                defaultChecked
                className="h-4 w-4 rounded border-line text-primary accent-primary focus:ring-primary/30"
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="font-medium text-ink underline underline-offset-4 hover:text-link">
              Forgot password?
            </Link>
          </div>

          <AuthSubmit
            submitting={submitting}
            busy="Signing in..."
            idle={<>Sign in <ChevronRight className="h-4 w-4" aria-hidden="true" /></>}
          />
        </form>

        <AuthDivider label="or continue with" />
        <AuthGoogleButton href={googleHref} label="Continue with Google" />
        {/* Same form either way (one page, one set of fields); this only keeps the
            host intent when a host arrives from the hosting entry point. */}
        <AuthSwitchLine
          prompt="New to ZuriLofts?"
          to={searchParams.get('role')?.toUpperCase() === 'HOST' ? '/register?role=HOST' : '/register'}
          action="Create account"
        />
      </div>
    </AuthShell>
  );
}

export default LoginPage;
