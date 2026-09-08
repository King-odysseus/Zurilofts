import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';

const labelCls = 'block text-sm font-medium text-[#222222] mb-2';
const inputCls =
  'w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#2563EB] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.18)] bg-white text-[#222222]';

const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const toLocalDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function CalendarMonth({ month, blocks, bookings, onSelectDate, onBlockClick, selectedStart, selectedEnd }) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = start.getDay();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => index - offset + 1);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const occupied = (date, item) => date >= new Date(item.start) && date < new Date(item.end);
  return <div className="overflow-x-auto">
    <div className="min-w-[560px]">
    <div className="grid grid-cols-7 gap-2 mb-2">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <div key={day} className="p-2 text-center text-xs font-semibold text-[#6b7280]">{day}</div>)}</div>
    <div className="grid grid-cols-7 gap-2">
    {cells.map((day, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      const inMonth = day > 0 && day <= days;
      const booking = inMonth && bookings.find((item) => occupied(date, item));
      const block = inMonth && blocks.find((item) => occupied(date, item));
      const isToday = sameDay(date, new Date());
      const isSelected = selectedStart && (selectedEnd ? date >= selectedStart && date <= selectedEnd : sameDay(date, selectedStart));
      const canClick = inMonth && !booking && (Boolean(onSelectDate) || Boolean(block?.manual && onBlockClick));
      return <button type="button" key={index} disabled={!canClick} onClick={() => block?.manual ? onBlockClick?.(block, date) : onSelectDate?.(date)} className={`min-h-[108px] rounded-xl p-3 text-left transition-colors duration-200 ${inMonth ? 'bg-white border border-[#E5E7EB]' : 'bg-transparent'} ${block ? 'bg-amber-50' : ''} ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-[#2563EB]' : ''} ${canClick ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-not-allowed'} ${booking ? 'opacity-90' : ''}`}>
        {inMonth && <span className={`inline-flex w-9 h-9 items-center justify-center rounded-full text-sm font-bold ${isSelected || isToday ? 'bg-[#2563EB] text-white' : 'text-[#222222]'}`}>{day}</span>}
        {booking && <div className="mt-3 rounded-lg bg-[#222222] text-white px-2 py-1.5 text-xs font-semibold truncate" title={`${booking.guestName} · ${booking.guests} guests`}>{booking.guestName}</div>}
        {!booking && block && <div className="mt-3 rounded-lg bg-amber-100 text-amber-800 px-2 py-1.5 text-xs font-semibold truncate">{block.summary || 'Blocked'}</div>}
      </button>;
    })}
    </div>
    </div>
  </div>;
}

CalendarMonth.propTypes = { month: PropTypes.instanceOf(Date).isRequired, blocks: PropTypes.array.isRequired, bookings: PropTypes.array.isRequired, onSelectDate: PropTypes.func, onBlockClick: PropTypes.func, selectedStart: PropTypes.instanceOf(Date), selectedEnd: PropTypes.instanceOf(Date) };

