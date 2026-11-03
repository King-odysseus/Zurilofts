import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Button } from 'flowbite-react';
import apiClient from '../../api/client.js';
import EmptyState from './EmptyState.jsx';
import Panel, { PanelHead } from './Panel.jsx';
import { StateBadge } from './StatusBadge.jsx';

/**
 * Listings that have no host account. They cannot be managed by anyone but an
 * admin, so this is where they get cleaned up. Listings with a paid booking are
 * shown but cannot be selected for deletion; suspending them is the safe option.
 */
function OrphanedListingsPanel({ onChanged }) {
  const [orphans, setOrphans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/admin/properties/orphans');
      setOrphans(response.data.data || []);
      setSelected(new Set());
    } catch (cause) {
      setError(cause.response?.data?.error || 'Orphaned listings could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggle(id) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function cleanup(mode) {
    const ids = [...selected];
    if (ids.length === 0) return;
    const verb = mode === 'delete' ? 'Permanently delete' : 'Suspend';
    if (!window.confirm(`${verb} ${ids.length} listing${ids.length === 1 ? '' : 's'}?${mode === 'delete' ? ' This cannot be undone.' : ''}`)) return;
    setBusy(true);
    setError('');
    setSummary('');
    try {
      const response = await apiClient.post('/admin/properties/orphans/cleanup', { ids, mode });
      const results = response.data.data || [];
      const done = results.filter((result) => result.outcome !== 'skipped').length;
      const skipped = results.filter((result) => result.outcome === 'skipped');
      setSummary(`${done} done, ${skipped.length} skipped${skipped.length ? `: ${skipped[0].reason}` : ''}.`);
      await load();
      onChanged?.();
    } catch (cause) {
      setError(cause.response?.data?.error || 'The cleanup could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  const deletableSelected = [...selected].every((id) => orphans.find((orphan) => orphan.id === id)?.canDelete);

  return (
    <Panel>
      <PanelHead title="Orphaned listings" subtitle="Listings with no host account" />
      {loading ? (
        <div className="px-5 py-10 text-center text-sm text-muted">Checking for orphaned listings...</div>
      ) : error && orphans.length === 0 ? (
        <EmptyState
          kind="error"
          title="Could not check"
          description={error}
          action={<Button color="light" type="button" onClick={load}>Retry</Button>}
        />
      ) : orphans.length === 0 ? (
        <EmptyState title="No orphaned listings" description="Every listing has a host account." />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {orphans.map((orphan) => (
              <li key={orphan.id} className="flex items-center gap-4 px-5 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(orphan.id)}
                  onChange={() => toggle(orphan.id)}
                  disabled={busy}
                  aria-label={`Select ${orphan.title}`}
                />
                <div className="min-w-0 flex-1">
                  <Link to={`/admin/listings/${orphan.id}`} className="block truncate text-sm font-semibold text-navy hover:underline">
                    {orphan.title}
                  </Link>
                  <small className="block text-xs text-muted">
                    {orphan.location || 'No location'} &middot; {orphan.paid} paid, {orphan.unpaid} unpaid bookings
                    {!orphan.canDelete && ' · cannot be deleted'}
                  </small>
                </div>
                <StateBadge state={orphan.status} />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4">
            <Button
              color="failure"
              type="button"
              disabled={busy || selected.size === 0 || !deletableSelected}
              onClick={() => cleanup('delete')}
            >
              Delete selected
            </Button>
            <Button color="light" type="button" disabled={busy || selected.size === 0} onClick={() => cleanup('suspend')}>
              Suspend selected
            </Button>
            {selected.size > 0 && !deletableSelected && (
              <span className="text-xs text-muted">A selected listing has paid bookings. Suspend it instead.</span>
            )}
            {error && <span role="alert" className="text-xs font-medium text-[#B42318]">{error}</span>}
            {summary && <span role="status" className="text-xs text-muted">{summary}</span>}
          </div>
        </>
      )}
    </Panel>
  );
}

OrphanedListingsPanel.propTypes = {
  onChanged: PropTypes.func,
};

export default OrphanedListingsPanel;
