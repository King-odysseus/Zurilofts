import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Page controls plus an honest result count.
 *
 * Lists used to either show no controls at all (so only the first page of
 * accounts was ever reachable) or paginate a client-side slice of a capped
 * fetch. The count is stated as a range over a total so nobody mistakes a page
 * for the whole table again.
 */
function AdminPagination({ page, limit, total, totalPages, onChange, noun = 'result' }) {
  if (!totalPages || totalPages <= 1) {
    return (
      <p className="text-xs text-muted">
        {total} {noun}{total === 1 ? '' : 's'}
      </p>
    );
  }

  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted">
        Showing {first}-{last} of {total} {noun}{total === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-9 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold text-navy transition-colors enabled:hover:bg-surface disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Previous
        </button>
        <span className="text-xs font-medium text-muted" aria-live="polite">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-9 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold text-navy transition-colors enabled:hover:bg-surface disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

AdminPagination.propTypes = {
  page: PropTypes.number.isRequired,
  limit: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  noun: PropTypes.string,
};

export default AdminPagination;
