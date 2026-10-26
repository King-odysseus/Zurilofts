import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from 'flowbite-react';
import { TrendingUp, Users, Wallet } from 'lucide-react';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';
import { formatPrice } from '../utils/currency.js';

// Shared admin surface recipes. PANEL_TITLE and friends are module-local in
// AdminDashboard/AdminGovernance, so the same Tailwind strings are repeated here
// rather than imported - a new page must not depend on another page's internals.
const METRIC_CARD = 'rounded-xl border border-border bg-elevated p-5 shadow-sm';
const METRIC_LABEL = 'text-[11px] font-semibold uppercase tracking-wide text-muted';
const METRIC_VALUE = 'mt-2 block text-2xl font-bold text-navy tabular-nums';
const METRIC_NOTE = 'mt-1 block text-xs text-muted';

const PANEL = 'overflow-hidden rounded-xl border border-border bg-elevated shadow-sm';
const PANEL_HEAD = 'flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between';
const PANEL_TITLE = 'text-base font-semibold text-navy';
const PANEL_SUBTITLE = 'text-xs text-muted';
const EMPTY_STATE = 'flex flex-col items-center gap-2 px-5 py-12 text-center';
const ICON_TILE = 'inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 dark:bg-primary/15 text-navy';
const COUNT_PILL = 'inline-flex shrink-0 items-center rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted';
const MONEY_CELL = 'whitespace-nowrap text-sm tabular-nums text-navy';

const EMPTY_TOTALS = {
  bookings: 0,
  grossPaid: 0,
  hostNet: 0,
  withholdingTax: 0,
  commission: 0,
  platformRevenue: 0,
};

/**
 * Whole-KES money label. formatPrice returns null when there is nothing numeric
 * to show, so a malformed row is labelled instead of rendering "null" or "KES NaN".
 */
function money(value) {
  return formatPrice(value) ?? 'Not available';
}

function bookingsLabel(count) {
  const total = Number(count) || 0;
  return `${total.toLocaleString('en-KE')} booking${total === 1 ? '' : 's'}`;
}

function hostsLabel(count) {
  const total = Number(count) || 0;
  return `${total.toLocaleString('en-KE')} host${total === 1 ? '' : 's'}`;
}

function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Turn a native date-input value into the boundary the API filters on.
 *
 * A bare "2026-01-31" parses as midnight, so an end bound sent that way would
 * silently drop every payment made later on the closing day. Widening the two
 * bounds to whole local days keeps the range inclusive at both ends.
 * Returns undefined for an empty or unparseable value so the param is omitted.
 */
function toIsoBoundary(value, endOfDay) {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** One headline figure. */
function MetricCard({ label, value, note }) {
  return (
    <article className={METRIC_CARD}>
      <span className={METRIC_LABEL}>{label}</span>
      <strong className={METRIC_VALUE}>{value}</strong>
      <small className={METRIC_NOTE}>{note}</small>
    </article>
  );
}

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  note: PropTypes.string.isRequired,
};

/**
 * Twelve columns of plain divs. No chart library: the shape is one column per
 * month, so a bar is a div whose height is a percentage of the peak month.
 * Two rows of six on a phone keeps every label legible without rotating text.
 */
function RevenueChart({ monthly = [] }) {
  const peak = monthly.reduce((highest, month) => Math.max(highest, Number(month.platformRevenue) || 0), 0);

  if (monthly.length === 0) {
    return <p className="text-sm text-muted">No monthly revenue is available for this range.</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-6 gap-x-2 gap-y-5 sm:grid-cols-12">
        {monthly.map((month, index) => {
          const amount = Number(month.platformRevenue) || 0;
          // A zero month draws nothing, so an empty month reads as empty instead
          // of as a short bar; a positive month keeps a 4% floor so it is visible.
          const height = peak > 0 && amount > 0 ? Math.max((amount / peak) * 100, 4) : 0;
          return (
            <div key={month.key || `${month.label}-${index}`} className="flex min-w-0 flex-col items-center gap-2">
              <div className="flex h-20 w-full items-end sm:h-36">
                <i className="block w-full rounded-t-md bg-primary" style={{ height: `${height}%` }} />
              </div>
              <span className="w-full truncate text-center text-[11px] font-semibold text-navy">{money(amount)}</span>
              <span className="w-full truncate text-center text-[11px] text-muted">{month.label}</span>
            </div>
          );
        })}
      </div>
      {peak === 0 && (
        <p className="mt-4 text-xs leading-relaxed text-muted">No platform revenue was recorded in these twelve months.</p>
      )}
    </div>
  );
}

