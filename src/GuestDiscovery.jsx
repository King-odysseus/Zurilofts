import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Checkbox,
  Datepicker,
  Dropdown,
  DropdownDivider,
  DropdownHeader,
  DropdownItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  TextInput,
} from 'flowbite-react';
import { ChevronDown, ChevronRight, Headphones, Receipt, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import apiClient from './api/client.js';
import SelectMenu from './components/SelectMenu.jsx';
import { heroImage } from './assets/images.js';
import { clearRecentlyViewed, getRecentlyViewed } from './utils/recentlyViewed.js';
import StayCard from './components/StayCard.jsx';
import { openConsentManager } from './utils/consent.js';
import { googleMapsSearchUrl } from './utils/googleMaps.js';
import { ALL_KENYA_SEARCH, DEFAULT_SEARCH_LOCATION, SEARCH_LOCATION_GROUPS } from './data/searchLocations.js';

const categories = ['All stays', 'Apartments', 'Studios', 'Penthouses', 'Villas'];
const guides = [
  { title: 'Westlands After Dark', label: 'Nightlife', image: '/images/place-sarit-centre.jpg' },
  { title: 'Kilimani Coffee Guide', label: 'Cafés', image: '/images/eat-artcaffe.jpg' },
  { title: 'Karen Green Escapes', label: 'Outdoors', image: '/images/place-karura-forest.jpg' },
];

const benefits = [
  { Icon: ShieldCheck, title: 'Verified homes', copy: 'Every listing is inspected and professionally photographed before it goes live.' },
  { Icon: Receipt, title: 'Transparent pricing', copy: 'One clear nightly rate, utilities, fast Wi-Fi and cleaning all included.' },
  { Icon: Headphones, title: '24/7 local support', copy: 'A Nairobi-based team on call for check-in, repairs and anything else.' },
];

// Shared class strings. Kept at module scope so every section of the page reads
// from one definition instead of restating the same utilities.
const CONTAINER = 'mx-auto w-full max-w-[1200px] px-5 sm:px-6';
const SEARCH_FIELD = 'flex min-w-0 flex-col justify-start gap-1 rounded-lg bg-surface px-4 py-3 lg:rounded-none lg:bg-transparent lg:px-5';
const SEARCH_FIELD_LABEL = 'text-[10px] font-bold uppercase tracking-wide text-muted';
const SEARCH_TRIGGER = 'flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-navy';
const RESULTS_GRID = 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3';
const RESULTS_STATE = 'flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center';

function parseDateValue(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateValue(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function useStays(params) {
  const { search, type, page, limit, checkIn, checkOut, minPrice, maxPrice, minBedrooms, minBathrooms, amenities, sort } = params;
  const [state, setState] = useState({ items: [], total: 0, loading: true, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    setState((old) => ({ ...old, loading: true, error: '' }));
    apiClient.get('/properties', { params: { search, type, page, limit, checkIn, checkOut, minPrice, maxPrice, minBedrooms, minBathrooms, amenities, sort }, signal: controller.signal })
      .then(({ data }) => setState({ items: Array.isArray(data.data) ? data.data : [], total: data.pagination?.total ?? data.data?.length ?? 0, loading: false, error: '' }))
      .catch((error) => { if (!controller.signal.aborted) setState({ items: [], total: 0, loading: false, error: error.response?.data?.message || 'Stays could not be loaded. Please try again.' }); });
    return () => controller.abort();
  }, [search, type, page, limit, checkIn, checkOut, minPrice, maxPrice, minBedrooms, minBathrooms, amenities, sort]);
  return state;
}

// `fluid` spans the page container instead of the 940px hero pill. On the
// results page a centred pill sat ~110px inside the heading, filter pills and
// card grid, so their left edges did not line up.
function SearchForm({ initial = DEFAULT_SEARCH_LOCATION, allKenya = false, fluid = false }) {
  const navigate = useNavigate();
  const [where, setWhere] = useState(allKenya ? ALL_KENYA_SEARCH : initial || DEFAULT_SEARCH_LOCATION);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  function submit(event) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (where === ALL_KENYA_SEARCH) query.set('scope', 'kenya');
    else query.set('search', where);
    if (checkIn && checkOut && checkOut > checkIn) { query.set('checkIn', checkIn); query.set('checkOut', checkOut); }
    if (guests !== 2) query.set('guests', String(guests));
    navigate(`/properties${query.size ? `?${query}` : ''}`);
  }
  return <form
    onSubmit={submit}
    className={`mt-8 grid w-full gap-2 rounded-2xl bg-elevated p-3 text-left shadow-lg sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto] lg:items-center lg:gap-0 lg:rounded-full lg:p-2 ${fluid ? 'max-w-none' : 'mx-auto max-w-[940px]'}`}
  >
    <div className={`${SEARCH_FIELD} sm:col-span-2 lg:col-span-1 lg:border-r lg:border-border`}>
      <span className={SEARCH_FIELD_LABEL}>Where</span>
      <Dropdown
        placement="bottom-start"
        renderTrigger={() => (
          <button type="button" aria-label="Search area in Kenya" aria-haspopup="menu" className={SEARCH_TRIGGER}>
            <span className="truncate">{where}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      >
        <DropdownItem onClick={() => setWhere(ALL_KENYA_SEARCH)}>All Kenya</DropdownItem>
        {SEARCH_LOCATION_GROUPS.map((group, index) => (
          <Fragment key={group.label}>
            {index > 0 && <DropdownDivider />}
            <DropdownHeader>{group.label}</DropdownHeader>
            {group.options.map((location) => (
              <DropdownItem key={`${group.label}-${location}`} onClick={() => setWhere(location)}>
                {location}
              </DropdownItem>
            ))}
          </Fragment>
        ))}
      </Dropdown>
    </div>
    <Label htmlFor="guest-search-check-in" className={`${SEARCH_FIELD} lg:border-r lg:border-border`}>
      <span className={SEARCH_FIELD_LABEL}>Check in</span>
      <Datepicker
        id="guest-search-check-in"
        className="w-full"
        value={parseDateValue(checkIn)}
        onChange={(date) => setCheckIn(formatDateValue(date))}
        placeholder="Add date"
        aria-label="Check in"
        language="en-GB"
        weekStart={1}
        showClearButton
        showTodayButton
        sizing="lg"
      />
    </Label>
    <Label htmlFor="guest-search-check-out" className={`${SEARCH_FIELD} lg:border-r lg:border-border`}>
      <span className={SEARCH_FIELD_LABEL}>Check out</span>
      <Datepicker
        id="guest-search-check-out"
        className="w-full"
        value={parseDateValue(checkOut)}
        onChange={(date) => setCheckOut(formatDateValue(date))}
        placeholder="Add date"
        minDate={parseDateValue(checkIn) || undefined}
        aria-label="Check out"
        language="en-GB"
        weekStart={1}
        showClearButton
        showTodayButton
        sizing="lg"
      />
    </Label>
    <div className={SEARCH_FIELD}>
      <span className={SEARCH_FIELD_LABEL}>Guests</span>
      <Dropdown
        placement="bottom-end"
        renderTrigger={() => (
          <button type="button" aria-haspopup="menu" className={SEARCH_TRIGGER}>
            <span className="truncate">{guests} {guests === 1 ? 'guest' : 'guests'}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
          <DropdownItem key={count} onClick={() => setGuests(count)}>
            {count} {count === 1 ? 'guest' : 'guests'}
          </DropdownItem>
        ))}
      </Dropdown>
    </div>
    <Button type="submit" aria-label="Search stays" className="w-full sm:col-span-2 lg:col-span-1 lg:w-14 lg:justify-self-end lg:px-0">
      <span className="hidden lg:grid" aria-hidden="true">
        <Search className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="lg:hidden">Search stays</span>
    </Button>
  </form>;
}

// Values must match the amenity names stored on a listing (the API matches on
// them by substring), so these read as data, not as free copy.
const AMENITY_OPTIONS = [
  { value: 'High-Speed WiFi', label: 'Wi-Fi' },
  { value: 'Secure Parking', label: 'Parking' },
  { value: 'Fully Equipped Kitchen', label: 'Kitchen' },
  { value: 'Air Conditioning', label: 'Air conditioning' },
  { value: 'Washing Machine', label: 'Washing machine' },
  { value: 'Balcony', label: 'Balcony' },
  { value: '24/7 Power Backup', label: 'Power backup' },
];

// SelectMenu options are strings, and every list starts with an empty-value entry
// so a filter can be cleared without a separate reset control.
const SORT_OPTIONS = [
  { value: '', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'newest', label: 'Newest' },
];

function countOptions(label, counts) {
  return [{ value: '', label }, ...counts.map((count) => ({ value: String(count), label: `${count}+` }))];
}

const BEDROOM_OPTIONS = countOptions('Any', [1, 2, 3, 4]);
const BATHROOM_OPTIONS = countOptions('Any', [1, 2, 3]);

function CategoryBar({ selected, onSelect, onFilters }) {
  // On phones the fixed-width Filters button squeezed the scrollable pill row
  // into ~250px, so "Studios" was cut in half with no hint that it scrolls.
  // Stacking it above the pills on small screens gives the row full width.
  return <div className="mb-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
    <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto pb-1">
      {categories.map((category) => <Button
        key={category}
        type="button"
        size="sm"
        color={selected === category ? 'default' : 'light'}
        aria-pressed={selected === category}
        onClick={() => onSelect(category)}
        className="shrink-0"
      >{category}</Button>)}
    </div>
    {onFilters
      ? <Button type="button" size="sm" color="light" onClick={onFilters} className="shrink-0">
        <SlidersHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Filters
      </Button>
      : <Button as={Link} to="/properties?filters=1" size="sm" color="light" className="shrink-0">
        <SlidersHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Filters
      </Button>}
  </div>;
}

function StayGrid({ items, loading, error, limit }) {
  if (loading) return <div className={RESULTS_STATE} role="status"><Spinner size="lg" /><p className="text-sm text-muted">Finding stays…</p></div>;
  if (error) return <div className={RESULTS_STATE} role="alert"><p className="text-sm text-muted">{error}</p></div>;
  if (!items.length) return <div className={RESULTS_STATE}><p className="text-sm text-muted">No stays match this search. Try another area or category.</p></div>;
  return <div className={RESULTS_GRID}>{items.slice(0, limit).map((stay) => <StayCard key={stay.id} stay={stay} />)}</div>;
}

export function GuestHome() {
  const [category, setCategory] = useState('All stays');
  const [recent, setRecent] = useState(() => getRecentlyViewed());
  const stays = useStays({ search: DEFAULT_SEARCH_LOCATION, limit: 8, type: category === 'All stays' ? undefined : category.slice(0, -1).toLowerCase() });
  return <main className="bg-white text-navy">
    <section className="relative overflow-hidden bg-white sm:bg-navy-bg">
      <img src="/images/place-un-hq.jpg" alt="" aria-hidden="true" className="absolute inset-0 hidden h-full w-full object-cover sm:block" />
      <span aria-hidden="true" className="absolute inset-0 hidden bg-gradient-to-r from-navy-bg/80 to-navy-bg/50 sm:block" />
      {/* The navbar is fixed at h-16, so the hero needs more than 56px of top
          padding or the "Verified homes" badge and headline sit under it. */}
      <div className={`relative ${CONTAINER} pb-8 pt-20 sm:pb-14 sm:pt-24 sm:text-center sm:text-white`}>
        {/* Fixed light pill on the photo: white surface, navy ink, in both themes. */}
        <Badge className="mb-5 hidden border-0 bg-white text-navy-bg sm:inline-flex">Verified homes · Nairobi</Badge>
        <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
          <span className="hidden sm:inline">Find your place in Nairobi</span>
          <span className="sm:hidden">Find your next stay</span>
        </h1>
        <p className="mx-auto mt-3 hidden max-w-[680px] text-sm leading-relaxed text-white sm:block">Handpicked apartments across the city&apos;s best neighbourhoods, verified, furnished, and ready to move in.</p>
        <span className="mt-1 block text-xs text-muted sm:hidden">{stays.loading ? 'Find a home across Nairobi.' : `${stays.total} homes across Nairobi.`}</span>
        <SearchForm />
        <div className="mt-4 hidden flex-wrap items-center justify-center gap-5 text-xs text-white/75 sm:flex">
          <span>Popular</span>
          {['Westlands', 'Kilimani', 'Lavington', 'Karen'].map((place) => <Link key={place} to={`/properties?search=${encodeURIComponent(place)}`} className="font-semibold text-white underline-offset-2 hover:underline">{place}</Link>)}
        </div>
        <Link to="/properties?search=Westlands" className="relative mt-3 block h-24 overflow-hidden rounded-xl bg-navy-bg sm:hidden">
          <span className="relative block h-full w-full">
            <img src="/images/place-un-hq.jpg" alt="" aria-hidden="true" className="h-full w-full object-cover" />
            <span className="absolute left-3 top-3 rounded-full bg-navy-bg px-3 py-1.5 text-[10px] font-bold text-white">Popular in Westlands</span>
          </span>
        </Link>
      </div>
    </section>

    <section className="py-10 sm:py-14">
      <div className={CONTAINER}>
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Stays in Nairobi</h2>
            <p className="mt-2 text-xs text-muted sm:text-sm">Handpicked homes, verified by our team</p>
          </div>
          <Link to="/properties" className="inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline">See all <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <CategoryBar selected={category} onSelect={setCategory} />
        <StayGrid {...stays} />
      </div>
    </section>

    {recent.length > 0 && <section className="bg-surface py-10 sm:py-14">
      <div className={CONTAINER}>
        <div className="mb-6 flex items-end justify-between gap-5">
          <h2 className="text-xl font-bold sm:text-2xl">Recently viewed</h2>
          <Button color="light" size="xs" type="button" onClick={() => { clearRecentlyViewed(); setRecent([]); }}>Clear history</Button>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {recent.slice(0, 5).map((stay) => <Link to={`/property/${stay.id}`} key={stay.id} className="group">
            <img src={stay.image || heroImage} alt="" className="mb-2 aspect-[220/146] w-full rounded-[10px] object-cover" />
            <strong className="block truncate text-xs font-semibold text-navy group-hover:underline">{stay.title}</strong>
          </Link>)}
        </div>
      </div>
    </section>}

    <section className="py-12 sm:py-16">
      <div className={CONTAINER}>
        <div className="mb-8 text-center sm:mb-12">
          <h2 className="text-xl font-bold sm:text-2xl">Why stay with ZuriLofts</h2>
          <p className="mt-2 text-sm text-muted">A calmer, clearer way to book a home in Nairobi</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {benefits.map(({ Icon, title, copy }) => <article key={title} className="flex items-start gap-3 rounded-xl border border-border bg-white p-5 sm:block sm:p-8">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white sm:mb-4" aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></span>
            <div>
              <h3 className="mb-1 text-base font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted">{copy}</p>
            </div>
          </article>)}
        </div>
      </div>
    </section>

    <section className="pb-14 sm:pb-16">
      <div className={CONTAINER}>
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Explore Nairobi</h2>
            <p className="mt-2 text-xs text-muted sm:text-sm">Neighbourhood guides, written by people who live there</p>
          </div>
          <Link to="/guides" className="inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline">Browse all guides <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6">
          {guides.map((guide) => <Link key={guide.title} to="/guides" className="group relative flex h-40 flex-col justify-between overflow-hidden rounded-[14px] bg-navy-bg p-4 text-white sm:h-[284px] sm:p-5">
            <img src={guide.image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <span className="relative w-fit rounded-full bg-white px-3 py-1 text-[11px] font-bold text-navy">{guide.label}</span>
            <div className="relative">
              <h3 className="text-base font-bold text-white sm:text-xl">{guide.title}</h3>
              <small className="text-[11px] text-white/80">Explore the area</small>
            </div>
          </Link>)}
        </div>
      </div>
    </section>
  </main>;
}

export function GuestStays() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState('All stays');
  const [filtersOpen, setFiltersOpen] = useState(searchParams.get('filters') === '1');
  // The styled selects are controlled, so their values live in state instead of
  // the old uncontrolled FormData fields. They are reset from the URL each time
  // the dialog opens, so closing it without applying discards edits as before.
  const [bedroomFilter, setBedroomFilter] = useState(() => searchParams.get('minBedrooms') || '');
  const [bathroomFilter, setBathroomFilter] = useState(() => searchParams.get('minBathrooms') || '');
  function openFilters() {
    setBedroomFilter(searchParams.get('minBedrooms') || '');
    setBathroomFilter(searchParams.get('minBathrooms') || '');
    setFiltersOpen(true);
  }
  function closeFilters() {
    setFiltersOpen(false);
  }
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const allKenya = searchParams.get('scope') === 'kenya';
  const search = allKenya ? '' : searchParams.get('search') || DEFAULT_SEARCH_LOCATION;
  const stays = useStays({ limit: 12, page, search: search || undefined, type: category === 'All stays' ? undefined : category.slice(0, -1).toLowerCase(), checkIn: searchParams.get('checkIn') || undefined, checkOut: searchParams.get('checkOut') || undefined, minPrice: searchParams.get('minPrice') || undefined, maxPrice: searchParams.get('maxPrice') || undefined, minBedrooms: searchParams.get('minBedrooms') || undefined, minBathrooms: searchParams.get('minBathrooms') || undefined, amenities: searchParams.get('amenities') || undefined, sort: searchParams.get('sort') || undefined });
  // The dialog is a real form: applying it writes the fields into the URL, which
  // is the single source of truth for the query below.
  function applyFilters(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const next = new URLSearchParams(searchParams); for (const name of ['minPrice', 'maxPrice', 'minBedrooms', 'minBathrooms']) { const value = String(form.get(name) || '').trim(); if (value) next.set(name, value); else next.delete(name); } const chosenAmenities = form.getAll('amenities'); if (chosenAmenities.length) next.set('amenities', chosenAmenities.join(',')); else next.delete('amenities'); next.delete('filters'); next.delete('page'); setSearchParams(next); setFiltersOpen(false); }
  const areaLabel = allKenya ? 'Kenya' : search;
  {/* pt-24 clears the fixed h-16 navbar; at pt-10 the page title was cut off. */}
  return <main className="min-h-screen bg-white pb-20 pt-24 text-navy">
    <div className={CONTAINER}>
      <div className="mb-2">
        <p className="mb-4 text-xs text-muted"><Link to="/" className="hover:underline">Home</Link> / Stays</p>
        <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{allKenya ? 'Stays across Kenya' : `Stays in ${areaLabel}`}</h1>
        <span className="text-sm text-muted">Find a verified, furnished home that fits your plans.</span>
      </div>

      <SearchForm initial={search} allKenya={allKenya} fluid />

      <div className="mt-6">
        <CategoryBar selected={category} onSelect={setCategory} onFilters={openFilters} />
      </div>

      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <strong className="text-sm font-semibold text-navy">{stays.loading ? 'Finding stays…' : `${stays.total} stays available`}</strong>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <a className="text-sm font-semibold text-navy underline underline-offset-2" href={googleMapsSearchUrl({ label: allKenya ? 'Kenya' : `${areaLabel}, Kenya` })} target="_blank" rel="noopener noreferrer">View area on map</a>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>Sort by</span>
            <SelectMenu ariaLabel="Sort stays" wrapperClassName="w-48" value={searchParams.get('sort') || ''} onChange={(next) => { const nextParams = new URLSearchParams(searchParams); if (next) nextParams.set('sort', next); else nextParams.delete('sort'); nextParams.delete('page'); setSearchParams(nextParams); }} options={SORT_OPTIONS} />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <StayGrid {...stays} />
      </div>

      {stays.total > page * 12 && <div className="flex items-center justify-center gap-2 pt-9">
        <Button color="light" type="button" onClick={() => { const next = new URLSearchParams(searchParams); next.set('page', String(page + 1)); setSearchParams(next); }}>
          Next page <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>}
    </div>

    <Modal show={filtersOpen} onClose={closeFilters} size="md" dismissible>
      {/* A real form wrapper: submit still writes the filter fields into the URL. */}
      <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={applyFilters}>
        <ModalHeader>Filter stays</ModalHeader>
        <ModalBody>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="filter-min-price">Minimum nightly price</Label>
              <TextInput id="filter-min-price" name="minPrice" type="number" min="0" defaultValue={searchParams.get('minPrice') || ''} placeholder="KSh" />
            </div>
            <div>
              <Label htmlFor="filter-max-price">Maximum nightly price</Label>
              <TextInput id="filter-max-price" name="maxPrice" type="number" min="0" defaultValue={searchParams.get('maxPrice') || ''} placeholder="KSh" />
            </div>
            <div>
              <Label htmlFor="filter-min-bedrooms">Minimum bedrooms</Label>
              <SelectMenu id="filter-min-bedrooms" name="minBedrooms" value={bedroomFilter} onChange={(next) => setBedroomFilter(next)} options={BEDROOM_OPTIONS} ariaLabel="Minimum bedrooms" />
            </div>
            <div>
              <Label htmlFor="filter-min-bathrooms">Minimum bathrooms</Label>
              <SelectMenu id="filter-min-bathrooms" name="minBathrooms" value={bathroomFilter} onChange={(next) => setBathroomFilter(next)} options={BATHROOM_OPTIONS} ariaLabel="Minimum bathrooms" />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-navy">Amenities</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {AMENITY_OPTIONS.map((amenity, index) => <Label
                  key={amenity.value}
                  htmlFor={`filter-amenity-${index}`}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-50"
                >
                  <Checkbox id={`filter-amenity-${index}`} name="amenities" value={amenity.value} defaultChecked={(searchParams.get('amenities') || '').split(',').includes(amenity.value)} />
                  <span>{amenity.label}</span>
                </Label>)}
              </div>
            </fieldset>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="submit" className="w-full">Show stays</Button>
        </ModalFooter>
      </form>
    </Modal>
  </main>;
}

export function GuestFooter() {
  return <footer className="border-t-4 border-primary bg-navy-bg py-12 text-white">
    <div className={CONTAINER}>
      <div className="grid gap-8 pb-12 sm:grid-cols-2 lg:grid-cols-[2fr_repeat(4,minmax(0,1fr))] lg:gap-10">
        <div className="flex flex-col gap-3">
          <Link className="font-montserrat text-base font-extrabold text-white" to="/">ZuriLofts</Link>
          <p className="text-xs leading-relaxed text-white/75">Furnished apartments in Nairobi&apos;s best neighbourhoods, verified, flexible, and ready when you are.</p>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wide text-primary">Explore</h3>
          <Link to="/properties" className="text-xs text-white/80 hover:text-white">Stays</Link>
          <Link to="/places" className="text-xs text-white/80 hover:text-white">Neighbourhoods</Link>
          <Link to="/guides" className="text-xs text-white/80 hover:text-white">Guides</Link>
          <Link to="/restaurants" className="text-xs text-white/80 hover:text-white">Restaurants</Link>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wide text-primary">Company</h3>
          <Link to="/host/today" className="text-xs text-white/80 hover:text-white">Become a host</Link>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wide text-primary">Support</h3>
          <Link to="/guides" className="text-xs text-white/80 hover:text-white">Help centre</Link>
          <Link to="/terms" className="text-xs text-white/80 hover:text-white">Terms</Link>
          <Link to="/privacy" className="text-xs text-white/80 hover:text-white">Privacy</Link>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wide text-primary">Stay updated</h3>
          <p className="text-xs leading-relaxed text-white/75">New homes and city notes, once a month.</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-white/20 pt-5 text-[11px] text-white/70 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} ZuriLofts. All rights reserved.</span>
        <span className="flex gap-6">
          <Link to="/privacy" className="hover:text-white">Privacy</Link>
          <Link to="/terms" className="hover:text-white">Terms</Link>
          <button type="button" className="hover:text-white" onClick={openConsentManager}>Cookies</button>
        </span>
      </div>
    </div>
  </footer>;
}
