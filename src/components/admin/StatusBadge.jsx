import PropTypes from 'prop-types';

/**
 * Status pill for booking, listing, payout and account states.
 *
 * The tones are semantic rather than per-page: a cancelled booking and a
 * suspended account must not be green on one screen and red on the next.
 */
const TONES = {
  neutral: 'bg-surface text-charcoal border-border',
  info: 'bg-[#EFF4FF] text-[#143A80] border-[#C7D7F5] dark:bg-[#143A80]/20 dark:text-[#C7D7F5] dark:border-[#143A80]/40',
  success: 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5] dark:bg-[#027A48]/20 dark:text-[#A6F4C5] dark:border-[#027A48]/40',
  warning: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89] dark:bg-[#B54708]/20 dark:text-[#FEDF89] dark:border-[#B54708]/40',
  danger: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA] dark:bg-[#B42318]/20 dark:text-[#FECDCA] dark:border-[#B42318]/40',
};

function StatusBadge({ children, tone = 'neutral', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${TONES[tone] || TONES.neutral} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

StatusBadge.propTypes = {
  children: PropTypes.node.isRequired,
  tone: PropTypes.oneOf(['neutral', 'info', 'success', 'warning', 'danger']),
  className: PropTypes.string,
};

/** Map the states the API actually returns onto a tone, in one place. */
const STATE_TONES = {
  // Bookings
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'danger',
  CONFLICT: 'danger',
  // Listings
  DRAFT: 'neutral',
  PENDING_REVIEW: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
  // Refunds and payouts
  REFUND_PENDING: 'warning',
  REFUNDED: 'info',
  REFUND_DECLINED: 'neutral',
  SUCCESS: 'success',
  PROCESSING: 'info',
  FAILED: 'danger',
  REVERSED: 'neutral',
  // Applications and verification
  SUBMITTED: 'warning',
  // Held by Trust and Safety. Red rather than amber: it is the one application
  // state an admin needs to spot in a table of ordinary pending work.
  UNDER_INVESTIGATION: 'danger',
  CHANGES_REQUESTED: 'warning',
  APPROVED: 'success',
  UNVERIFIED: 'neutral',
  // Disputes
  OPEN: 'warning',
  UNDER_REVIEW: 'info',
  RESOLVED: 'success',
  DISMISSED: 'neutral',
};

// Exported beside the components on purpose: every table page needs the same
// state-to-tone mapping, and a second copy of it is how two screens start
// disagreeing about what a cancelled booking looks like. The fast-refresh rule
// wants component-only modules; this three-line mapping is the deliberate
// exception, because moving it out would separate the tone table from the badge
// that renders it.
// eslint-disable-next-line react-refresh/only-export-components
export function stateTone(state) {
  return STATE_TONES[state] || 'neutral';
}

/** Badge that renders a raw API state with a readable label and the right tone. */
export function StateBadge({ state, label }) {
  const text = label || String(state || '').replace(/_/g, ' ').toLowerCase();
  const pretty = text.charAt(0).toUpperCase() + text.slice(1);
  return <StatusBadge tone={stateTone(state)}>{pretty}</StatusBadge>;
}

StateBadge.propTypes = {
  state: PropTypes.string,
  label: PropTypes.string,
};

export default StatusBadge;
