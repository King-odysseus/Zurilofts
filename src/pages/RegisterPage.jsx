import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import Dropdown from '../components/Dropdown.jsx';
import apiClient from '../api/client.js';
import logoImg from '../assets/zurilofts-logo.png';
import { zuriImages } from '../assets/images';
import { googleOAuthUrl } from '../utils/authUrls.js';
import { rememberNavMode, rememberPostAuthMode } from '../utils/authIntent.js';
import { languageOptions } from '../i18n/translations.js';

// Use the same background treatment as the login page for consistency
const bgImage = zuriImages[14];

function getDashboardPath(user) {
  if (user?.role === 'ADMIN') return '/admin';
  // A plain USER who registered with hosting intent (registerUser creates a
  // DRAFT HostApplication atomically) lands in their dashboard immediately -
  // see HostRoute. They can prepare draft listings while verification,
  // reachable from Settings -> Verification, is still pending.
  if (user?.role === 'HOST' || user?.hostApplicationStatus != null) return '/host/today';
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
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !isLoading && user) {
      navigate(getDashboardPath(user), { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
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

    // Upload avatar if one was selected
    if (avatarFile) {
      try {
        const form = new FormData();
        form.append('avatar', avatarFile);
        const avatarRes = await apiClient.post('/users/avatar', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        // Update auth context with the avatar URL
        setUser(avatarRes.data.data);
      } catch (err) {
        console.error('Failed to upload avatar:', err);
      }
    }

    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Compact white header - no full-screen dark photo behind the form */}
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[#E5E7EB] px-4 md:px-6">
        <Link to="/" className="inline-flex items-center gap-2" aria-label="ZuriLofts home">
          <img src={logoImg} alt="ZuriLofts" className="h-9 w-auto" />
        </Link>
        <div className="flex items-center gap-4">
          <a href="mailto:enquires@zurilofts.com" className="text-sm text-[#6b7280] hover:text-[#2563EB] transition-colors">
            {t('register.needHelp')}
          </a>
          <Dropdown
            value={lang}
            onChange={setLang}
            options={languageOptions}
            ariaLabel={t('nav.language')}
            triggerClassName="rounded-full border border-[#D9D9D9] px-3 py-1.5 text-sm text-[#1f2937] hover:border-[#C49A6C] transition-colors"
            menuClassName="right-0"
          />
        </div>
      </header>

      <div className="grid flex-1 lg:grid-cols-2">
        {/* Photo panel - desktop only, reduced/omitted on mobile per spec */}
        <div className="relative hidden lg:block">
          <img src={bgImage} alt="" className="h-full w-full object-cover" />
        </div>

        {/* Light form panel */}
        <div className="flex items-start justify-center px-4 py-12 md:px-8">
        <div className="max-w-md w-full">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#222222]">
              {isHost ? 'Become a Host' : t('register.title')}
            </h1>
            <p className="text-[#6b7280] mt-2">
              {isHost
                ? 'List your property and start earning with ZuriLofts'
                : t('register.subtitle')}
            </p>
          </div>

          <AuthModeToggle activeMode={isHost ? 'host' : 'guest'} basePath="/register" />

          {(localError || error) && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
              {localError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="register-firstName" className="block text-sm font-medium text-[#222222] mb-2">First Name</label>
                <input
                  id="register-firstName"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  className="auth-input w-full px-4 py-3 focus:outline-none bg-white text-[#222222] placeholder-[#6b7280]"
                  required
                />
              </div>
              <div>
                <label htmlFor="register-lastName" className="block text-sm font-medium text-[#222222] mb-2">Last Name</label>
                <input
                  id="register-lastName"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  className="auth-input w-full px-4 py-3 focus:outline-none bg-white text-[#222222] placeholder-[#6b7280]"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-[#222222] mb-2">Email</label>
              <input
                id="register-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="auth-input w-full px-4 py-3 focus:outline-none bg-white text-[#222222] placeholder-[#6b7280]"
                required
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-[#222222] mb-2">Password</label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  className="auth-input w-full px-4 py-3 pr-12 focus:outline-none bg-white text-[#222222] placeholder-[#6b7280]"
                  required
                />
                <PasswordToggle
                  shown={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="register-confirmPassword" className="block text-sm font-medium text-[#222222] mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  id="register-confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  className="auth-input w-full px-4 py-3 pr-12 focus:outline-none bg-white text-[#222222] placeholder-[#6b7280]"
                  required
                />
                <PasswordToggle
                  shown={showConfirm}
                  onClick={() => setShowConfirm((v) => !v)}
                />
              </div>
            </div>
            <div className="flex flex-col items-center pt-2">
              <p className="block text-sm font-medium text-[#222222] mb-3">Profile Picture (optional)</p>
              <label className="relative cursor-pointer group">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 bg-[#E5E7EB]/30 rounded-full flex items-center justify-center border-2 border-dashed border-[#E5E7EB]">
                    <svg className="w-8 h-8 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatarFile(file);
                      setAvatarPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] bg-[#C49A6C] text-white font-semibold py-3 rounded-lg hover:bg-[#B8895C] transition-all duration-200 disabled:opacity-50 mt-6"
            >
              {submitting
                ? 'Creating Account...'
                : isHost ? 'Create Host Account' : 'Create Account'}
            </button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-[#E5E7EB]"></div>
            <span className="px-4 text-sm text-[#6b7280]">or</span>
            <div className="flex-1 h-px bg-[#E5E7EB]"></div>
          </div>

          {/* Google OAuth - follows Google's sign-in button branding guidelines:
              white background, #747775 border, #1F1F1F text, official 4-colour "G". */}
          <a
            href={googleHref}
            onClick={() => rememberPostAuthMode(isHost ? 'hosting' : 'travelling')}
            className="flex items-center justify-center gap-3 w-full min-h-[44px] py-3 rounded-lg border border-[#747775] bg-white text-[#1F1F1F] text-sm font-medium hover:bg-[#F8F9FA] hover:shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1a73e8]"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.94 23.94 0 000 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </a>

          <Link
            to="/properties"
            className="flex items-center justify-center w-full min-h-[44px] py-3 mt-4 rounded-lg text-[#6b7280] font-semibold hover:text-[#2563EB] transition-all duration-200 text-sm"
          >
            Continue Browsing Properties
          </Link>

          <p className="text-center text-sm text-[#6b7280] mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
              Sign in
            </Link>
          </p>

        {/* Selling Points - Host Registration */}
        {isHost && (
          <div className="mt-6 ui-surface rounded-[14px] p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-[#222222] mb-4">Why Host with ZuriLofts</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="text-[#2563EB] font-bold flex-shrink-0">7.5%</span>
                <span className="text-[#222222]"><span className="font-semibold">Lowest platform fee in Kenya</span> - less than half of Booking.com (15%)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#2563EB] flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </span>
                <span className="text-[#222222]"><span className="font-semibold">Guests pay zero markup</span> - unlike Airbnb&apos;s 14% guest fee, your listed price IS the guest price</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#2563EB] flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </span>
                <span className="text-[#222222]"><span className="font-semibold">Tax handled for you</span> - WHT auto-deducted, remitted to KRA, and you get a downloadable statement anytime</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#2563EB] flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </span>
                <span className="text-[#222222]"><span className="font-semibold">Flexible payouts</span> - choose weekly, bi-weekly, or monthly transfers to your bank account</span>
              </li>
            </ul>

            {/* Airbnb comparison */}
            <div className="mt-5 bg-[#F7F7F5] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#222222] mb-2 uppercase tracking-wide">Cost Comparison - Guest Pays</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#6b7280] border-b border-[#E5E7EB]">
                    <th className="text-left py-1">Property at KES 8,000/night</th>
                    <th className="text-right py-1">Airbnb</th>
                    <th className="text-right py-1 text-[#2563EB]">ZuriLofts</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#E5E7EB]/50">
                    <td className="py-1">Nightly rate</td>
                    <td className="text-right">KES 8,000</td>
                    <td className="text-right text-[#2563EB] font-medium">KES 8,000</td>
                  </tr>
                  <tr className="border-b border-[#E5E7EB]/50">
                    <td className="py-1">Guest service fee</td>
                    <td className="text-right text-red-500">+KES 1,120 (14%)</td>
                    <td className="text-right text-[#2563EB] font-bold">KES 0</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Guest pays</td>
                    <td className="text-right font-semibold text-red-500">KES 9,120</td>
                    <td className="text-right font-bold text-[#2563EB]">KES 8,000</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-[#6b7280] mt-2 italic">
                Guests save 12% booking direct - your property attracts more bookings at the same listed price.
              </p>
            </div>
          </div>
        )}
        </div>
        </div>
      </div>
    </div>
  );
}

function AuthModeToggle({ activeMode, basePath }) {
  const modes = [
    { key: 'guest', label: 'Traveling', to: basePath },
    { key: 'host', label: 'Hosting', to: `${basePath}?role=HOST` },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 rounded-full bg-[#F7F7F5] p-1 mb-6">
      {modes.map((mode) => {
        const active = activeMode === mode.key;
        return (
          <Link
            key={mode.key}
            to={mode.to}
            aria-current={active ? 'true' : undefined}
            className={`text-center rounded-full px-4 py-2 min-h-[44px] flex items-center justify-center text-sm font-semibold transition-all ${
              active
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-[#6b7280] hover:text-[#2563EB] hover:bg-white/70'
            }`}
          >
            {mode.label}
          </Link>
        );
      })}
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
      className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#6b7280] hover:text-[#2563EB] transition-colors"
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

export default RegisterPage;
