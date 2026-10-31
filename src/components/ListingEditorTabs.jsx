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

  // Capped rather than stretched. The editor header belongs to the listing, not
  // to the width of whatever screen renders it, so on a wide page the title, the
  // gear and the two-part switch stay a compact block on the left.
  return (
    <div className="flex w-full max-w-md flex-col gap-5">
      {/* The title sits left, right beside the back button, and takes the space
          between the two round controls, so a long listing name truncates
          instead of pushing the gear off the row. */}
      <div className="flex items-center gap-3">
        <Link
          to="/host/listings"
          aria-label="Back to your listings"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-inset text-navy transition-colors hover:bg-surface"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold tracking-tight text-navy">Listing editor</h1>
        <Link
          to="/host/settings"
          aria-label="Listing settings"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-inset text-navy transition-colors hover:bg-surface"
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
                  ? 'bg-elevated text-navy shadow-sm'
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
