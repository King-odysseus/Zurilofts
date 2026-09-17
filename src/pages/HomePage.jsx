import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchBar } from '../components/Hero.jsx';
import Spinner from '../components/Spinner.jsx';
import logoImg from '../assets/zurilofts-logo.png';
import { heroImage } from '../assets/images.js';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { firstImage } from '../utils/images.js';
import { clearRecentlyViewed, getRecentlyViewed } from '../utils/recentlyViewed.js';
import { PLACES_TO_VISIT, PLACES_TO_EAT } from '../data/nearby.js';

const HOME_TYPE_CHIPS = [
  { key: 'all', label: 'All stays' },
  { key: 'apartment', label: 'Apartments' },
  { key: 'studio', label: 'Studios' },
  { key: 'penthouse', label: 'Penthouses' },
  { key: 'villa', label: 'Villas' },
];

const EXPLORE_CARDS = [
  {
    eyebrow: 'Nightlife',
    title: 'Westlands After Dark',
    meta: '12 stays · 8 min read',
    image: PLACES_TO_VISIT.find((place) => place.area === 'westlands')?.image,
    href: '/guides',
  },
  {
    eyebrow: 'Cafés',
    title: 'Kilimani Coffee Guide',
    meta: '12 stays · 8 min read',
    image: PLACES_TO_EAT.find((place) => place.area === 'kilimani' && place.category === 'cafe')?.image,
    href: '/restaurants',
  },
  {
    eyebrow: 'Outdoors',
    title: 'Karen Green Escapes',
    meta: '12 stays · 8 min read',
    image: PLACES_TO_VISIT.find((place) => place.area === 'karen' && place.category === 'nature')?.image,
    href: '/places',
  },
];

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
    sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15M15 6v15" /></>,
    shield: <><path d="M12 3 4.8 6v5.2c0 4.5 3 8.4 7.2 9.8 4.2-1.4 7.2-5.3 7.2-9.8V6Z" /><path d="m8.7 12 2.1 2.1 4.5-4.5" /></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    headset: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v5H5a1 1 0 0 1-1-1ZM20 14h-3v5h2a1 1 0 0 0 1-1ZM17 19c0 1.1-.9 2-2 2h-3" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  };
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function HomeHeader() {
  const { user, isAuthenticated } = useAuth();
  return (
    <header className="relative z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-4 px-5 md:px-8">
        <Link to="/" className="shrink-0" aria-label="ZuriLofts home">
          <img src={logoImg} alt="ZuriLofts" className="h-11 w-[118px] object-contain" />
        </Link>
        <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#0B1F42] md:flex" aria-label="Main navigation">
          <Link className="hover:text-[#2563EB]" to="/properties">Stays</Link>
          <Link className="hover:text-[#2563EB]" to="/places">Places</Link>
          <Link className="hover:text-[#2563EB]" to="/restaurants">Restaurants</Link>
          <Link className="hover:text-[#2563EB]" to="/guides">Guides</Link>
        </nav>
        <div className="flex items-center gap-1.5 text-[#0B1F42] sm:gap-3">
          <Link to="/properties" className="hidden h-9 items-center gap-2 rounded-full bg-slate-50 px-4 text-xs text-slate-500 lg:flex">
            <Icon name="search" className="h-3.5 w-3.5" /> Search
          </Link>
          <Link to="/host/application" className="hidden text-xs font-medium hover:text-[#2563EB] lg:block">Become a host</Link>
          <Link to="/favourites" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-50" aria-label="Favourites">
            <Icon name="heart" className="h-[18px] w-[18px]" />
          </Link>
          <button type="button" className="hidden h-11 w-11 items-center justify-center rounded-full hover:bg-slate-50 sm:flex" aria-label="Choose language">
            <Icon name="globe" className="h-[18px] w-[18px]" />
          </button>
          <Link to={isAuthenticated ? '/profile' : '/login'} className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500" aria-label={isAuthenticated ? 'Profile' : 'Sign in'}>
            {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : <Icon name="user" className="h-4 w-4" />}
          </Link>
        </div>
      </div>
    </header>
  );
}

