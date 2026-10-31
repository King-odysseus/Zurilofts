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
import CalendarQuickSheet from '../components/CalendarQuickSheet.jsx';
import NightSettingsPanel from '../components/NightSettingsPanel.jsx';
import SelectMenu from '../components/SelectMenu.jsx';
import { useToast } from '../context/ToastContext.jsx';

// The host calendar, shaped like the reference screen: one month at a time, a
// cell per night showing that night's price, bookings drawn as a bar across the
// dates they occupy, and the pricing and availability controls beside the grid
// rather than on another page. A host should be able to answer "is this night
// free, and what does it cost" without leaving the month.

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];


// Each night is its own rounded tile, so a week has to be tall enough for the
// number, the rate and any stay lanes. A booking bar sits below the date/price
// line, one 22px lane per stay, so a week with two bookings never hides one
// behind the other. The week's tiles reserve that height through the --cal-min
// custom property below.
const TILE_MIN = 92;
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

// Calendar arithmetic, not "now plus 24 hours at a stretch": a fixed DAY_MS
// step drifts across a daylight-saving change, which shifted every week after
// the transition back by an hour and made the grid repeat a day (25 October
// appeared twice, and 1 November never rendered). setDate() moves in calendar
// days, so midnight stays midnight in whatever zone the host is in.
function addDays(date, amount) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + amount);
  return next;
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
    // `end` is the check-out day, the same half-open range the server prices
    // with, so the last night a rule covers is the day before it.
    return night >= start && night < end;
  });
  return rule ? rule.price : basePrice;
}

function coversNight(rule, day) {
  const night = midnight(day).getTime();
  return midnight(rule.start).getTime() <= night && night < midnight(rule.end).getTime();
}

/** A promotion is a dated rate whose name carries the percentage it took off. */
function isPromotionRule(rule) {
  return (rule.name || '').startsWith('Promotion ');
}

function promotionPercentIn(rule) {
  const percent = Number((rule.name || '').replace(/[^0-9]/g, ''));
  return percent > 0 ? percent : null;
}

function runNights(run) {
  const nights = [];
  for (let day = midnight(run.start); day.getTime() < midnight(run.end).getTime(); day = addDays(day, 1)) {
    nights.push(day);
  }
  return nights;
}

/**
 * Rewrite the dated rules of one kind for a run of picked nights.
 *
 * The API can add and delete a rule but not update one, so a rule overlapping
 * the run is cut: it is deleted and the nights before and after it are written
 * back with the same terms. The run's own rule goes in last, which leaves one
 * rule per night instead of several quietly competing for the same date.
 * Returning null from `makeRule` clears the run instead of setting anything.
 */
async function replaceDatedRulesForRuns({ listPath, runs, makeRule, keepOutside }) {
  for (const run of runs) {
    const from = midnight(run.start).getTime();
    const to = midnight(run.end).getTime();
    const latest = (await apiClient.get(listPath)).data.data || [];
    for (const rule of latest) {
      const start = midnight(rule.start).getTime();
      const end = midnight(rule.end).getTime();
      if (start >= to || end <= from) continue;
      await apiClient.delete(`${listPath}/${rule.id}`);
      if (start < from) {
        await apiClient.post(listPath, keepOutside(rule, { start: rule.start, end: run.start }));
      }
      if (end > to) {
        await apiClient.post(listPath, keepOutside(rule, { start: run.end, end: rule.end }));
      }
    }
    const body = makeRule(run);
    if (body) await apiClient.post(listPath, body);
  }
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

  // The chip spans grid tracks rather than a percentage of the row: the overlay
  // grid carries the same tracks and gap as the night tiles, so a stay lines up
  // with the nights it covers even when the gap changes. Phone tiles have no
  // room for a name, so the chip is a desktop layer; on a phone the same nights
  // read as the solid navy tile fill underneath.
  return <Link
    to={`/host/reservations/${booking.id}`}
    className="pointer-events-auto flex items-center gap-1.5 self-start overflow-hidden rounded-full bg-white px-2 text-[11px] font-semibold text-navy-bg shadow-sm ring-1 ring-inset ring-navy-bg/15 transition-opacity hover:opacity-90"
    style={{
      gridColumn: `${firstVisible + 1} / span ${lastVisible - firstVisible + 1}`,
      gridRow: 1,
      marginTop: `${BAR_TOP + row * BAR_STEP}px`,
      height: `${BAR_HEIGHT}px`,
    }}
    title={`${booking.guestName || 'Guest'}, ${formatDay(booking.start)} to ${formatDay(booking.end)}`}
  >
    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-navy-bg text-[8px] font-bold text-white">{initialsOf(booking.guestName)}</span>
    <span className="truncate">{booking.guestName || 'Guest'}{booking.guests > 1 ? ` + ${booking.guests - 1}` : ''}</span>
  </Link>;
}

