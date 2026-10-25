import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Datepicker, Dropdown, DropdownDivider, DropdownHeader, DropdownItem, Label, TextInput } from 'flowbite-react';
import { ChevronRight, Headphones, Receipt, Search, ShieldCheck } from 'lucide-react';
import apiClient from './api/client.js';
import SelectMenu from './components/SelectMenu.jsx';
import { heroImage } from './assets/images.js';
import { clearRecentlyViewed, getRecentlyViewed } from './utils/recentlyViewed.js';
import StayCard from './components/StayCard.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { openConsentManager } from './utils/consent.js';
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

function SearchForm({ initial = DEFAULT_SEARCH_LOCATION, allKenya = false }) {
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
  return <form className="opg-search" onSubmit={submit}>
    <div className="opg-search-field opg-search-where">
      <span>Where</span>
      <Dropdown
        inline
        theme={{ inlineWrapper: 'opg-location-trigger' }}
        label={<span className="opg-location-value">{where}</span>}
        placement="bottom-start"
        aria-label="Search area in Kenya"
      >
        <DropdownItem onClick={() => setWhere(ALL_KENYA_SEARCH)}>All Kenya</DropdownItem>
        {SEARCH_LOCATION_GROUPS.map((group, index) => (
          <Fragment key={group.label}>
            {index > 0 && <DropdownDivider />}
            <DropdownHeader className="opg-location-group">{group.label}</DropdownHeader>
            {group.options.map((location) => (
              <DropdownItem key={`${group.label}-${location}`} onClick={() => setWhere(location)}>
                {location}
              </DropdownItem>
            ))}
          </Fragment>
        ))}
      </Dropdown>
    </div>
    <Label htmlFor="guest-search-check-in" className="opg-search-field">
      <span>Check in</span>
      <Datepicker
        id="guest-search-check-in"
        className="opg-datepicker"
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
    <Label htmlFor="guest-search-check-out" className="opg-search-field">
      <span>Check out</span>
      <Datepicker
        id="guest-search-check-out"
        className="opg-datepicker"
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
    <div className="opg-search-field">
      <span>Guests</span>
      <Dropdown
        inline
        theme={{ inlineWrapper: 'opg-guest-trigger' }}
        label={<span className="opg-guest-value">{guests} {guests === 1 ? 'guest' : 'guests'}</span>}
        placement="bottom-end"
      >
        {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
          <DropdownItem key={count} onClick={() => setGuests(count)}>
            {count} {count === 1 ? 'guest' : 'guests'}
          </DropdownItem>
        ))}
      </Dropdown>
    </div>
    <Button type="submit" aria-label="Search stays" className="opg-search-submit" pill>
      <span className="opg-search-desktop-label" aria-hidden="true">
        <Search className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="opg-search-mobile-label">Search stays</span>
    </Button>
  </form>;
}

const AMENITY_OPTIONS = [{ value: 'WiFi', label: 'Wi-Fi' }, { value: 'Parking', label: 'Parking' }, { value: 'Kitchen', label: 'Kitchen' }, { value: 'Air Conditioning', label: 'Air conditioning' }, { value: 'Washing Machine', label: 'Washing machine' }, { value: 'Balcony', label: 'Balcony' }, { value: 'Power Backup', label: 'Power backup' }];

// SelectMenu takes string values, while the old native <option> elements used
// numbers; the leading empty option keeps a "clear this filter" choice.
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
  return <div className="opg-filter-bar"><div className="opg-categories">{categories.map((category) => <button key={category} type="button" className={selected === category ? 'active' : ''} onClick={() => onSelect(category)}>{category}</button>)}</div>{onFilters ? <button className="opg-filter-action" type="button" onClick={onFilters}>☷ Filters</button> : <Link to="/properties?filters=1" className="opg-filter-action">☷ Filters</Link>}</div>;
}

function StayGrid({ items, loading, error, limit }) {
  if (loading) return <div className="opg-state" role="status">Finding stays…</div>;
  if (error) return <div className="opg-state" role="alert">{error}</div>;
  if (!items.length) return <div className="opg-state">No stays match this search. Try another area or category.</div>;
  return <div className="opg-stay-grid">{items.slice(0, limit).map((stay) => <StayCard key={stay.id} stay={stay} />)}</div>;
}

