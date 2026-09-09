import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * Shared Inbox / Support tabs for the two message surfaces. Keeps the
 * existing /inbox and /messages URLs and deep links unchanged - this is
 * purely a navigation affordance between them, per design2.md G5.
 */
function MessagesTabBar({ active }) {
  return (
    <div className="mb-6 flex items-center gap-5 border-b border-[#E5E7EB]" role="tablist" aria-label="Messages">
      <Link
        to="/inbox"
        role="tab"
        aria-selected={active === 'inbox'}
        className={`border-b-2 px-1 pb-3 text-sm font-semibold transition-colors ${
          active === 'inbox' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#6b7280] hover:text-[#222222]'
        }`}
      >
        Inbox
      </Link>
      <Link
        to="/messages"
        role="tab"
        aria-selected={active === 'support'}
        className={`border-b-2 px-1 pb-3 text-sm font-semibold transition-colors ${
          active === 'support' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#6b7280] hover:text-[#222222]'
        }`}
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
