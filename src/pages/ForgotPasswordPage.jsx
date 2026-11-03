import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Mail } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import apiClient from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

/**
 * Ask for a password reset link.
 *
 * The page always shows the same confirmation, whether or not an account
 * exists for the address. That is not politeness: a screen that says "no such
 * account" is a free way to discover who is registered here, and the server
 * answers identically for the same reason. The two must not disagree, or the
 * care taken on one side is undone by the other.
 */
export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiClient.post('/auth/password-reset/request', { email: email.trim() });
      setSent(true);
    } catch (cause) {
      const status = cause.response?.status;
      const message = cause.response?.data?.message || cause.response?.data?.error;
      // A rate limit is worth naming; anything else is a transport problem, and
      // guessing at a reason would be worse than saying it could not be sent.
      setError(status === 429 ? t('recovery.tooMany') : message || t('recovery.requestFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthShell>
        <h2>{t('recovery.requestSentTitle')}</h2>
        <p>{t('recovery.requestSentBody')}</p>
        <p className="op-auth-hint">{t('recovery.requestSentHint')}</p>
        <button type="button" className="op-auth-submit" onClick={() => { setSent(false); setEmail(''); }}>
          {t('recovery.tryAnother')}
        </button>
        <div className="op-auth-switch">
          <Link to="/login">{t('recovery.backToSignIn')}</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/help">{t('recovery.openHelp')}</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h2>{t('recovery.forgotTitle')}</h2>
      <p>{t('recovery.forgotIntro')}</p>
      {error && <div className="op-auth-error" role="alert">{error}</div>}

      <form onSubmit={handleSubmit}>
        <label className="op-auth-label">
          <span>{t('recovery.emailLabel')}</span>
          <span className="op-auth-control">
            <Mail className="op-auth-control-icon" strokeWidth={1.8} aria-hidden="true" />
            <input
              className="has-icon"
              id="forgot-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('recovery.emailPlaceholder')}
              required
              autoComplete="email"
              autoFocus
            />
          </span>
        </label>

        <button type="submit" className="op-auth-submit" disabled={submitting}>
          {submitting ? t('recovery.sending') : <>{t('recovery.sendLink')} <ChevronRight className="w-4 h-4" aria-hidden="true" /></>}
        </button>
      </form>

      <div className="op-auth-switch">
        <Link to="/login">{t('recovery.backToSignIn')}</Link>
        <span aria-hidden="true"> · </span>
        <Link to="/help">{t('recovery.openHelp')}</Link>
      </div>
    </AuthShell>
  );
}
