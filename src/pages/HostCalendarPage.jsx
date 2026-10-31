import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Label, TextInput, ToggleSwitch } from 'flowbite-react';
import HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';
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
  X,
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


// A booking bar sits below the date/price line, one 22px lane per stay, so a
// week with two bookings never hides one behind the other. The week's cells
// reserve that much height through the --cal-min custom property below.
const BAR_TOP = 40;
const BAR_STEP = 22;
const BAR_HEIGHT = 20;


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

/* Selection is keyed by calendar day (YYYY-MM-DD in local time) so a set of
   picks survives re-renders and can be merged into runs for the API, which
   stores availability as start/end ranges rather than single nights. */
function dayKey(date) {
  const day = midnight(date);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

function fromDayKey(key) {
  const [year, month, date] = key.split('-').map(Number);
  return new Date(year, month - 1, date);
}

/** Group picked nights into consecutive start/end runs; `end` is the check-out day. */
function groupRuns(days) {
  const sorted = [...days].sort((a, b) => a.getTime() - b.getTime());
  const runs = [];
  sorted.forEach((day) => {
    const last = runs[runs.length - 1];
    // last.end is already the day after the run, so a touching day extends it.
    if (last && last.end.getTime() === day.getTime()) {
      last.end = addDays(day, 1);
      return;
    }
    runs.push({ start: day, end: addDays(day, 1) });
  });
  return runs;
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

/** Nightly rate as it fits a phone cell: 6,300 becomes 6.3k. */
function compactMoney(value) {
  if (value == null) return '-';
  const amount = Number(value);
  if (amount < 1000) return amount.toLocaleString();
  const thousands = amount / 1000;
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
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
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface/60"
    >
      <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-navy">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />}
        <span className="truncate">{title}</span>
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
    // Phone cells have no room for a name, so the bar is a desktop layer; on a
    // phone the same nights read as the solid navy cell fill underneath.
    // The night it sits on is solid navy already, so the bar borrows the darker
    // navy plus a hairline edge to stay a legible chip on top of its own run.
    className={`absolute hidden items-center gap-1.5 overflow-hidden bg-navy-hover px-2 text-[11px] font-semibold text-white ring-1 ring-inset ring-white/25 transition-opacity hover:opacity-90 sm:flex ${startsHere ? 'rounded-l-md' : ''} ${endsHere ? 'rounded-r-md' : ''}`}
    style={{
      left: `${(firstVisible / 7) * 100}%`,
      width: `${((lastVisible - firstVisible + 1) / 7) * 100}%`,
      top: `${BAR_TOP + row * BAR_STEP}px`,
      height: `${BAR_HEIGHT}px`,
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

function MonthGrid({ weeks, monthAnchor, calendar, selectedKeys, onToggle }) {
  const today = midnight(new Date());
  const basePrice = calendar?.property?.price ?? 0;
  const priceRules = calendar?.priceRules || [];
  const bookings = calendar?.bookings || [];
  const blocks = calendar?.blocks || [];

  return <div className="select-none">
    {/* The weekday row shares the week row's exact template: seven equal
        tracks, no gap, the same width, so a label can never drift off its
        column. Only the bottom hairline is drawn, because the hint line above
        the grid already owns the top edge. */}
    <div className="grid grid-cols-7 border-b border-border bg-surface/60">
      {WEEKDAYS.map((day) => <span key={day} className="min-w-0 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted sm:text-[11px]">
        {/* A phone column is ~46px wide, so it gets a single letter. */}
        <span className="sm:hidden">{day[0]}</span>
        <span className="hidden sm:inline">{day}</span>
      </span>)}
    </div>

    {weeks.map((weekStart) => {
      const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
      const weekBookings = bookings.filter((booking) => days.some((day) => inStay(day, booking.start, booking.end)));
      // Bars stack, so an imported block and a booking on the same week never
      // hide each other.
      const barRows = weekBookings.length;

      // An empty week needs no extra lane, so the 72px floor covers it and each
      // bar past the first adds its own lane.
      const weekMinHeight = Math.max(64, 44 + barRows * BAR_STEP);

      return <div key={weekStart.toISOString()} className="relative border-b border-border last:border-b-0">
        <div className="grid grid-cols-7" style={{ '--cal-min': `${weekMinHeight}px` }}>
          {days.map((day) => {
            const outside = day.getMonth() !== monthAnchor.getMonth();
            const isToday = sameDay(day, today);
            const isSelected = selectedKeys.includes(dayKey(day));
            const blocked = blocks.some((block) => inStay(day, block.start, block.end));
            const stay = bookings.some((booking) => inStay(day, booking.start, booking.end));
            const nightPrice = priceFor(day, basePrice, priceRules);
            // A booked night cannot be blocked or opened, and a day lent in from
            // the next month is not a night of this month, so both are labels.
            const label = `${day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}: ${stay ? 'booked' : blocked ? 'blocked' : `open, ${money(nightPrice)}`}`;
            return <button
              key={day.toISOString()}
              type="button"
              onClick={(event) => { if (!stay && !outside) onToggle(day, event.shiftKey); }}
              aria-pressed={isSelected}
              disabled={stay || outside}
              aria-label={`${label}${outside ? ', outside this month' : stay ? ', not editable' : isSelected ? ', selected' : ', tap to select'}`}
              className={`flex min-h-[48px] min-w-0 flex-col border-l border-border px-1 pb-1 pt-1 text-left transition-colors first:border-l-0 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:min-h-[var(--cal-min,64px)] sm:px-2 sm:pb-1.5 sm:pt-1.5 ${
                isSelected
                  ? 'bg-navy/10 ring-1 ring-inset ring-navy'
                  : stay
                    ? 'bg-navy-bg'
                    : blocked
                      ? 'bg-[#B9C3D1] hover:bg-[#AEBAC9]'
                      : `${outside ? 'bg-canvas' : 'bg-elevated'} hover:bg-surface`
              }${isToday && !isSelected ? ' ring-1 ring-inset ring-bronze' : ''}`}
            >
              {/* Number over price, both left-aligned from sm up and centred on
                  a phone. Stacking holds every rate in the same place, so a
                  column of prices reads straight down instead of drifting out to
                  the far edge of each cell. */}
              <span className="flex min-w-0 flex-col items-center gap-0.5 sm:items-start sm:gap-px">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums sm:text-[15px] ${isSelected ? 'bg-navy text-white' : stay ? 'text-white' : outside ? 'text-muted/60' : 'text-navy'}`}>
                  {day.getDate()}
                </span>
                <span className={`min-w-0 max-w-full truncate text-[9px] font-medium leading-tight tabular-nums sm:text-[10px] ${stay ? 'text-white/75' : blocked ? 'text-navy-bg/70' : outside ? 'text-muted/50' : 'text-muted'}`}>
                  <span className="sm:hidden">{compactMoney(nightPrice)}</span>
                  <span className="hidden sm:inline">{money(nightPrice)}</span>
                </span>
              </span>

              {blocked && !stay && <span className="mt-1 hidden items-center gap-1 text-[10px] text-navy-bg/70 sm:inline-flex">
                <Ban className="h-2.5 w-2.5" strokeWidth={2} aria-hidden="true" />Blocked
              </span>}

              {/* The fill alone reads the state on a phone - booked is navy,
                  blocked is grey - so the foot strip that duplicated it is gone. */}


            </button>;
          })}
        </div>

        {weekBookings.map((booking, index) => <StayBar key={booking.id} booking={booking} weekStart={weekStart} row={index} />)}
      </div>;
    })}
  </div>;
}

MonthGrid.propTypes = {
  weeks: PropTypes.arrayOf(PropTypes.instanceOf(Date)).isRequired,
  monthAnchor: PropTypes.instanceOf(Date).isRequired,
  calendar: PropTypes.object,
  selectedKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggle: PropTypes.func.isRequired,
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
  const [selectedKeys, setSelectedKeys] = useState([]);
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

  function goToday() {
    setMonthAnchor(firstOfMonth(new Date()));
  }

  /** Click picks a night; shift-click fills the range from the previous pick. */
  function toggleDay(day, extend) {
    const key = dayKey(day);
    setSelectedKeys((current) => {
      const anchor = current[current.length - 1];
      if (extend && anchor) {
        const from = fromDayKey(anchor);
        const to = midnight(day);
        const step = to.getTime() >= from.getTime() ? 1 : -1;
        const keys = new Set(current);
        for (let cursor = from; step > 0 ? cursor.getTime() <= to.getTime() : cursor.getTime() >= to.getTime(); cursor = addDays(cursor, step)) {
          keys.add(dayKey(cursor));
        }
        return [...keys];
      }
      return current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    });
  }

  function clearSelection() {
    setSelectedKeys([]);
  }

  const selectedDays = useMemo(() => selectedKeys.map(fromDayKey).sort((a, b) => a.getTime() - b.getTime()), [selectedKeys]);
  const selectedBlockedDays = useMemo(() => {
    const blocks = calendar?.blocks || [];
    return selectedDays.filter((day) => blocks.some((block) => inStay(day, block.start, block.end)));
  }, [calendar, selectedDays]);
  const selectedOpenDays = useMemo(() => {
    const blocks = calendar?.blocks || [];
    const bookings = calendar?.bookings || [];
    return selectedDays.filter((day) => !bookings.some((booking) => inStay(day, booking.start, booking.end)) && !blocks.some((block) => inStay(day, block.start, block.end)));
  }, [calendar, selectedDays]);
  const selectedAllOpen = selectedDays.length > 0 && selectedBlockedDays.length === 0;

  // Month totals for the strip above the grid: the summary a host would
  // otherwise work out by counting cells.
  const monthNights = useMemo(() => {
    const offerings = calendar?.bookings || [];
    const blocks = calendar?.blocks || [];
    const daysInMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate();
    let booked = 0;
    let blocked = 0;
    for (let date = 1; date <= daysInMonth; date += 1) {
      const day = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), date);
      if (offerings.some((booking) => inStay(day, booking.start, booking.end))) booked += 1;
      else if (blocks.some((block) => inStay(day, block.start, block.end))) blocked += 1;
    }
    return { booked, blocked };
  }, [calendar, monthAnchor]);

  /** Block every open night in the selection, one request per consecutive run. */
  async function blockSelected() {
    if (!activePropertyId || selectedOpenDays.length === 0) return;
    setSaving(true);
    try {
      const runs = groupRuns(selectedOpenDays);
      for (const run of runs) {
        await apiClient.post(`/properties/${activePropertyId}/calendar/blocks`, {
          start: dayKey(run.start),
          end: dayKey(run.end),
          summary: 'Blocked from calendar',
        });
      }
      await load({ silent: true });
      clearSelection();
      const nights = selectedOpenDays.length;
      toast.success(`${nights} ${nights === 1 ? 'night' : 'nights'} blocked.`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Could not block those dates.');
    } finally {
      setSaving(false);
    }
  }

  /**
   * Reopen blocked nights in the selection. Unblocking a single night splits its
   * block server-side and hands back new block ids, so each call re-reads the
   * calendar before picking the next block to trim.
   */
  async function openSelected() {
    if (!activePropertyId || selectedBlockedDays.length === 0) return;
    setSaving(true);
    let remaining = new Set(selectedBlockedDays.map(dayKey));
    try {
      for (let attempt = 0; attempt < 60 && remaining.size > 0; attempt += 1) {
        const response = await apiClient.get(`/properties/${activePropertyId}/calendar`);
        const latest = response.data.data;
        const blocks = latest?.blocks || [];
        const target = [...remaining].map(fromDayKey).find((day) => blocks.some((block) => inStay(day, block.start, block.end)));
        if (!target) break;
        const block = blocks.find((item) => inStay(target, item.start, item.end));
        if (!block.manual) {
          // Imported blocks belong to the other platform; say so once and stop.
          toast.error('Some dates come from a connected calendar. Remove that feed to free them.');
          break;
        }
        await apiClient.post(`/properties/${activePropertyId}/calendar/blocks/${block.id}/unblock-date`, { date: dayKey(target) });
        remaining.delete(dayKey(target));
      }
      await load({ silent: true });
      const opened = selectedBlockedDays.length - remaining.size;
      clearSelection();
      if (opened > 0) toast.success(`${opened} ${opened === 1 ? 'night' : 'nights'} opened again.`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Could not open those dates.');
    } finally {
      setSaving(false);
    }
  }

  /** One switch for the pick, like the reference's Available toggle: on opens
      every selected night, off blocks them. */
  function toggleSelectedAvailability(nextAvailable) {
    if (nextAvailable) openSelected();
    else blockSelected();
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
  const stayCount = (calendar?.bookings || []).length;
  const selectionCount = selectedDays.length;
  const shownMonth = firstOfMonth(new Date());
  const onCurrentMonth = monthAnchor.getFullYear() === shownMonth.getFullYear() && monthAnchor.getMonth() === shownMonth.getMonth();
  const monthStats = [
    { label: 'Nights booked', shortLabel: 'Booked', value: monthNights.booked },
    { label: 'Nights blocked', shortLabel: 'Blocked', value: monthNights.blocked },
    { label: 'Base rate', shortLabel: 'Base rate', value: money(basePrice) },
  ];

  return <div className="space-y-4">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={HOST_EYEBROW}>HOST WORKSPACE</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Calendar</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Every night you can sell, what it costs, and who is already booked.</p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
        {properties.length > 1 && <div className="relative w-full sm:w-64">
          <label className="sr-only" htmlFor="calendar-property">Listing</label>
          <select
            id="calendar-property"
            value={activePropertyId || ''}
            onChange={(event) => navigate(`/host/calendar/${event.target.value}`)}
            className="h-11 w-full appearance-none rounded-full border border-border bg-elevated pl-3 pr-8 text-xs font-semibold text-navy focus:border-primary focus:outline-none focus:ring-0"
          >
            {properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" strokeWidth={2} aria-hidden="true" />
        </div>}

        {/* Month paging is one control, not two arrows at opposite edges: on a
            phone the label and its arrows stay together as a single pill. */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="flex min-w-0 flex-1 items-center justify-between gap-1 rounded-full border border-border bg-elevated p-1 sm:flex-none">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              aria-label="Previous month"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-navy transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
            <span className="min-w-0 flex-1 truncate px-1 text-center text-sm font-semibold text-navy sm:min-w-[7.5rem] sm:flex-none">{formatMonth(monthAnchor)}</span>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              aria-label="Next month"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-navy transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          <Button type="button" size="xs" color="light" onClick={goToday} disabled={onCurrentMonth} className="min-h-[44px] shrink-0">Today</Button>
        </div>
      </div>
    </header>

    {error && <Alert color="failure">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1">{error}</p>
        <Button type="button" size="xs" color="light" onClick={() => load()}>Try again</Button>
      </div>
    </Alert>}

    {loading ? <HostCard aria-label="Loading calendar">
      <span className="block h-[420px] animate-pulse rounded-lg bg-surface" />
    </HostCard> : !activePropertyId ? <HostCard className="py-12 text-center">
      <CalendarDays className="mx-auto h-6 w-6 text-muted" strokeWidth={1.6} aria-hidden="true" />
      <strong className="mt-2 block text-base font-semibold text-navy">No listings to manage</strong>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">Add a listing before setting availability.</p>
      <Button as={Link} to="/host/properties/new" size="sm" className="mx-auto mt-4 w-fit">Add a listing</Button>
    </HostCard> : <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
      {/* Flush: the grid and the totals strip run edge to edge, while the head
          keeps its padding so it still lines up with the side panel. */}
      <section aria-label="Month calendar">
      <HostCard flush className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-navy">{calendar?.property?.title || 'Your stay'}</h2>
            <p className="text-xs text-muted">
              {stayCount} {stayCount === 1 ? 'stay' : 'stays'} booked
              {selectionCount > 0 && <> <span aria-hidden="true">·</span> {selectionCount} {selectionCount === 1 ? 'night' : 'nights'} selected</>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-navy-bg" aria-hidden="true" />Booked</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#B9C3D1]" aria-hidden="true" />Blocked</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-border bg-elevated" aria-hidden="true" />Open</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-primary bg-elevated" aria-hidden="true" />Today</span>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-surface/40">
          {monthStats.map((stat) => <div key={stat.label} className="min-w-0 px-3 py-2 sm:px-4">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted"><span className="sm:hidden">{stat.shortLabel}</span><span className="hidden sm:inline">{stat.label}</span></p>
            <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-navy">{stat.value}</p>
          </div>)}
        </div>

        <p className="border-b border-border px-4 py-2 text-[11px] leading-relaxed text-muted">
          Tap the nights you want, then block or open them together. Shift-click fills a whole range.
        </p>

        <MonthGrid
          weeks={weeks}
          monthAnchor={monthAnchor}
          calendar={calendar}
          selectedKeys={selectedKeys}
          onToggle={toggleDay}
        />
        </HostCard>
      </section>

      <aside aria-label="Calendar settings" className="h-fit">
        <HostCard flush>
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-navy">Pricing and availability</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">Changes here apply to this stay only.</p>
        </div>

        {selectionCount > 0 && <div className="border-b border-border bg-[#F7F9FC] px-4 py-3">
          <p className="text-[11px] font-semibold text-navy">{selectionCount} {selectionCount === 1 ? 'night' : 'nights'} selected</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
            {selectedOpenDays.length > 0 && `${selectedOpenDays.length} open`}
            {selectedOpenDays.length > 0 && selectedBlockedDays.length > 0 && ' · '}
            {selectedBlockedDays.length > 0 && `${selectedBlockedDays.length} blocked`}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold text-navy">Available</span>
            <ToggleSwitch
              checked={selectedAllOpen}
              onChange={toggleSelectedAvailability}
              disabled={saving}
              sizing="sm"
              aria-label="Selected nights are available"
            />
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted">On opens these nights, off blocks them.</p>
          <button type="button" onClick={clearSelection} className="mt-2 w-full text-left text-[10px] text-muted underline underline-offset-2 hover:text-navy">Clear selection</button>
        </div>}

        <SidebarSection title="Pricing" icon={Wallet} defaultOpen>
          <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
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
        </HostCard>
      </aside>
    </div>}

    {/* Floating action bar: the grid is tall, so the buttons for a multi-day
        pick follow the host instead of sitting off-screen above the month. */}
    {!loading && activePropertyId && selectionCount > 0 && <div
      className="fixed inset-x-3 bottom-[calc(var(--zl-bottom-nav-space)_+_10px)] z-30 mx-auto flex max-w-md items-center gap-2 rounded-full border border-border bg-elevated px-2 py-2 shadow-xl md:inset-x-auto md:right-6 md:bottom-6"
      role="region"
      aria-label="Selected dates"
    >
      <span className="pl-1 pr-1 text-xs font-semibold tabular-nums text-navy">{selectionCount} {selectionCount === 1 ? 'night' : 'nights'}</span>
      <Button type="button" size="xs" color="dark" className="min-h-[44px]" disabled={saving || selectedOpenDays.length === 0} onClick={blockSelected}>{saving ? 'Saving...' : 'Block'}</Button>
      <Button type="button" size="xs" color="light" className="min-h-[44px]" disabled={saving || selectedBlockedDays.length === 0} onClick={openSelected}>Open</Button>
      <button type="button" onClick={clearSelection} aria-label="Clear selection" className="ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-navy">
        <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>}
  </div>;
}
