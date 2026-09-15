import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import Dropdown from '../components/Dropdown.jsx';
import logoImg from '../assets/zurilofts-logo.png';
import { zuriImages } from '../assets/images';
import { googleOAuthUrl } from '../utils/authUrls.js';
import { languageOptions } from '../i18n/translations.js';

// Use a consistent background image with a dark overlay
const bgImage = zuriImages[14]; // Ely Homes Photography (15 of 20)

function getDashboardPath(user) {
  if (user?.role === 'ADMIN') return '/admin';
  // A plain USER who has hosting intent (any HostApplication, any status)
  // lands in their dashboard too, not the application form - see HostRoute.
  if (user?.role === 'HOST' || user?.hostApplicationStatus != null) return '/host/today';
  return '/';
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { user, login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleHref = googleOAuthUrl();

  useEffect(() => {
    if (isAuthenticated && !isLoading && user) {
      const returnTo = searchParams.get('returnUrl')
        || getDashboardPath(user);
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate, searchParams]);

  useEffect(() => {
    if (searchParams.get('error')) {
      setLocalError('Google sign-in failed. Please try again.');
    }
  }, [searchParams]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setLocalError('');
    const result = await login(email, password, rememberMe);
    if (!result.success) {
      setLocalError(result.message);
    }
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-white">
      {/* Story panel - photo + pitch, desktop only */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden bg-[#0B0B45] px-10 py-10 lg:flex lg:w-[42%] lg:px-14 lg:py-12">
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

        <div className="relative z-10 mt-10">
          <h1 className="text-3xl font-bold leading-tight text-white lg:text-4xl">
            {t('login.headline')}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            {t('login.subheadline')}
          </p>

          <ul className="mt-8 space-y-3">
            {[t('login.point1'), t('login.point2'), t('login.point3')].map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-white/90">
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

        <div />
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 flex-shrink-0 items-center justify-between px-4 md:px-8">
          <Link to="/" className="inline-flex items-center gap-2 lg:hidden" aria-label="ZuriLofts home">
            <img src={logoImg} alt="ZuriLofts" className="h-9 w-auto" />
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <a href="mailto:enquires@zurilofts.com" className="text-sm text-[#6b7280] hover:text-[#2563EB] transition-colors">
              {t('login.needHelp')}
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

        <div className="flex flex-1 items-center justify-center px-4 py-8 md:px-8">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-[#0B0B45]">{t('login.welcomeBack')}</h1>
            <p className="mt-2 text-sm text-[#6b7280]">{t('login.subtitle')}</p>

            {/* Error */}
            {(localError || error) && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {localError || error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-[#1f2937]">
                  {t('login.email')}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#6b7280]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border-0 bg-[#F3F4F6] py-3 pl-12 pr-4 text-base text-[#1f2937] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-[#1f2937]">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#6b7280]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border-0 bg-[#F3F4F6] py-3 pl-12 pr-12 text-base text-[#1f2937] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]"
                    required
                  />
                  <PasswordToggle
                    shown={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-[#1f2937] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[#D9D9D9] text-[#0B0B45] focus:ring-[#C49A6C]"
                  />
                  {t('login.rememberMe')}
                </label>
                <a href="mailto:enquires@zurilofts.com" className="text-sm font-medium text-[#0B0B45] hover:text-[#C49A6C] transition-colors">
                  {t('login.forgotPassword')}
                </a>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#C49A6C] py-3 font-semibold text-[#0B0B45] transition-all duration-200 hover:bg-[#B8895C] disabled:opacity-50"
              >
                {submitting ? t('login.signingIn') : (
                  <>
                    {t('login.signIn')}
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
              <span className="px-4 text-sm text-[#6b7280]">{t('login.orContinueWith')}</span>
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
              {t('login.continueWithGoogle')}
            </a>

            <Link
              to="/properties"
              className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-full py-3 text-sm font-semibold text-[#6b7280] transition-all duration-200 hover:text-[#2563EB]"
            >
              {t('login.continueBrowsing')}
            </Link>

            <p className="mt-6 text-center text-sm text-[#6b7280]">
              {t('login.newToZuriLofts')}{' '}
              <Link to="/register" className="font-semibold text-[#0B0B45] transition-colors hover:text-[#C49A6C]">
                {t('login.createAccount')}
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

export default LoginPage;
