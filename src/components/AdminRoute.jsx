import { Link, Navigate, useLocation } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { rememberPostAuthPath } from '../utils/authIntent.js';

/**
 * Guards every /admin route.
 *
 * Both fallback screens used a hard-coded white background, so they flashed
 * bright white inside an otherwise dark shell. They now use the same design
 * tokens as the rest of the app, and denied access offers a way back into the
 * product instead of dead-ending a signed-in user.
 */
function AdminRoute({ children }) {
  const { t } = useLanguage();
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="text-center" role="status" aria-label={t('chrome.checkingAccess')}>
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary" />
          <p className="text-sm text-muted">{t('chrome.loadingEllipsis')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // An admin deep link (a case, a filtered queue) is worth keeping: signing in
    // should land on the screen that was asked for, not on a dashboard.
    const destination = `${location.pathname}${location.search}${location.hash}`;
    rememberPostAuthPath(destination);
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(destination)}`} replace />;
  }

  // Admin control centre is ADMIN-only. Hosts have their own workspace under
  // /host/* and must never reach /admin/*.
  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FEF3F2] text-[#B42318] dark:bg-[#B42318]/20">
            <TriangleAlert className="h-8 w-8" strokeWidth={2} aria-hidden="true" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-navy">{t('chrome.accessDenied')}</h2>
          <p className="mb-5 text-sm text-muted">
            {t('chrome.noAdminPermission')}
          </p>
          <Link
            to="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t('chrome.backToZuriLofts')}
          </Link>
        </div>
      </div>
    );
  }

  return children;
}

export default AdminRoute;
