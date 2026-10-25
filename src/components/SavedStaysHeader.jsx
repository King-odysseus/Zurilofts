import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Button } from 'flowbite-react';

const TAB_BASE = 'rounded-full px-4 py-1.5 text-sm font-medium text-muted hover:text-navy';

function SavedStaysHeader({ activeTab, title, subtitle, actionLabel = '', actionTo = '', onAction, showTabs = true }) {
  // The action is a bronze pill either way: a route link when actionTo is given,
  // otherwise an in-page handler (e.g. "Create shortlist" opens the form).
  const action = actionLabel ? (
    actionTo ? (
      <Button as={Link} to={actionTo} size="sm">{actionLabel}</Button>
    ) : (
      <Button size="sm" onClick={onAction}>{actionLabel}</Button>
    )
  ) : null;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>
        </div>
        {action}
      </header>
      {showTabs && <nav className="mt-5 inline-flex flex-wrap gap-1 rounded-full border border-border bg-white p-1" aria-label="Saved stays views">
        <Link className={`${TAB_BASE}${activeTab === 'saved' ? ' bg-navy-bg text-white hover:text-white' : ''}`} to="/favourites">All saved</Link>
        <Link className={`${TAB_BASE}${activeTab === 'lists' ? ' bg-navy-bg text-white hover:text-white' : ''}`} to="/shortlists">My lists</Link>
      </nav>}
    </>
  );
}

SavedStaysHeader.propTypes = {
  activeTab: PropTypes.oneOf(['saved', 'lists']).isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  actionLabel: PropTypes.string,
  actionTo: PropTypes.string,
  onAction: PropTypes.func,
  showTabs: PropTypes.bool,
};

export default SavedStaysHeader;
