import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import Dropdown from '../components/Dropdown.jsx';
import logoImg from '../assets/zurilofts-logo.png';
import { zuriImages } from '../assets/images';
import { googleOAuthUrl } from '../utils/authUrls.js';
import { languageOptions } from '../i18n/translations.js';

// Use the same background treatment as the login page for consistency
const bgImage = zuriImages[14];

function getDashboardPath(user) {
  if (user?.role === 'ADMIN') return '/admin';
  // Existing host users and users with an application continue into the host
  // workspace when they revisit this route after authentication.
  if (user?.role === 'HOST' || user?.hostApplicationStatus != null) return '/host/today';
  return '/';
}

function RegisterPage() {
  const googleHref = googleOAuthUrl();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { user, register, isAuthenticated, isLoading, error, clearError } = useAuth();
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

    if (!agreedToTerms) {
      setLocalError('Please agree to the Terms & Privacy Policy to continue');
      setSubmitting(false);
      return;
    }

    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      role: 'USER',
    });

    if (!result.success) {
      setLocalError(result.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* Story panel - photo + pitch, desktop only. Fixed in place; only the form panel scrolls. */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden bg-[#0B0B45] px-10 py-10 lg:flex lg:h-full lg:w-[70%] lg:px-14 lg:py-12">
        <img src={bgImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[#0B0B45]/80" />

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label="ZuriLofts home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5">
              <img src={logoImg} alt="" className="h-full w-full object-contain" />
            </span>
            <span className="text-lg font-bold text-white">ZuriLofts</span>
          </Link>
        </div>

        <div className="relative z-10 mt-6">
          <h1 className="font-montserrat text-5xl font-bold leading-tight text-white lg:text-6xl">
            {t('register.headline')}
          </h1>
          <p className="mt-5 max-w-md font-roboto text-lg leading-relaxed text-white/70">
            {t('register.subheadline')}
          </p>

          <ul className="mt-9 space-y-4">
            {[t('register.benefit1'), t('register.benefit2'), t('register.benefit3')].map((point) => (
              <li key={point} className="flex items-start gap-3 font-roboto text-lg text-white/90">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="h-16" />
      </div>

      {/* Form panel - scrolls independently of the fixed story panel */}
      <div className="flex flex-1 flex-col lg:h-full lg:overflow-y-auto">
        <header className="flex h-16 flex-shrink-0 items-center justify-between px-4 md:px-8">
          <Link to="/" className="inline-flex items-center gap-2 lg:hidden" aria-label="ZuriLofts home">
            <img src={logoImg} alt="ZuriLofts" className="h-9 w-auto" />
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <a href="mailto:enquires@zurilofts.com" className="text-sm text-[#6b7280] hover:text-[#C49A6C] transition-colors">
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

        <div className="flex flex-1 items-start justify-center px-4 py-8 md:px-8">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-[#0B0B45]">{t('register.title')}</h1>
            <p className="mt-2 text-sm text-[#6b7280]">{t('register.subtitle')}</p>

            {(localError || error) && (
              <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {localError || error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="register-firstName" className="mb-2 block text-sm font-medium text-[#1f2937]">
                    {t('register.firstName')}
                  </label>
                  <input
                    id="register-firstName"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Jane"
                    className="w-full rounded-xl border-0 bg-[#F7F7F5] py-3 px-4 text-base text-[#1f2937] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="register-lastName" className="mb-2 block text-sm font-medium text-[#1f2937]">
                    {t('register.lastName')}
                  </label>
                  <input
                    id="register-lastName"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Muthoni"
                    className="w-full rounded-xl border-0 bg-[#F7F7F5] py-3 px-4 text-base text-[#1f2937] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-email" className="mb-2 block text-sm font-medium text-[#1f2937]">
                  {t('register.email')}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#6b7280]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    id="register-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border-0 bg-[#F7F7F5] py-3 pl-12 pr-4 text-base text-[#1f2937] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-password" className="mb-2 block text-sm font-medium text-[#1f2937]">
                  {t('register.password')}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#6b7280]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={t('register.passwordHint')}
                    className="w-full rounded-xl border-0 bg-[#F7F7F5] py-3 pl-12 pr-12 text-base text-[#1f2937] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]"
                    required
                  />
                  <PasswordToggle
                    shown={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-confirmPassword" className="mb-2 block text-sm font-medium text-[#1f2937]">
                  {t('register.confirmPassword')}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#6b7280]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="register-confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder={t('register.confirmPasswordHint')}
                    className="w-full rounded-xl border-0 bg-[#F7F7F5] py-3 pl-12 pr-12 text-base text-[#1f2937] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]"
                    required
                  />
                  <PasswordToggle
                    shown={showConfirm}
                    onClick={() => setShowConfirm((v) => !v)}
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <span className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="peer sr-only"
                    required
                  />
                  <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border border-[#D9D9D9] bg-white peer-checked:bg-[#0B0B45] peer-checked:border-[#0B0B45] peer-focus-visible:ring-2 peer-focus-visible:ring-[#C49A6C] transition-colors">
                    <svg className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: agreedToTerms ? 1 : 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </span>
                <span className="flex flex-wrap gap-x-1 text-sm text-[#6b7280]">
                  {t('register.agreeTermsPrefix')}{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-[#0B0B45] hover:text-[#C49A6C] transition-colors">
                    {t('register.terms')}
                  </a>{' '}
                  {t('register.and')}{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-[#0B0B45] hover:text-[#C49A6C] transition-colors">
                    {t('register.privacyPolicy')}
                  </a>
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#C49A6C] py-3 font-semibold text-white transition-all duration-200 hover:bg-[#B8895C] disabled:opacity-50"
              >
                {submitting ? t('register.creatingAccount') : (
                  <>
                    {t('register.createAccount')}
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="h-px flex-1 bg-[#E5E7EB]"></div>
              <span className="px-4 text-sm text-[#6b7280]">{t('register.orSignUpWith')}</span>
              <div className="h-px flex-1 bg-[#E5E7EB]"></div>
            </div>

            {/* Google OAuth - follows Google's sign-in button branding guidelines:
                white background, #747775 border, #1F1F1F text, official 4-colour "G". */}
            <a
              href={googleHref}
              className="flex min-h-[44px] w-full items-center justify-center gap-3 rounded-xl border border-[#747775] bg-white py-3 text-sm font-medium text-[#1F1F1F] transition-colors duration-150 hover:bg-[#F8F9FA] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1a73e8]"
            >
              <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.94 23.94 0 000 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              {t('register.continueWithGoogle')}
            </a>

            <Link
              to="/properties"
              className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-full py-3 text-sm font-semibold text-[#6b7280] transition-all duration-200 hover:text-[#C49A6C]"
            >
              {t('register.continueBrowsing')}
            </Link>

            <p className="mt-6 text-center text-sm text-[#6b7280]">
              {t('register.alreadyHaveAccount')}{' '}
              <Link to="/login" className="font-semibold text-[#0B0B45] transition-colors hover:text-[#C49A6C]">
                {t('register.signIn')}
              </Link>
            </p>

          </div>
        </div>
      </div>
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
      className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#6b7280] hover:text-[#C49A6C] transition-colors"
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
