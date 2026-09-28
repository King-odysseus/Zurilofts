import { useLocation, useParams, useSearchParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft, Bath, Building2, Check, ChevronLeft, ChevronRight, CircleAlert, House, Map, MapPin, Ruler, ShieldCheck, Star } from 'lucide-react';
import Lightbox from './Lightbox.jsx';
import ReviewSection from './ReviewSection.jsx';
import PropertyTrustPanel from './PropertyTrustPanel';
import SimilarProperties from './SimilarProperties';
import AddOnsSection from './AddOnsSection';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

import apiClient from '../api/client.js';
import { recordView } from '../utils/recentlyViewed.js';
import { googleMapsDirectionsUrl, hasMapCoordinates } from '../utils/googleMaps.js';

/** Safely coerce a value to an array, no matter what the API sends. */
function safeArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function PropertyPage() {
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
        if (!cancelled) setError(err.response?.data?.error || 'Failed to load property');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProperty();
    return () => { cancelled = true; };
  }, [id]);

  // Record the view once the property data has loaded. Guarded so it never
  // fires before data arrives or twice on re-render.
  useEffect(() => {
    if (!property || recordedRef.current) return;
    recordedRef.current = true;
    recordView(property);
  }, [property]);

  useEffect(() => {
    if (!property) return;
    document.title = `${property.title} - ZuriLofts`;
    const setMeta = (prop, content) => {
      let el = document.querySelector(`meta[property="og:${prop}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', `og:${prop}`); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('title', `${property.title} - ZuriLofts`);
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
      <div className="min-h-screen bg-white">
        <main className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading property">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#C49A6C] border-t-transparent" />
            <p className="text-[#5B6B82]">Loading property...</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Error / Not Found ────────────────────────────────────────────────
  if (error || !property) {
    return (
      <div className="min-h-screen bg-white">
        <main className="flex items-center justify-center min-h-[60vh]" role="alert">
          <div className="text-center px-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CircleAlert className="w-10 h-10 text-red-500" strokeWidth={2} aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[#0B1F42]">Property Not Found</h2>
            <p className="mb-4 text-[#5B6B82]">{error || 'This property could not be loaded.'}</p>
            <Link to="/properties" className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#0B1F42] px-6 py-2 font-semibold text-white transition-colors duration-200 hover:bg-[#07072E]">
              View All Stays
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

  const hasReviews = typeof property.rating === 'number' && property.rating > 0;
  const reviewLabel = property.reviews === 1 ? '1 review' : `${property.reviews || 0} reviews`;

  const variantLabel = variant === '1bed'
    ? '1-Bedroom Option'
    : variant === '2bed'
      ? '2-Bedroom Option'
      : null;

  const typeLabels = { apartment: 'Apartment', studio: 'Studio', penthouse: 'Penthouse' };
  const typeLabel = typeLabels[property.type] || property.type || 'Property';

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      {/* ── Compact breadcrumb / back row ────────────────────────── */}
      <nav className="border-b border-[#E3E8EF] bg-white px-4 py-4 sm:px-6" aria-label="Breadcrumb">
        <div className="mx-auto w-full max-w-[1344px]">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link
                to="/properties"
                className="inline-flex min-h-[44px] items-center rounded text-[#0B1F42] transition-colors duration-200 hover:text-[#9A744A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C]"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" strokeWidth={2} aria-hidden="true" />
                Back to Stays
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#94A3B8]">/</li>
            <li className="truncate font-medium text-[#0B1F42]" aria-current="page">{typeLabel}</li>
          </ol>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-[1344px] px-4 sm:px-6 md:px-8 lg:px-16 py-6 md:py-10 lg:py-14">
        {/* ── Image gallery: large primary + supporting thumbnail grid ── */}
        {images.length > 0 && (
          <section className="mb-6 md:mb-8" aria-label="Property photo gallery">
            {images.length === 1 ? (
              <img
                className="h-56 w-full cursor-pointer rounded-2xl border border-[#E3E8EF] object-cover shadow-sm sm:h-72 md:h-[460px]"
                src={images[0]}
                alt={`${property.title} - photo 1 of 1`}
                onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-2 md:gap-3">
                {/* Primary image - spans two columns and rows on desktop */}
                <div className="relative col-span-2 row-span-2 overflow-hidden rounded-2xl border border-[#E3E8EF] bg-white shadow-sm md:col-span-2">
                  <img
                    className="w-full h-56 sm:h-72 md:h-full md:min-h-[440px] object-cover cursor-pointer"
                    src={images[featuredImage]}
                    alt={`${property.title} - photo ${featuredImage + 1} of ${images.length}`}
                    onClick={() => { setLightboxIndex(featuredImage); setLightboxOpen(true); }}
                  />
                  {/* Previous / Next - only show when there are multiple images */}
                  <button
                    onClick={goPrev}
                    className="absolute top-1/2 -translate-y-1/2 left-3 w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C] transition-colors shadow-md"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-5 w-5 text-[#0B1F42]" strokeWidth={2} aria-hidden="true" />
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute top-1/2 -translate-y-1/2 right-3 w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C] transition-colors shadow-md"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-5 w-5 text-[#0B1F42]" strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>

                {/* Supporting thumbnail grid - up to 4 complementary images */}
                {supportingImages.map(({ src, i }) => (
                  <button
                    key={i}
                    onClick={() => { setFeaturedImage(i); setLightboxIndex(i); setLightboxOpen(true); }}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[#E3E8EF] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C]"
                    aria-label={`View photo ${i + 1}`}
                  >
                    <img
                      className="w-full h-20 sm:h-24 md:h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      src={src}
                      alt={`${property.title} - thumbnail ${i + 1}`}
                    />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Property identity: title, location, rating ────────── */}
        <header className="mb-6 md:mb-8">
          <h1 className="mb-2 text-2xl font-bold leading-tight text-[#0B1F42] sm:text-3xl md:text-4xl">
            {property.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[#5B6B82]">
            <a
              href={googleMapsDirectionsUrl({ lat: property.lat, lng: property.lng, label: property.location })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-[44px] rounded-full transition-colors hover:text-[#9A744A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C]"
              title="Get directions in Google Maps"
            >
              <MapPin className="w-5 h-5 text-[#5B6B82] shrink-0" strokeWidth={2} aria-hidden="true" />
              {property.location}
              <span className="text-xs font-semibold">Google Maps ↗</span>
            </a>
            {typeof property.rating === 'number' && property.rating > 0 && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#0B1F42]" aria-label={`Rated ${property.rating} out of 5 from ${property.reviews || 0} reviews`}>
                <Star className="w-4 h-4 text-amber-500" fill="currentColor" aria-hidden="true" />
                {property.rating}
                <span className="font-normal text-[#5B6B82]">
                  &middot; {property.reviews === 1 ? '1 review' : `${property.reviews || 0} reviews`}
                </span>
              </span>
            )}
          </div>
        </header>

        {/* ── Trust panel ────────────────────────────────────────── */}
        <PropertyTrustPanel
          rating={property.rating}
          reviewCount={property.reviews}
          type={property.type}
          location={property.location}
        />

        {/* ── Two-column body ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
          {/* ── Left column - property details ─────────────────── */}
          <div className="lg:col-span-2">
            {/* Quick facts */}
            <section className="flex flex-wrap gap-5 sm:gap-8 mb-8 py-8 md:py-10 border-b border-[#E3E8EF]" aria-label="Key facts">
              <div className="flex items-center gap-2">
                <House className="h-6 w-6 shrink-0 text-[#C49A6C]" strokeWidth={2} aria-hidden="true" />
                <div>
                  <p className="font-bold text-[#0B1F42]">{displayBedrooms}</p>
                  <p className="text-sm text-[#5B6B82]">{displayBedrooms === 1 ? 'Bedroom' : 'Bedrooms'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bath className="h-6 w-6 shrink-0 text-[#C49A6C]" strokeWidth={2} aria-hidden="true" />
                <div>
                  <p className="font-bold text-[#0B1F42]">{displayBathrooms}</p>
                  <p className="text-sm text-[#5B6B82]">{displayBathrooms === 1 ? 'Bathroom' : 'Bathrooms'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Ruler className="h-6 w-6 shrink-0 text-[#C49A6C]" strokeWidth={2} aria-hidden="true" />
                <div>
                  <p className="font-bold text-[#0B1F42]">{property.area} sq ft</p>
                  <p className="text-sm text-[#5B6B82]">Area</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 shrink-0 text-[#C49A6C]" strokeWidth={2} aria-hidden="true" />
                <div>
                  <p className="font-bold text-[#0B1F42]">{typeLabel}</p>
                  <p className="text-sm text-[#5B6B82]">Type</p>
                </div>
              </div>
            </section>

            {/* Description */}
            <section className="mb-8 md:mb-10" aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-xl sm:text-2xl font-bold text-[#0B1F42] mb-4">About this {typeLabel.toLowerCase()}</h2>
              <div className="text-[#1f2937] leading-relaxed space-y-3">
                {(property.description || 'No description provided.').replace(/<[^>]*>?/gm, '').split('\n').filter(Boolean).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Amenities */}
            {amenities.length > 0 && (
              <section className="mb-8 md:mb-10" aria-labelledby="amenities-heading">
                <h2 id="amenities-heading" className="text-xl sm:text-2xl font-bold text-[#0B1F42] mb-4">What this place offers</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
                  {amenities.map((amenity, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <Check className="h-5 w-5 shrink-0 text-[#C49A6C]" strokeWidth={2} aria-hidden="true" />
                      <span className="text-[#1f2937]">{amenity}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Nearby */}
            {nearby.length > 0 && (
              <section className="mb-8 md:mb-10" aria-labelledby="nearby-heading">
                <h2 id="nearby-heading" className="text-xl sm:text-2xl font-bold text-[#0B1F42] mb-4">What&apos;s nearby</h2>
                <ul className="space-y-3" role="list">
                  {nearby.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-[#1f2937]">
                      <MapPin className="w-5 h-5 text-[#5B6B82] shrink-0 mt-0.5" strokeWidth={2} aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Where you'll be - only when the host confirmed coordinates */}
            {hasMapCoordinates(property.lat, property.lng) && (
              <section className="mb-8 md:mb-10" aria-labelledby="location-heading">
                <h2 id="location-heading" className="text-xl sm:text-2xl font-bold text-[#0B1F42] mb-4">Where you&apos;ll be</h2>
                <div className="rounded-2xl border border-[#E3E8EF] bg-white p-5 shadow-[0_8px_24px_rgba(11,31,66,0.06)]">
                  <p className="font-semibold text-[#0B1F42]">{property.location}</p>
                  {property.address && <p className="mt-1 text-sm text-[#5B6B82]">{property.address}</p>}
                  <a href={googleMapsDirectionsUrl({ lat: property.lat, lng: property.lng, label: property.address || property.location })} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-10 items-center rounded-full bg-[#C49A6C] px-4 text-xs font-semibold text-white hover:bg-[#B8895C]">Get directions ↗</a>
                </div>
              </section>
            )}

            {/* Add-ons - renders nothing when the property has none */}
            <AddOnsSection propertyId={property.id} />

            {/* No-content fallback when all optional sections are empty */}
            {amenities.length === 0 && nearby.length === 0 && (
              <p className="text-[#5B6B82] py-4">Additional details about this property are being prepared.</p>
            )}
          </div>

          {/* ── Right column - sticky booking summary ─────────────── */}
          <aside className="lg:col-span-1" aria-label="Booking">
            <div className="sticky top-24 rounded-2xl border border-[#E3E8EF] bg-white p-5 shadow-[0_8px_28px_rgba(11,31,66,0.08)] md:p-6" role="complementary" aria-label="Booking summary">
              {/* Price per night */}
              <div className="mb-5">
                <span className="text-3xl font-bold text-[#0B1F42]">
                  KES {displayPrice != null ? displayPrice.toLocaleString() : '-'}
                </span>
                <span className="text-[#5B6B82]"> / night</span>
              </div>

              {/* Bed variant chip - only when arriving from a variant card */}
              {variantLabel && (
                <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-[#FDE8D8] px-3 py-1.5 text-sm font-medium text-[#0B1F42]">
                  <House className="w-4 h-4 text-[#C49A6C]" strokeWidth={2} aria-hidden="true" />
                  {variantLabel}
                </div>
              )}

              {/* Dates & guests summary - selection happens on the booking flow */}
              <Link
                to={bookingHref}
                className="mb-5 block rounded-2xl border border-[#E3E8EF] p-4 transition-colors duration-200 hover:border-[#C49A6C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C]"
                aria-label="Choose check-in, check-out, and guests"
              >
                <div className="grid grid-cols-2 divide-x divide-[#E3E8EF]">
                  <div className="pr-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#5B6B82]">Check-in / Check-out</p>
                    <p className="mt-1 text-sm text-[#0B1F42]">Add dates</p>
                  </div>
                  <div className="pl-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#5B6B82]">Guests</p>
                    <p className="mt-1 text-sm text-[#0B1F42]">Add guests</p>
                  </div>
                </div>
              </Link>

              {/* Continue to booking CTA */}
              <Link
                to={bookingHref}
                className="block min-h-[48px] w-full rounded-[10px] bg-[#C49A6C] py-4 text-center font-bold text-white transition-colors duration-200 hover:bg-[#B8895C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C] active:bg-[#9A744A]"
                aria-label={`Continue to booking for ${variantLabel ? variantLabel + ' option' : 'this property'} at KES ${displayPrice != null ? displayPrice.toLocaleString() : '-'} per night`}
              >
                Continue to booking
              </Link>

              <p className="mt-4 text-center text-sm text-[#5B6B82]">You won&apos;t be charged yet</p>

              {/* Fee / total rows - resolved at checkout once dates are selected */}
              <div className="mt-6 space-y-2 border-t border-[#E3E8EF] pt-6 text-sm">
                <div className="flex justify-between text-[#0B1F42]">
                  <span>Cleaning fee</span>
                  <span className="text-[#5B6B82]">Shown at checkout</span>
                </div>
                <div className="flex justify-between text-[#0B1F42]">
                  <span>Service fee</span>
                  <span className="text-[#5B6B82]">Shown at checkout</span>
                </div>
                <div className="flex justify-between border-t border-[#E3E8EF] pt-2 font-bold text-[#0B1F42]">
                  <span>Total</span>
                  <span className="font-normal text-[#5B6B82]">Add dates for total</span>
                </div>
              </div>

              {/* Trust context - only facts from the API */}
              <div className="mt-6 border-t border-[#E3E8EF] pt-6">
                <h4 className="mb-3 font-semibold text-[#0B1F42]">About this listing</h4>
                <ul className="space-y-2 text-sm text-[#5B6B82]">
                  {hasReviews && (
                    <li className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-[#C49A6C] mt-0.5 shrink-0" fill="currentColor" aria-hidden="true" />
                      <span>
                        <span className="font-semibold text-[#0B1F42]">{property.rating}</span> rating &middot; {reviewLabel}
                      </span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#C49A6C] mt-0.5 shrink-0" strokeWidth={2} aria-hidden="true" />
                    <span>Secure booking via Paystack</span>
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
          <ReviewSection propertyId={property.id} />
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

// Static pin map for a pinned property. Rendered only when the host dropped
// coordinates during listing, so it never needs an empty-state.
function PropertyPinMap({ lat, lng, address, location, title }) {
  const mapElRef = useRef(null);
  const directionsUrl = googleMapsDirectionsUrl({ lat, lng, label: address || location });

  useEffect(() => {
    const el = mapElRef.current;
    if (!el) return;
    const map = L.map(el, {
      scrollWheelZoom: false,
      center: [Number(lat), Number(lng)],
      zoom: 15,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
    L.marker([Number(lat), Number(lng)], { title, alt: `Map pin for ${title}` })
      .addTo(map)
      .bindPopup(location || title || 'Property');
    return () => map.remove();
  }, [lat, lng, title, location]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E3E8EF] bg-white shadow-[0_8px_28px_rgba(11,31,66,0.08)]">
      <div ref={mapElRef} className="h-64 md:h-80 w-full" aria-label={`Map showing the location of ${title}`} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0B1F42]">{location}</p>
          {address && (
            <p className="mt-0.5 break-words text-sm text-[#5B6B82]">{address}</p>
          )}
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#0B1F42] px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#07072E]"
        >
          <Map className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          Get directions
        </a>
      </div>
    </div>
  );
}

PropertyPinMap.propTypes = {
  lat: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  lng: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  address: PropTypes.string,
  location: PropTypes.string,
  title: PropTypes.string,
};

export default PropertyPage;