function StayCard({ property }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const image = firstImage(property);
  const liked = property.id ? isFavorite(property.id) : false;
  const meta = [property.location, property.guests ? `${property.guests} guests` : null, property.bedrooms != null ? `${property.bedrooms} bed${property.bedrooms === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ');

  function toggle(e) {
    e.preventDefault();
    if (!isAuthenticated) navigate('/login');
    else if (property.id) toggleFavorite(property.id);
  }

  return (
    <article className="group min-w-0">
      <Link to={`/property/${property.id}`} className="block focus-visible:rounded-xl">
        <div className="relative aspect-[1.55/1] overflow-hidden rounded-[12px] bg-[#E8EEF5]">
          {image && <img src={image} alt={property.title || 'Furnished stay'} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />}
          <button type="button" onClick={toggle} className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#0B1F42] shadow-sm" aria-label={liked ? 'Remove from favourites' : 'Add to favourites'}>
            <svg className={`h-4 w-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
          </button>
        </div>
        <div className="pt-3">
          <h3 className="truncate text-[14px] font-semibold text-[#0B1F42]">{property.title || 'ZuriLofts stay'}</h3>
          <p className="mt-1 truncate text-[11px] text-[#5B6B82]">{meta || 'Nairobi'}</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="text-[12px] font-semibold text-[#0B1F42]">KES {Number(property.price || 0).toLocaleString()}</p>
            {property.rating != null && <p className="flex items-center gap-1 text-[11px] text-[#0B1F42]"><span aria-hidden="true">★</span> {Number(property.rating).toFixed(2)}</p>}
          </div>
        </div>
      </Link>
    </article>
  );
}

function RecentCard({ property }) {
  const image = firstImage(property);
  return (
    <Link to={`/property/${property.id}`} className="block min-w-0">
      <div className="aspect-[1.55/1] overflow-hidden rounded-[10px] bg-slate-200">
        {image && <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />}
      </div>
      <h3 className="mt-1.5 truncate text-[11px] font-semibold text-[#0B1F42]">{property.title}</h3>
      <p className="mt-0.5 truncate text-[9px] text-[#5B6B82]">{property.location} · KES {Number(property.price || 0).toLocaleString()}</p>
    </Link>
  );
}

