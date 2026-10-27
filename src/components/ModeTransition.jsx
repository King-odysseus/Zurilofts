import PropTypes from 'prop-types';
import { ArrowLeftRight, BriefcaseBusiness, Compass } from 'lucide-react';

// A short, non-blocking overlay that names the side being entered. It exists
// because travelling and hosting share one navigation bar: without a moment
// like this, the header would simply be different once it had already changed.
// pointer-events-none keeps every control usable while it plays, and the CSS
// animation handles the exit so nothing here needs to know about timing.
function ModeTransition({ transition = null }) {
  if (!transition) return null;

  const hosting = transition.to === 'hosting';
  const Icon = hosting ? BriefcaseBusiness : Compass;

  return (
    <div
      // Keying on the switch id restarts the animation when sides change twice
      // in quick succession, which a plain mount would swallow.
      key={transition.id}
      className="mode-transition"
      role="status"
      aria-live="polite"
    >
      <div className="mode-transition-panel">
        <span className="mode-transition-icon" aria-hidden="true">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="mode-transition-text">
          <span className="mode-transition-label">
            {hosting ? 'Hosting' : 'Travelling'}
          </span>
          <span className="mode-transition-hint">
            <ArrowLeftRight className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
            {hosting ? 'Switched to your host workspace' : 'Switched to browsing stays'}
          </span>
        </span>
      </div>
    </div>
  );
}

ModeTransition.propTypes = {
  // { to: 'hosting' | 'travelling', id: number } while a switch is playing.
  transition: PropTypes.shape({
    to: PropTypes.oneOf(['hosting', 'travelling']).isRequired,
    id: PropTypes.number.isRequired,
  }),
};

export default ModeTransition;
