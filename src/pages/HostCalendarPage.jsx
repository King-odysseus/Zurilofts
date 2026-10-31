import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Label, TextInput } from 'flowbite-react';
import PropTypes from 'prop-types';
import {
  Ban,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Link2,
  Wallet,
} from 'lucide-react';
import apiClient from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

// The host calendar, shaped like the reference screen: one month at a time, a
// cell per night showing that night's price, bookings drawn as a bar across the
// dates they occupy, and the pricing and availability controls beside the grid
// rather than on another page. A host should be able to answer "is this night
// free, and what does it cost" without leaving the month.

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CARD = 'rounded-xl border border-border bg-elevated shadow-sm';
const PANEL_HEAD = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600';

const BTN_PRIMARY = 'h-9 !items-center !rounded-full !border-0 !bg-primary !px-4 !text-sm !font-semibold !text-white hover:!bg-primary-hover hover:!text-white';
const BTN_ICON = 'h-8 !w-8 !items-center !justify-center !rounded-full !border !border-border !bg-elevated !px-0 !text-navy hover:!bg-surface hover:!text-navy';

function midnight(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function firstOfMonth(value) {
  const date = midnight(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date, amount) {
  return new Date(date.getTime() + amount * DAY_MS);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** True for the night starting on `day`: the check-out day itself stays free. */
function inStay(day, start, end) {
  const night = midnight(day).getTime();
  return night >= midnight(start).getTime() && night < midnight(end).getTime();
}

function startOfMonthGrid(monthAnchor) {
  const first = firstOfMonth(monthAnchor);
  const weekdayOffset = (first.getDay() + 6) % 7;
  return addDays(first, -weekdayOffset);
}

function priceFor(day, basePrice, priceRules) {
  const night = midnight(day).getTime();
  const rule = (priceRules || []).find((item) => {
    const start = midnight(item.start).getTime();
    const end = midnight(item.end).getTime();
    // A dated rate covers whole days, and its final day counts.
    return night >= start && night <= end;
  });
  return rule ? rule.price : basePrice;
}

function formatMonth(date) {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatDay(iso) {
  if (!iso) return '-';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function money(value) {
  return value == null ? '-' : `KES ${Number(value).toLocaleString()}`;
}

function initialsOf(name) {
  return (name || 'G')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'G';
}

/* --------------------------------------------------------------- sidebar ---- */

function SidebarSection({ title, children, defaultOpen = false, icon: Icon }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="border-b border-border last:border-b-0">
    <button
      type="button"
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
    >
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />}
        {title}
      </span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.9} aria-hidden="true" />
    </button>
    {open && <div className="px-4 pb-4">{children}</div>}
  </section>;
}

SidebarSection.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  defaultOpen: PropTypes.bool,
  icon: PropTypes.elementType,
};

/* ------------------------------------------------------------------ grid ---- */

function StayBar({ booking, weekStart, row }) {
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const firstVisible = weekDays.findIndex((day) => inStay(day, booking.start, booking.end));
  if (firstVisible < 0) return null;

  let lastVisible = firstVisible;
  for (let index = firstVisible; index < 7; index += 1) {
    if (inStay(weekDays[index], booking.start, booking.end)) lastVisible = index;
  }

  // A bar clipped by the week edge loses its rounded cap on that side, so a stay
  // spanning two weeks reads as one continuous run instead of two pills.
  const startsHere = !inStay(addDays(weekDays[firstVisible], -1), booking.start, booking.end);
  const endsHere = !inStay(addDays(weekDays[lastVisible], 1), booking.start, booking.end);

  return <Link
    to={`/host/reservations/${booking.id}`}
    className={`absolute flex items-center gap-1.5 overflow-hidden bg-[#64748B] px-2 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 ${startsHere ? 'rounded-l-md' : ''} ${endsHere ? 'rounded-r-md' : ''}`}
    style={{
      left: `${(firstVisible / 7) * 100}%`,
      width: `${((lastVisible - firstVisible + 1) / 7) * 100}%`,
      top: `${row * 26 + 46}px`,
      height: '22px',
    }}
    title={`${booking.guestName || 'Guest'}, ${formatDay(booking.start)} to ${formatDay(booking.end)}`}
  >
    {startsHere && <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/20 text-[8px] font-bold">{initialsOf(booking.guestName)}</span>}
    <span className="truncate">{booking.guestName || 'Guest'}{booking.guests > 1 ? ` + ${booking.guests - 1}` : ''}</span>
  </Link>;
}

StayBar.propTypes = {
  booking: PropTypes.object.isRequired,
  weekStart: PropTypes.instanceOf(Date).isRequired,
  row: PropTypes.number.isRequired,
};

function MonthGrid({ weeks, monthAnchor, calendar, selectedDate, onSelect }) {
  const today = midnight(new Date());
  const basePrice = calendar?.property?.price ?? 0;
  const priceRules = calendar?.priceRules || [];
  const bookings = calendar?.bookings || [];
  const blocks = calendar?.blocks || [];

  return <div className="overflow-x-auto">
    <div className="min-w-[640px]">
      <div className="grid grid-cols-7 border-b border-border bg-surface">
        {WEEKDAYS.map((day) => <span key={day} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">{day}</span>)}
      </div>

      {weeks.map((weekStart) => {
        const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
        const weekBookings = bookings.filter((booking) => days.some((day) => inStay(day, booking.start, booking.end)));
        // Bars stack, so an imported block and a booking on the same week never
        // hide each other.
        const barRows = weekBookings.length;

        return <div key={weekStart.toISOString()} className="relative border-b border-border last:border-b-0">
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const outside = day.getMonth() !== monthAnchor.getMonth();
              const isToday = sameDay(day, today);
              const isSelected = selectedDate && sameDay(day, selectedDate);
              const blocked = blocks.some((block) => inStay(day, block.start, block.end));
              const stay = bookings.some((booking) => inStay(day, booking.start, booking.end));
              return <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelect(day)}
                aria-pressed={Boolean(isSelected)}
                aria-label={`${day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}: ${stay ? 'booked' : blocked ? 'blocked' : `open, ${money(priceFor(day, basePrice, priceRules))}`}`}
                className={`flex flex-col items-start gap-0.5 border-l border-border px-2 pt-1.5 text-left transition-colors first:border-l-0 ${outside ? 'bg-surface/60' : 'bg-elevated'} hover:bg-surface ${isSelected ? 'ring-2 ring-inset ring-primary' : ''}`}
                style={{ minHeight: `${Math.max(92, 78 + barRows * 26)}px` }}
              >
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold ${isToday ? 'bg-primary text-white' : outside ? 'text-muted' : 'text-navy'}`}>
                  {day.getDate()}
                </span>
                {blocked && !stay && <span className="inline-flex items-center gap-1 text-[10px] text-muted"><Ban className="h-2.5 w-2.5" strokeWidth={2} aria-hidden="true" />Blocked</span>}
                {!stay && !blocked && <span className="text-[10px] text-muted">{money(priceFor(day, basePrice, priceRules))}</span>}
              </button>;
            })}
          </div>

          {weekBookings.map((booking, index) => <StayBar key={booking.id} booking={booking} weekStart={weekStart} row={index} />)}
        </div>;
      })}
    </div>
  </div>;
}

MonthGrid.propTypes = {
  weeks: PropTypes.arrayOf(PropTypes.instanceOf(Date)).isRequired,
  monthAnchor: PropTypes.instanceOf(Date).isRequired,
  calendar: PropTypes.object,
  selectedDate: PropTypes.instanceOf(Date),
  onSelect: PropTypes.func.isRequired,
};

/* ------------------------------------------------------------------ page ---- */

export default function HostCalendarPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [properties, setProperties] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthAnchor, setMonthAnchor] = useState(() => firstOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(null);
  const [sourceDraft, setSourceDraft] = useState({ name: '', url: '' });
  const [blockDraft, setBlockDraft] = useState({ start: '', end: '', summary: '' });
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadProperties = useCallback(async () => {
    try {
      const response = await apiClient.get('/properties/mine?limit=100');
      setProperties(response.data.data || []);
    } catch {
      // The calendar reports its own failure; an empty selector is enough here.
    }
  }, []);

  const activePropertyId = id || properties[0]?.id || null;

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!activePropertyId) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/properties/${activePropertyId}/calendar`);
      setCalendar(response.data.data);
    } catch {
      setError('Could not load your availability calendar. Please try again.');
      setCalendar(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activePropertyId]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    load();
  }, [load]);

  const weeks = useMemo(() => {
    const gridStart = startOfMonthGrid(monthAnchor);
    return Array.from({ length: 6 }, (_, index) => addDays(gridStart, index * 7));
  }, [monthAnchor]);

  function moveMonth(amount) {
    setMonthAnchor((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  async function addSource(event) {
    event.preventDefault();
    if (!activePropertyId) return;
    setSaving(true);
    try {
      await apiClient.post(`/properties/${activePropertyId}/calendar/sources`, sourceDraft);
      setSourceDraft({ name: '', url: '' });
      await load({ silent: true });
      toast.success('Calendar feed added.');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Could not add the calendar feed.');
    } finally {
      setSaving(false);
    }
  }

  async function removeSource(sourceId) {
    if (!activePropertyId || !window.confirm('Remove this calendar feed and its imported blocks?')) return;
    setSaving(true);
    try {
      await apiClient.delete(`/properties/${activePropertyId}/calendar/sources/${sourceId}`);
      await load({ silent: true });
      toast.success('Calendar feed removed.');
    } catch {
      toast.error('Could not remove the calendar feed.');
    } finally {
      setSaving(false);
    }
  }

  async function syncNow() {
    if (!activePropertyId) return;
    setSyncing(true);
    try {
      await apiClient.post(`/properties/${activePropertyId}/calendar/sync`);
      await load({ silent: true });
      toast.success('Calendar feeds synced.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Calendar sync failed.');
    } finally {
      setSyncing(false);
    }
  }

  async function addBlock(event) {
    event.preventDefault();
    if (!activePropertyId) return;
    setSaving(true);
    try {
      await apiClient.post(`/properties/${activePropertyId}/calendar/blocks`, {
        start: blockDraft.start,
        end: blockDraft.end,
        summary: blockDraft.summary || undefined,
      });
      setBlockDraft({ start: '', end: '', summary: '' });
      await load({ silent: true });
      toast.success('Dates blocked.');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Could not block those dates.');
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(blockId) {
    if (!activePropertyId) return;
    setSaving(true);
    try {
      await apiClient.delete(`/properties/${activePropertyId}/calendar/blocks/${blockId}`);
      setCalendar((current) => current ? { ...current, blocks: current.blocks.filter((block) => block.id !== blockId) } : current);
      toast.success('Calendar block removed.');
    } catch {
      toast.error('Could not remove this block.');
    } finally {
      setSaving(false);
    }
  }

  function copyFeed() {
    if (!calendar?.feedUrl) return;
    navigator.clipboard?.writeText(calendar.feedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const basePrice = calendar?.property?.price ?? 0;
  const priceRules = calendar?.priceRules || [];
  const selectedPrice = selectedDate ? priceFor(selectedDate, basePrice, priceRules) : null;
  const stayCount = (calendar?.bookings || []).length;

  return <div className="space-y-4">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className={PANEL_HEAD}>HOST WORKSPACE</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Calendar</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Every night you can sell, what it costs, and who is already booked.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {properties.length > 1 && <div className="relative w-full sm:w-auto">
          <label className="sr-only" htmlFor="calendar-property">Listing</label>
          <select
            id="calendar-property"
            value={activePropertyId || ''}
            onChange={(event) => navigate(`/host/calendar/${event.target.value}`)}
            className="w-full appearance-none rounded-full border border-border bg-elevated py-1.5 pl-3 pr-8 text-xs font-semibold text-navy focus:border-primary focus:outline-none focus:ring-0 sm:w-auto"
          >
            {properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" strokeWidth={2} aria-hidden="true" />
        </div>}
        <div className="flex w-full items-center justify-between gap-1.5 sm:w-auto sm:justify-start">
          <Button type="button" className={BTN_ICON} aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" /></Button>
          <span className="min-w-[7.5rem] text-center text-sm font-semibold text-navy">{formatMonth(monthAnchor)}</span>
          <Button type="button" className={BTN_ICON} aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" /></Button>
        </div>
      </div>
    </header>

    {error && <Alert color="failure">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1">{error}</p>
        <Button type="button" size="xs" color="light" onClick={() => load()}>Try again</Button>
      </div>
    </Alert>}

    {loading ? <div className={`${CARD} p-5`} aria-label="Loading calendar">
      <span className="block h-[420px] animate-pulse rounded-lg bg-surface" />
    </div> : !activePropertyId ? <div className={`${CARD} px-5 py-12 text-center`}>
      <CalendarDays className="mx-auto h-6 w-6 text-muted" strokeWidth={1.6} aria-hidden="true" />
      <strong className="mt-2 block text-base font-semibold text-navy">No listings to manage</strong>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">Add a listing before setting availability.</p>
      <Button as={Link} to="/host/properties/new" className={`mx-auto mt-4 w-fit ${BTN_PRIMARY}`}>Add a listing</Button>
    </div> : <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
      <section className={`${CARD} overflow-hidden`} aria-label="Month calendar">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-navy">{calendar?.property?.title || 'Your stay'}</h2>
            <p className="text-xs text-muted">
              {stayCount} {stayCount === 1 ? 'stay' : 'stays'} booked
              {selectedDate && <> <span aria-hidden="true">·</span> {formatDay(selectedDate)} at {money(selectedPrice)}</>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#64748B]" aria-hidden="true" />Booked</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-silver" aria-hidden="true" />Blocked</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-border bg-elevated" aria-hidden="true" />Open</span>
          </div>
        </div>
        <MonthGrid
          weeks={weeks}
          monthAnchor={monthAnchor}
          calendar={calendar}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />
      </section>

      <aside className={`${CARD} h-fit overflow-hidden`} aria-label="Calendar settings">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-navy">Pricing and availability</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">Changes here apply to this stay only.</p>
        </div>

        <SidebarSection title="Pricing" icon={Wallet} defaultOpen>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-muted">Base nightly rate</span>
            <strong className="text-sm font-bold tabular-nums text-navy">{money(basePrice)}</strong>
          </div>
          {priceRules.length > 0 ? <ul className="mt-2 space-y-1.5">
            {priceRules.map((rule) => <li key={rule.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-navy">{rule.name || 'Date range'}</span>
              <span className="shrink-0 tabular-nums text-muted">{money(rule.price)} <span className="text-[10px]">({formatDay(rule.start)}-{formatDay(rule.end)})</span></span>
            </li>)}
          </ul> : <p className="mt-2 text-[11px] leading-relaxed text-muted">No dated rates. Every night uses the base rate.</p>}
          <Button as={Link} to={`/host/properties/${activePropertyId}/edit`} color="light" size="xs" className="mt-3 w-full">Edit pricing</Button>
        </SidebarSection>

        <SidebarSection title="Availability" icon={Ban}>
          <form onSubmit={addBlock} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="block-start" className="text-[11px]">From</Label>
                <TextInput id="block-start" type="date" sizing="sm" value={blockDraft.start} onChange={(event) => setBlockDraft((current) => ({ ...current, start: event.target.value }))} required />
              </div>
              <div>
                <Label htmlFor="block-end" className="text-[11px]">To</Label>
                <TextInput id="block-end" type="date" sizing="sm" value={blockDraft.end} onChange={(event) => setBlockDraft((current) => ({ ...current, end: event.target.value }))} required />
              </div>
            </div>
            <div>
              <Label htmlFor="block-summary" className="text-[11px]">Reason (optional)</Label>
              <TextInput id="block-summary" sizing="sm" value={blockDraft.summary} onChange={(event) => setBlockDraft((current) => ({ ...current, summary: event.target.value }))} placeholder="Maintenance" />
            </div>
            <Button type="submit" color="light" size="xs" className="w-full" disabled={saving}>{saving ? 'Saving...' : 'Block these dates'}</Button>
          </form>

          {(calendar?.blocks || []).length > 0 && <ul className="mt-3 space-y-1.5 border-t border-border pt-2">
            {calendar.blocks.map((block) => <li key={block.id} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="min-w-0 truncate text-navy">{formatDay(block.start)} - {formatDay(block.end)}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-muted">{block.manual ? 'Manual' : block.sourceName || 'Imported'}</span>
                {block.manual && <button type="button" onClick={() => removeBlock(block.id)} className="text-muted underline underline-offset-2 hover:text-navy" disabled={saving}>Undo</button>}
              </span>
            </li>)}
          </ul>}
        </SidebarSection>

        <SidebarSection title="Connected calendars" icon={Link2}>
          <p className="text-[11px] leading-relaxed text-muted">Pull bookings from other platforms so a stay is never double-sold.</p>
          {(calendar?.sources || []).length > 0 ? <ul className="mt-2 space-y-2">
            {calendar.sources.map((source) => <li key={source.id} className="rounded-lg border border-border p-2">
              <p className="truncate text-xs font-semibold text-navy">{source.name}</p>
              <p className={`text-[10px] ${source.lastStatus?.startsWith('ERROR') ? 'text-red-600' : 'text-muted'}`}>
                {source.lastSyncedAt ? `${source.lastStatus} · ${new Date(source.lastSyncedAt).toLocaleString()}` : 'Not synced yet'}
              </p>
              <button type="button" onClick={() => removeSource(source.id)} className="mt-1 text-[10px] text-muted underline underline-offset-2 hover:text-navy" disabled={saving}>Remove</button>
            </li>)}
          </ul> : <p className="mt-2 text-[11px] text-muted">No external calendars connected.</p>}

          <Button color="light" size="xs" className="mt-2 w-full" disabled={syncing || (calendar?.sources || []).length === 0} onClick={syncNow}>
            {syncing ? 'Syncing...' : 'Sync now'}
          </Button>

          <form onSubmit={addSource} className="mt-2 space-y-2 border-t border-border pt-2">
            <TextInput id="calendar-platform" sizing="sm" value={sourceDraft.name} onChange={(event) => setSourceDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Platform, e.g. Airbnb" required />
            <TextInput id="calendar-url" sizing="sm" type="url" value={sourceDraft.url} onChange={(event) => setSourceDraft((current) => ({ ...current, url: event.target.value }))} placeholder="https://example.com/calendar.ics" required />
            <Button type="submit" color="light" size="xs" className="w-full" disabled={saving}>Add feed</Button>
          </form>
        </SidebarSection>

        <SidebarSection title="Export to another platform" icon={Info}>
          <p className="text-[11px] leading-relaxed text-muted">Paste this link where the other platform asks for an iCal address.</p>
          <TextInput readOnly sizing="sm" className="mt-2" value={calendar?.feedUrl || ''} onFocus={(event) => event.target.select()} />
          <Button color="light" size="xs" className="mt-2 w-full" onClick={copyFeed}>{copied ? 'Copied' : 'Copy link'}</Button>
        </SidebarSection>
      </aside>
    </div>}
  </div>;
}
