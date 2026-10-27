import { useLocation, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext.jsx';
import { useMode } from '../context/ModeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

// Travelling and hosting are two destinations in one product, not two settings.
// The stored preference used to be changed only from the account dropdown and
// the mode could also flip on its own when a link landed on /host/*, so people
// arrived somewhere new with no notice. This control is the deliberate door:
// it always shows which side of the product you are on and switching costs one
// visible click. Both headers render it, so the choice cannot hide behind a
// menu that the host workspace does not have.
function ModeSwitch({ className = '' }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { mode, setMode, canSelectHosting } = useMode();
  const { t } = useLanguage();

  if (!canSelectHosting) return null;

  // A plain USER with no application yet starts a host application instead of
  // landing on an empty workspace.
  const hasHostIntent = user?.role === 'HOST' || user?.hostApplicationStatus != null;

  // On the host routes the host navigation is shown whatever the stored
  // preference says, so the control has to read the route as well as the
  // preference - otherwise it would claim "Travelling" while Today/Listings are
  // on screen.
  const current = pathname.startsWith('/host') ? 'hosting' : mode;

  function go(next) {
    if (next === current) return;
    setMode(next);
    navigate(next === 'hosting' ? (hasHostIntent ? '/host/today' : '/host/application') : '/');
  }

  const segment = (value, label) => {
    const active = current === value;
    return (
      <button
        type="button"
        onClick={() => go(value)}
        aria-pressed={active}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C] focus-visible:ring-offset-2 ${
          active
            ? 'bg-[#C49A6C] text-white shadow-[0_1px_4px_rgba(11,31,66,0.16)]'
            : 'text-[#5B6B82] hover:text-[#0B1F42]'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label={t('nav.modeSwitch')}
      className={`inline-flex items-center gap-0.5 rounded-full border border-[#E3E8EF] bg-surface p-0.5 ${className}`}
    >
      {segment('travelling', t('nav.modeTravelling'))}
      {segment('hosting', t('nav.modeHosting'))}
    </div>
  );
}

ModeSwitch.propTypes = { className: PropTypes.string };

export default ModeSwitch;
