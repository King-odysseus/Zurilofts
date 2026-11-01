import PropTypes from 'prop-types';

/**
 * The single page header for the admin workspace.
 *
 * Every page used to print its own eyebrow, h1 and subtitle, so the shell's
 * sticky header named the section and then the page named it again. This keeps
 * one shape: optional eyebrow, one h1, one description, one action slot.
 */
function AdminPageHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <header className={`flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between ${className}`.trim()}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

AdminPageHeader.propTypes = {
  eyebrow: PropTypes.string,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  actions: PropTypes.node,
  className: PropTypes.string,
};

export default AdminPageHeader;
