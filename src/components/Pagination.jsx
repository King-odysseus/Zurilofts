import PropTypes from 'prop-types';

function pageList(page, totalPages) {
  const pages = [];
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, page + 2);
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('...');
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }
  return pages;
}

/**
 * Paged-list footer: a "x-y of z" summary plus prev/next + numbered pills.
 * Renders nothing when there is only one page and no total was provided.
 */
function Pagination({ page, totalPages, onPageChange, total, limit, itemLabel }) {
  if (total == null && totalPages <= 1) return null;

  const from = total != null ? (page - 1) * limit + 1 : null;
  const to = total != null ? Math.min(page * limit, total) : null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3">
      {total != null ? (
        <p className="text-sm text-[#6b7280]">
          Showing {total === 0 ? 0 : from}-{to} of {total}
          {itemLabel ? ` ${itemLabel}` : ''}
        </p>
      ) : (
        <span />
      )}
      {totalPages > 1 && (
        <nav className="flex items-center gap-1.5" aria-label="Pagination">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="w-9 h-9 inline-flex items-center justify-center rounded-full text-[#0B0B45] bg-white shadow-sm hover:shadow-md disabled:opacity-40 disabled:hover:shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {pageList(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`e-${i}`} className="w-6 text-center text-[#6b7280] text-sm">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`min-w-[2.25rem] h-9 px-2 inline-flex items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  p === page
                    ? 'bg-[#C49A6C] text-white shadow-md'
                    : 'bg-white text-[#0B0B45] shadow-sm hover:shadow-md'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className="w-9 h-9 inline-flex items-center justify-center rounded-full text-[#0B0B45] bg-white shadow-sm hover:shadow-md disabled:opacity-40 disabled:hover:shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      )}
    </div>
  );
}

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  total: PropTypes.number,
  limit: PropTypes.number,
  itemLabel: PropTypes.string,
};

export default Pagination;