export function GuestHome() {
  const [category, setCategory] = useState('All stays');
  const [recent, setRecent] = useState(() => getRecentlyViewed());
  const stays = useStays({ search: DEFAULT_SEARCH_LOCATION, limit: 8, type: category === 'All stays' ? undefined : category.slice(0, -1).toLowerCase() });
  return <main className="opg-page opg-home">
    <section className="opg-hero" style={{ backgroundImage: 'linear-gradient(90deg, rgba(11,31,66,.79), rgba(11,31,66,.48)), url("/images/place-un-hq.jpg")' }}><div className="opg-container"><span className="opg-hero-badge">Verified homes · Nairobi</span><h1><span className="opg-desktop-title">Find your place in Nairobi</span><span className="opg-mobile-title">Find your next stay</span></h1><p>Handpicked apartments across the city&apos;s best neighbourhoods, verified, furnished, and ready to move in.</p><span className="opg-mobile-subtitle">{stays.loading ? 'Find a home across Nairobi.' : `${stays.total} homes across Nairobi.`}</span><SearchForm /><div className="opg-popular">Popular {['Westlands','Kilimani','Lavington','Karen'].map((place) => <Link key={place} to={`/properties?search=${encodeURIComponent(place)}`}>{place}</Link>)}</div><Link to="/properties?search=Westlands" className="opg-mobile-feature" style={{ backgroundImage: 'url("/images/place-un-hq.jpg")' }}><span>Popular in Westlands</span></Link></div></section>
    <section className="opg-section opg-stays-section"><div className="opg-container"><div className="opg-section-heading"><div><h2>Stays in Nairobi</h2><p>Handpicked homes, verified by our team</p></div><Link to="/properties" className="inline-flex items-center gap-1">See all <ChevronRight className="w-4 h-4" aria-hidden="true" /></Link></div><CategoryBar selected={category} onSelect={setCategory} /><StayGrid {...stays} /></div></section>
    {recent.length > 0 && <section className="opg-section opg-recent"><div className="opg-container"><div className="opg-section-heading"><h2>Recently viewed</h2><button type="button" onClick={() => { clearRecentlyViewed(); setRecent([]); }}>Clear history</button></div><div className="opg-recent-grid">{recent.slice(0, 5).map((stay) => <Link to={`/property/${stay.id}`} key={stay.id}><img src={stay.image || heroImage} alt="" /><strong>{stay.title}</strong></Link>)}</div></div></section>}
    <section className="opg-section opg-benefits"><div className="opg-container"><div className="opg-centered"><h2>Why stay with ZuriLofts</h2><p>A calmer, clearer way to book a home in Nairobi</p></div><div className="opg-benefit-grid">{benefits.map(({ Icon, title, copy }) => <article key={title}><span aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
    <section className="opg-section opg-guides"><div className="opg-container"><div className="opg-section-heading"><div><h2>Explore Nairobi</h2><p>Neighbourhood guides, written by people who live there</p></div><Link to="/guides" className="inline-flex items-center gap-1">Browse all guides <ChevronRight className="w-4 h-4" aria-hidden="true" /></Link></div><div className="opg-guide-grid">{guides.map((guide) => <Link to="/guides" key={guide.title} style={{ backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.8), transparent 58%), url("${guide.image}")` }}><span>{guide.label}</span><div><h3>{guide.title}</h3><small>Explore the area</small></div></Link>)}</div></div></section>
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
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const allKenya = searchParams.get('scope') === 'kenya';
  const search = allKenya ? '' : searchParams.get('search') || DEFAULT_SEARCH_LOCATION;
  const stays = useStays({ limit: 12, page, search: search || undefined, type: category === 'All stays' ? undefined : category.slice(0, -1).toLowerCase(), checkIn: searchParams.get('checkIn') || undefined, checkOut: searchParams.get('checkOut') || undefined, minPrice: searchParams.get('minPrice') || undefined, maxPrice: searchParams.get('maxPrice') || undefined, minBedrooms: searchParams.get('minBedrooms') || undefined, minBathrooms: searchParams.get('minBathrooms') || undefined, amenities: searchParams.get('amenities') || undefined, sort: searchParams.get('sort') || undefined });
  function applyFilters(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const next = new URLSearchParams(searchParams); for (const name of ['minPrice','maxPrice','minBedrooms','minBathrooms']) { const value = String(form.get(name) || '').trim(); if (value) next.set(name, value); else next.delete(name); } const chosenAmenities = form.getAll('amenities'); if (chosenAmenities.length) next.set('amenities', chosenAmenities.join(',')); else next.delete('amenities'); next.delete('filters'); next.delete('page'); setSearchParams(next); setFiltersOpen(false); }
  const areaLabel = allKenya ? 'Kenya' : search;
  return <main className="opg-page opg-results"><div className="opg-container"><div className="opg-results-intro"><p><Link to="/">Home</Link> / Stays</p><h1>{allKenya ? 'Stays across Kenya' : `Stays in ${areaLabel}`}</h1><span>Find a verified, furnished home that fits your plans.</span></div><SearchForm initial={search} allKenya={allKenya} /><CategoryBar selected={category} onSelect={setCategory} onFilters={openFilters} /><div className="opg-results-toolbar"><strong>{stays.loading ? 'Finding stays…' : `${stays.total} stays available`}</strong><a className="opg-map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`stays in ${areaLabel}`)}`} target="_blank" rel="noopener noreferrer">View area on map</a><label className="opg-sort">Sort by <SelectMenu ariaLabel="Sort stays" value={searchParams.get('sort') || ''} onChange={(next) => { const nextParams = new URLSearchParams(searchParams); if (next) nextParams.set('sort', next); else nextParams.delete('sort'); nextParams.delete('page'); setSearchParams(nextParams); }} options={SORT_OPTIONS} /></label></div><StayGrid {...stays} />{stays.total > page * 12 && <button className="opg-load-more" onClick={() => { const next = new URLSearchParams(searchParams); next.set('page', String(page + 1)); setSearchParams(next); }}>Next page <ChevronRight className="w-4 h-4" aria-hidden="true" /></button>}</div>{filtersOpen && <div className="opg-filter-backdrop" onClick={() => setFiltersOpen(false)}><form className="opg-filter-dialog" onClick={(event) => event.stopPropagation()} onSubmit={applyFilters}><div><h2>Filter stays</h2><button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">×</button></div><label>Minimum nightly price<TextInput name="minPrice" type="number" min="0" defaultValue={searchParams.get('minPrice') || ''} placeholder="KSh" /></label><label>Maximum nightly price<TextInput name="maxPrice" type="number" min="0" defaultValue={searchParams.get('maxPrice') || ''} placeholder="KSh" /></label><label>Minimum bedrooms<SelectMenu name="minBedrooms" value={bedroomFilter} onChange={(next) => setBedroomFilter(next)} options={BEDROOM_OPTIONS} ariaLabel="Minimum bedrooms" /></label><label>Minimum bathrooms<SelectMenu name="minBathrooms" value={bathroomFilter} onChange={(next) => setBathroomFilter(next)} options={BATHROOM_OPTIONS} ariaLabel="Minimum bathrooms" /></label><fieldset className="opg-amenity-filters"><legend>Amenities</legend>{AMENITY_OPTIONS.map((amenity) => <label key={amenity.value}><input type="checkbox" name="amenities" value={amenity.value} defaultChecked={(searchParams.get('amenities') || '').split(',').includes(amenity.value)} /> {amenity.label}</label>)}</fieldset><button className="opg-apply-filters" type="submit">Show stays</button></form></div>}</main>;
}

export function GuestFooter() {
  const { isAuthenticated, user } = useAuth();
  // A visitor with no account cannot open the host workspace, so this CTA has
  // to start them on the shared sign-up form in hosting mode. Pointing it at
  // /host/today used to bounce a new host straight to the sign-in page.
  const hostHref = !isAuthenticated
    ? '/register?role=HOST'
    : user?.role === 'USER' ? '/host/application' : '/host/today';
  return <footer className="opg-footer"><div className="opg-container"><div className="opg-footer-columns"><div><Link className="opg-footer-brand" to="/">ZuriLofts</Link><p>Furnished apartments in Nairobi&apos;s best neighbourhoods, verified, flexible, and ready when you are.</p></div><div><h3>Explore</h3><Link to="/properties">Stays</Link><Link to="/places">Neighbourhoods</Link><Link to="/guides">Guides</Link><Link to="/restaurants">Restaurants</Link></div><div><h3>Company</h3><Link to={hostHref}>Become a host</Link></div><div><h3>Support</h3><Link to="/guides">Help centre</Link><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link></div><div><h3>Stay updated</h3><p>New homes and city notes, once a month.</p></div></div><div className="opg-footer-bottom">© {new Date().getFullYear()} ZuriLofts. All rights reserved. <span><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><button type="button" onClick={openConsentManager}>Cookies</button></span></div></div></footer>;
}