StayBar.propTypes = {
  booking: PropTypes.object.isRequired,
  weekStart: PropTypes.instanceOf(Date).isRequired,
  row: PropTypes.number.isRequired,
};

/**
 * A booked run on a phone. The reference replaces the individual night cells of
 * a stay with one tile carrying the guest's initials and "Reserved", so the
 * dates of those nights are covered rather than shown. A one-night stay is a
 * single column (~46px) with no room for the label, so it shows initials alone.
 */
function ReservedTile({ booking, weekStart }) {
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const firstVisible = weekDays.findIndex((day) => inStay(day, booking.start, booking.end));
  if (firstVisible < 0) return null;

  let lastVisible = firstVisible;
  for (let index = firstVisible; index < 7; index += 1) {
    if (inStay(weekDays[index], booking.start, booking.end)) lastVisible = index;
  }
  const span = lastVisible - firstVisible + 1;

  return <Link
    to={`/host/reservations/${booking.id}`}
    aria-label={`Reserved, ${booking.guestName || 'guest'}, ${formatDay(booking.start)} to ${formatDay(booking.end)}`}
    className="pointer-events-auto flex h-full min-w-0 items-center gap-1.5 overflow-hidden rounded-[10px] border border-border bg-elevated px-1.5"
    style={{ gridColumn: `${firstVisible + 1} / span ${span}`, gridRow: 1 }}
  >
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy-bg text-[9px] font-bold text-white">{initialsOf(booking.guestName)}</span>
    {span > 1 && <span className="min-w-0 truncate text-[10px] font-semibold text-navy">Reserved</span>}
  </Link>;
}

ReservedTile.propTypes = {
  booking: PropTypes.object.isRequired,
  weekStart: PropTypes.instanceOf(Date).isRequired,
};

