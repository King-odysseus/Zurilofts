import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';

const labelCls = 'block text-sm font-semibold text-[#1f2937] mb-2';
const inputCls =
  'w-full px-4 py-2.5 rounded-xl border border-[#D9D9D9] focus:outline-none focus:border-[#C49A6C] bg-white text-[#1f2937]';

const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

function CalendarMonth({ month, blocks, bookings, onSelectDate, selectedStart, selectedEnd }) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (start.getDay() + 6) % 7;
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => index - offset + 1);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const occupied = (date, item) => date >= new Date(item.start) && date < new Date(item.end);
  return <div className="grid grid-cols-7 border-l border-t border-[#D9D9D9] rounded-2xl overflow-hidden">
    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="bg-[#f8f9fa] p-3 text-center text-xs font-semibold text-[#6b7280] border-r border-b border-[#D9D9D9]">{day}</div>)}
    {cells.map((day, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      const inMonth = day > 0 && day <= days;
      const booking = inMonth && bookings.find((item) => occupied(date, item));
      const block = inMonth && blocks.find((item) => occupied(date, item));
      const isToday = sameDay(date, new Date());
      const isSelected = selectedStart && selectedEnd && date >= selectedStart && date <= selectedEnd;
      return <button type="button" key={index} disabled={!inMonth || !onSelectDate || Boolean(booking)} onClick={() => onSelectDate?.(date)} className={`min-h-[96px] p-2 border-r border-b border-[#D9D9D9] text-left ${inMonth ? 'bg-white' : 'bg-[#f8f9fa]/70'} ${block ? 'bg-[#0B0B45]/5' : ''} ${isSelected ? 'bg-[#C49A6C]/20' : ''} ${onSelectDate && inMonth && !booking ? 'hover:bg-[#C49A6C]/10 cursor-pointer' : ''}`}>
        {inMonth && <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-[#C49A6C] text-white' : 'text-[#0B0B45]'}`}>{day}</span>}
        {booking && <div className="mt-2 rounded-lg bg-[#0B0B45] text-white px-2 py-1.5 text-xs font-semibold truncate" title={`${booking.guestName} · ${booking.guests} guests`}>{booking.guestName}</div>}
        {!booking && block && <div className="mt-2 rounded-lg bg-[#C49A6C]/20 text-[#0B0B45] px-2 py-1.5 text-xs font-semibold truncate">{block.summary || 'Blocked'}</div>}
      </button>;
    })}
  </div>;
}

CalendarMonth.propTypes = { month: PropTypes.instanceOf(Date).isRequired, blocks: PropTypes.array.isRequired, bookings: PropTypes.array.isRequired, onSelectDate: PropTypes.func, selectedStart: PropTypes.instanceOf(Date), selectedEnd: PropTypes.instanceOf(Date) };

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0B0B45]">Calendar</h1>
        <p className="text-sm text-[#6b7280]">Choose a listing to view its availability, block dates, and sync its own external calendar.</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#D9D9D9] p-10 text-center">
          <p className="text-[#6b7280]">No properties yet. Add a property to manage its calendar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => (
            <Link
              key={p.id}
              to={`${base}/calendar/${p.id}`}
              className="bg-white rounded-2xl border border-[#D9D9D9] overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#D9D9D9]/30">
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
                <p className="font-semibold text-[#0B0B45] group-hover:text-[#C49A6C] transition-colors line-clamp-1">{p.title}</p>
                <p className="text-sm text-[#6b7280] mt-0.5">{p.location}</p>
                <span className="inline-flex items-center mt-3 text-xs font-semibold text-[#C49A6C]">
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
        <div className="w-8 h-8 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-red-600">{error || 'Calendar unavailable'}</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <Link to={`${base}/calendar`} className="text-sm text-[#6b7280] hover:text-[#C49A6C]">&larr; All listing calendars</Link>
        <h1 className="text-2xl font-bold text-[#0B0B45] mt-1">Calendar: {data.property.title}</h1>
        <p className="text-sm text-[#6b7280]">Two-way sync with Airbnb, Booking.com, VRBO and other platforms using iCal feeds.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">{error}</div>}

      <div className="flex gap-1 border-b border-[#D9D9D9] mb-6" role="tablist" aria-label="Calendar sections">
        {[['view', 'View'], ['availability', 'Availability'], ['settings', 'Settings']].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={calendarTab === value} onClick={() => setCalendarTab(value)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 ${calendarTab === value ? 'border-[#C49A6C] text-[#0B0B45]' : 'border-transparent text-[#6b7280]'}`}>{label}</button>)}
      </div>

      {calendarTab === 'view' && <section className="bg-white rounded-2xl border border-[#D9D9D9] p-5 sm:p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#C49A6C]">Availability</p><h2 className="text-2xl font-bold text-[#0B0B45] mt-1">{monthCursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2></div>
          <div className="flex gap-2"><button type="button" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} className="w-10 h-10 rounded-full border border-[#D9D9D9] text-[#0B0B45]">←</button><button type="button" onClick={() => setMonthCursor(new Date())} className="px-4 rounded-full border border-[#D9D9D9] text-sm font-semibold text-[#0B0B45]">Today</button><button type="button" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} className="w-10 h-10 rounded-full border border-[#D9D9D9] text-[#0B0B45]">→</button></div>
        </div>
        <CalendarMonth month={monthCursor} blocks={data.blocks} bookings={data.bookings || []} />
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-[#6b7280]"><span><i className="inline-block w-2.5 h-2.5 rounded-sm bg-[#0B0B45] mr-1.5" />Booking</span><span><i className="inline-block w-2.5 h-2.5 rounded-sm bg-[#C49A6C]/30 mr-1.5" />Blocked date</span></div>
      </section>}

      {/* Outbound feed */}
      {calendarTab === 'settings' && <section className="bg-white rounded-2xl border border-[#D9D9D9] p-6 mb-6">
        <h2 className="text-lg font-bold text-[#0B0B45] mb-1">Export this calendar</h2>
        <p className="text-sm text-[#6b7280] mb-4">Paste this link into Airbnb / Booking.com so they block the dates booked on ZuriLofts.</p>
        <div className="flex items-center gap-2">
          <input readOnly value={data.feedUrl} className={`${inputCls} font-mono text-xs`} onFocus={(e) => e.target.select()} />
          <button onClick={copyFeed} className="shrink-0 bg-[#0B0B45] text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-[#06062a] transition-colors text-sm">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </section>}

      {/* Imported feeds */}
      {calendarTab === 'settings' && <section className="bg-white rounded-2xl border border-[#D9D9D9] p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-[#0B0B45]">Imported calendars</h2>
          <button
            onClick={syncNow}
            disabled={syncing || data.sources.length === 0}
            className="text-sm font-semibold px-4 py-2 rounded-full border border-[#D9D9D9] text-[#0B0B45] hover:border-[#C49A6C] hover:text-[#C49A6C] transition-colors disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync now'}
          </button>
        </div>
        <p className="text-sm text-[#6b7280] mb-4">Add the iCal export URL from each platform to pull in their bookings.</p>
        <p className="text-sm text-[#6b7280] mb-4">Sync with Airbnb, Booking.com or Google Calendar - import their calendars to block your dates automatically, and share your ZuriLofts calendar with them.</p>

        {data.sources.length > 0 ? (
          <div className="space-y-2 mb-5">
            {data.sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-[#f8f9fa] rounded-xl px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-[#0B0B45]">{s.name}</p>
                  <p className="text-[#6b7280] text-xs truncate max-w-md">{s.url}</p>
                  <p className={`text-xs mt-0.5 ${s.lastStatus?.startsWith('ERROR') ? 'text-red-600' : 'text-green-700'}`}>
                    {s.lastSyncedAt ? `${s.lastStatus} · ${new Date(s.lastSyncedAt).toLocaleString()}` : 'Not synced yet'}
                  </p>
                </div>
                <button onClick={() => removeSource(s.id)} className="shrink-0 text-red-600 hover:text-red-800 text-xs font-semibold ml-3">Remove</button>
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
          <button type="submit" className="md:col-span-2 bg-[#C49A6C] text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-[#b8895c] transition-colors">Add feed</button>
        </form>
      </section>}

      {/* Blocked dates */}
      {calendarTab === 'availability' && <section className="bg-white rounded-2xl border border-[#D9D9D9] p-6">
        <h2 className="text-lg font-bold text-[#0B0B45] mb-1">Blocked dates</h2>
        <p className="text-sm text-[#6b7280] mb-4">Select a start date, then the final night to block it. Existing stays can&apos;t be selected.</p>
        <CalendarMonth month={monthCursor} blocks={data.blocks} bookings={data.bookings || []} onSelectDate={selectBlockDate} selectedStart={blockDraft.start ? new Date(`${blockDraft.start}T00:00:00`) : null} selectedEnd={selectedBlockEnd} />
        <div className="flex items-center justify-between gap-3 mt-4 mb-6"><p className="text-xs text-[#6b7280]">{blockDraft.start ? selectedBlockEnd ? `Selected: ${fmt(blockDraft.start)} – ${fmt(selectedBlockEnd)}` : 'Now select the final night.' : 'Select a start date to begin.'}</p>{blockDraft.start && <button type="button" onClick={() => { setBlockDraft((draft) => ({ ...draft, start: '', end: '' })); setSelectedBlockEnd(null); }} className="text-xs font-semibold text-[#0B0B45] hover:text-[#C49A6C]">Clear selection</button>}</div>

        {data.blocks.length > 0 ? (
          <div className="space-y-2 mb-5">
            {data.blocks.map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-[#f8f9fa] rounded-xl px-4 py-2.5 text-sm">
                <div>
                  <span className="font-semibold text-[#0B0B45]">{fmt(b.start)} &rarr; {fmt(b.end)}</span>
                  <span className="text-[#6b7280] ml-2">{b.summary || 'Blocked'}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${b.manual ? 'bg-[#C49A6C]/15 text-[#8a6a3e]' : 'bg-blue-100 text-blue-700'}`}>
                    {b.manual ? 'Manual' : b.sourceName || 'Imported'}
                  </span>
                </div>
                {b.manual && (
                  <button onClick={() => removeBlock(b.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Remove</button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6b7280] mb-5">No blocked dates.</p>
        )}

        <form onSubmit={addBlock} className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className={labelCls}>From</label>
            <input type="date" className={inputCls} value={blockDraft.start} onChange={(e) => setBlockDraft({ ...blockDraft, start: e.target.value })} required />
          </div>
          <div className="md:col-span-3">
            <label className={labelCls}>To</label>
            <input type="date" className={inputCls} value={blockDraft.end} onChange={(e) => setBlockDraft({ ...blockDraft, end: e.target.value })} required />
          </div>
          <div className="md:col-span-4">
            <label className={labelCls}>Reason</label>
            <input className={inputCls} placeholder="Maintenance" value={blockDraft.summary} onChange={(e) => setBlockDraft({ ...blockDraft, summary: e.target.value })} />
          </div>
          <button type="submit" className="md:col-span-2 bg-[#0B0B45] text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-[#06062a] transition-colors">Block</button>
        </form>
      </section>}
    </div>
  );
}

export default AdminCalendar;
