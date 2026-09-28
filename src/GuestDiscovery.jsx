import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Datepicker, Dropdown, DropdownItem, Label, TextInput } from 'flowbite-react';
import apiClient from './api/client.js';
import { heroImage } from './assets/images.js';
import { useAuth } from './context/AuthContext.jsx';
import { useFavorites } from './context/FavoritesContext.jsx';
import { firstImage } from './utils/images.js';
import { clearRecentlyViewed, getRecentlyViewed } from './utils/recentlyViewed.js';
import PropertyResultsMap from './components/PropertyResultsMap.jsx';
import { openConsentManager } from './utils/consent.js';

const categories = ['All stays', 'Apartments', 'Studios', 'Penthouses', 'Villas'];
const guestDropdownTheme = {
  floating: {
    style: {
      auto: 'border-0 bg-white text-[#0B1F42] shadow-[0_14px_36px_rgba(11,31,66,0.16)]',
    },
  },
};
const guides = [
  { title: 'Westlands After Dark', label: 'Nightlife', image: '/images/place-sarit-centre.jpg' },
  { title: 'Kilimani Coffee Guide', label: 'Cafés', image: '/images/eat-artcaffe.jpg' },
  { title: 'Karen Green Escapes', label: 'Outdoors', image: '/images/place-karura-forest.jpg' },
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
  const { search, type, page, limit, checkIn, checkOut, minPrice, maxPrice, minBedrooms } = params;
  const [state, setState] = useState({ items: [], total: 0, loading: true, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    setState((old) => ({ ...old, loading: true, error: '' }));
    apiClient.get('/properties', { params: { search, type, page, limit, checkIn, checkOut, minPrice, maxPrice, minBedrooms }, signal: controller.signal })
      .then(({ data }) => setState({ items: Array.isArray(data.data) ? data.data : [], total: data.pagination?.total ?? data.data?.length ?? 0, loading: false, error: '' }))
      .catch((error) => { if (!controller.signal.aborted) setState({ items: [], total: 0, loading: false, error: error.response?.data?.message || 'Stays could not be loaded. Please try again.' }); });
    return () => controller.abort();
  }, [search, type, page, limit, checkIn, checkOut, minPrice, maxPrice, minBedrooms]);
  return state;
}

function StayCard({ stay }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const image = firstImage(stay);
  const location = stay.neighborhood || stay.location || 'Nairobi';
  const details = [location, stay.guests && `${stay.guests} guests`, stay.bedrooms != null && `${stay.bedrooms} bed${stay.bedrooms === 1 ? '' : 's'}`].filter(Boolean);
  return <article className="opg-stay-card">
    <Link to={`/property/${stay.id}`} className="opg-stay-image" aria-label={`View ${stay.title}`}>
      {image ? <img src={image} alt={stay.title} loading="lazy" /> : <span className="opg-image-fallback">Photo coming soon</span>}
      {stay.featured && <span className="opg-card-badge">Featured</span>}
    </Link>
    <button type="button" className="opg-heart" aria-label={isFavorite(stay.id) ? 'Remove from saved stays' : 'Save stay'} aria-pressed={isFavorite(stay.id)} onClick={() => isAuthenticated ? toggleFavorite(stay.id) : navigate('/login')}>{isFavorite(stay.id) ? '♥' : '♡'}</button>
    <Link to={`/property/${stay.id}`} className="opg-stay-content"><h3>{stay.title}</h3><p>{details.join(' · ')}</p><div className="opg-price"><strong>{stay.price != null ? `KSh ${Number(stay.price).toLocaleString()}` : 'Price on request'}</strong>{stay.price != null && <span>per night</span>}{stay.rating != null && <span className="opg-rating">★ {Number(stay.rating).toFixed(2)}</span>}</div></Link>
  </article>;
}

function SearchForm({ initial = '' }) {
  const navigate = useNavigate();
  const [where, setWhere] = useState(initial);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  function submit(event) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (where.trim()) query.set('search', where.trim());
    if (checkIn && checkOut && checkOut > checkIn) { query.set('checkIn', checkIn); query.set('checkOut', checkOut); }
    if (guests !== 2) query.set('guests', String(guests));
    navigate(`/properties${query.size ? `?${query}` : ''}`);
  }
  return <form className="opg-search" onSubmit={submit}>
    <Label htmlFor="guest-search-where" className="opg-search-field opg-search-where">
      <span>Where</span>
      <TextInput id="guest-search-where" value={where} onChange={(event) => setWhere(event.target.value)} placeholder="Anywhere in Nairobi" aria-label="Search location or stay" sizing="lg" />
    </Label>
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
        theme={{ inlineWrapper: 'opg-guest-trigger', ...guestDropdownTheme }}
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
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </span>
      <span className="opg-search-mobile-label">Search stays</span>
    </Button>
  </form>;
}

