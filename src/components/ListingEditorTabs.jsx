import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';

/**
 * The one header for the host listing editor.
 *
 * "Your space" and "Arrival guide" are two halves of the same listing, so they
 * render this header and switch between each other with one segmented control.
 * Keeping both halves in a single component is what stops the tab order, the
 * wording and the back target drifting apart as one side is edited.
 */
export default function ListingEditorTabs({ listingId, active }) {
  const sections = [
    { key: 'space', label: 'Your space', to: `/host/properties/${listingId}/edit` },
    { key: 'arrival', label: 'Arrival guide', to: `/host/properties/${listingId}/arrival-guide` },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Three fixed columns rather than space-between, so the title stays
          optically centred whatever the icon widths are. */}
      <div className="grid grid-cols-[44px_1fr_44px] items-center">
        <Link
          to="/host/listings"
          aria-label="Back to your listings"
          className="grid h-11 w-11 place-items-center rounded-full text-navy transition-colors hover:bg-surface"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 truncate text-center text-base font-semibold text-navy sm:text-lg">Listing editor</h1>
        <Link
          to="/host/settings"
          aria-label="Listing settings"
          className="ml-auto grid h-11 w-11 place-items-center rounded-full text-navy transition-colors hover:bg-surface"
        >
          <Settings className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </Link>
      </div>

      {/* The chosen section is a raised white pill on the grey track; the other
          stays flat text so only one half ever looks selected. */}
      <div
        role="tablist"
        aria-label="Listing editor sections"
        className="grid grid-cols-2 gap-1 rounded-full bg-inset p-1"
      >
        {sections.map((section) => {
          const current = section.key === active;
          return (
            <Link
              key={section.key}
              to={section.to}
              role="tab"
              aria-selected={current}
              aria-current={current ? 'page' : undefined}
              className={`flex min-h-[44px] items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors ${
                current
                  ? 'border border-border bg-elevated text-navy shadow-sm'
                  : 'text-muted hover:text-navy'
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

ListingEditorTabs.propTypes = {
  listingId: PropTypes.string.isRequired,
  active: PropTypes.oneOf(['space', 'arrival']).isRequired,
};
