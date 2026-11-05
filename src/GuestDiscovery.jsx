import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Datepicker, Dropdown, DropdownDivider, DropdownHeader, DropdownItem, Label, TextInput } from 'flowbite-react';
import { ChevronRight, Headphones, Receipt, Search, ShieldCheck } from 'lucide-react';
import apiClient from './api/client.js';
import SelectMenu from './components/SelectMenu.jsx';
import { heroImage } from './assets/images.js';
import { clearRecentlyViewed, getRecentlyViewed } from './utils/recentlyViewed.js';
import StayCard from './components/StayCard.jsx';
import BrandLogo from './components/BrandLogo.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useLanguage } from './context/LanguageContext.jsx';
import { openConsentManager } from './utils/consent.js';
import { ALL_KENYA_SEARCH, DEFAULT_SEARCH_LOCATION, SEARCH_LOCATION_GROUPS } from './data/searchLocations.js';

const categories = ['All stays', 'Apartments', 'Studios', 'Penthouses', 'Villas'];

// The array stays in English because each value is also the query the results
// page filters on; only what the reader sees is translated.
const CATEGORY_LABEL_KEYS = {
  'All stays': 'discovery.categoryAll',
  Apartments: 'discovery.categoryApartments',
  Studios: 'discovery.categoryStudios',
  Penthouses: 'discovery.categoryPenthouses',
  Villas: 'discovery.categoryVillas',
};

const guides = [
  { titleKey: 'discovery.guideWestlandsTitle', labelKey: 'discovery.guideWestlandsLabel', image: '/images/place-sarit-centre.jpg' },
  { titleKey: 'discovery.guideCoffeeTitle', labelKey: 'discovery.guideCoffeeLabel', image: '/images/eat-artcaffe.jpg' },
  { titleKey: 'discovery.guideOutdoorsTitle', labelKey: 'discovery.guideOutdoorsLabel', image: '/images/place-karura-forest.jpg' },
];

const benefits = [
  { Icon: ShieldCheck, titleKey: 'discovery.benefitVerifiedTitle', copyKey: 'discovery.benefitVerifiedCopy' },
  { Icon: Receipt, titleKey: 'discovery.benefitPricingTitle', copyKey: 'discovery.benefitPricingCopy' },
  { Icon: Headphones, titleKey: 'discovery.benefitSupportTitle', copyKey: 'discovery.benefitSupportCopy' },
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

function useStays(params, t) {
  const { search, type, page, limit, checkIn, checkOut, minPrice, maxPrice, minBedrooms, minBathrooms, amenities, sort } = params;
  const [state, setState] = useState({ items: [], total: 0, loading: true, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    setState((old) => ({ ...old, loading: true, error: '' }));
    apiClient.get('/properties', { params: { search, type, page, limit, checkIn, checkOut, minPrice, maxPrice, minBedrooms, minBathrooms, amenities, sort }, signal: controller.signal })
      .then(({ data }) => setState({ items: Array.isArray(data.data) ? data.data : [], total: data.pagination?.total ?? data.data?.length ?? 0, loading: false, error: '' }))
      .catch((error) => { if (!controller.signal.aborted) setState({ items: [], total: 0, loading: false, error: error.response?.data?.message || t('discovery.staysLoadError') }); });
    return () => controller.abort();
  }, [search, type, page, limit, checkIn, checkOut, minPrice, maxPrice, minBedrooms, minBathrooms, amenities, sort, t]);
  return state;
}

function SearchForm({ initial = DEFAULT_SEARCH_LOCATION, allKenya = false }) {
  const { t, lang } = useLanguage();
  // The date pickers render their own calendar chrome, so the locale has to
  // follow the switcher or Swahili visitors get English month and day names.
  const dateLocale = lang === 'sw' ? 'sw-KE' : 'en-GB';
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
    navigate(`/stays${query.size ? `?${query}` : ''}`);
  }
  return <form className="opg-search" onSubmit={submit}>
    <div className="opg-search-field opg-search-where">
      <span>{t('discovery.searchWhere')}</span>
      <Dropdown
        inline
        theme={{ inlineWrapper: 'opg-location-trigger' }}
        label={<span className="opg-location-value">{where}</span>}
        placement="bottom-start"
        aria-label={t('discovery.searchAreaInKenya')}
      >
        <DropdownItem onClick={() => setWhere(ALL_KENYA_SEARCH)}>{t('discovery.searchAllKenya')}</DropdownItem>
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
      <span>{t('discovery.searchCheckIn')}</span>
      <Datepicker
        id="guest-search-check-in"
        className="opg-datepicker"
        value={parseDateValue(checkIn)}
        onChange={(date) => setCheckIn(formatDateValue(date))}
        placeholder={t('discovery.searchAddDate')}
        aria-label={t('discovery.searchCheckIn')}
        language={dateLocale}
        weekStart={1}
        showClearButton
        showTodayButton
        labelClearButton={t('discovery.searchClearDate')}
        labelTodayButton={t('discovery.searchToday')}
        sizing="lg"
      />
    </Label>
    <Label htmlFor="guest-search-check-out" className="opg-search-field opg-search-checkout">
      <span>{t('discovery.searchCheckOut')}</span>
      <Datepicker
        id="guest-search-check-out"
        className="opg-datepicker"
        value={parseDateValue(checkOut)}
        onChange={(date) => setCheckOut(formatDateValue(date))}
        placeholder={t('discovery.searchAddDate')}
        minDate={parseDateValue(checkIn) || undefined}
        aria-label={t('discovery.searchCheckOut')}
        language={dateLocale}
        weekStart={1}
        showClearButton
        showTodayButton
        labelClearButton={t('discovery.searchClearDate')}
        labelTodayButton={t('discovery.searchToday')}
        sizing="lg"
      />
    </Label>
    <div className="opg-search-field opg-search-guests">
      <span>{t('discovery.searchGuests')}</span>
      <Dropdown
        inline
        theme={{ inlineWrapper: 'opg-guest-trigger' }}
        label={<span className="opg-guest-value">{t(guests === 1 ? 'common.guest_one' : 'common.guest_other', { count: guests })}</span>}
        placement="bottom-end"
      >
        {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
          <DropdownItem key={count} onClick={() => setGuests(count)}>
            {t(count === 1 ? 'common.guest_one' : 'common.guest_other', { count })}
          </DropdownItem>
        ))}
      </Dropdown>
    </div>
    <Button type="submit" aria-label={t('discovery.searchStays')} className="opg-search-submit" pill>
      <span className="opg-search-desktop-label" aria-hidden="true">
        <Search className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="opg-search-mobile-label">{t('discovery.searchStays')}</span>
    </Button>
  </form>;
}

