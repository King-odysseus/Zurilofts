import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Label, TextInput } from 'flowbite-react';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

const DAY_MS = 24 * 60 * 60 * 1000;

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

  return <section className="op-host-calendar-board">
    <div className="op-host-calendar-scroll">
      <div className="op-host-calendar-week">
        <div className="op-host-calendar-week-head">
          <span>PROPERTY</span>
          {days.map((day) => <span key={day.toISOString()} className={sameDay(day, new Date()) ? 'is-today' : ''}>
            {day.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()} {day.getDate()}
          </span>)}
        </div>
        {rows.map(({ property, calendar }) => {
          const weekBookings = (calendar.bookings || []).filter((booking) => days.some((day) => inRange(day, booking.start, booking.end)));
          return <div className="op-host-calendar-row" key={property.id}>
            <div className="op-host-calendar-property">
              <Link to={`/host/calendar/${property.id}`}>{property.title}</Link>
              <span>{weekBookings.length} {weekBookings.length === 1 ? 'stay' : 'stays'} this week</span>
            </div>
            {days.map((day) => {
              const state = calendarDayState(calendar, day);
              const isSelected = selected?.propertyId === property.id && selected?.date && sameDay(selected.date, day);
              return <button
                key={day.toISOString()}
                type="button"
                className={`op-host-calendar-day is-${state.type}${isSelected ? ' is-selected' : ''}`}
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
    <div className="op-host-calendar-legend"><span><i className="is-open" />Open</span><span><i className="is-reserved" />Reserved</span><span><i className="is-blocked" />Blocked</span></div>
  </section>;
}

WeeklyCalendar.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({ property: PropTypes.object, calendar: PropTypes.object })).isRequired,
  weekStart: PropTypes.instanceOf(Date).isRequired,
  selected: PropTypes.shape({ propertyId: PropTypes.string, date: PropTypes.instanceOf(Date) }),
  onSelect: PropTypes.func.isRequired,
};

function CalendarDetail({ selected, row, onOpenProperty }) {
  if (!row || !selected?.date) return <aside className="op-host-calendar-detail is-empty"><span>Select a date</span><small>Choose a day to see its booking or availability state.</small></aside>;
  const state = calendarDayState(row.calendar, selected.date);

  return <aside className="op-host-calendar-detail">
    <header><h2>{formatFullDate(selected.date)}</h2><p>{row.property.title}</p></header>
    {state.type === 'reserved' ? <div className="op-host-calendar-event is-reserved">
      <span>RESERVED STAY</span>
      <strong>{state.item.guestName || 'Guest'}</strong>
      <p>{sameDay(selected.date, new Date(state.item.start)) ? 'Check-in today' : sameDay(selected.date, addDays(new Date(state.item.end), -1)) ? 'Check-out today' : 'Stay in progress'} · {state.item.guests || 1} guest{state.item.guests === 1 ? '' : 's'}</p>
      <Link to={`/booking/${state.item.id}`}>View booking</Link>
    </div> : state.type === 'blocked' ? <div className="op-host-calendar-event is-blocked">
      <span>BLOCKED DATE</span>
      <strong>{state.item.summary || 'Unavailable'}</strong>
      <p>{state.item.manual ? 'Manual block' : state.item.sourceName || 'Imported calendar'}</p>
    </div> : <div className="op-host-calendar-event is-open">
      <span>OPEN NIGHT</span>
      <strong>Ready for bookings</strong>
      <p>Guests can reserve this date on ZuriLofts.</p>
    </div>}
    <div className="op-host-calendar-rule">
      <strong>Availability rules</strong>
      <p>Reserved dates are read-only. Manual blocks can be managed below.</p>
      <button type="button" onClick={onOpenProperty}>Open property calendar</button>
    </div>
  </aside>;
}

CalendarDetail.propTypes = {
  selected: PropTypes.shape({ propertyId: PropTypes.string, date: PropTypes.instanceOf(Date) }),
  row: PropTypes.shape({ property: PropTypes.object, calendar: PropTypes.object }),
  onOpenProperty: PropTypes.func.isRequired,
};

function CalendarLoading() {
  return <div className="op-host-calendar-loading" aria-label="Loading calendar"><span /><span /><span /></div>;
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

  return <div className="op-host-calendar">
    <header className="op-host-calendar-heading">
      <div>
        {id && <Link to="/host/calendar">← All calendars</Link>}
        <h1>Availability calendar</h1>
        <p>Manage open dates without changing reserved stays.</p>
      </div>
      <div className="op-host-calendar-controls">
        <div className="op-host-calendar-week-nav">
          <button type="button" aria-label="Previous week" onClick={() => moveWeek(-1)}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m15 18-6-6 6-6" /></svg></button>
          <span>{formatWeek(weekStart)}</span>
          <button type="button" aria-label="Next week" onClick={() => moveWeek(1)}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m9 18 6-6-6-6" /></svg></button>
        </div>
        {selectedRow && <Link className="op-host-calendar-manage" to={`/host/calendar/${selectedRow.property.id}#block-dates`}>Manage availability</Link>}
      </div>
    </header>

    {error && <div className="op-host-calendar-error"><p>{error}</p><button type="button" onClick={load}>Try again</button></div>}
    {loading ? <CalendarLoading /> : rows.length === 0 && !error ? <div className="op-host-calendar-empty">
      <strong>No listings to manage</strong>
      <p>Add a listing before setting availability.</p>
      <Link to="/host/properties/new">Add a listing</Link>
    </div> : <div className="op-host-calendar-layout">
      <WeeklyCalendar rows={rows} weekStart={weekStart} selected={selected} onSelect={selectDate} />
      <CalendarDetail selected={selected} row={selectedRow} onOpenProperty={() => selectedRow && navigate(`/host/calendar/${selectedRow.property.id}`)} />
    </div>}

    {!id && rows.length > 0 && <div className="op-host-calendar-hint">
      <strong>Need to edit a feed or block dates?</strong>
      <span>Open a property calendar to manage imported calendars and manual blocks.</span>
      <button type="button" onClick={() => selectedRow && navigate(`/host/calendar/${selectedRow.property.id}`)}>Open selected calendar</button>
    </div>}

    {id && selectedCalendar && <div className="op-host-calendar-management">
      <section className="op-host-calendar-panel">
        <header><div><h2>Export this calendar</h2><p>Paste this link into Airbnb, Booking.com, or another platform.</p></div></header>
        <div className="op-host-calendar-copy-row">
          <TextInput readOnly value={selectedCalendar.feedUrl || ''} onFocus={(event) => event.target.select()} sizing="md" />
          <Button color="dark" onClick={copyFeed}>{copied ? 'Copied' : 'Copy link'}</Button>
        </div>
      </section>

      <section className="op-host-calendar-panel">
        <header>
          <div><h2>Imported calendars</h2><p>Pull reservations from other platforms into this stay.</p></div>
          <Button color="light" disabled={syncing || (selectedCalendar.sources || []).length === 0} onClick={syncNow}>{syncing ? 'Syncing...' : 'Sync now'}</Button>
        </header>
        {(selectedCalendar.sources || []).length > 0 ? <div className="op-host-calendar-source-list">
          {selectedCalendar.sources.map((source) => <article key={source.id}>
            <div><strong>{source.name}</strong><span>{source.url}</span><small className={source.lastStatus?.startsWith('ERROR') ? 'is-error' : ''}>{source.lastSyncedAt ? `${source.lastStatus} · ${new Date(source.lastSyncedAt).toLocaleString()}` : 'Not synced yet'}</small></div>
            <button type="button" disabled={saving} onClick={() => removeSource(source.id)}>Remove</button>
          </article>)}
        </div> : <p className="op-host-calendar-none">No external calendars connected.</p>}
        <form className="op-host-calendar-source-form" onSubmit={addSource}>
          <div><Label htmlFor="calendar-platform">Platform</Label><TextInput id="calendar-platform" value={sourceDraft.name} onChange={(event) => setSourceDraft({ ...sourceDraft, name: event.target.value })} placeholder="Airbnb" required /></div>
          <div><Label htmlFor="calendar-url">iCal URL</Label><TextInput id="calendar-url" type="url" value={sourceDraft.url} onChange={(event) => setSourceDraft({ ...sourceDraft, url: event.target.value })} placeholder="https://example.com/calendar.ics" required /></div>
          <Button type="submit" className="op-host-calendar-bronze" disabled={saving}>Add feed</Button>
        </form>
      </section>

      <section className="op-host-calendar-panel" id="block-dates">
        <header><div><h2>Blocked dates</h2><p>Imported bookings are read-only. Manual blocks can be removed at any time.</p></div></header>
        {(selectedCalendar.blocks || []).length > 0 ? <div className="op-host-calendar-block-list">
          {selectedCalendar.blocks.map((block) => <article key={block.id}>
            <div><strong>{formatShortDate(new Date(block.start))} → {formatShortDate(new Date(block.end))}</strong><span>{block.summary || 'Blocked'}</span><small className={block.manual ? 'is-manual' : ''}>{block.manual ? 'Manual' : block.sourceName || 'Imported'}</small></div>
            {block.manual && <button type="button" disabled={saving} onClick={() => removeBlock(block.id)}>Remove</button>}
          </article>)}
        </div> : <p className="op-host-calendar-none">No blocked dates.</p>}
        <form className="op-host-calendar-block-form" onSubmit={addBlock}>
          <div><Label htmlFor="block-start">From</Label><TextInput id="block-start" type="date" value={blockDraft.start} onChange={(event) => setBlockDraft({ ...blockDraft, start: event.target.value })} required /></div>
          <div><Label htmlFor="block-end">To</Label><TextInput id="block-end" type="date" value={blockDraft.end} onChange={(event) => setBlockDraft({ ...blockDraft, end: event.target.value })} required /></div>
          <div><Label htmlFor="block-reason">Reason</Label><TextInput id="block-reason" value={blockDraft.summary} onChange={(event) => setBlockDraft({ ...blockDraft, summary: event.target.value })} placeholder="Maintenance" /></div>
          <Button type="submit" color="dark" disabled={saving}>Block dates</Button>
        </form>
      </section>
    </div>}
  </div>;
}