// The calendar is per-property, so /host/calendar (no id) shows a picker of the
// host's own listings. Reuses the existing /properties/mine endpoint.
function CalendarPropertyPicker({ base }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/properties/mine');
        if (!cancelled) setProperties(res.data.data || []);
      } catch {
        if (!cancelled) setProperties([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="w-full">
      <div className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 sm:px-6 mb-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#222222]">Calendar</h1>
        <p className="text-sm text-[#6b7280]">Choose a listing to view its availability, block dates, and sync its own external calendar.</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-10 text-center">
          <p className="text-[#6b7280]">No properties yet. Add a property to manage its calendar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => (
            <Link
              key={p.id}
              to={`${base}/calendar/${p.id}`}
              className="bg-white rounded-[14px] border border-[#E5E7EB] overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#F7F7F5]">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#6b7280]">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold text-[#222222] group-hover:text-[#2563EB] transition-colors line-clamp-1">{p.title}</p>
                <p className="text-sm text-[#6b7280] mt-0.5">{p.location}</p>
                <span className="inline-flex items-center mt-3 text-xs font-semibold text-[#2563EB]">
                  View calendar
                  <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

CalendarPropertyPicker.propTypes = {
  base: PropTypes.string.isRequired,
};

function AdminCalendar() {
  const { id } = useParams();
  const location = useLocation();
  // Shared between the admin control centre (/admin/*) and the host workspace
  // (/host/*). Build frontend links against the active base so a host never
  // lands on an /admin/* URL. The backend /admin/properties/:id/calendar
  // endpoints are unchanged - they already scope by hostId.
  const base = location.pathname.startsWith('/host') ? '/host' : '/admin';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [calendarTab, setCalendarTab] = useState('view');
  const [selectedBlockEnd, setSelectedBlockEnd] = useState(null);
  const [pendingUnblock, setPendingUnblock] = useState(null);

  const [sourceDraft, setSourceDraft] = useState({ name: '', url: '' });
  const [blockDraft, setBlockDraft] = useState({ start: '', end: '', summary: '' });

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get(`/admin/properties/${id}/calendar`);
      setData(res.data.data);
    } catch {
      setError('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    load();
  }, [load, id]);

  async function addSource(e) {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post(`/admin/properties/${id}/calendar/sources`, sourceDraft);
      setSourceDraft({ name: '', url: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to add source');
    }
  }

  async function removeSource(sourceId) {
    if (!confirm('Remove this calendar feed and its imported blocks?')) return;
    try {
      await apiClient.delete(`/admin/properties/${id}/calendar/sources/${sourceId}`);
      load();
    } catch {
      alert('Failed to remove source');
    }
  }

  async function syncNow() {
    setSyncing(true);
    setError('');
    try {
      await apiClient.post(`/admin/properties/${id}/calendar/sync`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function addBlock(e) {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post(`/admin/properties/${id}/calendar/blocks`, {
        start: blockDraft.start,
        end: blockDraft.end,
        summary: blockDraft.summary || undefined,
      });
      setBlockDraft({ start: '', end: '', summary: '' });
      setSelectedBlockEnd(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to add block');
    }
  }

  function selectBlockDate(date) {
    const toInputDate = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    const start = blockDraft.start ? new Date(`${blockDraft.start}T00:00:00`) : null;
    if (!start || selectedBlockEnd) {
      setBlockDraft((draft) => ({ ...draft, start: toInputDate(date), end: '' }));
      setSelectedBlockEnd(null);
      return;
    }
    if (date < start) {
      setBlockDraft((draft) => ({ ...draft, start: toInputDate(date), end: '' }));
      return;
    }
    const exclusiveEnd = new Date(date);
    exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
    setBlockDraft((draft) => ({ ...draft, end: toInputDate(exclusiveEnd) }));
    setSelectedBlockEnd(date);
  }

  async function removeBlock(blockId) {
    try {
      await apiClient.delete(`/admin/properties/${id}/calendar/blocks/${blockId}`);
      setData((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== blockId) }));
    } catch {
      alert('Failed to remove block');
    }
  }

  function handleCalendarBlockClick(block, date) {
    setPendingUnblock({ block, date });
  }

  async function confirmUnblockDate() {
    if (!pendingUnblock) return;
    try {
      await apiClient.post(`/admin/properties/${id}/calendar/blocks/${pendingUnblock.block.id}/unblock-date`, { date: toLocalDate(pendingUnblock.date) });
      setPendingUnblock(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not unblock this date.');
    }
  }

  function copyFeed() {
    navigator.clipboard?.writeText(data.feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // No property selected (e.g. /host/calendar) - show a picker of the host's
  // own listings instead of trying to load a calendar without an id.
  if (!id) {
    return <CalendarPropertyPicker base={base} />;
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-red-600">{error || 'Calendar unavailable'}</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <Link to={`${base}/calendar`} className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors">&larr; All listing calendars</Link>
        <h1 className="text-2xl font-bold text-[#222222] mt-1">Calendar: {data.property.title}</h1>
        <p className="text-sm text-[#6b7280]">Two-way sync with Airbnb, Booking.com, VRBO and other platforms using iCal feeds.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          ['Upcoming stays', data.bookings?.filter((booking) => new Date(booking.checkOut || booking.end) >= new Date()).length || 0],
          ['Blocked ranges', data.blocks?.length || 0],
          ['Connected calendars', data.sources?.length || 0],
          ['Calendar status', data.sources?.some((source) => source.lastStatus?.startsWith('ERROR')) ? 'Action needed' : 'Synced'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">{label}</p>
            <p className="mt-2 text-xl font-bold text-[#222222]">{value}</p>
          </div>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">{error}</div>}

      <div className="flex gap-1 border-b border-[#E5E7EB] mb-6" role="tablist" aria-label="Calendar sections">
        {[['view', 'View'], ['availability', 'Availability'], ['settings', 'Settings']].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={calendarTab === value} onClick={() => setCalendarTab(value)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors duration-200 ${calendarTab === value ? 'border-[#2563EB] text-[#222222]' : 'border-transparent text-[#6b7280] hover:text-[#222222]'}`}>{label}</button>)}
      </div>

      {calendarTab === 'view' && <section className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-5 sm:p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b7280]">Availability</p><h2 className="text-2xl font-bold text-[#222222] mt-1">{monthCursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2></div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} aria-label="Previous month" className="w-10 h-10 rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F5] transition-colors text-[#222222]"><svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
            <button type="button" onClick={() => setMonthCursor(new Date())} className="px-4 rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F5] transition-colors text-sm font-semibold text-[#222222]">Today</button>
            <button type="button" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} aria-label="Next month" className="w-10 h-10 rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F5] transition-colors text-[#222222]"><svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
          </div>
        </div>
        <CalendarMonth month={monthCursor} blocks={data.blocks} bookings={data.bookings || []} onSelectDate={selectBlockDate} onBlockClick={handleCalendarBlockClick} selectedStart={blockDraft.start ? new Date(`${blockDraft.start}T00:00:00`) : null} selectedEnd={selectedBlockEnd} />
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#6b7280]">
            <span className="inline-flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-sm bg-[#222222]" />Booked</span>
            <span className="inline-flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-300" />Blocked</span>
            <span className="inline-flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-sm bg-white border border-[#E5E7EB]" />Available</span>
            <span>Click a start date, then the final night to block. Click a manual block to unblock it.</span>
          </div>
          <button type="button" disabled={!blockDraft.start || !blockDraft.end} onClick={() => addBlock({ preventDefault() {} })} className="bg-[#C49A6C] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#B8895C] transition-colors disabled:opacity-50">Block selected dates</button>
        </div>
      </section>}

      {/* Outbound feed */}
      {calendarTab === 'settings' && <section className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-[#222222] mb-1">Export this calendar</h2>
        <p className="text-sm text-[#6b7280] mb-4">Paste this link into Airbnb / Booking.com so they block the dates booked on ZuriLofts.</p>
        <div className="flex items-center gap-2">
          <input readOnly value={data.feedUrl} className={`${inputCls} font-mono text-xs`} onFocus={(e) => e.target.select()} />
          <button onClick={copyFeed} className="shrink-0 bg-[#C49A6C] text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-[#B8895C] transition-colors text-sm">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </section>}

      {/* Imported feeds */}
      {calendarTab === 'settings' && <section className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-[#222222]">Imported calendars</h2>
          <button
            onClick={syncNow}
            disabled={syncing || data.sources.length === 0}
            className="text-sm font-semibold px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-colors disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync now'}
          </button>
        </div>
        <p className="text-sm text-[#6b7280] mb-4">Add the iCal export URL from each platform to pull in their bookings.</p>
        <p className="text-sm text-[#6b7280] mb-4">Sync with Airbnb, Booking.com or Google Calendar - import their calendars to block your dates automatically, and share your ZuriLofts calendar with them.</p>

        {data.sources.length > 0 ? (
          <div className="space-y-2 mb-5">
            {data.sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-canvas rounded-xl px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-[#222222]">{s.name}</p>
                  <p className="text-[#6b7280] text-xs truncate max-w-md">{s.url}</p>
                  <p className={`text-xs mt-0.5 ${s.lastStatus?.startsWith('ERROR') ? 'text-red-600' : 'text-green-600'}`}>
                    {s.lastSyncedAt ? `${s.lastStatus} · ${new Date(s.lastSyncedAt).toLocaleString()}` : 'Not synced yet'}
                  </p>
                </div>
                <button onClick={() => removeSource(s.id)} className="shrink-0 text-red-600 hover:text-red-700 text-xs font-semibold ml-3">Remove</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6b7280] mb-5">No external calendars connected.</p>
        )}

        <form onSubmit={addSource} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className={labelCls}>Platform</label>
            <input className={inputCls} placeholder="Airbnb" value={sourceDraft.name} onChange={(e) => setSourceDraft({ ...sourceDraft, name: e.target.value })} required />
          </div>
          <div className="md:col-span-7">
            <label className={labelCls}>iCal URL</label>
            <input className={inputCls} placeholder="https://www.airbnb.com/calendar/ical/....ics" value={sourceDraft.url} onChange={(e) => setSourceDraft({ ...sourceDraft, url: e.target.value })} required />
          </div>
          <button type="submit" className="md:col-span-2 bg-[#C49A6C] text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-[#B8895C] transition-colors">Add feed</button>
        </form>
      </section>}

      {/* Blocked dates */}
      {calendarTab === 'availability' && <section className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#222222] mb-1">Blocked dates</h2>
        <p className="text-sm text-[#6b7280] mb-4">Select a start date, then the final night to block it. Existing stays can&apos;t be selected.</p>
        <CalendarMonth month={monthCursor} blocks={data.blocks} bookings={data.bookings || []} onSelectDate={selectBlockDate} onBlockClick={handleCalendarBlockClick} selectedStart={blockDraft.start ? new Date(`${blockDraft.start}T00:00:00`) : null} selectedEnd={selectedBlockEnd} />
        <div className="flex items-center justify-between gap-3 mt-4 mb-6"><p className="text-xs text-[#6b7280]">{blockDraft.start ? selectedBlockEnd ? `Selected: ${fmt(blockDraft.start)} - ${fmt(selectedBlockEnd)}` : 'Now select the final night.' : 'Select a start date to begin.'}</p>{blockDraft.start && <button type="button" onClick={() => { setBlockDraft((draft) => ({ ...draft, start: '', end: '' })); setSelectedBlockEnd(null); }} className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]">Clear selection</button>}</div>

        {data.blocks.length > 0 ? (
          <div className="space-y-2 mb-5">
            {data.blocks.map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-canvas rounded-xl px-4 py-2.5 text-sm">
                <div>
                  <span className="font-semibold text-[#222222]">{fmt(b.start)} &rarr; {fmt(b.end)}</span>
                  <span className="text-[#6b7280] ml-2">{b.summary || 'Blocked'}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${b.manual ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-[#2563EB]'}`}>
                    {b.manual ? 'Manual' : b.sourceName || 'Imported'}
                  </span>
                </div>
                {b.manual && (
                  <button onClick={() => removeBlock(b.id)} className="text-red-600 hover:text-red-700 text-xs font-semibold">Remove</button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6b7280] mb-5">No blocked dates.</p>
        )}

        <form onSubmit={addBlock} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5 rounded-xl bg-canvas px-4 py-2.5">
            <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Selected dates</p>
            <p className="text-sm font-semibold text-[#222222] mt-0.5">{blockDraft.start && selectedBlockEnd ? `${fmt(blockDraft.start)} - ${fmt(selectedBlockEnd)}` : 'Choose dates on the calendar above'}</p>
          </div>
          <div className="md:col-span-5">
            <label className={labelCls}>Reason</label>
            <input className={inputCls} placeholder="Maintenance" value={blockDraft.summary} onChange={(e) => setBlockDraft({ ...blockDraft, summary: e.target.value })} />
          </div>
          <button type="submit" disabled={!blockDraft.start || !blockDraft.end} className="md:col-span-2 bg-[#C49A6C] text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-[#B8895C] transition-colors disabled:opacity-50">Block dates</button>
        </form>
      </section>}
      {pendingUnblock && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="unblock-title">
        <div className="w-full max-w-md rounded-[14px] bg-white p-6 shadow-xl">
          <h2 id="unblock-title" className="text-lg font-bold text-[#222222]">Unblock this date?</h2>
          <p className="mt-2 text-sm text-[#6b7280]">{fmt(pendingUnblock.date)} will become available. Other dates in this blocked range will remain blocked.</p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setPendingUnblock(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#222222] border border-[#E5E7EB] hover:bg-[#F7F7F5] transition-colors">Cancel</button>
            <button type="button" onClick={confirmUnblockDate} className="rounded-lg bg-[#C49A6C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#B8895C] transition-colors">Unblock date</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

export default AdminCalendar;
