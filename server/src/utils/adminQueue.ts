/**
 * Shared paging and counting for admin queues.
 *
 * Every admin list is paged on the server, and every one of them shows a total
 * per status. Doing that arithmetic in each service produced two quiet problems:
 * a badge that counted the rows on screen instead of the queue, and a page
 * number that could be steered by the query string.
 */

const DEFAULT_LIMIT = 20;
// A page is a screen of work, not an export. Anything larger is a client asking
// for the whole table, which this endpoint is not for.
const MAX_LIMIT = 100;

export interface QueuePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** A page number and page size that are safe to hand to Prisma. */
export function clampQueueWindow(page?: number, limit?: number): { page: number; limit: number; skip: number } {
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const requested = Math.floor(Number(limit) || DEFAULT_LIMIT);
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, requested));
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

/**
 * Fill a status -> count map, defaulting every known status to zero.
 *
 * A status with no rows has no group in the database result, and a missing key
 * would render as a blank badge rather than "0", which reads as a bug.
 */
export function countByStatus(
  statuses: readonly string[],
  groups: Array<{ status: string; _count: { _all: number } }>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const status of statuses) counts[status] = 0;
  for (const group of groups) counts[group.status] = group._count._all;
  return counts;
}

export function buildPagination(page: number, limit: number, total: number): QueuePagination {
  return {
    page,
    limit,
    total,
    // An empty queue reports zero pages rather than one empty page, so
    // "page 1 of 1" is never shown over nothing.
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