function ExploreCard({ card }) {
  return (
    <Link to={card.href} className="group relative h-[320px] overflow-hidden rounded-[15px] bg-slate-300 md:h-[360px]">
      {card.image && <img src={card.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />}
      <div className="absolute inset-0 bg-gradient-to-t from-[#06152f]/95 via-transparent to-transparent" />
      <span className="absolute left-5 top-5 rounded-full bg-white/90 px-4 py-1.5 text-[10px] font-medium text-[#0B1F42]">{card.eyebrow}</span>
      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <h3 className="text-lg font-semibold">{card.title}</h3>
        <div className="mt-2 flex items-center justify-between text-[11px] text-white/80"><span>{card.meta}</span><Icon name="arrow" className="h-4 w-4" /></div>
      </div>
    </Link>
  );
}

function HomeFooter() {
  return (
    <footer className="bg-[#0B1F42] text-white">
      <div className="mx-auto max-w-[1240px] px-5 py-12 md:px-8 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_.7fr_.7fr_1fr]">
          <div>
            <div className="inline-flex rounded-lg bg-white p-1.5"><img src={logoImg} alt="ZuriLofts" className="h-9 w-[100px] object-contain" /></div>
            <p className="mt-5 max-w-[280px] text-[13px] leading-6 text-white/75">Furnished apartments in Nairobi&apos;s best neighbourhoods — verified, flexible, and ready when you are.</p>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider">Explore</h3>
            <div className="mt-5 flex flex-col gap-3 text-[12px] text-white/75"><Link to="/properties">Stays</Link><Link to="/places">Neighbourhoods</Link><Link to="/guides">Guides</Link><Link to="/restaurants">Restaurants</Link></div>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider">Company</h3>
            <div className="mt-5 flex flex-col gap-3 text-[12px] text-white/75"><a href="mailto:enquires@zurilofts.com">About us</a><Link to="/host/application">Host with us</Link><a href="mailto:enquires@zurilofts.com">Press</a><a href="mailto:enquires@zurilofts.com">Contact</a></div>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider">Stay updated</h3>
            <p className="mt-5 text-[12px] leading-5 text-white/75">New homes and off-season rates, once a month. No spam.</p>
            <form className="mt-4 flex h-11 items-center rounded-full bg-white px-4" onSubmit={(e) => e.preventDefault()}>
              <label className="sr-only" htmlFor="home-newsletter">Email address</label>
              <input id="home-newsletter" type="email" placeholder="you@email.com" className="min-w-0 flex-1 bg-transparent text-xs text-[#0B1F42] outline-none" />
              <button type="submit" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C89B6D]" aria-label="Subscribe"><Icon name="arrow" className="h-4 w-4" /></button>
            </form>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/15 pt-6 text-[11px] text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ZuriLofts. All rights reserved.</p>
          <div className="flex gap-6"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/privacy#cookies">Cookies</Link></div>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [allProperties, setAllProperties] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeType, setActiveType] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/properties');
      setAllProperties(response.data.data || []);
    } catch (err) {
      console.error('HomePage load error', err);
      setError('We couldn\'t load stays right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!allProperties.length) return;
    const byId = new Map(allProperties.map((property) => [property.id, property]));
    setRecentlyViewed(getRecentlyViewed().map((entry) => byId.get(entry.id)).filter(Boolean).slice(0, 5));
  }, [allProperties]);

  const stays = useMemo(() => {
    const matching = activeType === 'all' ? allProperties : allProperties.filter((property) => String(property.type || '').toLowerCase() === activeType);
    return matching.slice(0, 8);
  }, [activeType, allProperties]);

  return (
    <div className="min-h-screen bg-white text-[#0B1F42]">
      <HomeHeader />
      <main>
        <section className="relative z-20 isolate overflow-visible bg-[#102B62] text-white">
          <img src={heroImage} alt="A furnished ZuriLofts apartment in Nairobi" className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-[#123878]/80" />
          <div className="mx-auto flex min-h-[440px] max-w-[1240px] flex-col items-center justify-center px-5 py-20 text-center md:px-8 md:py-24">
            <span className="rounded-full bg-[#C89B6D] px-4 py-2 text-[10px] font-semibold uppercase tracking-[.1em] text-white">100+ verified homes · Nairobi</span>
            <h1 className="mt-6 text-4xl font-semibold tracking-[-.03em] sm:text-5xl">Find your place in Nairobi</h1>
            <p className="mt-4 max-w-[650px] text-sm leading-6 text-white/90 sm:text-base">Handpicked apartments across the city&apos;s best neighbourhoods — verified, furnished, and ready to move in.</p>
            <div className="mt-7 w-full max-w-[940px] text-left"><SearchBar discovery /></div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-white/80"><span className="text-[#E3B77F]">Popular:</span><Link to="/properties?search=Westlands">Westlands</Link><span>·</span><Link to="/properties?search=Kilimani">Kilimani</Link><span>·</span><Link to="/properties?search=Lavington">Lavington</Link><span>·</span><Link to="/properties?search=Karen">Karen</Link></div>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-5 py-14 md:px-8 md:py-16">
          <div className="flex items-end justify-between gap-4">
            <div><h2 className="mt-4 text-2xl font-semibold tracking-tight md:mt-6 md:text-[30px]">Stays in Nairobi</h2><p className="mt-1 text-xs text-[#5B6B82]">Handpicked homes, verified by our team</p></div>
            <Link to="/properties" className="hidden items-center gap-2 text-xs font-medium sm:flex">See all <Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1 no-scrollbar">
              {HOME_TYPE_CHIPS.map((chip) => <button key={chip.key} type="button" onClick={() => setActiveType(chip.key)} className={`min-h-[36px] shrink-0 rounded-full px-4 text-xs font-medium ${activeType === chip.key ? 'bg-[#0B1F42] text-white' : 'border border-[#D8E0E9] bg-white text-[#44546A]'}`}>{chip.label}</button>)}
            </div>
            <div className="flex gap-2"><button type="button" onClick={() => navigate('/properties')} className="flex min-h-[36px] items-center gap-2 rounded-full border border-[#D8E0E9] px-4 text-xs"><Icon name="sliders" className="h-4 w-4" /> Filters</button><button type="button" onClick={() => navigate('/properties?view=map')} className="flex min-h-[36px] items-center gap-2 rounded-full border border-[#D8E0E9] px-4 text-xs"><Icon name="map" className="h-4 w-4" /> Show map</button></div>
          </div>
          {loading && <div className="flex justify-center py-24"><Spinner /></div>}
          {!loading && error && <div className="mt-8 rounded-2xl bg-[#F4F7FB] p-10 text-center text-sm text-[#5B6B82]"><p>{error}</p><button type="button" onClick={load} className="mt-4 rounded-full bg-[#0B1F42] px-6 py-3 font-semibold text-white">Try again</button></div>}
          {!loading && !error && stays.length === 0 && <div className="mt-8 rounded-2xl bg-[#F4F7FB] p-10 text-center text-sm text-[#5B6B82]">No stays match this category yet.</div>}
          {!loading && !error && stays.length > 0 && <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">{stays.map((property, index) => <div key={property.id} className={index >= 4 ? 'hidden sm:block' : ''}><StayCard property={property} /></div>)}</div>}
        </section>

        {recentlyViewed.length > 0 && <section className="bg-[#EFF3F9]"><div className="mx-auto max-w-[1240px] px-5 py-12 md:px-8"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Recently viewed</h2><button type="button" onClick={() => { clearRecentlyViewed(); setRecentlyViewed([]); }} className="text-[11px] text-[#5B6B82]">Clear history</button></div><div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-5 lg:gap-4">{recentlyViewed.map((property) => <RecentCard key={property.id} property={property} />)}</div></div></section>}

        <section className="mx-auto max-w-[1240px] px-5 py-20 text-center md:px-8 md:py-24">
          <h2 className="text-2xl font-semibold md:text-[30px]">Why stay with ZuriLofts</h2>
          <p className="mt-2 text-xs text-[#5B6B82]">A calmer, clearer way to book a home in Nairobi</p>
          <div className="mt-8 grid gap-5 text-left md:grid-cols-3">
            {[
              ['shield', 'Verified homes', 'Every listing is inspected and professionally photographed before it goes live.'],
              ['receipt', 'Transparent pricing', 'One clear nightly rate — utilities, fast WiFi and cleaning all included.'],
              ['headset', '24/7 local support', 'A Nairobi-based team on call for check-in, repairs and anything else.'],
            ].map(([icon, title, copy]) => <div key={title} className="rounded-[14px] border border-[#E3E8EF] bg-[#F4F7FB] p-7"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C89B6D] text-white"><Icon name={icon} /></span><h3 className="mt-5 text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-[#5B6B82]">{copy}</p></div>)}
          </div>
        </section>

        <section className="bg-[#F8FAFC]"><div className="mx-auto max-w-[1240px] px-5 py-16 md:px-8 md:py-20"><div className="flex items-end justify-between"><div><h2 className="text-2xl font-semibold md:text-[30px]">Explore Nairobi</h2><p className="mt-2 text-xs text-[#5B6B82]">Neighbourhood guides, written by people who live there</p></div><Link to="/guides" className="hidden items-center gap-2 text-xs font-medium sm:flex">Browse all guides <Icon name="arrow" className="h-4 w-4" /></Link></div><div className="mt-8 grid gap-5 md:grid-cols-3">{EXPLORE_CARDS.map((card) => <ExploreCard key={card.title} card={card} />)}</div></div></section>
      </main>
      <HomeFooter />
    </div>
  );
}
