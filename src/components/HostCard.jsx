import { Card } from 'flowbite-react';
import PropTypes from 'prop-types';

/**
 * The one surface every host screen is built from.
 *
 * Host pages used to each declare their own `CARD` string, so the same panel
 * came out as rounded-xl on one page, rounded-2xl on another, with three
 * different paddings. This wraps Flowbite's Card - so hover, focus, dark mode
 * and the theme in theme/flowbiteTheme.js all apply - and adds the head every
 * host panel has: an optional small eyebrow, a title, a line of description,
 * and an action parked on the right.
 *
 * `flush` drops the body padding for panels whose content runs edge to edge
 * (the month grid, an inbox list); the head keeps its own padding so it still
 * lines up with the padded panels beside it.
 */
// Grey, not bronze: the label is a wayfinding mark on every panel, so bronze
// here would turn the whole workspace bronze one small label at a time.
export const HOST_EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-muted';

export default function HostCard({
  eyebrow,
  title,
  description,
  action,
  children,
  className = '',
  flush = false,
  id,
}) {
  const hasHead = Boolean(eyebrow || title || action);

  return <Card
    id={id}
    className={`${flush ? '[&>div]:gap-0 [&>div]:p-0' : ''} ${className}`.trim()}
  >
    {hasHead && <div className={`flex flex-wrap items-start justify-between gap-x-3 gap-y-2 ${flush ? 'border-b border-border px-4 py-3' : ''}`}>
      <div className="min-w-0 flex-1">
        {eyebrow && <p className={HOST_EYEBROW}>{eyebrow}</p>}
        {title && <h2 className="truncate text-base font-semibold text-navy">{title}</h2>}
        {description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>}
    {children}
  </Card>;
}

HostCard.propTypes = {
  eyebrow: PropTypes.string,
  title: PropTypes.node,
  description: PropTypes.node,
  action: PropTypes.node,
  children: PropTypes.node,
  className: PropTypes.string,
  flush: PropTypes.bool,
  id: PropTypes.string,
};
