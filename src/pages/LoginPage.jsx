import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { googleOAuthUrl } from '../utils/authUrls.js';
import AuthShell from '../components/AuthShell.jsx';
import GoogleIcon from '../components/GoogleIcon.jsx';

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
  const [showPassword, setShowPassword] = useState(false);
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
      <h2>Welcome back</h2>
      <p>Sign in to manage your stays, bookings and saved places.</p>
      {(localError || error) && <div className="op-auth-error" role="alert">{localError || error}</div>}

      <form onSubmit={handleSubmit}>
        <label className="op-auth-label">
          <span>Email address</span>
          <span className="op-auth-control">
            <Mail className="op-auth-control-icon" strokeWidth={1.8} aria-hidden="true" />
            <input
              className="has-icon"
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </span>
        </label>

        <label className="op-auth-label">
          <span>Password</span>
          <span className="op-auth-control op-auth-password">
            <LockKeyhole className="op-auth-control-icon" strokeWidth={1.8} aria-hidden="true" />
            <input
              className="has-icon has-toggle"
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
            <PasswordToggle shown={showPassword} onClick={() => setShowPassword((value) => !value)} />
          </span>
        </label>

        <div className="op-auth-form-row">
          <span className="op-auth-check">
            <input type="checkbox" id="remember-me" defaultChecked />
            <label htmlFor="remember-me">Remember me</label>
          </span>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <button type="submit" className="op-auth-submit" disabled={submitting}>
          {submitting ? 'Signing in…' : <>Sign in <ChevronRight className="w-4 h-4" aria-hidden="true" /></>}
        </button>
      </form>

      <div className="op-auth-divider">or continue with</div>
      <a className="op-auth-google" href={googleHref}><GoogleIcon className="h-[18px] w-[18px]" /> Continue with Google</a>
      <div className="op-auth-switch">New to ZuriLofts? <Link to="/register">Create account</Link></div>
    </AuthShell>
  );
}

function PasswordToggle({ shown, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? 'Hide password' : 'Show password'}
      className="op-auth-password-toggle"
    >
      {shown ? (
        <EyeOff className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      ) : (
        <Eye className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  );
}

export default LoginPage;
