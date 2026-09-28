import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

function SavedStaysHeader({ activeTab, title, subtitle, actionLabel = '', actionTo = '', onAction, showTabs = true }) {
  const action = actionLabel ? (
    actionTo ? (
      <Link className="opg-saved-action" to={actionTo}>{actionLabel}</Link>
    ) : (
      <button type="button" className="opg-saved-action" onClick={onAction}>{actionLabel}</button>
    )
  ) : null;

  return (
    <>
      <header className="opg-saved-header">
        <div className="opg-saved-heading">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {action}
      </header>
      {showTabs && <nav className="opg-saved-tabs" aria-label="Saved stays views">
        <Link className={activeTab === 'saved' ? 'is-active' : ''} to="/favourites">All saved</Link>
        <Link className={activeTab === 'lists' ? 'is-active' : ''} to="/shortlists">My lists</Link>
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
