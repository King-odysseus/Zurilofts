import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../api/client.js';

/**
 * One list-fetching hook for every admin table.
 *
 * Every admin page had its own copy of loading / error / refetch, and several
 * of them swallowed failures (`.catch(() => null)`), so a failed request
 * rendered as an empty list. This keeps exactly one behaviour: data, the
 * server's own pagination block, a real error string, and a refetch.
 *
 * `params` must be stable or memoised by the caller - it is a dependency of the
 * fetch, so an inline object literal would refetch on every render.
 */
export default function usePagedResource(url, params, { limit = 20, initialPage = 1, enabled = true } = {}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: initialPage, limit, total: 0, totalPages: 0 });
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [extra, setExtra] = useState({});
  const [reloadKey, setReloadKey] = useState(0);
  // Track the latest request so a slow response for page 1 cannot overwrite
  // page 2 after the admin has already moved on.
  const requestRef = useRef(0);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    let cancelled = false;
    setLoading(true);

    apiClient
      .get(url, { params: { ...params, page, limit } })
      .then((res) => {
        if (cancelled || requestRef.current !== requestId) return;
        setData(Array.isArray(res.data?.data) ? res.data.data : []);
        const serverPagination = res.data?.pagination;
        setPagination(serverPagination || {
          page,
          limit,
          total: Array.isArray(res.data?.data) ? res.data.data.length : 0,
          totalPages: 1,
        });
        // Extra top-level blocks (summary, totals) some endpoints return. Built
        // by copying and deleting rather than by destructuring ignored names,
        // which would leave three bindings that are never read.
        const rest = { ...(res.data || {}) };
        delete rest.data;
        delete rest.pagination;
        delete rest.success;
        setExtra(rest);
        setError('');
      })
      .catch((err) => {
        if (cancelled || requestRef.current !== requestId) return;
        // Never silent: an empty table and a failed fetch must not look alike.
        setData([]);
        setPagination({ page, limit, total: 0, totalPages: 0 });
        setError(err.response?.data?.error || 'Could not load this list. Check your connection and try again.');
      })
      .finally(() => {
        if (cancelled || requestRef.current !== requestId) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
    // params is intentionally spread into the dependency list via JSON so a
    // memoised object and an inline literal behave the same way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, page, limit, reloadKey, enabled, JSON.stringify(params)]);

  return {
    data,
    pagination,
    extra,
    page,
    setPage,
    loading,
    error,
    refetch,
  };
}
