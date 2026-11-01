import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

// Fallbacks cover direct visits where there is no in-app history entry.
const fallbackRules = [
  [/^\/verify-identity$/, '/profile'],
  [/^\/payment\/callback$/, '/trips'],
  [/^\/stay\/[^/]+$/, '/stays'],
  [/^\/guides\/[^/]+$/, '/guides'],
  [/^\/shortlists\/[^/]+$/, '/shortlists'],
  [/^\/inbox\/[^/]+$/, '/inbox'],
  [/^\/messages$/, '/inbox'],
  [/^\/booking-history$/, '/trips'],
  [/^\/bookings$/, '/trips'],
  [/^\/host\/calendar\/[^/]+$/, '/host/calendar'],
  [/^\/host\/properties\/[^/]+$/, '/host/listings'],
  [/^\/host\/properties\/new$/, '/host/listings'],
  [/^\/admin\/messages\/[^/]+$/, '/admin/messages'],
  [/^\/admin\/.+$/, '/admin'],
];

function RouteBackButton({ className = '', label = 'Back' }) {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === '/' || location.pathname.startsWith('/auth/')) return null;

  function handleBack() {
    const historyIndex = window.history.state?.idx;
    if (Number.isInteger(historyIndex) && historyIndex > 0) {
      navigate(-1);
      return;
    }

    const fallback = fallbackRules.find(([pattern]) => pattern.test(location.pathname));
    navigate(fallback?.[1] || '/');
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-full bg-surface px-2.5 text-sm font-semibold text-[#203565] transition-colors hover:bg-[#F4F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A28C] focus-visible:ring-offset-2 ${className}`}
      aria-label={t('a11y1.goBackToPreviousPage')}
      title={t('a11y1.goBack')}
    >
      <ChevronLeft className="h-5 w-5 flex-none" strokeWidth={1.8} aria-hidden="true" />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

RouteBackButton.propTypes = {
  className: PropTypes.string,
  label: PropTypes.string,
};

export default RouteBackButton;
