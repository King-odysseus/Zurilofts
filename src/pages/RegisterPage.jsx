import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import { googleOAuthUrl } from '../utils/authUrls.js';
import { rememberNavMode, rememberPostAuthMode } from '../utils/authIntent.js';
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

// Travelling / Hosting is a mode switch, not a navigation: it reads as one
// segmented control so the two account types never look like separate links.
const MODES = [
  { to: '/register', label: 'Travelling', hosting: false },
  { to: '/register?role=HOST', label: 'Hosting', hosting: true },
];

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
      <div className="space-y-5">
        <AuthHeading
          title={isHost ? 'Create your host account' : 'Create your account'}
          subtitle={isHost
            ? 'List verified, furnished homes with ZuriLofts.'
            : 'Book verified furnished apartments across Nairobi. It is free to join.'}
        />
        <AuthError>{localError || error}</AuthError>

        <div className="flex rounded-full bg-inset p-1" role="tablist" aria-label="Account type">
          {MODES.map((mode) => {
            const active = mode.hosting === isHost;
            return (
              <Link
                key={mode.label}
                to={mode.to}
                role="tab"
                aria-selected={active}
                className={`flex-1 rounded-full px-4 py-2 text-center text-[13px] font-semibold transition-colors ${
                  active ? 'bg-elevated text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {mode.label}
              </Link>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <AuthField
              id="register-first-name"
              label="First name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Grace"
              required
              autoComplete="given-name"
            />
            <AuthField
              id="register-last-name"
              label="Last name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Wanjiru"
              required
              autoComplete="family-name"
            />
          </div>

          <AuthField
            id="register-email"
            label="Email address"
            icon={Mail}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <AuthPasswordField
            id="register-password"
            label="Password"
            hint="Use at least 8 characters with a number and an uppercase letter."
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="8+ characters"
            required
            autoComplete="new-password"
          />

          <AuthPasswordField
            id="register-confirm-password"
            label="Confirm password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter your password"
            required
            autoComplete="new-password"
          />

          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-ink">Profile photo <span className="font-normal text-muted">(optional)</span></span>
            <div className="flex items-center gap-3">
              {avatarPreview
                ? <img src={avatarPreview} alt="Selected profile" className="h-11 w-11 rounded-full border border-line object-cover" />
                : (
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-inset text-sm font-semibold text-muted" aria-hidden="true">
                    {formData.firstName?.[0] || 'Z'}
                  </span>
                )}
              <label
                htmlFor="register-avatar"
                className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-ink transition-colors hover:bg-inset"
              >
                Choose photo
              </label>
              <input
                id="register-avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setAvatarFile(file);
                  setAvatarPreview(URL.createObjectURL(file));
                }}
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-[13px] text-muted">
            <input
              type="checkbox"
              id="register-terms"
              required
              className="mt-0.5 h-4 w-4 rounded border-line text-primary accent-primary focus:ring-primary/30"
            />
            <label htmlFor="register-terms" className="leading-relaxed">
              I agree to the{' '}
              <Link to="/terms" className="font-medium text-ink underline underline-offset-4 hover:text-link">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="font-medium text-ink underline underline-offset-4 hover:text-link">Privacy Policy</Link>.
            </label>
          </div>

          <AuthSubmit
            submitting={submitting}
            busy="Creating account..."
            idle={<>{isHost ? 'Create host account' : 'Create account'} <ChevronRight className="h-4 w-4" aria-hidden="true" /></>}
          />
        </form>

        <AuthDivider label="or sign up with" />
        <AuthGoogleButton
          href={googleHref}
          label="Sign up with Google"
          onClick={() => rememberPostAuthMode(isHost ? 'hosting' : 'travelling')}
        />
        {/* Carry the chosen mode across: a host who clicks "Sign in" should land on
            the host sign-in, not silently drop back to the traveller flow. */}
        <AuthSwitchLine prompt="Already have an account?" to={isHost ? '/login?role=HOST' : '/login'} action="Sign in" />
      </div>
    </AuthShell>
  );
}

export default RegisterPage;
