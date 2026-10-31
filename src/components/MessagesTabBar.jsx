import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

// Shared tab styling. On a phone the two tabs split the width evenly (flex-1 with
// min-w-0), so neither the row nor the labels can ever force a horizontal scroll;
// from sm upwards they shrink back to compact text tabs.
// The active state is navy text plus a 2px bronze underline: bronze is only the
// accent marker, never a fill behind the label.
function tabClassName(isActive) {
  return `-mb-px flex min-h-[44px] min-w-0 flex-1 items-center justify-center border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:flex-none sm:justify-start ${
    isActive ? 'border-primary text-navy' : 'border-transparent text-muted hover:text-navy'
  }`;
}

/**
 * Shared Inbox / Support tabs for the two message surfaces. Keeps the
 * existing /inbox and /messages URLs and deep links unchanged - this is
 * purely a navigation affordance between them, per design2.md G5.
 */
function MessagesTabBar({ active }) {
  return (
    <div
      className="mb-6 flex w-full items-stretch border-b border-border sm:w-auto sm:items-center sm:gap-5"
      role="tablist"
      aria-label="Messages"
    >
      <Link
        to="/inbox"
        role="tab"
        aria-selected={active === 'inbox'}
        className={tabClassName(active === 'inbox')}
      >
        <span className="truncate">Inbox</span>
      </Link>
      <Link
        to="/messages"
        role="tab"
        aria-selected={active === 'support'}
        className={tabClassName(active === 'support')}
      >
        <span className="truncate">Support</span>
      </Link>
    </div>
  );
}

MessagesTabBar.propTypes = {
  active: PropTypes.oneOf(['inbox', 'support']).isRequired,
};

export default MessagesTabBar;
