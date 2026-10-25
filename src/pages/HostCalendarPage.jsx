import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Label, TextInput } from 'flowbite-react';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

const DAY_MS = 24 * 60 * 60 * 1000;

// Property column plus seven equal day columns. Held in one constant so the
// header row and every property row line up on exactly the same grid.
const WEEK_GRID = 'grid grid-cols-[minmax(170px,1.6fr)_repeat(7,minmax(0,1fr))]';

// Day-cell surface per availability state; selected cells add a ring.
const DAY_STATE_CLASSES = {
  open: 'bg-white text-muted hover:bg-surface',
  reserved: 'bg-navy-bg text-white hover:bg-navy-bg/90',
  blocked: 'bg-silver/50 text-navy hover:bg-silver/70',
};

function startOfWeek(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const mondayOffset = (value.getDay() + 6) % 7;
  value.setDate(value.getDate() - mondayOffset);
  return value;
}

function addDays(date, amount) {
  return new Date(date.getTime() + amount * DAY_MS);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function inRange(day, start, end) {
  const current = new Date(day);
  const from = new Date(start);
  const until = new Date(end);
  current.setHours(0, 0, 0, 0);
  from.setHours(0, 0, 0, 0);
  until.setHours(0, 0, 0, 0);
  return current >= from && current < until;
}

function formatShortDate(value) {
  return value.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatWeek(weekStart) {
  const end = addDays(weekStart, 6);
  const startLabel = formatShortDate(weekStart);
  const endLabel = end.toLocaleDateString('en-GB', weekStart.getMonth() === end.getMonth() ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
  return `${startLabel} - ${endLabel}`;
}

function formatFullDate(value) {
  return value.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

function calendarDayState(calendar, day) {
  const booking = (calendar?.bookings || []).find((item) => inRange(day, item.start, item.end));
  if (booking) return { type: 'reserved', item: booking };
  const block = (calendar?.blocks || []).find((item) => inRange(day, item.start, item.end));
  if (block) return { type: 'blocked', item: block };
  return { type: 'open', item: null };
}

function WeeklyCalendar({ rows, weekStart, selected, onSelect }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  return <section className="rounded-xl border border-border bg-white shadow-sm xl:col-span-2">
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className={`${WEEK_GRID} border-b border-border bg-surface`}>
          <span className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">PROPERTY</span>
          {days.map((day) => <span key={day.toISOString()} className={`px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wide ${sameDay(day, new Date()) ? 'text-navy' : 'text-muted'}`}>
            {day.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()} {day.getDate()}
          </span>)}
        </div>
        {rows.map(({ property, calendar }) => {
          const weekBookings = (calendar.bookings || []).filter((booking) => days.some((day) => inRange(day, booking.start, booking.end)));
          return <div className={`${WEEK_GRID} border-b border-border last:border-0`} key={property.id}>
            <div className="flex flex-col justify-center gap-1 px-3 py-2">
              <Link to={`/host/calendar/${property.id}`} className="text-sm font-semibold text-navy hover:text-primary-600">{property.title}</Link>
              <span className="text-[11px] text-muted">{weekBookings.length} {weekBookings.length === 1 ? 'stay' : 'stays'} this week</span>
            </div>
            {days.map((day) => {
              const state = calendarDayState(calendar, day);
              const isSelected = selected?.propertyId === property.id && selected?.date && sameDay(selected.date, day);
              return <button
                key={day.toISOString()}
                type="button"
                className={`flex min-h-[64px] flex-col items-center justify-center border-l border-border px-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors ${DAY_STATE_CLASSES[state.type] || DAY_STATE_CLASSES.open}${isSelected ? ' ring-2 ring-inset ring-primary' : ''}`}
                onClick={() => onSelect(property.id, day)}
                aria-label={`${property.title}, ${formatFullDate(day)}: ${state.type}`}
              >
                <span>{state.type === 'reserved' ? 'Reserved' : state.type === 'blocked' ? 'Blocked' : 'Open'}</span>
              </button>;
            })}
          </div>;
        })}
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-4 border-t border-border px-5 py-3 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full border border-border bg-white" aria-hidden="true" />Open</span>
      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-navy-bg" aria-hidden="true" />Reserved</span>
      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-silver" aria-hidden="true" />Blocked</span>
    </div>
  </section>;
}

WeeklyCalendar.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({ property: PropTypes.object, calendar: PropTypes.object })).isRequired,
  weekStart: PropTypes.instanceOf(Date).isRequired,
  selected: PropTypes.shape({ propertyId: PropTypes.string, date: PropTypes.instanceOf(Date) }),
  onSelect: PropTypes.func.isRequired,
};

function CalendarDetail({ selected, row, onOpenProperty }) {
  if (!row || !selected?.date) return <aside className="h-fit rounded-xl border border-dashed border-border bg-white p-5 text-center shadow-sm xl:col-span-1">
    <span className="block text-sm font-semibold text-navy">Select a date</span>
    <small className="mt-1 block text-xs leading-relaxed text-muted">Choose a day to see its booking or availability state.</small>
  </aside>;
  const state = calendarDayState(row.calendar, selected.date);

  return <aside className="h-fit space-y-4 rounded-xl border border-border bg-white p-5 shadow-sm xl:col-span-1">
    <header><h2 className="text-base font-semibold text-navy">{formatFullDate(selected.date)}</h2><p className="mt-1 text-xs text-muted">{row.property.title}</p></header>
    {state.type === 'reserved' ? <div className="rounded-lg bg-navy-bg p-3 text-white">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">RESERVED STAY</span>
      <strong className="mt-1 block text-sm font-semibold">{state.item.guestName || 'Guest'}</strong>
      <p className="mt-1 text-xs leading-relaxed text-white/80">{sameDay(selected.date, new Date(state.item.start)) ? 'Check-in today' : sameDay(selected.date, addDays(new Date(state.item.end), -1)) ? 'Check-out today' : 'Stay in progress'} · {state.item.guests || 1} guest{state.item.guests === 1 ? '' : 's'}</p>
      <Link to={`/bookings/${state.item.id}`} className="mt-2 inline-block text-xs font-semibold underline">View booking</Link>
    </div> : state.type === 'blocked' ? <div className="rounded-lg bg-surface p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">BLOCKED DATE</span>
      <strong className="mt-1 block text-sm font-semibold text-navy">{state.item.summary || 'Unavailable'}</strong>
      <p className="mt-1 text-xs leading-relaxed text-muted">{state.item.manual ? 'Manual block' : state.item.sourceName || 'Imported calendar'}</p>
    </div> : <div className="rounded-lg border border-dashed border-border p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">OPEN NIGHT</span>
      <strong className="mt-1 block text-sm font-semibold text-navy">Ready for bookings</strong>
      <p className="mt-1 text-xs leading-relaxed text-muted">Guests can reserve this date on ZuriLofts.</p>
    </div>}
    <div className="rounded-lg border border-border p-3">
      <strong className="block text-sm font-semibold text-navy">Availability rules</strong>
      <p className="mt-1 text-xs leading-relaxed text-muted">Reserved dates are read-only. Manual blocks can be managed below.</p>
      <Button type="button" color="light" size="xs" onClick={onOpenProperty} className="mt-2">Open property calendar</Button>
    </div>
  </aside>;
}

CalendarDetail.propTypes = {
  selected: PropTypes.shape({ propertyId: PropTypes.string, date: PropTypes.instanceOf(Date) }),
  row: PropTypes.shape({ property: PropTypes.object, calendar: PropTypes.object }),
  onOpenProperty: PropTypes.func.isRequired,
};

function CalendarLoading() {
  return <div className="space-y-3 rounded-xl border border-border bg-white p-5 shadow-sm" aria-label="Loading calendar">
    <span className="block h-16 animate-pulse rounded-lg bg-surface" />
    <span className="block h-16 animate-pulse rounded-lg bg-surface" />
    <span className="block h-16 animate-pulse rounded-lg bg-surface" />
  </div>;
}

export default function HostCalendarPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState(null);
  const [sourceDraft, setSourceDraft] = useState({ name: '', url: '' });
  const [blockDraft, setBlockDraft] = useState({ start: '', end: '', summary: '' });
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = id ? 'Property calendar | ZuriLofts Host' : 'Availability calendar | ZuriLofts Host';
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (id) {
        const response = await apiClient.get(`/properties/${id}/calendar`);
        const calendar = response.data.data;
        const nextRows = [{ property: calendar.property, calendar }];
        setRows(nextRows);
        setSelected((current) => current?.propertyId === id ? current : { propertyId: id, date: new Date() });
      } else {
        const propertyResponse = await apiClient.get('/properties/mine?limit=100');
        const properties = propertyResponse.data.data || [];
        const nextRows = await Promise.all(properties.map(async (property) => {
          const response = await apiClient.get(`/properties/${property.id}/calendar`);
          return { property, calendar: response.data.data };
        }));
        setRows(nextRows);
        setSelected((current) => current?.propertyId ? current : nextRows[0] ? { propertyId: nextRows[0].property.id, date: new Date() } : null);
      }
    } catch {
      setError('Could not load your availability calendar. Please try again.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const selectedRow = useMemo(() => rows.find((row) => row.property.id === selected?.propertyId) || rows[0], [rows, selected]);
  const selectedCalendar = selectedRow?.calendar;

  function moveWeek(amount) {
    const next = addDays(weekStart, amount * 7);
    setWeekStart(next);
    if (selectedRow && selected?.date) setSelected({ propertyId: selectedRow.property.id, date: addDays(selected.date, amount * 7) });
  }

  function selectDate(propertyId, date) {
    setSelected({ propertyId, date });
  }

  async function addSource(event) {
    event.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await apiClient.post(`/properties/${id}/calendar/sources`, sourceDraft);
      setSourceDraft({ name: '', url: '' });
      await load();
      toast.success('Calendar feed added.');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Could not add the calendar feed.');
    } finally {
      setSaving(false);
    }
  }

  async function removeSource(sourceId) {
    if (!id || !window.confirm('Remove this calendar feed and its imported blocks?')) return;
    setSaving(true);
    try {
      await apiClient.delete(`/properties/${id}/calendar/sources/${sourceId}`);
      const response = await apiClient.get(`/properties/${id}/calendar`);
      setRows([{ property: response.data.data.property, calendar: response.data.data }]);
      toast.success('Calendar feed removed.');
    } catch {
      toast.error('Could not remove the calendar feed.');
    } finally {
      setSaving(false);
    }
  }

  async function syncNow() {
    if (!id) return;
    setSyncing(true);
    try {
      await apiClient.post(`/properties/${id}/calendar/sync`);
      await load();
      toast.success('Calendar feeds synced.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Calendar sync failed.');
    } finally {
      setSyncing(false);
    }
  }

  async function addBlock(event) {
    event.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await apiClient.post(`/properties/${id}/calendar/blocks`, {
        start: blockDraft.start,
        end: blockDraft.end,
        summary: blockDraft.summary || undefined,
      });
      setBlockDraft({ start: '', end: '', summary: '' });
      await load();
      toast.success('Dates blocked.');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Could not block those dates.');
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(blockId) {
    if (!id) return;
    setSaving(true);
    try {
      await apiClient.delete(`/properties/${id}/calendar/blocks/${blockId}`);
      setRows((current) => current.map((row) => row.property.id === id ? { ...row, calendar: { ...row.calendar, blocks: row.calendar.blocks.filter((block) => block.id !== blockId) } } : row));
      toast.success('Calendar block removed.');
    } catch {
      toast.error('Could not remove this block.');
    } finally {
      setSaving(false);
    }
  }

  function copyFeed() {
    if (!selectedCalendar?.feedUrl) return;
    navigator.clipboard?.writeText(selectedCalendar.feedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {id && <Link to="/host/calendar" className="mb-2 inline-block text-sm font-medium text-primary-600 hover:underline">← All calendars</Link>}
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Availability calendar</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Manage open dates without changing reserved stays.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" color="light" size="xs" aria-label="Previous week" onClick={() => moveWeek(-1)}><ChevronLeft strokeWidth={1.8} aria-hidden="true" /></Button>
        <span className="text-sm font-semibold text-navy">{formatWeek(weekStart)}</span>
        <Button type="button" color="light" size="xs" aria-label="Next week" onClick={() => moveWeek(1)}><ChevronRight strokeWidth={1.8} aria-hidden="true" /></Button>
        {selectedRow && <Button as={Link} to={`/host/calendar/${selectedRow.property.id}#block-dates`} color="light" size="sm">Manage availability</Button>}
      </div>
    </header>

    {error && <Alert color="failure">
      <p>{error}</p>
      <div><Button type="button" color="light" size="sm" onClick={load}>Try again</Button></div>
    </Alert>}
    {loading ? <CalendarLoading /> : rows.length === 0 && !error ? <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-white px-5 py-12 text-center">
      <strong className="text-base font-semibold text-navy">No listings to manage</strong>
      <p className="max-w-md text-sm leading-relaxed text-muted">Add a listing before setting availability.</p>
      <Button as={Link} to="/host/properties/new" size="sm">Add a listing</Button>
    </div> : <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <WeeklyCalendar rows={rows} weekStart={weekStart} selected={selected} onSelect={selectDate} />
      <CalendarDetail selected={selected} row={selectedRow} onOpenProperty={() => selectedRow && navigate(`/host/calendar/${selectedRow.property.id}`)} />
    </div>}

    {!id && rows.length > 0 && <div className="flex flex-col items-start gap-2 rounded-xl border border-border bg-white p-5 shadow-sm">
      <strong className="text-base font-semibold text-navy">Need to edit a feed or block dates?</strong>
      <span className="text-sm leading-relaxed text-muted">Open a property calendar to manage imported calendars and manual blocks.</span>
      <Button type="button" color="light" size="sm" onClick={() => selectedRow && navigate(`/host/calendar/${selectedRow.property.id}`)}>Open selected calendar</Button>
    </div>}

    {id && selectedCalendar && <div className="space-y-4">
      <section className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-sm">
        <header><div><h2 className="text-base font-semibold text-navy">Export this calendar</h2><p className="mt-1 text-xs text-muted">Paste this link into Airbnb, Booking.com, or another platform.</p></div></header>
        <div className="flex flex-col gap-2 sm:flex-row">
          <TextInput readOnly value={selectedCalendar.feedUrl || ''} onFocus={(event) => event.target.select()} sizing="md" className="sm:flex-1" />
          <Button color="dark" onClick={copyFeed}>{copied ? 'Copied' : 'Copy link'}</Button>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-base font-semibold text-navy">Imported calendars</h2><p className="mt-1 text-xs text-muted">Pull reservations from other platforms into this stay.</p></div>
          <Button color="light" disabled={syncing || (selectedCalendar.sources || []).length === 0} onClick={syncNow}>{syncing ? 'Syncing...' : 'Sync now'}</Button>
        </header>
        {(selectedCalendar.sources || []).length > 0 ? <div className="space-y-2">
          {selectedCalendar.sources.map((source) => <article key={source.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0">
              <strong className="block text-sm font-semibold text-navy">{source.name}</strong>
              <span className="block truncate text-xs text-muted">{source.url}</span>
              <small className={`text-xs ${source.lastStatus?.startsWith('ERROR') ? 'text-red-600' : 'text-muted'}`}>{source.lastSyncedAt ? `${source.lastStatus} · ${new Date(source.lastSyncedAt).toLocaleString()}` : 'Not synced yet'}</small>
            </div>
            <Button type="button" color="light" size="xs" disabled={saving} onClick={() => removeSource(source.id)}>Remove</Button>
          </article>)}
        </div> : <p className="text-xs text-muted">No external calendars connected.</p>}
        <form className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2" onSubmit={addSource}>
          <div className="space-y-1.5"><Label htmlFor="calendar-platform">Platform</Label><TextInput id="calendar-platform" value={sourceDraft.name} onChange={(event) => setSourceDraft({ ...sourceDraft, name: event.target.value })} placeholder="Airbnb" required /></div>
          <div className="space-y-1.5"><Label htmlFor="calendar-url">iCal URL</Label><TextInput id="calendar-url" type="url" value={sourceDraft.url} onChange={(event) => setSourceDraft({ ...sourceDraft, url: event.target.value })} placeholder="https://example.com/calendar.ics" required /></div>
          <div className="sm:col-span-2"><Button type="submit" disabled={saving}>Add feed</Button></div>
        </form>
      </section>

      <section id="block-dates" className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-sm">
        <header><div><h2 className="text-base font-semibold text-navy">Blocked dates</h2><p className="mt-1 text-xs text-muted">Imported bookings are read-only. Manual blocks can be removed at any time.</p></div></header>
        {(selectedCalendar.blocks || []).length > 0 ? <div className="space-y-2">
          {selectedCalendar.blocks.map((block) => <article key={block.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0">
              <strong className="block text-sm font-semibold text-navy">{formatShortDate(new Date(block.start))} → {formatShortDate(new Date(block.end))}</strong>
              <span className="block text-xs text-muted">{block.summary || 'Blocked'}</span>
              <small className={`text-xs ${block.manual ? 'font-semibold text-navy' : 'text-muted'}`}>{block.manual ? 'Manual' : block.sourceName || 'Imported'}</small>
            </div>
            {block.manual && <Button type="button" color="light" size="xs" disabled={saving} onClick={() => removeBlock(block.id)}>Remove</Button>}
          </article>)}
        </div> : <p className="text-xs text-muted">No blocked dates.</p>}
        <form className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-3" onSubmit={addBlock}>
          <div className="space-y-1.5"><Label htmlFor="block-start">From</Label><TextInput id="block-start" type="date" value={blockDraft.start} onChange={(event) => setBlockDraft({ ...blockDraft, start: event.target.value })} required /></div>
          <div className="space-y-1.5"><Label htmlFor="block-end">To</Label><TextInput id="block-end" type="date" value={blockDraft.end} onChange={(event) => setBlockDraft({ ...blockDraft, end: event.target.value })} required /></div>
          <div className="space-y-1.5"><Label htmlFor="block-reason">Reason</Label><TextInput id="block-reason" value={blockDraft.summary} onChange={(event) => setBlockDraft({ ...blockDraft, summary: event.target.value })} placeholder="Maintenance" /></div>
          <div className="sm:col-span-3"><Button type="submit" color="dark" disabled={saving}>Block dates</Button></div>
        </form>
      </section>
    </div>}
  </div>;
}
