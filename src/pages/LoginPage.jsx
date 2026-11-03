import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { googleOAuthUrl } from '../utils/authUrls.js';
import AuthShell from '../components/AuthShell.jsx';
import GoogleIcon from '../components/GoogleIcon.jsx';
import { consumePostAuthPath, safeInternalPath } from '../utils/authIntent.js';

function getDashboardPath(user) {
  if (user?.role === 'ADMIN') return '/admin';
  if (user?.role === 'HOST') return '/host/today';
  return '/';
}

function LoginPage() {
  const { t } = useLanguage();
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
      // The guarded destination, then the one remembered for this tab, then the
      // account's own home. Only a site-internal path is ever followed.
      const returnTo =
        safeInternalPath(searchParams.get('returnUrl')) ||
        consumePostAuthPath() ||
        getDashboardPath(user);
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate, searchParams]);

  useEffect(() => {
    if (searchParams.get('error')) {
      setLocalError(t('auth.googleSignInFailed'));
    }
  }, [searchParams, t]);

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
      <h2>{t('auth.welcomeBack')}</h2>
      <p>{t('auth.signInSubtitle')}</p>
      {(localError || error) && <div className="op-auth-error" role="alert">{localError || error}</div>}

      <form onSubmit={handleSubmit}>
        <label className="op-auth-label">
          <span>{t('auth.emailLabel')}</span>
          <span className="op-auth-control">
            <Mail className="op-auth-control-icon" strokeWidth={1.8} aria-hidden="true" />
            <input
              className="has-icon"
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
              autoComplete="email"
            />
          </span>
        </label>

        <label className="op-auth-label">
          <span>{t('auth.passwordLabel')}</span>
          <span className="op-auth-control op-auth-password">
            <LockKeyhole className="op-auth-control-icon" strokeWidth={1.8} aria-hidden="true" />
            <input
              className="has-icon has-toggle"
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              required
              autoComplete="current-password"
            />
            <PasswordToggle shown={showPassword} onClick={() => setShowPassword((value) => !value)} />
          </span>
        </label>

        <div className="op-auth-form-row">
          <span className="op-auth-check">
            <input type="checkbox" id="remember-me" defaultChecked />
            <label htmlFor="remember-me">{t('auth.rememberMe')}</label>
          </span>
          {/* A real, single-use link flow. It replaces a mailto that asked a
              person to describe their own reset to support. */}
          <Link to="/forgot-password">{t('auth.forgotPassword')}</Link>
        </div>

        <button type="submit" className="op-auth-submit" disabled={submitting}>
          {submitting ? t('auth.signingIn') : <>{t('auth.signIn')} <ChevronRight className="w-4 h-4" aria-hidden="true" /></>}
        </button>
      </form>

      <div className="op-auth-divider">{t('auth.orContinueWith')}</div>
      <a className="op-auth-google" href={googleHref}><GoogleIcon className="h-[18px] w-[18px]" /> {t('auth.continueWithGoogle')}</a>
      {/* Keep the hosting intent: a host who came from the hosting entry point
          must land on the same sign-up form in hosting mode. */}
      <div className="op-auth-switch">{t('auth.newToZuriLofts')} <Link to={searchParams.get('role')?.toUpperCase() === 'HOST' ? '/register?role=HOST' : '/register'}>{t('auth.createAccount')}</Link></div>
    </AuthShell>
  );
}

function PasswordToggle({ shown, onClick }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? t('auth.hidePassword') : t('auth.showPassword')}
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