const AMENITY_OPTIONS = [{ value: 'WiFi', labelKey: 'discovery.amenityWifi' }, { value: 'Parking', labelKey: 'discovery.amenityParking' }, { value: 'Kitchen', labelKey: 'discovery.amenityKitchen' }, { value: 'Air Conditioning', labelKey: 'discovery.amenityAirConditioning' }, { value: 'Washing Machine', labelKey: 'discovery.amenityWashingMachine' }, { value: 'Balcony', labelKey: 'discovery.amenityBalcony' }, { value: 'Power Backup', labelKey: 'discovery.amenityPowerBackup' }];

// SelectMenu takes string values, while the old native <option> elements used
// numbers; the leading empty option keeps a "clear this filter" choice.
const SORT_OPTIONS = [
  { value: '', labelKey: 'discovery.sortRecommended' },
  { value: 'price_asc', labelKey: 'discovery.sortPriceAsc' },
  { value: 'price_desc', labelKey: 'discovery.sortPriceDesc' },
  { value: 'rating', labelKey: 'discovery.sortTopRated' },
  { value: 'newest', labelKey: 'discovery.sortNewest' },
];

function countOptions(label, counts) {
  return [{ value: '', label }, ...counts.map((count) => ({ value: String(count), label: `${count}+` }))];
}

const BEDROOM_OPTIONS = countOptions('Any', [1, 2, 3, 4]);
const BATHROOM_OPTIONS = countOptions('Any', [1, 2, 3]);

function CategoryBar({ selected, onSelect, onFilters }) {
  const { t } = useLanguage();
  return <div className="opg-filter-bar"><div className="opg-categories">{categories.map((category) => <button key={category} type="button" className={selected === category ? 'active' : ''} onClick={() => onSelect(category)}>{t(CATEGORY_LABEL_KEYS[category])}</button>)}</div>{onFilters ? <button className="opg-filter-action" type="button" onClick={onFilters}>☷ {t('discovery.filtersAction')}</button> : <Link to="/stays?filters=1" className="opg-filter-action">☷ {t('discovery.filtersAction')}</Link>}</div>;
}

