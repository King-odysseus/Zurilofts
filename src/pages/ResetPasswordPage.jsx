import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, LockKeyhole } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import apiClient from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

/**
 * Complete a password reset.
 *
 * The token arrives in the address, which is what makes the link work from an
 * email client. It is single use and short lived, so the page does not try to
 * remember it anywhere: it is read once and sent straight back with the new
 * password.
 *
 * On success there is no session. Signing in with the new password is the proof
 * the change worked, and it avoids handing a fresh token to a page that was
 * opened from a link someone else could have forwarded.
 */
export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  function validate() {
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return t('recovery.passwordHint');
    }
    // bcrypt reads 72 bytes at most, so a longer passphrase would be silently
    // shortened and two different passwords could open the same account.
    if (new TextEncoder().encode(password).length > 72) return t('recovery.tooLong');
    if (password !== confirm) return t('recovery.mismatch');
    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await apiClient.post('/auth/password-reset/complete', {
        token,
        newPassword: password,
        confirmPassword: confirm,
      });
      setDone(true);
    } catch (cause) {
      // Bad, expired, used and stale all answer the same way, so this page must
      // not invent a distinction the server refuses to make.
      setError(cause.response?.data?.message || cause.response?.data?.error || t('recovery.invalidBody'));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthShell>
        <h2>{t('recovery.completeTitle')}</h2>
        <p>{t('recovery.completeBody')}</p>
        <Link to="/login" className="op-auth-submit">
          {t('recovery.goToSignIn')} <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </AuthShell>
    );
  }

  if (!token) {
    return (
      <AuthShell>
        <h2>{t('recovery.invalidTitle')}</h2>
        <p>{t('recovery.missingToken')}</p>
        <Link to="/forgot-password" className="op-auth-submit">
          {t('recovery.requestNewLink')} <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h2>{t('recovery.resetTitle')}</h2>
      <p>{t('recovery.resetIntro')}</p>
      {error && <div className="op-auth-error" role="alert">{error}</div>}

      <form onSubmit={handleSubmit}>
        <label className="op-auth-label">
          <span>{t('recovery.newPassword')}</span>
          <span className="op-auth-control op-auth-password">
            <LockKeyhole className="op-auth-control-icon" strokeWidth={1.8} aria-hidden="true" />
            <input
              className="has-icon has-toggle"
              id="reset-password"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('recovery.newPassword')}
              required
              autoComplete="new-password"
              autoFocus
              aria-describedby="reset-password-hint"
            />
            <button
              type="button"
              onClick={() => setShow((value) => !value)}
              aria-label={show ? t('recovery.hidePassword') : t('recovery.showPassword')}
              className="op-auth-toggle"
            >
              {show ? t('recovery.hidePassword') : t('recovery.showPassword')}
            </button>
          </span>
        </label>
        <p id="reset-password-hint" className="op-auth-hint">{t('recovery.passwordHint')}</p>

        <label className="op-auth-label">
          <span>{t('recovery.confirmPassword')}</span>
          <span className="op-auth-control">
            <LockKeyhole className="op-auth-control-icon" strokeWidth={1.8} aria-hidden="true" />
            <input
              className="has-icon"
              id="reset-confirm"
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder={t('recovery.confirmPassword')}
              required
              autoComplete="new-password"
            />
          </span>
        </label>

        <button type="submit" className="op-auth-submit" disabled={submitting}>
          {submitting ? t('recovery.savingPassword') : <>{t('recovery.savePassword')} <ChevronRight className="w-4 h-4" aria-hidden="true" /></>}
        </button>
      </form>

      <div className="op-auth-switch">
        <Link to="/forgot-password">{t('recovery.requestNewLink')}</Link>
        <span aria-hidden="true"> · </span>
        <Link to="/help">{t('recovery.openHelp')}</Link>
      </div>
    </AuthShell>
  );
}