function CategoryBar({ selected, onSelect, onFilters, onMap, mapActive }) {
  return <div className="opg-filter-bar"><div className="opg-categories">{categories.map((category) => <button key={category} type="button" className={selected === category ? 'active' : ''} onClick={() => onSelect(category)}>{category}</button>)}</div>{onFilters ? <button className="opg-filter-action" type="button" onClick={onFilters}>☷ Filters</button> : <Link to="/properties?filters=1" className="opg-filter-action">☷ Filters</Link>}{onMap ? <button className="opg-filter-action" type="button" onClick={onMap}>{mapActive ? '☷ List view' : '⌖ Map view'}</button> : <Link to="/properties?view=map" className="opg-filter-action">⌖ Map view</Link>}</div>;
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
  const stays = useStays({ limit: 8, type: category === 'All stays' ? undefined : category.slice(0, -1).toLowerCase() });
  return <main className="opg-page opg-home">
    <section className="opg-hero" style={{ backgroundImage: 'linear-gradient(90deg, rgba(11,31,66,.79), rgba(11,31,66,.48)), url("/images/place-un-hq.jpg")' }}><div className="opg-container"><span className="opg-hero-badge">VERIFIED HOMES · NAIROBI</span><h1><span className="opg-desktop-title">Find your place in Nairobi</span><span className="opg-mobile-title">Find your next stay</span></h1><p>Handpicked apartments across the city&apos;s best neighbourhoods — verified, furnished, and ready to move in.</p><span className="opg-mobile-subtitle">{stays.loading ? 'Find a home across Nairobi.' : `${stays.total} homes across Nairobi.`}</span><SearchForm /><div className="opg-popular">Popular {['Westlands','Kilimani','Lavington','Karen'].map((place) => <Link key={place} to={`/properties?search=${encodeURIComponent(place)}`}>{place}</Link>)}</div><Link to="/properties?search=Westlands" className="opg-mobile-feature" style={{ backgroundImage: 'url("/images/place-un-hq.jpg")' }}><span>Popular in Westlands</span></Link></div></section>
    <section className="opg-section opg-stays-section"><div className="opg-container"><div className="opg-section-heading"><div><h2>Stays in Nairobi</h2><p>Handpicked homes, verified by our team</p></div><Link to="/properties">See all →</Link></div><CategoryBar selected={category} onSelect={setCategory} /><StayGrid {...stays} /></div></section>
    {recent.length > 0 && <section className="opg-section opg-recent"><div className="opg-container"><div className="opg-section-heading"><h2>Recently viewed</h2><button type="button" onClick={() => { clearRecentlyViewed(); setRecent([]); }}>Clear history</button></div><div className="opg-recent-grid">{recent.slice(0, 5).map((stay) => <Link to={`/property/${stay.id}`} key={stay.id}><img src={stay.image || heroImage} alt="" /><strong>{stay.title}</strong></Link>)}</div></div></section>}
    <section className="opg-section opg-benefits"><div className="opg-container"><div className="opg-centered"><h2>Why stay with ZuriLofts</h2><p>A calmer, clearer way to book a home in Nairobi</p></div><div className="opg-benefit-grid">{[['◇','Verified homes','Every listing is inspected and professionally photographed before it goes live.'],['▣','Transparent pricing','One clear nightly rate — utilities, fast Wi-Fi and cleaning all included.'],['♧','24/7 local support','A Nairobi-based team on call for check-in, repairs and anything else.']].map(([icon,title,copy]) => <article key={title}><span>{icon}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
    <section className="opg-section opg-guides"><div className="opg-container"><div className="opg-section-heading"><div><h2>Explore Nairobi</h2><p>Neighbourhood guides, written by people who live there</p></div><Link to="/guides">Browse all guides →</Link></div><div className="opg-guide-grid">{guides.map((guide) => <Link to="/guides" key={guide.title} style={{ backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.8), transparent 58%), url("${guide.image}")` }}><span>{guide.label}</span><div><h3>{guide.title}</h3><small>Explore the area</small></div></Link>)}</div></div></section>
  </main>;
}

export function GuestStays() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState('All stays');
  const [filtersOpen, setFiltersOpen] = useState(searchParams.get('filters') === '1');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const search = searchParams.get('search') || '';
  const stays = useStays({ limit: 12, page, search: search || undefined, type: category === 'All stays' ? undefined : category.slice(0, -1).toLowerCase(), checkIn: searchParams.get('checkIn') || undefined, checkOut: searchParams.get('checkOut') || undefined, minPrice: searchParams.get('minPrice') || undefined, maxPrice: searchParams.get('maxPrice') || undefined, minBedrooms: searchParams.get('minBedrooms') || undefined });
  const mapActive = searchParams.get('view') === 'map';
  function toggleMap() { const next = new URLSearchParams(searchParams); if (mapActive) next.delete('view'); else next.set('view', 'map'); setSearchParams(next); }
  function applyFilters(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const next = new URLSearchParams(searchParams); for (const name of ['minPrice','maxPrice','minBedrooms']) { const value = String(form.get(name) || '').trim(); if (value) next.set(name, value); else next.delete(name); } next.delete('filters'); next.delete('page'); setSearchParams(next); setFiltersOpen(false); }
  return <main className="opg-page opg-results"><div className="opg-container"><div className="opg-results-intro"><p><Link to="/">Home</Link> / Stays</p><h1>Stays in Nairobi</h1><span>Find a verified, furnished home that fits your plans.</span></div><SearchForm initial={search} /><CategoryBar selected={category} onSelect={setCategory} onFilters={() => setFiltersOpen(true)} onMap={toggleMap} mapActive={mapActive} /><div className="opg-results-toolbar"><strong>{stays.loading ? 'Finding stays…' : `${stays.total} stays available`}</strong><span>Nairobi, Kenya</span></div>{mapActive ? <PropertyResultsMap listings={stays.items} /> : <StayGrid {...stays} />}{!mapActive && stays.total > page * 12 && <button className="opg-load-more" onClick={() => { const next = new URLSearchParams(searchParams); next.set('page', String(page + 1)); setSearchParams(next); }}>Next page →</button>}</div>{filtersOpen && <div className="opg-filter-backdrop" onClick={() => setFiltersOpen(false)}><form className="opg-filter-dialog" onClick={(event) => event.stopPropagation()} onSubmit={applyFilters}><div><h2>Filter stays</h2><button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">×</button></div><label>Minimum nightly price<input name="minPrice" type="number" min="0" defaultValue={searchParams.get('minPrice') || ''} placeholder="KSh" /></label><label>Maximum nightly price<input name="maxPrice" type="number" min="0" defaultValue={searchParams.get('maxPrice') || ''} placeholder="KSh" /></label><label>Minimum bedrooms<select name="minBedrooms" defaultValue={searchParams.get('minBedrooms') || ''}><option value="">Any</option>{[1,2,3,4].map((n) => <option key={n} value={n}>{n}+</option>)}</select></label><button className="opg-apply-filters" type="submit">Show stays</button></form></div>}</main>;
}

export function GuestFooter() {
  return <footer className="opg-footer"><div className="opg-container"><div className="opg-footer-columns"><div><Link className="opg-footer-brand" to="/">ZuriLofts</Link><p>Furnished apartments in Nairobi&apos;s best neighbourhoods — verified, flexible, and ready when you are.</p></div><div><h3>Explore</h3><Link to="/properties">Stays</Link><Link to="/places">Neighbourhoods</Link><Link to="/guides">Guides</Link><Link to="/restaurants">Restaurants</Link></div><div><h3>Company</h3><Link to="/about">About us</Link><Link to="/host/today">Become a host</Link><Link to="/contact">Contact</Link></div><div><h3>Support</h3><Link to="/help">Help centre</Link><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link></div><div><h3>Stay updated</h3><p>New homes and city notes, once a month.</p></div></div><div className="opg-footer-bottom">© {new Date().getFullYear()} ZuriLofts. All rights reserved. <span><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><button type="button" onClick={openConsentManager}>Cookies</button></span></div></div></footer>;
}
