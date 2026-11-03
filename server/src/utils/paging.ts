/**
 * Paging and filter normalisation shared by the admin list endpoints.
 *
 * Every one of them had grown its own version: some clamped, some did not, one
 * had no paging at all and loaded the whole table. These helpers exist so an
 * unbounded query cannot come back one endpoint at a time, and so the rules can
 * be tested without a database.
 */

export const DEFAULT_PAGE_SIZE = 20;
// Hard ceiling. A client that asks for 100000 rows gets 100, not a memory spike.
export const MAX_PAGE_SIZE = 100;

export interface PagingInput {
  page?: number | string | null;
  limit?: number | string | null;
}

export interface Paging {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Coerce and clamp a page/limit pair.
 *
 * A non-numeric or absent value falls back to the default rather than producing
 * NaN, because `skip: NaN` reaches Prisma as a bad offset instead of an error
 * anyone can read. Values below 1 clamp to 1 for the same reason.
 */
export function parsePaging(
  input: PagingInput = {},
  options: { defaultLimit?: number; maxLimit?: number } = {}
): Paging {
  const defaultLimit = options.defaultLimit ?? DEFAULT_PAGE_SIZE;
  const maxLimit = Math.min(options.maxLimit ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE);

  const page = positiveInt(input.page, 1);
  const limit = Math.min(positiveInt(input.limit, defaultLimit), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

function positiveInt(value: number | string | null | undefined, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * The envelope every list response returns. `totalPages` is never 0, so a client
 * showing "page 1 of 1" on an empty result does not have to special-case it.
 */
export function paginationMeta(total: number, paging: { page: number; limit: number }): PaginationMeta {
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.trunc(total) : 0;
  const totalPages = Math.max(1, Math.ceil(safeTotal / paging.limit));
  return {
    page: paging.page,
    limit: paging.limit,
    total: safeTotal,
    totalPages,
    hasMore: paging.page < totalPages,
  };
}

/** A free-text filter value, or undefined when the caller sent nothing useful. */
export function parseSearch(value: unknown, maxLength = 120): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

/**
 * A date window for a Date column. Returns undefined when neither bound is
 * usable, so callers can spread the result into a `where` without a conditional.
 */
export function parseDateRange(
  from?: unknown,
  to?: unknown
): { gte?: Date; lte?: Date } | undefined {
  const gte = toDate(from);
  const lte = toDate(to);
  if (!gte && !lte) return undefined;
  return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * A boolean query flag. Returns undefined for "not asked", which is different
 * from false: `?unreadOnly=false` should still filter to read items only.
 */
export function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

/** A value that must be one of a fixed set, or undefined. */
export function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}
