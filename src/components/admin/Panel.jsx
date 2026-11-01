import PropTypes from 'prop-types';

/**
 * The card that wraps every admin list and form section.
 *
 * Pages used to retype `overflow-hidden rounded-xl border border-border
 * bg-elevated shadow-sm` plus their own head, which is why padding and
 * title size drifted between screens.
 */
export function Panel({ children, className = '', ...rest }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-elevated shadow-sm ${className}`.trim()} {...rest}>
      {children}
    </section>
  );
}

Panel.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

/** Panel head: title, optional subtitle, optional toolbar on the right. */
export function PanelHead({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

PanelHead.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  actions: PropTypes.node,
};

export function PanelBody({ children, className = '' }) {
  return <div className={`px-5 py-5 ${className}`.trim()}>{children}</div>;
}

PanelBody.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

/** Footer strip used for result counts and pagination. */
export function PanelFooter({ children, className = '' }) {
  return (
    <div className={`flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}>
      {children}
    </div>
  );
}

PanelFooter.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

export default Panel;
