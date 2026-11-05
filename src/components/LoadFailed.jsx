import PropTypes from 'prop-types';

/**
 * "We could not load this" told apart from "there is nothing here".
 *
 * A rejected request used to be rendered as an empty list on several screens,
 * so a host read a zero balance as "you have earned nothing" and a guest read a
 * failed review fetch as "no reviews". The message says the load failed, and the
 * retry runs the screens' own fetch again rather than only clearing the line.
 */
export default function LoadFailed({ message, onRetry, align = 'start', className = '' }) {
  const centered = align === 'center';

  return (
    <div className={`flex flex-col gap-3 ${centered ? 'items-center text-center' : 'items-start'} ${className}`.trim()}>
      <p role="alert" className="max-w-md text-sm leading-relaxed text-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="bg-[#143A80] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0B2A5E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#143A80]/40"
        >
          Try again
        </button>
      )}
    </div>
  );
}

LoadFailed.propTypes = {
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func,
  align: PropTypes.oneOf(['start', 'center']),
  className: PropTypes.string,
};
