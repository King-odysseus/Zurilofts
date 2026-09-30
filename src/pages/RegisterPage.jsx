import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import { googleOAuthUrl } from '../utils/authUrls.js';
import { rememberNavMode, rememberPostAuthMode } from '../utils/authIntent.js';
import AuthShell from '../components/AuthShell.jsx';
import GoogleIcon from '../components/GoogleIcon.jsx';

function getDashboardPath(user) {
  if (user?.role === 'ADMIN') return '/admin';
  if (user?.role === 'HOST') return '/host/today';
  return '/';
}

function RegisterPage() {
  const [searchParams] = useSearchParams();
  const urlRole = (searchParams.get('role') || '').toUpperCase();
  const isHost = urlRole === 'HOST';
  const googleHref = googleOAuthUrl();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const { user, register, isAuthenticated, isLoading, error, clearError, setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !isLoading && user) {
      navigate(isHost && user.role === 'USER' ? '/host/application' : getDashboardPath(user), { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate, isHost]);

  useEffect(() => () => clearError(), [clearError]);

  function handleChange(event) {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setLocalError('');

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      setSubmitting(false);
      return;
    }

    if (formData.password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      setSubmitting(false);
      return;
    }

    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      role: isHost ? 'HOST' : 'USER',
    });

    if (!result.success) {
      setLocalError(result.message);
      setSubmitting(false);
      return;
    }

    rememberNavMode(isHost ? 'hosting' : 'travelling');

    if (avatarFile) {
      try {
        const form = new FormData();
        form.append('avatar', avatarFile);
        const avatarResponse = await apiClient.post('/users/avatar', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setUser(avatarResponse.data.data);
      } catch {
        // Account creation is complete even when the optional avatar upload fails.
      }
    }

    setSubmitting(false);
  }

  return (
    <AuthShell>
      <h2>{isHost ? 'Create your host account' : 'Create your account'}</h2>
      <p>{isHost ? 'List verified, furnished homes with ZuriLofts.' : 'Book verified furnished apartments across Nairobi. It’s free to join.'}</p>
      {(localError || error) && <div className="op-auth-error" role="alert">{localError || error}</div>}

      <div className="op-auth-mode" aria-label="Account type">
        <Link to="/register" className={!isHost ? 'active' : ''}>Travelling</Link>
        <Link to="/register?role=HOST" className={isHost ? 'active' : ''}>Hosting</Link>
      </div>

      <form onSubmit={handleSubmit} className="op-auth-register-form">
        <div className="op-auth-name-grid">
          <label className="op-auth-label">
            <span>First name</span>
            <span className="op-auth-control">
              <input id="register-first-name" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Grace" required autoComplete="given-name" />
            </span>
          </label>
          <label className="op-auth-label">
            <span>Last name</span>
            <span className="op-auth-control">
              <input id="register-last-name" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Wanjiru" required autoComplete="family-name" />
            </span>
          </label>
        </div>

        <label className="op-auth-label">
          <span>Email address</span>
          <span className="op-auth-control">
            <Mail className="op-auth-control-icon" strokeWidth={1.8} aria-hidden="true" />
            <input className="has-icon" id="register-email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required autoComplete="email" />
          </span>
        </label>

        <label className="op-auth-label">
          <span>Password</span>
          <span className="op-auth-control op-auth-password">
            <LockKeyhole className="op-auth-control-icon" strokeWidth={1.8} aria-hidden="true" />
            <input className="has-icon has-toggle" id="register-password" type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="8+ characters" required autoComplete="new-password" />
            <PasswordToggle shown={showPassword} onClick={() => setShowPassword((value) => !value)} />
          </span>
          <small className="op-auth-hint">Use at least 8 characters with a number and an uppercase letter.</small>
        </label>

        <label className="op-auth-label">
          <span>Confirm password</span>
          <span className="op-auth-control op-auth-password">
            <LockKeyhole className="op-auth-control-icon" strokeWidth={1.8} aria-hidden="true" />
            <input className="has-icon has-toggle" id="register-confirm-password" type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter your password" required autoComplete="new-password" />
            <PasswordToggle shown={showConfirm} onClick={() => setShowConfirm((value) => !value)} />
          </span>
        </label>

        <label className="op-auth-label op-auth-file-label">
          <span>Profile photo <small>(optional)</small></span>
          <div className="op-auth-file-row">
            {avatarPreview ? <img src={avatarPreview} alt="Selected profile" className="op-auth-avatar-preview" /> : <span className="op-auth-avatar-placeholder" aria-hidden="true">{formData.firstName?.[0] || 'Z'}</span>}
            <input id="register-avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setAvatarFile(file);
              setAvatarPreview(URL.createObjectURL(file));
            }} />
          </div>
        </label>

        <div className="op-auth-check op-auth-terms">
          <input type="checkbox" id="register-terms" required />
          <label htmlFor="register-terms">I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.</label>
        </div>

        <button type="submit" className="op-auth-submit" disabled={submitting}>
          {submitting ? 'Creating account…' : <>{isHost ? 'Create host account' : 'Create account'} <ChevronRight className="w-4 h-4" aria-hidden="true" /></>}
        </button>
      </form>

      <div className="op-auth-divider">or sign up with</div>
      <a className="op-auth-google" href={googleHref} onClick={() => rememberPostAuthMode(isHost ? 'hosting' : 'travelling')}><GoogleIcon className="h-[18px] w-[18px]" /> Sign up with Google</a>
      <div className="op-auth-switch">Already have an account? <Link to="/login">Sign in</Link></div>
    </AuthShell>
  );
}

function PasswordToggle({ shown, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={shown ? 'Hide password' : 'Show password'} className="op-auth-password-toggle">
      {shown ? (
        <EyeOff className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      ) : (
        <Eye className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  );
}

export default RegisterPage;
