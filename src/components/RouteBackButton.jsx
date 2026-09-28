import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';

// Fallbacks cover direct visits where there is no in-app history entry.
const fallbackRules = [
  [/^\/verify-identity$/, '/profile'],
  [/^\/payment\/callback$/, '/trips'],
  [/^\/property\/[^/]+$/, '/properties'],
  [/^\/guides\/[^/]+$/, '/guides'],
  [/^\/shortlists\/[^/]+$/, '/shortlists'],
  [/^\/inbox\/[^/]+$/, '/inbox'],
  [/^\/messages$/, '/inbox'],
  [/^\/booking-history$/, '/trips'],
  [/^\/bookings$/, '/trips'],
  [/^\/host\/calendar\/[^/]+$/, '/host/calendar'],
  [/^\/host\/properties\/[^/]+$/, '/host/listings'],
  [/^\/host\/properties\/new$/, '/host/listings'],
  [/^\/admin\/.+$/, '/admin'],
];

function RouteBackButton({ className = '', label = 'Back' }) {
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
      className={`inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-full bg-[#F7F4EF] px-2.5 text-sm font-semibold text-[#0B1F42] transition-colors hover:bg-[#F3E9DC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C] focus-visible:ring-offset-2 ${className}`}
      aria-label="Go back to the previous page"
      title="Go back"
    >
      <svg className="h-5 w-5 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

RouteBackButton.propTypes = {
  className: PropTypes.string,
  label: PropTypes.string,
};

export default RouteBackButton;
