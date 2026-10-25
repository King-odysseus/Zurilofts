import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

const TAB_BASE = 'whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-semibold transition-colors';
const TAB_ACTIVE = 'border-primary text-navy';
const TAB_IDLE = 'border-transparent text-muted hover:text-navy';

function tabClass(isActive) {
  return `${TAB_BASE} ${isActive ? TAB_ACTIVE : TAB_IDLE}`;
}

/**
 * Shared Inbox / Support tabs for the two message surfaces. Keeps the
 * existing /inbox and /messages URLs and deep links unchanged - this is
 * purely a navigation affordance between them, per design2.md G5.
 */
function MessagesTabBar({ active }) {
  return (
    <div className="mb-6 flex items-center gap-5 border-b border-border" role="tablist" aria-label="Messages">
      <Link
        to="/inbox"
        role="tab"
        aria-selected={active === 'inbox'}
        className={tabClass(active === 'inbox')}
      >
        Inbox
      </Link>
      <Link
        to="/messages"
        role="tab"
        aria-selected={active === 'support'}
        className={tabClass(active === 'support')}
      >
        Support
      </Link>
    </div>
  );
}

MessagesTabBar.propTypes = {
  active: PropTypes.oneOf(['inbox', 'support']).isRequired,
};

export default MessagesTabBar;