function StayGrid({ items, loading, error, limit, checkIn, checkOut }) {
  const { t } = useLanguage();
  if (loading) return <div className="opg-state" role="status">{t('discovery.staysFinding')}</div>;
  if (error) return <div className="opg-state" role="alert">{error}</div>;
  if (!items.length) return <div className="opg-state">{t('discovery.staysNoMatch')}</div>;
  // Show as many columns as there are cards, up to four. A fixed four-column
  // grid stranded the two published listings in the left quarter of a wide
  // screen, which read as an empty collection rather than a small one.
  const visible = items.slice(0, limit);
  const columns = Math.max(1, Math.min(visible.length, 4));
  return <div className="opg-stay-grid" style={{ '--opg-stay-columns': columns }}>{visible.map((stay) => <StayCard key={stay.id} stay={stay} checkIn={checkIn} checkOut={checkOut} />)}</div>;
}

// Vertical rhythm: styles.css owns each section's padding-block and every
// heading's margin, and an unlayered rule there outranks a single-class
// utility. space-y still works because it reaches the children through
// `> :not([hidden]) ~ :not([hidden])`, which does outrank their own class
// rules: it replaces each child's margins rather than adding to them. So every
// value below is at least the largest margin already in that stack (section
// headings sit at 24px, which is why the stacks start at 28px, not 24px), and
// the gap only ever grows.
//
// The hero and the benefits block are left alone on purpose: the hero is a
// fixed 440px tall, so extra rows of text would spill past its background, and
// `.opg-centered` already carries a 48px margin under the section heading.
export function GuestHome() {
  const { t } = useLanguage();
  const [category, setCategory] = useState('All stays');
  const [recent, setRecent] = useState(() => getRecentlyViewed());
  const stays = useStays({ search: DEFAULT_SEARCH_LOCATION, limit: 8, type: category === 'All stays' ? undefined : category.slice(0, -1).toLowerCase() }, t);
  return <main className="opg-page opg-home">
    <section className="opg-hero" style={{ backgroundImage: 'linear-gradient(90deg, rgba(20,58,128,.79), rgba(20,58,128,.48)), url("/images/place-un-hq.jpg")' }}><div className="opg-container"><span className="opg-hero-badge">{t('discovery.homeBadge')}</span><h1><span className="opg-desktop-title">{t('discovery.homeTitle')}</span><span className="opg-mobile-title">{t('discovery.homeTitleMobile')}</span></h1><p>{t('discovery.homeBody')}</p><span className="opg-mobile-subtitle">{stays.loading ? t('discovery.homeMobileSubtitleLoading') : t('discovery.homeMobileSubtitle', { count: stays.total })}</span><SearchForm /><div className="opg-popular">{t('discovery.homePopular')} {['Westlands','Kilimani','Lavington','Karen'].map((place) => <Link key={place} to={`/stays?search=${encodeURIComponent(place)}`}>{place}</Link>)}</div><Link to="/stays?search=Westlands" className="opg-mobile-feature" style={{ backgroundImage: 'url("/images/place-un-hq.jpg")' }}><span>{t('discovery.homePopularInArea', { area: 'Westlands' })}</span></Link></div></section>
    <section className="opg-section opg-stays-section"><div className="opg-container space-y-7 md:space-y-8"><div className="opg-section-heading"><div><h2>{t('discovery.homeStaysTitle')}</h2><p>{t('discovery.homeStaysSubtitle')}</p></div><Link to="/stays" className="inline-flex items-center gap-1">{t('common.seeAll')} <ChevronRight className="w-4 h-4" aria-hidden="true" /></Link></div><CategoryBar selected={category} onSelect={setCategory} /><StayGrid {...stays} /></div></section>
    {recent.length > 0 && <section className="opg-section opg-recent"><div className="opg-container space-y-7 md:space-y-8"><div className="opg-section-heading"><h2>{t('discovery.homeRecentlyViewed')}</h2><button type="button" onClick={() => { clearRecentlyViewed(); setRecent([]); }}>{t('discovery.homeClearHistory')}</button></div><div className="opg-recent-grid">{recent.slice(0, 5).map((stay) => <Link to={`/stay/${stay.id}`} key={stay.id} className="space-y-3"><img src={stay.image || heroImage} alt="" /><strong>{stay.title}</strong></Link>)}</div></div></section>}
    <section className="opg-section opg-benefits"><div className="opg-container"><div className="opg-centered"><h2>{t('discovery.homeWhyTitle')}</h2><p>{t('discovery.homeWhySubtitle')}</p></div><div className="opg-benefit-grid">{benefits.map(({ Icon, titleKey, copyKey }) => <article key={titleKey} className="sm:space-y-5"><span aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></span><h3>{t(titleKey)}</h3><p>{t(copyKey)}</p></article>)}</div></div></section>
    <section className="opg-section opg-guides"><div className="opg-container space-y-7 md:space-y-8"><div className="opg-section-heading"><div><h2>{t('discovery.homeExploreTitle')}</h2><p>{t('discovery.homeExploreSubtitle')}</p></div><Link to="/guides" className="inline-flex items-center gap-1">{t('discovery.homeBrowseGuides')} <ChevronRight className="w-4 h-4" aria-hidden="true" /></Link></div><div className="opg-guide-grid">{guides.map((guide) => <Link to="/guides" key={guide.titleKey} style={{ backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.8), transparent 58%), url("${guide.image}")` }}><span>{t(guide.labelKey)}</span><div><h3>{t(guide.titleKey)}</h3><small>{t('discovery.guideExploreArea')}</small></div></Link>)}</div></div></section>
  </main>;
}

export function GuestStays() {
  const { t } = useLanguage();
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
  const stays = useStays({ limit: 12, page, search: search || undefined, type: category === 'All stays' ? undefined : category.slice(0, -1).toLowerCase(), checkIn: searchParams.get('checkIn') || undefined, checkOut: searchParams.get('checkOut') || undefined, minPrice: searchParams.get('minPrice') || undefined, maxPrice: searchParams.get('maxPrice') || undefined, minBedrooms: searchParams.get('minBedrooms') || undefined, minBathrooms: searchParams.get('minBathrooms') || undefined, amenities: searchParams.get('amenities') || undefined, sort: searchParams.get('sort') || undefined }, t);
  function applyFilters(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const next = new URLSearchParams(searchParams); for (const name of ['minPrice','maxPrice','minBedrooms','minBathrooms']) { const value = String(form.get(name) || '').trim(); if (value) next.set(name, value); else next.delete(name); } const chosenAmenities = form.getAll('amenities'); if (chosenAmenities.length) next.set('amenities', chosenAmenities.join(',')); else next.delete('amenities'); next.delete('filters'); next.delete('page'); setSearchParams(next); setFiltersOpen(false); }
  const areaLabel = allKenya ? 'Kenya' : search;
  return <main className="opg-page opg-results"><div className="opg-container space-y-9"><div className="opg-results-intro"><p><Link to="/">{t('discovery.navHome')}</Link> / {t('discovery.navStays')}</p><h1>{allKenya ? t('discovery.staysTitleAllKenya') : t('discovery.staysTitleArea', { area: areaLabel })}</h1><span>{t('discovery.staysLede')}</span></div><SearchForm initial={search} allKenya={allKenya} /><CategoryBar selected={category} onSelect={setCategory} onFilters={openFilters} /><div className="opg-results-toolbar"><strong>{stays.loading ? t('discovery.staysFinding') : t('discovery.staysAvailable', { count: stays.total })}</strong><a className="opg-map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`stays in ${areaLabel}`)}`} target="_blank" rel="noopener noreferrer">{t('discovery.staysViewAreaOnMap')}</a><label className="opg-sort">{t('discovery.staysSortBy')} <SelectMenu ariaLabel={t('discovery.staysSortAria')} value={searchParams.get('sort') || ''} onChange={(next) => { const nextParams = new URLSearchParams(searchParams); if (next) nextParams.set('sort', next); else nextParams.delete('sort'); nextParams.delete('page'); setSearchParams(nextParams); }} options={SORT_OPTIONS.map((option) => ({ ...option, label: t(option.labelKey) }))} /></label></div><StayGrid {...stays} checkIn={searchParams.get('checkIn') || undefined} checkOut={searchParams.get('checkOut') || undefined} />{stays.total > page * 12 && <button className="opg-load-more" onClick={() => { const next = new URLSearchParams(searchParams); next.set('page', String(page + 1)); setSearchParams(next); }}>{t('discovery.staysNextPage')} <ChevronRight className="w-4 h-4" aria-hidden="true" /></button>}</div>{filtersOpen && <div className="opg-filter-backdrop" onClick={() => setFiltersOpen(false)}><form className="opg-filter-dialog space-y-5" onClick={(event) => event.stopPropagation()} onSubmit={applyFilters}><div><h2>{t('discovery.filtersTitle')}</h2><button type="button" onClick={() => setFiltersOpen(false)} aria-label={t('discovery.filtersClose')}>×</button></div><label>{t('discovery.filterMinPrice')}<TextInput name="minPrice" type="number" min="0" defaultValue={searchParams.get('minPrice') || ''} placeholder="KSh" /></label><label>{t('discovery.filterMaxPrice')}<TextInput name="maxPrice" type="number" min="0" defaultValue={searchParams.get('maxPrice') || ''} placeholder="KSh" /></label><label>{t('discovery.filterMinBedrooms')}<SelectMenu name="minBedrooms" value={bedroomFilter} onChange={(next) => setBedroomFilter(next)} options={BEDROOM_OPTIONS.map((option) => ({ ...option, label: option.value ? option.label : t('discovery.filterAny') }))} ariaLabel={t('discovery.filterMinBedrooms')} /></label><label>{t('discovery.filterMinBathrooms')}<SelectMenu name="minBathrooms" value={bathroomFilter} onChange={(next) => setBathroomFilter(next)} options={BATHROOM_OPTIONS.map((option) => ({ ...option, label: option.value ? option.label : t('discovery.filterAny') }))} ariaLabel={t('discovery.filterMinBathrooms')} /></label><fieldset className="opg-amenity-filters"><legend>{t('discovery.filterAmenities')}</legend>{AMENITY_OPTIONS.map((amenity) => <label key={amenity.value}><input type="checkbox" name="amenities" value={amenity.value} defaultChecked={(searchParams.get('amenities') || '').split(',').includes(amenity.value)} /> {t(amenity.labelKey)}</label>)}</fieldset><button className="opg-apply-filters" type="submit">{t('discovery.filterShow')}</button></form></div>}</main>;
}

/**
 * One-line legal strip for the signed-in app screens (trips, bookings, inbox,
 * profile, saved lists), which carry no marketing footer. It keeps the legal
 * entries and the cookie choice reachable from inside the app.
 */
export function GuestLegalStrip() {
  const { t } = useLanguage();
  return <footer className="opg-legal-strip"><div className="opg-container"><small>{t('discovery.footerLegalEntity')} {t('discovery.rightsReserved', { year: new Date().getFullYear() })}</small><span><Link to="/privacy">{t('discovery.legalPrivacy')}</Link><Link to="/terms">{t('discovery.legalTerms')}</Link><Link to="/credits">{t('discovery.footerPhotoCredits')}</Link><button type="button" onClick={openConsentManager}>{t('discovery.legalCookies')}</button></span></div></footer>;
}
export function GuestFooter() {
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  // A visitor with no account cannot open the host workspace, so this CTA has
  // to earn their interest first: /become-a-host explains the fees and links
  // on to sign-up. Pointing it at /host/today used to bounce a new host
  // straight to the sign-in page.
  const hostHref = !isAuthenticated
    ? '/become-a-host'
    : user?.role === 'USER'
      ? '/host/application'
      // An administrator has no host workspace to land on; HostRoute bounces them
      // to the admin dashboard, so send them there directly.
      : user?.role === 'ADMIN' ? '/admin' : '/host/today';
  return <footer className="opg-footer"><div className="opg-container"><div className="opg-footer-columns"><div><Link className="opg-footer-brand" to="/" aria-label={t('discovery.footerBrandHome')}><BrandLogo imgClassName="h-16 w-auto" alt="ZuriLofts" /></Link><p>{t('discovery.footerAbout')}</p></div><div><h3>{t('discovery.footerExplore')}</h3><Link to="/stays">{t('discovery.footerStaysLink')}</Link><Link to="/places">{t('discovery.footerNeighbourhoods')}</Link><Link to="/guides">{t('discovery.footerGuides')}</Link><Link to="/restaurants">{t('discovery.footerRestaurants')}</Link></div><div><h3>{t('discovery.footerCompany')}</h3><Link to={hostHref}>{t('discovery.footerBecomeHost')}</Link><Link to="/become-a-host">{t('discovery.footerFeeCalculator')}</Link></div><div><h3>{t('discovery.footerSupport')}</h3><Link to="/help">{t('discovery.footerHelpCentre')}</Link><Link to="/terms">{t('discovery.legalTerms')}</Link><Link to="/privacy">{t('discovery.legalPrivacy')}</Link><Link to="/credits">{t('discovery.footerPhotoCredits')}</Link></div><div><h3>{t('discovery.footerStayUpdated')}</h3><p>{t('discovery.footerNewsletter')}</p></div></div><div className="opg-footer-bottom">{t('discovery.footerLegalEntity')} {t('discovery.rightsReserved', { year: new Date().getFullYear() })} <span><Link to="/privacy">{t('discovery.legalPrivacy')}</Link><Link to="/terms">{t('discovery.legalTerms')}</Link><Link to="/credits">{t('discovery.footerPhotoCredits')}</Link><button type="button" onClick={openConsentManager}>{t('discovery.legalCookies')}</button></span></div></div></footer>;
}
