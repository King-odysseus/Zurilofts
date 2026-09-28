import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Checkbox, Label, TextInput } from 'flowbite-react';
import { useAuth } from '../context/AuthContext.jsx';
import { googleOAuthUrl } from '../utils/authUrls.js';
import AuthShell from '../components/AuthShell.jsx';

function getDashboardPath(user) {
  if (user?.role === 'ADMIN') return '/admin';
  if (user?.role === 'HOST') return '/host/today';
  return '/';
}

function MailIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16v12H4z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m5 7 7 6 7-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 10V8a5 5 0 0110 0v2" />
      <rect x="5" y="10" width="14" height="10" rx="2" strokeWidth={1.8} />
    </svg>
  );
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
        <Label htmlFor="login-email" className="op-auth-label">
          <span>Email address</span>
          <TextInput
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            icon={MailIcon}
            sizing="lg"
          />
        </Label>
        <Label htmlFor="login-password" className="op-auth-label">
          <span>Password</span>
          <div className="op-auth-password">
            <TextInput
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              icon={LockIcon}
              sizing="lg"
            />
            <PasswordToggle shown={showPassword} onClick={() => setShowPassword((value) => !value)} />
          </div>
        </Label>
        <div className="op-auth-form-row">
          <span className="op-auth-check">
            <Checkbox id="remember-me" defaultChecked />
            <Label htmlFor="remember-me">Remember me</Label>
          </span>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <Button type="submit" className="op-auth-submit" disabled={submitting} pill>
          {submitting ? 'Signing in…' : 'Sign in →'}
        </Button>
      </form>

      <div className="op-auth-divider">or continue with</div>
      <a className="op-auth-google" href={googleHref}><span>G</span> Continue with Google</a>
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
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}

export default LoginPage;