RevenueChart.propTypes = {
  monthly: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    label: PropTypes.string,
    platformRevenue: PropTypes.number,
    grossPaid: PropTypes.number,
    hostNet: PropTypes.number,
    bookings: PropTypes.number,
  })),
};

function AdminRevenue() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // The applied range drives the request; the draft range only mirrors the inputs.
  const [range, setRange] = useState({ from: '', to: '' });
  const [draft, setDraft] = useState({ from: '', to: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/admin/revenue', {
        params: {
          from: toIsoBoundary(range.from, false),
          to: toIsoBoundary(range.to, true),
        },
      });
      setReport(response.data.data || null);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Revenue could not be loaded.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  function applyRange(event) {
    event.preventDefault();
    // Fail before the request: an inverted range would come back as an empty
    // report, which reads like "no revenue" rather than "wrong dates".
    if (draft.from && draft.to && draft.from > draft.to) {
      setError('The start date must be on or before the end date.');
      return;
    }
    setError('');
    setRange(draft);
  }

  function clearRange() {
    setDraft({ from: '', to: '' });
    setRange({ from: '', to: '' });
  }

  const totals = report?.totals ?? EMPTY_TOTALS;
  const held = report?.held ?? { amount: 0, bookings: 0 };
  const unsettled = report?.unsettled ?? { bookings: 0, grossPaid: 0 };
  const monthly = Array.isArray(report?.monthly) ? report.monthly : [];
  const byHost = Array.isArray(report?.byHost) ? report.byHost : [];
  const recent = Array.isArray(report?.recent) ? report.recent : [];
  const hasRange = Boolean(range.from || range.to);

  return (
    <div className="space-y-6" data-openpencil-frame="0:7343">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">ZURILOFTS / ADMIN / PLATFORM</p>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Revenue</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
            What ZuriLofts itself kept from paid stays, before Paystack and card fees are deducted. Host money the
            platform is still holding until release is reported separately.
          </p>
        </div>

        <form className="flex flex-wrap items-end gap-3" onSubmit={applyRange}>
          <div className="flex flex-col gap-1">
            <label htmlFor="revenue-from" className="text-[11px] font-semibold uppercase tracking-wide text-muted">FROM</label>
            <TextInput
              id="revenue-from"
              type="date"
              value={draft.from}
              max={draft.to || undefined}
              onChange={(event) => setDraft({ ...draft, from: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="revenue-to" className="text-[11px] font-semibold uppercase tracking-wide text-muted">TO</label>
            <TextInput
              id="revenue-to"
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              onChange={(event) => setDraft({ ...draft, to: event.target.value })}
            />
          </div>
          <Button type="submit" size="sm" disabled={loading}>Apply</Button>
          {hasRange && <Button type="button" size="sm" color="light" onClick={clearRange} disabled={loading}>Clear</Button>}
        </form>
      </div>

      {loading ? (
        <section className={PANEL}>
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Spinner size="lg" />
            <strong className="text-sm font-semibold text-navy">Loading revenue</strong>
            <p className="text-xs text-muted">Totalling paid bookings, host payouts and held host balances.</p>
          </div>
        </section>
      ) : !report ? (
        <section className={PANEL}>
          <div className={EMPTY_STATE}>
            <span className={ICON_TILE} aria-hidden="true"><Wallet strokeWidth={1.8} /></span>
            <strong className="text-base font-semibold text-navy">Revenue could not be loaded</strong>
            <p className="text-xs leading-relaxed text-muted">{error || 'The revenue report is unavailable right now.'}</p>
            <Button size="sm" color="light" className="mt-2" onClick={load}>Try again</Button>
          </div>
        </section>
      ) : (
        <>
          {error && <Alert color="failure" role="alert">{error}</Alert>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="PLATFORM REVENUE"
              value={money(totals.platformRevenue)}
              note={`Platform share of ${bookingsLabel(totals.bookings)}`}
            />
            <MetricCard
              label="GUEST PAYMENTS COLLECTED"
              value={money(totals.grossPaid)}
              note="Charged to guests, before gateway fees"
            />
            <MetricCard
              label="PAID TO HOSTS"
              value={money(totals.hostNet)}
              note={`Net of ${money(totals.withholdingTax)} withholding tax`}
            />
            <MetricCard
              label="HELD FOR HOSTS"
              value={money(held.amount)}
              note={`${bookingsLabel(held.bookings)} awaiting release, not date filtered`}
            />
          </div>

          {/* Paid stays from before the split was stored cannot be split, so they
              are called out instead of being counted as platform profit. */}
          {unsettled.bookings > 0 && (
            <Alert color="warning" role="status">
              {bookingsLabel(unsettled.bookings)} worth {money(unsettled.grossPaid)} {unsettled.bookings === 1 ? 'was' : 'were'} paid before the platform
              split was recorded, so {unsettled.bookings === 1 ? 'it is' : 'they are'} left out of these totals and
              listed under recent paid bookings.
            </Alert>
          )}

          <section className={PANEL}>
            <div className={PANEL_HEAD}>
              <div>
                <h2 className={PANEL_TITLE}>Platform revenue by month</h2>
                <p className={PANEL_SUBTITLE}>Last twelve months in range, oldest first.</p>
              </div>
            </div>
            <div className="px-5 py-6">
              <RevenueChart monthly={monthly} />
            </div>
          </section>

          <section className={PANEL}>
            <div className={PANEL_HEAD}>
              <div>
                <h2 className={PANEL_TITLE}>Revenue by host</h2>
                <p className={PANEL_SUBTITLE}>Sorted by what the platform earned, highest first.</p>
              </div>
              <span className={COUNT_PILL}>{hostsLabel(byHost.length)}</span>
            </div>

            {byHost.length === 0 ? (
              <div className={EMPTY_STATE}>
                <span className={ICON_TILE} aria-hidden="true"><Users strokeWidth={1.8} /></span>
                <strong className="text-base font-semibold text-navy">No host revenue yet</strong>
                <p className="text-xs leading-relaxed text-muted">A confirmed, paid stay is what puts a host on this table.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table hoverable aria-label="Revenue by host">
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>HOST</TableHeadCell>
                      <TableHeadCell>BOOKINGS</TableHeadCell>
                      <TableHeadCell>GROSS PAID</TableHeadCell>
                      <TableHeadCell>HOST NET</TableHeadCell>
                      <TableHeadCell>PLATFORM REVENUE</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {byHost.map((host) => (
                      <TableRow key={host.hostId}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <strong className="text-sm font-semibold text-navy">{host.name || 'Unknown host'}</strong>
                            <span className="text-xs text-muted">{host.email || 'Email not available'}</span>
                          </div>
                        </TableCell>
                        <TableCell><span className={MONEY_CELL}>{Number(host.bookings) || 0}</span></TableCell>
                        <TableCell><span className={MONEY_CELL}>{money(host.grossPaid)}</span></TableCell>
                        <TableCell><span className={MONEY_CELL}>{money(host.hostNet)}</span></TableCell>
                        <TableCell><strong className={`${MONEY_CELL} font-semibold`}>{money(host.platformRevenue)}</strong></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section className={PANEL}>
            <div className={PANEL_HEAD}>
              <div>
                <h2 className={PANEL_TITLE}>Recent paid bookings</h2>
                <p className={PANEL_SUBTITLE}>The 50 most recently paid stays, newest first.</p>
              </div>
              <span className={COUNT_PILL}>{bookingsLabel(recent.length)}</span>
            </div>

            {recent.length === 0 ? (
              <div className={EMPTY_STATE}>
                <span className={ICON_TILE} aria-hidden="true"><TrendingUp strokeWidth={1.8} /></span>
                <strong className="text-base font-semibold text-navy">No paid bookings in range</strong>
                <p className="text-xs leading-relaxed text-muted">Widen the dates or clear the filter to see earlier payments.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table hoverable aria-label="Recent paid bookings">
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>DATE</TableHeadCell>
                      <TableHeadCell>PROPERTY</TableHeadCell>
                      <TableHeadCell>HOST</TableHeadCell>
                      <TableHeadCell>GROSS PAID</TableHeadCell>
                      <TableHeadCell>HOST NET</TableHeadCell>
                      <TableHeadCell>PLATFORM REVENUE</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recent.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <strong className="whitespace-nowrap text-sm font-semibold text-navy">{formatDate(row.paidAt)}</strong>
                            <span className="whitespace-nowrap text-xs text-muted">Stay from {formatDate(row.checkIn)}</span>
                          </div>
                        </TableCell>
                        <TableCell><strong className="text-sm font-semibold text-navy">{row.propertyTitle || 'Property unavailable'}</strong></TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-navy">{row.hostName || 'Unknown host'}</span>
                            <span className="text-xs text-muted">{row.hostEmail || 'Email not available'}</span>
                          </div>
                        </TableCell>
                        <TableCell><span className={MONEY_CELL}>{money(row.grossPaid)}</span></TableCell>
                        <TableCell><span className={MONEY_CELL}>{row.settled === false ? 'Not recorded' : money(row.hostNet)}</span></TableCell>
                        <TableCell><strong className={`${MONEY_CELL} font-semibold`}>{row.settled === false ? 'Not recorded' : money(row.platformRevenue)}</strong></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default AdminRevenue;
