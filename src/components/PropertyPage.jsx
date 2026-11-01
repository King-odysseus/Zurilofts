import { useLocation, useParams, useSearchParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowLeft, Bath, Building2, Check, ChevronLeft, ChevronRight, CircleAlert, House, MapPin, Ruler, ShieldCheck, Star } from 'lucide-react';
import Lightbox from './Lightbox.jsx';
import ReviewSection from './ReviewSection.jsx';
import PropertyTrustPanel from './PropertyTrustPanel';
import SimilarProperties from './SimilarProperties';
import AddOnsSection from './AddOnsSection';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTranslated, useTranslatedList } from '../i18n/useTranslated.js';

import apiClient from '../api/client.js';
import { recordView } from '../utils/recentlyViewed.js';
import { googleMapsSearchUrl, googleMapsDirectionsUrl } from '../utils/googleMaps.js';
import { formatPrice } from '../utils/currency.js';

/** Safely coerce a value to an array, no matter what the API sends. */
function safeArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function PropertyPage() {
  const { t } = useLanguage();
  const { id: routeId } = useParams();
  const { pathname } = useLocation();
  const id = routeId || pathname.split('/')[2];
  const [searchParams] = useSearchParams();
  const variant = searchParams.get('variant'); // '1bed' | '2bed' | null
  const [featuredImage, setFeaturedImage] = useState(0);
  useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const recordedRef = useRef(false);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  // The listing's own words - title, description, where it is, and the lists the
  // host filled in - are stored in whatever language the host typed them. The
  // hooks give back the original until a translation exists, so none of these
  // needs a loading branch. Declared above the early returns: hooks must run on
  // every render, including the loading and error ones.
  const title = useTranslated(property?.title);
  // Tags are stripped before translating rather than after: the translator
  // should be sent prose, and a '<' in its answer must not later be swallowed
  // by the markup cleanup as if it were an HTML tag.
  const descriptionSource = useMemo(
    () => (property?.description ?? '').replace(/<[^>]*>?/gm, ''),
    [property?.description]
  );
  const description = useTranslated(descriptionSource);
  const location = useTranslated(property?.location);
  const address = useTranslated(property?.address);
  const amenityLabels = useTranslatedList(safeArray(property?.amenities));
  const nearbyLabels = useTranslatedList(safeArray(property?.nearby));

  // ReviewSection owns the only fetch of the review summary, so it reports the
  // result upward instead of the page asking for the same data twice.
  const handleReviewSummary = useCallback((summary) => {
    setReviewsLoaded(summary !== undefined);
    setReviewSummary(summary ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchProperty() {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get(`/properties/${id}`);
        if (!cancelled) {
          setFeaturedImage(0);
          setProperty(res.data.data);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || t('stays.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProperty();
    return () => { cancelled = true; };
  }, [id, t]);

  // Record the view once the property data has loaded. Guarded so it never
  // fires before data arrives or twice on re-render.
  useEffect(() => {
    if (!property || recordedRef.current) return;
    recordedRef.current = true;
    recordView(property);
  }, [property]);

  useEffect(() => {
    if (!property) return;
    // A stored listing title often already opens with the brand ("ZuriLofts -
    // Serenity Residency 1003"), so strip it and add it back once. Worded to
    // match the server-rendered head (seo.service.ts) so the tab, the search
    // result and a link preview all read the same.
    const brandPrefixes = ['zurilofts - ', 'zurilofts: ', 'zurilofts | '];
    const prefix = brandPrefixes.find((candidate) => property.title.toLowerCase().startsWith(candidate));
    const listingTitle = (prefix ? property.title.slice(prefix.length) : property.title).trim();
    const place = property.neighborhood || property.location;
    const pageTitle = place ? `${listingTitle} in ${place} | ZuriLofts` : `${listingTitle} | ZuriLofts`;
    document.title = pageTitle;
    const setMeta = (prop, content) => {
      let el = document.querySelector(`meta[property="og:${prop}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', `og:${prop}`); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('title', pageTitle);
    setMeta('description', property.description?.slice(0, 200) || '');
    setMeta('image', property.images?.[0] || '');
  }, [property]);

  // ── Stable gallery callbacks (must be above early returns - Rules of Hooks) ──
  const imagesLength = property?.images?.length || 0;
  const goPrev = useCallback(() => {
    if (imagesLength === 0) return;
    setFeaturedImage((prev) => (prev - 1 + imagesLength) % imagesLength);
  }, [imagesLength]);
  const goNext = useCallback(() => {
    if (imagesLength === 0) return;
    setFeaturedImage((prev) => (prev + 1) % imagesLength);
  }, [imagesLength]);

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-elevated">
        <main className="flex items-center justify-center min-h-[60vh]" role="status" aria-label={t('stays.loadingProperty')}>
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#C5A28C] border-t-transparent" />
            <p className="text-[#5B6B82]">{t('stays.loadingPropertyText')}</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Error / Not Found ────────────────────────────────────────────────
  if (error || !property) {
    return (
      <div className="min-h-screen bg-elevated">
        <main className="flex items-center justify-center min-h-[60vh]" role="alert">
          <div className="text-center px-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CircleAlert className="w-10 h-10 text-red-500" strokeWidth={2} aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[#203565]">{t('stays.notFoundTitle')}</h2>
            <p className="mb-4 text-[#5B6B82]">{error || t('stays.notFoundBody')}</p>
            <Link to="/properties" className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#16294B] px-6 py-2 font-semibold text-white transition-colors duration-200 hover:bg-[#16294B]">
              {t('stays.viewAllStays')}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────
  const images = property.images?.length > 0 ? property.images : [];

  // Supporting thumbnails for the asymmetric gallery: every image except the
  // currently featured one, capped at four to fill the desktop grid.
  const supportingImages = images
    .map((src, i) => ({ src, i }))
    .filter(({ i }) => i !== featuredImage)
    .slice(0, 4);

  const amenities = safeArray(property.amenities);
  const nearby = safeArray(property.nearby);

  // Bed-variant display logic (preserved exactly from original)
  const displayBedrooms = variant === '1bed' ? 1 : variant === '2bed' ? 2 : property.bedrooms;
  const displayBathrooms = variant === '1bed'
    ? (property.bathrooms1Bed ?? property.bathrooms)
    : variant === '2bed'
      ? (property.bathrooms2Bed ?? property.bathrooms)
      : property.bathrooms;
  const displayPrice = variant === '2bed'
    ? (property.price2Bed ?? property.price)
    : variant === '1bed'
      ? (property.price1Bed ?? property.price)
      : property.price;
  const bookingHref = `/booking/${property.id}${variant ? `?variant=${variant}` : ''}`;

  // The cached rating/reviews columns can lag behind the real reviews: a
  // seeded listing advertised "12 reviews" in the header while the section
  // under it said "No reviews yet". The live summary wins once it arrives.
  const liveReviewCount = reviewsLoaded ? (reviewSummary?.totalReviews ?? 0) : null;
  const shownReviewCount = liveReviewCount ?? property.reviews ?? 0;
  const hasReviews = typeof property.rating === 'number' && property.rating > 0 && shownReviewCount > 0;
  const reviewLabel = t(shownReviewCount === 1 ? 'common.review_one' : 'common.review_other', { count: shownReviewCount });

  const variantLabel = variant === '1bed'
    ? t('stays.oneBedOption')
    : variant === '2bed'
      ? t('stays.twoBedOption')
      : null;

  const typeLabels = { apartment: t('stays.typeApartment'), studio: t('stays.typeStudio'), penthouse: t('stays.typePenthouse') };
  const typeLabel = typeLabels[property.type] || property.type || t('stays.typeProperty');

  // ── Render ───────────────────────────────────────────────────────────
  return (
    // Bottom padding matches the ~88px the other public pages already leave
    // (.op-public-directory, .op-guides-content) so the final block - the Similar
    // properties strip - never butts straight up against the footer.
    <div className="min-h-screen bg-elevated pb-20 md:pb-24">
      {/* ── Compact breadcrumb / back row ────────────────────────── */}
      <nav className="border-b border-[#E3E8EF] bg-elevated px-4 py-4 sm:px-6" aria-label={t('stays.breadcrumb')}>
        <div className="mx-auto w-full max-w-[1344px]">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link
                to="/properties"
                className="inline-flex min-h-[44px] items-center rounded text-[#203565] transition-colors duration-200 hover:text-[#203565] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A28C]"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" strokeWidth={2} aria-hidden="true" />
                {t('stays.backToStays')}
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#94A3B8]">/</li>
            <li className="truncate font-medium text-[#203565]" aria-current="page">{typeLabel}</li>
          </ol>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-[1344px] px-4 sm:px-6 md:px-8 lg:px-16 py-6 md:py-10 lg:py-14">
        {/* ── Image gallery: large primary + supporting thumbnail grid ── */}
        {images.length > 0 && (
          <section className="mb-8 lg:mb-12" aria-label={t('stays.photoGallery')}>
            {images.length === 1 ? (
              <img
                className="h-56 w-full cursor-pointer rounded-2xl border border-[#E3E8EF] object-cover shadow-sm sm:h-72 md:h-[460px]"
                src={images[0]}
                alt={t('stays.photoAltSingle', { title: property.title })}
                onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-2 md:gap-3">
                {/* Primary image - spans two columns and rows on desktop */}
                <div className="relative col-span-2 row-span-2 overflow-hidden rounded-2xl border border-[#E3E8EF] bg-elevated shadow-sm md:col-span-2">
                  <img
                    className="w-full h-56 sm:h-72 md:h-full md:min-h-[440px] object-cover cursor-pointer"
                    src={images[featuredImage]}
                    alt={t('stays.photoAlt', { title: property.title, index: featuredImage + 1, total: images.length })}
                    onClick={() => { setLightboxIndex(featuredImage); setLightboxOpen(true); }}
                  />
                  {/* Previous / Next - only show when there are multiple images */}
                  <button
                    onClick={goPrev}
                    className="absolute top-1/2 -translate-y-1/2 left-3 w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A28C] transition-colors shadow-md"
                    aria-label={t('stays.previousPhoto')}
                  >
                    <ChevronLeft className="h-5 w-5 text-[#203565]" strokeWidth={2} aria-hidden="true" />
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute top-1/2 -translate-y-1/2 right-3 w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A28C] transition-colors shadow-md"
                    aria-label={t('stays.nextPhoto')}
                  >
                    <ChevronRight className="h-5 w-5 text-[#203565]" strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>

                {/* Supporting thumbnail grid - up to 4 complementary images */}
                {supportingImages.map(({ src, i }) => (
                  <button
                    key={i}
                    onClick={() => { setFeaturedImage(i); setLightboxIndex(i); setLightboxOpen(true); }}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[#E3E8EF] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A28C]"
                    aria-label={t('stays.viewPhoto', { index: i + 1 })}
                  >
                    <img
                      className="w-full h-20 sm:h-24 md:h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      src={src}
                      alt={t('stays.thumbnailAlt', { title: property.title, index: i + 1 })}
                    />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Property identity: title, location, rating ────────── */}
        <header className="mb-8 lg:mb-12">
          <h1 className="mb-2 text-2xl font-bold leading-tight text-[#203565] sm:text-3xl md:text-4xl">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[#5B6B82]">
            <a
              href={googleMapsSearchUrl({ lat: property.lat, lng: property.lng, label: property.location })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-[44px] rounded-full transition-colors hover:text-[#203565] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A28C]"
              title={t('stays.openInMaps')}
            >
              <MapPin className="w-5 h-5 text-[#5B6B82] shrink-0" strokeWidth={2} aria-hidden="true" />
              {location}
              <span className="text-xs font-semibold">Google Maps</span>
            </a>
            {hasReviews && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#203565]" aria-label={t('stays.ratedFrom', { rating: property.rating, count: shownReviewCount })}>
                <Star className="w-4 h-4 text-amber-500" fill="currentColor" aria-hidden="true" />
                {property.rating}
                <span className="font-normal text-[#5B6B82]">
                  &middot; {reviewLabel}
                </span>
              </span>
            )}
          </div>
        </header>

        {/* ── Trust panel ────────────────────────────────────────── */}
        <PropertyTrustPanel
          rating={hasReviews ? property.rating : 0}
          reviewCount={shownReviewCount}
          type={property.type}
          location={location}
        />

        {/* ── Two-column body ────────────────────────────────────── */}
        {/* mt-8 lg:mt-12 keeps the two-column body clear of the trust panel above it. */}
        <div className="mt-8 lg:mt-12 grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
          {/* ── Left column - property details ─────────────────── */}
          <div className="lg:col-span-2">
            {/* Quick facts */}
            <section className="flex flex-wrap gap-5 sm:gap-8 mb-8 lg:mb-12 py-8 md:py-10 border-b border-[#E3E8EF]" aria-label={t('stays.keyFacts')}>
              <div className="flex items-center gap-2">
                <House className="h-6 w-6 shrink-0 text-[#8A6B52]" strokeWidth={2} aria-hidden="true" />
                <div>
                  <p className="font-bold text-[#203565]">{displayBedrooms}</p>
                  <p className="text-sm text-[#5B6B82]">{displayBedrooms === 1 ? t('stays.bedroomLabel') : t('stays.bedroomsLabel')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bath className="h-6 w-6 shrink-0 text-[#8A6B52]" strokeWidth={2} aria-hidden="true" />
                <div>
                  <p className="font-bold text-[#203565]">{displayBathrooms}</p>
                  <p className="text-sm text-[#5B6B82]">{displayBathrooms === 1 ? t('stays.bathroomLabel') : t('stays.bathroomsLabel')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Ruler className="h-6 w-6 shrink-0 text-[#8A6B52]" strokeWidth={2} aria-hidden="true" />
                <div>
                  <p className="font-bold text-[#203565]">{t('stays.areaSqft', { area: property.area })}</p>
                  <p className="text-sm text-[#5B6B82]">{t('stays.area')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 shrink-0 text-[#8A6B52]" strokeWidth={2} aria-hidden="true" />
                <div>
                  <p className="font-bold text-[#203565]">{typeLabel}</p>
                  <p className="text-sm text-[#5B6B82]">{t('stays.typeLabel')}</p>
                </div>
              </div>
            </section>

            {/* Description */}
            <section className="mb-8 lg:mb-12" aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-xl sm:text-2xl font-bold text-[#203565] mb-4">{t('stays.aboutType', { type: typeLabel.toLowerCase() })}</h2>
              <div className="text-[#1f2937] leading-relaxed space-y-4">
                {(description || t('stays.noDescription')).replace(/<[^>]*>?/gm, '').split('\n').filter(Boolean).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Amenities */}
            {amenities.length > 0 && (
              <section className="mb-8 lg:mb-12" aria-labelledby="amenities-heading">
                <h2 id="amenities-heading" className="text-xl sm:text-2xl font-bold text-[#203565] mb-4">{t('stays.amenitiesTitle')}</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5" role="list">
                  {amenityLabels.map((amenity, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <Check className="h-5 w-5 shrink-0 text-[#8A6B52]" strokeWidth={2} aria-hidden="true" />
                      <span className="text-[#1f2937]">{amenity}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Nearby */}
            {nearby.length > 0 && (
              <section className="mb-8 lg:mb-12" aria-labelledby="nearby-heading">
                <h2 id="nearby-heading" className="text-xl sm:text-2xl font-bold text-[#203565] mb-4">{t('stays.nearbyTitle')}</h2>
                <ul className="space-y-4" role="list">
                  {nearbyLabels.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-[#1f2937]">
                      <MapPin className="w-5 h-5 text-[#5B6B82] shrink-0 mt-0.5" strokeWidth={2} aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Where you'll be - shown whenever the listing has a place name or
                street address. No map is embedded; the link opens Google Maps. */}
            {(property.location || property.address) && (
              <section className="mb-8 lg:mb-12" aria-labelledby="location-heading">
                <h2 id="location-heading" className="text-xl sm:text-2xl font-bold text-[#203565] mb-4">{t('stays.whereYoullBe')}</h2>
                <div className="rounded-2xl border border-[#E3E8EF] bg-elevated p-5 shadow-[0_8px_24px_rgba(20,58,128,0.06)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      {property.location && <p className="font-semibold text-[#203565]">{location}</p>}
                      {property.address && <p className="mt-1 break-words text-sm text-[#5B6B82]">{address}</p>}
                    </div>
                    <a
                      href={googleMapsSearchUrl({ lat: property.lat, lng: property.lng, label: property.address || property.location })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#16294B] px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#16294B]"
                    >
                      <MapPin className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                      {t('stays.openInMaps')}
                    </a>
                    <a
                      href={googleMapsDirectionsUrl({ lat: property.lat, lng: property.lng, label: property.address || property.location })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#E3E8EF] bg-elevated px-5 py-2.5 text-sm font-semibold text-[#203565] transition-colors hover:border-[#203565] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A28C]"
                    >
                      {t('stays.getDirections')}
                    </a>
                  </div>
                </div>
              </section>
            )}

            {/* Add-ons - renders nothing when the property has none */}
            <AddOnsSection propertyId={property.id} />

            {/* No-content fallback when all optional sections are empty */}
            {amenities.length === 0 && nearby.length === 0 && (
              <p className="text-[#5B6B82] py-4">{t('stays.detailsPreparing')}</p>
            )}
          </div>

          {/* ── Right column - sticky booking summary ─────────────── */}
          <aside className="lg:col-span-1" aria-label={t('stays.bookingAside')}>
            <div className="sticky top-24 rounded-2xl border border-[#E3E8EF] bg-elevated p-5 shadow-[0_8px_28px_rgba(20,58,128,0.08)] md:p-6" role="complementary" aria-label={t('stays.bookingSummary')}>
              {/* Price per night */}
              <div className="mb-6">
                <span className="text-3xl font-bold text-[#203565]">
                  {formatPrice(displayPrice) ?? '-'}
                </span>
                <span className="text-[#5B6B82]"> {t('stays.perNightCompact')}</span>
              </div>

              {/* Bed variant chip - only when arriving from a variant card */}
              {variantLabel && (
                <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-[#FDE8D8] px-3 py-1.5 text-sm font-medium text-[#203565]">
                  <House className="w-4 h-4 text-[#8A6B52]" strokeWidth={2} aria-hidden="true" />
                  {variantLabel}
                </div>
              )}

              {/* Dates & guests summary - selection happens on the booking flow */}
              <Link
                to={bookingHref}
                className="mb-6 block rounded-2xl border border-[#E3E8EF] p-4 transition-colors duration-200 hover:border-[#C5A28C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A28C]"
                aria-label={t('stays.chooseDatesGuests')}
              >
                <div className="grid grid-cols-2 divide-x divide-[#E3E8EF]">
                  <div className="pr-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#5B6B82]">{t('stays.checkInOut')}</p>
                    <p className="mt-1 text-sm text-[#203565]">{t('stays.addDates')}</p>
                  </div>
                  <div className="pl-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#5B6B82]">{t('stays.guests')}</p>
                    <p className="mt-1 text-sm text-[#203565]">{t('stays.addGuests')}</p>
                  </div>
                </div>
              </Link>

              {/* Continue to booking CTA */}
              <Link
                to={bookingHref}
                className="block min-h-[48px] w-full rounded-[10px] bg-[#143A80] py-4 text-center font-bold text-white transition-colors duration-200 hover:bg-[#0B2A5E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A28C] active:bg-[#0B2A5E]"
                aria-label={t('stays.continueBookingAria', { what: variantLabel ? t('stays.variantOption', { variant: variantLabel }) : t('stays.thisProperty'), price: formatPrice(displayPrice) ?? '-' })}
              >
                {t('stays.continueBooking')}
              </Link>

              <p className="mt-5 text-center text-sm text-[#5B6B82]">{t('stays.notChargedYet')}</p>

              {/* Fee / total rows - resolved at checkout once dates are selected */}
              <div className="mt-6 space-y-3 border-t border-[#E3E8EF] pt-6 text-sm">
                <div className="flex justify-between text-[#203565]">
                  <span>{t('stays.cleaningFee')}</span>
                  <span className="text-[#5B6B82]">{t('stays.shownAtCheckout')}</span>
                </div>
                <div className="flex justify-between text-[#203565]">
                  <span>{t('stays.serviceFee')}</span>
                  <span className="text-[#5B6B82]">{t('stays.shownAtCheckout')}</span>
                </div>
                <div className="flex justify-between text-[#203565]">
                  <span>{t('stays.processingFee')}</span>
                  <span className="text-[#5B6B82]">{t('stays.shownAtCheckout')}</span>
                </div>
                <div className="flex justify-between border-t border-[#E3E8EF] pt-3 font-bold text-[#203565]">
                  <span>{t('common.total')}</span>
                  <span className="font-normal text-[#5B6B82]">{t('stays.addDatesForTotal')}</span>
                </div>
              </div>

              {/* Trust context - only facts from the API */}
              <div className="mt-6 border-t border-[#E3E8EF] pt-6">
                <h4 className="mb-4 font-semibold text-[#203565]">{t('stays.aboutListing')}</h4>
                <ul className="space-y-3 text-sm text-[#5B6B82]">
                  {hasReviews && (
                    <li className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-[#8A6B52] mt-0.5 shrink-0" fill="currentColor" aria-hidden="true" />
                      <span>
                        <span className="font-semibold text-[#203565]">{property.rating}</span> {t('stays.ratingWord')} &middot; {reviewLabel}
                      </span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#8A6B52] mt-0.5 shrink-0" strokeWidth={2} aria-hidden="true" />
                    <span>{t('stays.secureBooking')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Public Reviews */}
      {property && (
        <div className="mx-auto w-full max-w-[1344px] px-4 sm:px-6 md:px-8">
          <ReviewSection propertyId={property.id} onSummary={handleReviewSummary} />
        </div>
      )}

      {/* Similar properties */}
      {property && (
        <div className="mt-16 md:mt-20">
          <SimilarProperties property={property} />
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

export default PropertyPage;
