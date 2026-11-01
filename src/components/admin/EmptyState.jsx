import PropTypes from 'prop-types';
import { Inbox } from 'lucide-react';

/**
 * The one empty state. Pages used two different paddings and sometimes a
 * Flowbite Alert, which read as an error rather than as "nothing here yet".
 *
 * `kind` separates the two meanings on purpose: "empty" is a healthy list with
 * no rows, "error" is a failed request. They must never look the same, because
 * a broken fetch that renders as an empty list reads as "you have no data".
 */
function EmptyState({ kind = 'empty', icon: Icon = Inbox, title, description, action }) {
  const isError = kind === 'error';
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
      <span
        className={`grid h-11 w-11 place-items-center rounded-full ${
          isError ? 'bg-[#FEF3F2] text-[#B42318] dark:bg-[#B42318]/20' : 'bg-surface text-muted'
        }`}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <strong className="text-sm font-semibold text-navy">{title}</strong>
      {description && <p className="max-w-sm text-xs leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

EmptyState.propTypes = {
  kind: PropTypes.oneOf(['empty', 'error']),
  icon: PropTypes.elementType,
  title: PropTypes.string.isRequired,
  description: PropTypes.node,
  action: PropTypes.node,
};

export default EmptyState;
