import PropTypes from 'prop-types';

/**
 * One metric tile. The same recipe was hand-written on four pages with four
 * different label casings and number sizes, so it lives here once.
 *
 * `tone` only changes the number's colour: default ink for a plain count,
 * warning for something needing attention, positive for a healthy figure.
 */
const VALUE_TONES = {
  default: 'text-navy',
  warning: 'text-[#B42318]',
  positive: 'text-[#027A48]',
};

function MetricCard({ label, value, note, tone = 'default', className = '' }) {
  return (
    <article className={`rounded-xl bg-elevated shadow-md p-5 ${className}`.trim()}>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <strong className={`mt-2 block text-2xl font-bold ${VALUE_TONES[tone] || VALUE_TONES.default}`}>{value}</strong>
      {note && <small className="mt-1 block text-xs text-muted">{note}</small>}
    </article>
  );
}

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  note: PropTypes.node,
  tone: PropTypes.oneOf(['default', 'warning', 'positive']),
  className: PropTypes.string,
};

export default MetricCard;
