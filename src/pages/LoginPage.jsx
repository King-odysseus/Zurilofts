import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Checkbox, Label, TextInput } from 'flowbite-react';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { googleOAuthUrl } from '../utils/authUrls.js';
import AuthShell from '../components/AuthShell.jsx';

function getDashboardPath(user) {
  if (user?.role === 'ADMIN') return '/admin';
  if (user?.role === 'HOST') return '/host/today';
  return '/';
}

function MailIcon() {
  return <Mail strokeWidth={1.8} aria-hidden="true" />;
}

function LockIcon() {
  return <LockKeyhole strokeWidth={1.8} aria-hidden="true" />;
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
        <EyeOff className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      ) : (
        <Eye className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  );
}

export default LoginPage;