function MonthGrid({ weeks, monthAnchor, calendar, selectedKeys, onToggle }) {
  // The grid is generated as six whole weeks so the arithmetic never runs short.
  // A month that ends mid-week leaves a last row made entirely of next-month
  // days, which would draw a band of empty tiles under the month, so any week
  // holding no night of this month is dropped.
  const visibleWeeks = weeks.filter((weekStart) => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
    .some((day) => day.getMonth() === monthAnchor.getMonth()));

  const today = midnight(new Date());
  const basePrice = calendar?.property?.price ?? 0;
  const priceRules = calendar?.priceRules || [];
  const bookings = calendar?.bookings || [];
  const blocks = calendar?.blocks || [];

  // Airbnb's month is a field of separate rounded tiles: the gap between tiles
  // carries the rhythm, so no cell is drawn with grid lines. The weekday row
  // keeps the same seven tracks and the same gap, or a label would drift off
  // its column.
  return <div className="select-none px-4 pb-3 sm:pb-4">
    {/* The weekday strip pins under the workspace header while the month
        scrolls beneath it, the way the reference keeps the column letters in
        view down a long month. The negative margin lets the strip run full
        bleed while the letters stay on the same gutter as the tiles below. Its
        background must be opaque: the tiles pass underneath it. */}
    <div className="sticky top-16 z-20 -mx-4 bg-elevated px-4 pb-1 pt-1.5 sm:static sm:mx-0 sm:px-0 sm:py-0">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((day) => <span key={day} className="min-w-0 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted sm:text-[11px]">
          {/* A phone column is ~46px wide, so it gets a single letter. */}
          <span className="sm:hidden">{day[0]}</span>
          <span className="hidden sm:inline">{day}</span>
        </span>)}
      </div>
    </div>

    {visibleWeeks.map((weekStart) => {
      const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
      const weekBookings = bookings.filter((booking) => days.some((day) => inStay(day, booking.start, booking.end)));
      // Bars stack, so an imported block and a booking on the same week never
      // hide each other.
      const barRows = weekBookings.length;

      // The tile floor covers a week with no stays; each stay past the first
      // adds its own lane, then 26px keeps the lanes clear of the rate at the
      // foot of the tile.
      const weekMinHeight = Math.max(TILE_MIN, BAR_TOP + barRows * BAR_STEP + 26);

      return <div key={weekStart.toISOString()} className="relative">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2" style={{ '--cal-min': `${weekMinHeight}px` }}>
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
              className={`flex min-h-[92px] min-w-0 flex-col justify-between gap-1 rounded-[10px] border p-1.5 text-left transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:min-h-[var(--cal-min,104px)] sm:rounded-2xl sm:p-2.5 ${
                isSelected || stay
                  ? 'border-navy-bg bg-navy-bg text-white'
                  : blocked
                    ? 'border-transparent bg-[#B9C3D1] hover:bg-[#AEBAC9]'
                    : outside
                      ? 'border-transparent bg-transparent'
                      : 'border-border bg-elevated hover:border-primary/40 hover:bg-surface'
              }${isToday && !isSelected && !stay ? ' ring-1 ring-inset ring-bronze' : ''}`}
            >
              {/* Number at the top of the tile and the rate at its foot, the way
                  a bookable night reads on Airbnb: the tile is the unit, so a
                  column of rates still lines up without cell borders. A day lent
                  in from the next month draws no tile at all. */}
              <span className={`text-sm font-semibold leading-none tabular-nums sm:text-[15px] ${stay || isSelected ? 'text-white' : outside ? 'text-muted/50' : 'text-navy'}`}>
                {day.getDate()}
              </span>

              {blocked && !stay
                ? <span className="inline-flex min-w-0 items-center gap-1 truncate text-[10px] font-medium leading-tight text-navy-bg/70">
                  <Ban className="h-2.5 w-2.5 shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span className="hidden truncate sm:inline">Blocked</span>
                </span>
                : outside
                  // A day lent in from the next month draws no tile and no rate:
                  // it is not a night of this month, so printing a price beside
                  // it would invent an offer the host cannot sell here.
                  ? null
                  : <span className={`min-w-0 max-w-full truncate text-[10px] font-medium leading-tight tabular-nums sm:text-[11px] ${stay || isSelected ? 'text-white/80' : 'text-muted'}`}>
                    <span className="sm:hidden">{compactMoney(nightPrice)}</span>
                    <span className="hidden sm:inline">{money(nightPrice)}</span>
                  </span>}

              {/* The fill alone reads the state on a phone - booked is navy,
                  blocked is grey - so the foot strip that duplicated it is gone. */}


            </button>;
          })}
        </div>

        {/* On a phone a stay reads as one tile spanning the nights it holds,
            with the guest's initials and the word Reserved, which is how the
            reference draws a booked run. Two stays can never share a night, so
            their spans within a week are disjoint and both fit the single row. */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-7 gap-1.5 sm:hidden">
          {weekBookings.map((booking) => <ReservedTile key={booking.id} booking={booking} weekStart={weekStart} />)}
        </div>

        {/* Stay chips ride in an overlay grid built on the same seven tracks and
            gap as the tiles, so each chip spans exactly the nights it covers.
            The layer ignores pointer events, so taps still reach the tiles; only
            the chips take a click, and only they link away. */}
        <div className="pointer-events-none absolute inset-0 hidden grid-cols-7 gap-1.5 sm:grid sm:gap-2">
          {weekBookings.map((booking, index) => <StayBar key={booking.id} booking={booking} weekStart={weekStart} row={index} />)}
        </div>
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
  // The phone sheet's "Custom settings" is a dropdown that edits the picked
  // nights in place, so it needs nothing more than its own open state here.
  const [settingsExpanded, setSettingsExpanded] = useState(false);

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
    setSettingsExpanded(false);
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

  // ---- Custom settings: dated edits for the picked nights, made in the sheet ----

  const priceRulesPath = activePropertyId ? `/properties/${activePropertyId}/price-rules` : null;
  const stayRulesPath = activePropertyId ? `/properties/${activePropertyId}/stay-rules` : null;

  /** The rate a run already carries, before anything is rewritten. */
  function rateForRun(run, rules = priceRules) {
    const nights = runNights(run);
    const total = nights.reduce((sum, day) => sum + priceFor(day, basePrice, rules), 0);
    return Math.round(total / Math.max(1, nights.length));
  }

  /** The rate before any promotion, so picking a second percentage never compounds. */
  function undiscountedRateForRun(run) {
    return rateForRun(run, priceRules.filter((rule) => !isPromotionRule(rule)));
  }

  async function runDatedEdit({ path, runs, makeRule, keepOutside, successMessage, failureMessage }) {
    if (!path || runs.length === 0) return false;
    setSaving(true);
    try {
      await replaceDatedRulesForRuns({ listPath: path, runs, makeRule, keepOutside });
      await load({ silent: true });
      toast.success(successMessage);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || failureMessage);
      return false;
    } finally {
      setSaving(false);
    }
  }

  function saveNightlyRate(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a nightly rate above zero.');
      return Promise.resolve(false);
    }
    const rate = Math.round(amount);
    return runDatedEdit({
      path: priceRulesPath,
      runs: groupRuns(selectedDays),
      makeRule: (run) => ({ name: 'Calendar rate', start: dayKey(run.start), end: dayKey(run.end), price: rate }),
      keepOutside: (rule, piece) => ({ name: rule.name || undefined, start: dayKey(piece.start), end: dayKey(piece.end), price: rule.price }),
      successMessage: `Those nights now cost ${money(rate)} a night.`,
      failureMessage: 'Could not set that rate.',
    });
  }

  function clearDatedRate() {
    return runDatedEdit({
      path: priceRulesPath,
      runs: groupRuns(selectedDays),
      makeRule: () => null,
      keepOutside: (rule, piece) => ({ name: rule.name || undefined, start: dayKey(piece.start), end: dayKey(piece.end), price: rule.price }),
      successMessage: 'Those nights use the base rate again.',
      failureMessage: 'Could not clear that rate.',
    });
  }

  function savePromotion(percent) {
    return runDatedEdit({
      path: priceRulesPath,
      runs: groupRuns(selectedDays),
      makeRule: (run) => ({
        name: `Promotion ${percent}%`,
        start: dayKey(run.start),
        end: dayKey(run.end),
        price: Math.max(1, Math.round(undiscountedRateForRun(run) * (1 - percent / 100))),
      }),
      keepOutside: (rule, piece) => ({ name: rule.name || undefined, start: dayKey(piece.start), end: dayKey(piece.end), price: rule.price }),
      successMessage: `${percent}% comes off those nights.`,
      failureMessage: 'Could not apply that promotion.',
    });
  }

  function clearPromotion() {
    return runDatedEdit({
      path: priceRulesPath,
      runs: groupRuns(selectedDays),
      makeRule: () => null,
      keepOutside: (rule, piece) => ({ name: rule.name || undefined, start: dayKey(piece.start), end: dayKey(piece.end), price: rule.price }),
      successMessage: 'Promotion removed from those nights.',
      failureMessage: 'Could not remove that promotion.',
    });
  }

  /** One night means no minimum, so clearing deletes the rule instead of storing a 1. */
  function saveMinimumStay(nights) {
    return runDatedEdit({
      path: stayRulesPath,
      runs: groupRuns(selectedDays),
      makeRule: (run) => (nights > 1
        ? { start: dayKey(run.start), end: dayKey(run.end), minNights: nights }
        : null),
      keepOutside: (rule, piece) => ({ start: dayKey(piece.start), end: dayKey(piece.end), minNights: rule.minNights }),
      successMessage: nights > 1
        ? `Guests must now book ${nights} nights across those dates.`
        : 'Minimum stay removed from those dates.',
      failureMessage: 'Could not change the minimum stay.',
    });
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

  // The sheet names the pick the way the reference does: one date, or the span.
  const selectionLabel = selectionCount === 0
    ? ''
    : selectionCount === 1
      ? formatDay(selectedDays[0])
      : `${formatDay(selectedDays[0])} - ${formatDay(selectedDays[selectedDays.length - 1])}`;

  // One night bills at its own rate; a run shows the average, because a dated
  // rate can price the nights within the same selection differently.
  const selectionRate = selectedDays.length === 0
    ? basePrice
    : Math.round(selectedDays.reduce((sum, day) => sum + priceFor(day, basePrice, priceRules), 0) / selectedDays.length);
  const selectionSummary = `${selectedOpenDays.length} open, ${selectedBlockedDays.length} blocked`;

  // What the sheet's Custom settings dropdown reads out for the pick. A minimum
  // stay is judged from the first night, which is the night a booking would
  // check in on and the night the server enforces the rule against.
  const hasDatedRate = selectedDays.some((day) => priceRules.some((rule) => coversNight(rule, day)));
  const promotionRule = selectedDays.length > 0
    ? priceRules.find((rule) => isPromotionRule(rule) && coversNight(rule, selectedDays[0]))
    : null;
  const promotionPercent = promotionRule ? promotionPercentIn(promotionRule) : null;
  const selectionMinNights = selectedDays.length > 0
    ? (calendar?.stayRules || []).reduce((longest, rule) => (
      coversNight(rule, selectedDays[0]) ? Math.max(longest, rule.minNights) : longest
    ), 1)
    : 1;

  // One panel, two homes: inside the phone sheet's dropdown and above the
  // wide-screen bar. Both edit the nights that are picked right now.
  const nightSettings = (
    <NightSettingsPanel
      nightsLabel={selectionCount === 1 ? '1 night picked' : `${selectionCount} nights picked`}
      baseRate={basePrice}
      nightRate={selectionRate}
      hasDatedRate={hasDatedRate}
      promotionPercent={promotionPercent}
      minNights={selectionMinNights}
      saving={saving}
      onSaveRate={saveNightlyRate}
      onClearRate={clearDatedRate}
      onSavePromotion={savePromotion}
      onClearPromotion={clearPromotion}
      onSaveMinimumStay={saveMinimumStay}
    />
  );

  /**
   * The pricing, availability and connected-calendar card for the side column.
   * The sheet's Custom settings dropdown edits the picked nights on its own, so
   * these form ids only exist once and need no prefix.
   */
  function renderSettings() {
    return <HostCard flush>
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
            <span className="shrink-0 tabular-nums text-muted">{money(rule.price)} <span className="text-[10px]">({formatDay(rule.start)}-{formatDay(addDays(new Date(rule.end), -1))})</span></span>
          </li>)}
        </ul> : <p className="mt-2 text-[11px] leading-relaxed text-muted">No dated rates. Every night uses the base rate.</p>}
        <Button as={Link} to={`/host/properties/${activePropertyId}/edit`} color="light" size="xs" className="mt-3 w-full">Edit pricing</Button>
      </SidebarSection>

      <SidebarSection title="Availability" icon={Ban}>
        <form onSubmit={addBlock} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor={`block-start`} className="text-[11px]">From</Label>
              <TextInput id={`block-start`} type="date" sizing="sm" value={blockDraft.start} onChange={(event) => setBlockDraft((current) => ({ ...current, start: event.target.value }))} required />
            </div>
            <div>
              <Label htmlFor={`block-end`} className="text-[11px]">To</Label>
              <TextInput id={`block-end`} type="date" sizing="sm" value={blockDraft.end} onChange={(event) => setBlockDraft((current) => ({ ...current, end: event.target.value }))} required />
            </div>
          </div>
          <div>
            <Label htmlFor={`block-summary`} className="text-[11px]">Reason (optional)</Label>
            <TextInput id={`block-summary`} sizing="sm" value={blockDraft.summary} onChange={(event) => setBlockDraft((current) => ({ ...current, summary: event.target.value }))} placeholder="Maintenance" />
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
          <TextInput id={`calendar-platform`} sizing="sm" value={sourceDraft.name} onChange={(event) => setSourceDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Platform, e.g. Airbnb" required />
          <TextInput id={`calendar-url`} sizing="sm" type="url" value={sourceDraft.url} onChange={(event) => setSourceDraft((current) => ({ ...current, url: event.target.value }))} placeholder="https://example.com/calendar.ics" required />
          <Button type="submit" color="light" size="xs" className="w-full" disabled={saving}>Add feed</Button>
        </form>
      </SidebarSection>

      <SidebarSection title="Export to another platform" icon={Info}>
        <p className="text-[11px] leading-relaxed text-muted">Paste this link where the other platform asks for an iCal address.</p>
        <TextInput readOnly sizing="sm" className="mt-2" value={calendar?.feedUrl || ''} onFocus={(event) => event.target.select()} />
        <Button color="light" size="xs" className="mt-2 w-full" onClick={copyFeed}>{copied ? 'Copied' : 'Copy link'}</Button>
      </SidebarSection>
    </HostCard>;
  }

  return <div className="space-y-4">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={HOST_EYEBROW}>HOST WORKSPACE</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Calendar</h1>
        <p className="mt-1 hidden max-w-2xl text-sm leading-relaxed text-muted sm:block">Every night you can sell, what it costs, and who is already booked.</p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
        {properties.length > 1 && <div className="w-full sm:w-80">
          {/* The app's own select, not a native <select>: the browser's popup
              ignores the palette and renders the blue system list. Pill shape
              and self-hiding chevron to match the month pager beside it. */}
          <SelectMenu
            id="calendar-property"
            value={activePropertyId || ''}
            onChange={(next) => navigate(`/host/calendar/${next}`)}
            options={properties.map((property) => ({ value: property.id, label: property.title }))}
            ariaLabel="Listing"
            shape="pill"
            className="font-semibold"
          />
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
      {/* Overflow stays visible on a phone so the weekday strip can pin to the
          viewport; a clipping ancestor would trap it inside the card. */}
      <HostCard flush className="overflow-visible sm:overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-navy">{calendar?.property?.title || 'Your stay'}</h2>
            <p className="text-xs text-muted">
              {stayCount} {stayCount === 1 ? 'stay' : 'stays'} booked
              {selectionCount > 0 && <> <span aria-hidden="true">·</span> {selectionCount} {selectionCount === 1 ? 'night' : 'nights'} selected</>}
            </p>
          </div>
          <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted sm:flex">
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-navy-bg" aria-hidden="true" />Booked</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#B9C3D1]" aria-hidden="true" />Blocked</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-border bg-elevated" aria-hidden="true" />Open</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-primary bg-elevated" aria-hidden="true" />Today</span>
          </div>
        </div>

        {/* Phone keeps the month clean, as the reference does: the totals and
            the legend move aside and the figures live in the sheet. */}
        <div className="hidden grid-cols-3 divide-x divide-border border-b border-border bg-surface/40 sm:grid">
          {monthStats.map((stat) => <div key={stat.label} className="min-w-0 px-3 py-2 sm:px-4">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted"><span className="sm:hidden">{stat.shortLabel}</span><span className="hidden sm:inline">{stat.label}</span></p>
            <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-navy">{stat.value}</p>
          </div>)}
        </div>

        <p className="hidden border-b border-border px-4 py-2 text-[11px] leading-relaxed text-muted sm:block">
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

      <aside id="calendar-settings" aria-label="Calendar settings" className="h-fit scroll-mt-20">
        {renderSettings()}
      </aside>
    </div>}

    {/* The pick follows the host. On a phone it is the reference sheet; on a
        wide screen there is room for the inline bar beside the grid. */}
    {!loading && activePropertyId && selectionCount > 0 && <>
      <CalendarQuickSheet
        open
        title={selectionLabel}
        subtitle={selectionCount === 1 ? '1 night' : `${selectionCount} nights`}
        rateLabel={selectionCount === 1 ? 'Nightly rate' : 'Average a night'}
        rate={money(selectionRate)}
        summary={selectionSummary}
        allOpen={selectedAllOpen}
        saving={saving}
        canBlock={selectedOpenDays.length > 0}
        canOpen={selectedBlockedDays.length > 0}
        onBlock={blockSelected}
        onOpen={openSelected}
        onClear={clearSelection}
        settingsExpanded={settingsExpanded}
        onToggleSettings={() => setSettingsExpanded((open) => !open)}
        onSettings={() => {
          // The sheet is an overlay over the nights that are picked; the full
          // pricing and availability card lives in the page itself. Dropping the
          // selection closes the sheet, and the next frame scrolls to that card
          // once the page is scrollable again.
          clearSelection();
          requestAnimationFrame(() => {
            document.getElementById('calendar-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }}
      >
        {nightSettings}
      </CalendarQuickSheet>

      <div className="fixed bottom-6 right-6 z-30 hidden flex-col items-end gap-2 md:flex">
        {settingsExpanded && (
          <div className="w-[360px] overflow-hidden rounded-2xl bg-navy-bg shadow-2xl">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/60">Custom settings</span>
              <button
                type="button"
                onClick={() => setSettingsExpanded(false)}
                aria-label="Close custom settings"
                className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto border-t border-white/10">{nightSettings}</div>
          </div>
        )}
        <div
          className="flex items-center gap-2 rounded-full border border-border bg-elevated px-2 py-2 shadow-xl"
          role="region"
          aria-label="Selected dates, actions"
        >
          <span className="pl-1 pr-1 text-xs font-semibold tabular-nums text-navy">{selectionCount} {selectionCount === 1 ? 'night' : 'nights'}</span>
          <Button type="button" size="xs" color="dark" className="min-h-[44px]" disabled={saving || selectedOpenDays.length === 0} onClick={blockSelected}>{saving ? 'Saving...' : 'Block'}</Button>
          <Button type="button" size="xs" color="light" className="min-h-[44px]" disabled={saving || selectedBlockedDays.length === 0} onClick={openSelected}>Open</Button>
          <Button
            type="button"
            size="xs"
            color="light"
            className="min-h-[44px]"
            aria-expanded={settingsExpanded}
            onClick={() => setSettingsExpanded((open) => !open)}
          >
            Custom settings
          </Button>
          <button type="button" onClick={clearSelection} aria-label="Clear selection" className="ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-navy">
            <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </>}
  </div>;
}
