import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import Navbar from './Navbar';
import Footer from './Footer';
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
  const { id } = useParams();
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
      <div className="min-h-screen bg-canvas">
        <Navbar />
        <main className="pt-24 flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading property">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#6b7280]">Loading property...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Error / Not Found ────────────────────────────────────────────────
  if (error || !property) {
    return (
      <div className="min-h-screen bg-canvas">
        <Navbar />
        <main className="pt-24 flex items-center justify-center min-h-[60vh]" role="alert">
          <div className="text-center px-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#222222] mb-2">Property Not Found</h2>
            <p className="text-[#6b7280] mb-4">{error || 'This property could not be loaded.'}</p>
            <Link to="/properties" className="inline-flex items-center justify-center min-h-[44px] bg-[#C49A6C] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#B8895C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] transition-colors duration-200">
              View All Properties
            </Link>
          </div>
        </main>
        <Footer />
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
    <div className="min-h-screen bg-canvas">
      <Navbar />

      {/* ── Compact breadcrumb / back row ────────────────────────── */}
      <nav className="bg-white border-b border-[#E5E7EB] py-4 px-4 sm:px-6 pt-24" aria-label="Breadcrumb">
        <div className="max-w-7xl mx-auto">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link
                to="/properties"
                className="inline-flex items-center min-h-[44px] text-[#222222] hover:text-[#2563EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] rounded transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Properties
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#6b7280]">/</li>
            <li className="text-[#222222] font-medium truncate" aria-current="page">{typeLabel}</li>
          </ol>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-16 py-6 md:py-10 lg:py-14">
        {/* ── Image gallery: large primary + supporting thumbnail grid ── */}
        {images.length > 0 && (
          <section className="mb-6 md:mb-8" aria-label="Property photo gallery">
            {images.length === 1 ? (
              <img
                className="w-full h-56 sm:h-72 md:h-[460px] object-cover rounded-2xl border border-[#E5E7EB] shadow-sm cursor-pointer"
                src={images[0]}
                alt={`${property.title} - photo 1 of 1`}
                onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-2 md:gap-3">
                {/* Primary image - spans two columns and rows on desktop */}
                <div className="relative col-span-2 md:col-span-2 md:row-span-2 overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-sm bg-white">
                  <img
                    className="w-full h-56 sm:h-72 md:h-full md:min-h-[440px] object-cover cursor-pointer"
                    src={images[featuredImage]}
                    alt={`${property.title} - photo ${featuredImage + 1} of ${images.length}`}
                    onClick={() => { setLightboxIndex(featuredImage); setLightboxOpen(true); }}
                  />
                  {/* Previous / Next - only show when there are multiple images */}
                  <button
                    onClick={goPrev}
                    className="absolute top-1/2 -translate-y-1/2 left-3 w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] transition-colors shadow-md"
                    aria-label="Previous photo"
                  >
                    <svg className="w-5 h-5 text-[#222222]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute top-1/2 -translate-y-1/2 right-3 w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] transition-colors shadow-md"
                    aria-label="Next photo"
                  >
                    <svg className="w-5 h-5 text-[#222222]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Supporting thumbnail grid - up to 4 complementary images */}
                {supportingImages.map(({ src, i }) => (
                  <button
                    key={i}
                    onClick={() => { setFeaturedImage(i); setLightboxIndex(i); setLightboxOpen(true); }}
                    className="group relative overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#222222] mb-2 leading-tight">
            {property.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[#6b7280]">
            <a
              href={googleMapsDirectionsUrl({ lat: property.lat, lng: property.lng, label: property.location })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-[44px] rounded-full transition-colors hover:text-[#2563EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              title="Get directions in Google Maps"
            >
              <svg className="w-5 h-5 text-[#6b7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {property.location}
              <span className="text-xs font-semibold">Google Maps ↗</span>
            </a>
            {typeof property.rating === 'number' && property.rating > 0 && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#222222]" aria-label={`Rated ${property.rating} out of 5 from ${property.reviews || 0} reviews`}>
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {property.rating}
                <span className="font-normal text-[#6b7280]">
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
            <section className="flex flex-wrap gap-5 sm:gap-8 mb-8 py-8 md:py-10 border-b border-[#E5E7EB]" aria-label="Key facts">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-[#2563EB] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
                </svg>
                <div>
                  <p className="font-bold text-[#222222]">{displayBedrooms}</p>
                  <p className="text-sm text-[#6b7280]">{displayBedrooms === 1 ? 'Bedroom' : 'Bedrooms'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-[#2563EB] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <div>
                  <p className="font-bold text-[#222222]">{displayBathrooms}</p>
                  <p className="text-sm text-[#6b7280]">{displayBathrooms === 1 ? 'Bathroom' : 'Bathrooms'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-[#2563EB] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <div>
                  <p className="font-bold text-[#222222]">{property.area} sq ft</p>
                  <p className="text-sm text-[#6b7280]">Area</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-[#2563EB] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div>
                  <p className="font-bold text-[#222222]">{typeLabel}</p>
                  <p className="text-sm text-[#6b7280]">Type</p>
                </div>
              </div>
            </section>

            {/* Description */}
            <section className="mb-8 md:mb-10" aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-xl sm:text-2xl font-bold text-[#222222] mb-4">About this {typeLabel.toLowerCase()}</h2>
              <div className="text-[#1f2937] leading-relaxed space-y-3">
                {(property.description || 'No description provided.').replace(/<[^>]*>?/gm, '').split('\n').filter(Boolean).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Amenities */}
            {amenities.length > 0 && (
              <section className="mb-8 md:mb-10" aria-labelledby="amenities-heading">
                <h2 id="amenities-heading" className="text-xl sm:text-2xl font-bold text-[#222222] mb-4">What this place offers</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
                  {amenities.map((amenity, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-[#2563EB] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[#1f2937]">{amenity}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Nearby */}
            {nearby.length > 0 && (
              <section className="mb-8 md:mb-10" aria-labelledby="nearby-heading">
                <h2 id="nearby-heading" className="text-xl sm:text-2xl font-bold text-[#222222] mb-4">What&apos;s nearby</h2>
                <ul className="space-y-3" role="list">
                  {nearby.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-[#1f2937]">
                      <svg className="w-5 h-5 text-[#6b7280] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Where you'll be - only when the host confirmed coordinates */}
            {hasMapCoordinates(property.lat, property.lng) && (
              <section className="mb-8 md:mb-10" aria-labelledby="location-heading">
                <h2 id="location-heading" className="text-xl sm:text-2xl font-bold text-[#222222] mb-4">Where you&apos;ll be</h2>
                <PropertyPinMap
                  lat={property.lat}
                  lng={property.lng}
                  address={property.address}
                  location={property.location}
                  title={property.title}
                />
              </section>
            )}

            {/* Add-ons - renders nothing when the property has none */}
            <AddOnsSection propertyId={property.id} />

            {/* No-content fallback when all optional sections are empty */}
            {amenities.length === 0 && nearby.length === 0 && (
              <p className="text-[#6b7280] py-4">Additional details about this property are being prepared.</p>
            )}
          </div>

          {/* ── Right column - sticky booking summary ─────────────── */}
          <aside className="lg:col-span-1" aria-label="Booking">
            <div className="neu-card p-5 md:p-6 sticky top-24" role="complementary" aria-label="Booking summary">
              {/* Price per night */}
              <div className="mb-5">
                <span className="text-3xl font-bold text-[#0B0B45]">
                  KES {displayPrice != null ? displayPrice.toLocaleString() : '-'}
                </span>
                <span className="text-[#6b7280]"> / night</span>
              </div>

              {/* Bed variant chip - only when arriving from a variant card */}
              {variantLabel && (
                <div className="mb-5 inline-flex items-center gap-1.5 bg-[#C49A6C]/10 text-[#0B0B45] text-sm font-medium px-3 py-1.5 rounded-full">
                  <svg className="w-4 h-4 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
                  </svg>
                  {variantLabel}
                </div>
              )}

              {/* Dates & guests summary - selection happens on the booking flow */}
              <Link
                to={bookingHref}
                className="block border border-[#E5E7EB] rounded-xl p-4 mb-5 hover:border-[#2563EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] transition-colors duration-200"
                aria-label="Choose check-in, check-out, and guests"
              >
                <div className="grid grid-cols-2 divide-x divide-[#E5E7EB]">
                  <div className="pr-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#6b7280]">Check-in / Check-out</p>
                    <p className="mt-1 text-sm text-[#222222]">Add dates</p>
                  </div>
                  <div className="pl-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#6b7280]">Guests</p>
                    <p className="mt-1 text-sm text-[#222222]">Add guests</p>
                  </div>
                </div>
              </Link>

              {/* Continue to booking CTA */}
              <Link
                to={bookingHref}
                className="block w-full bg-[#C49A6C] text-white font-bold py-4 rounded-xl hover:bg-[#B8895C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C] active:bg-[#a6794d] transition-all duration-200 text-center"
                aria-label={`Continue to booking for ${variantLabel ? variantLabel + ' option' : 'this property'} at KES ${displayPrice != null ? displayPrice.toLocaleString() : '-'} per night`}
              >
                Continue to booking
              </Link>

              <p className="text-center text-sm text-[#6b7280] mt-4">You won&apos;t be charged yet</p>

              {/* Fee / total rows - resolved at checkout once dates are selected */}
              <div className="mt-6 pt-6 border-t border-[#D9D9D9] space-y-2 text-sm">
                <div className="flex justify-between text-[#1f2937]">
                  <span>Cleaning fee</span>
                  <span className="text-[#6b7280]">Shown at checkout</span>
                </div>
                <div className="flex justify-between text-[#1f2937]">
                  <span>Service fee</span>
                  <span className="text-[#6b7280]">Shown at checkout</span>
                </div>
                <div className="flex justify-between font-bold text-[#0B0B45] pt-2 border-t border-[#D9D9D9]">
                  <span>Total</span>
                  <span className="font-normal text-[#6b7280]">Add dates for total</span>
                </div>
              </div>

              {/* Trust context - only facts from the API */}
              <div className="mt-6 pt-6 border-t border-[#D9D9D9]">
                <h4 className="font-semibold text-[#0B0B45] mb-3">About this listing</h4>
                <ul className="space-y-2 text-sm text-[#6b7280]">
                  {hasReviews && (
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-[#C49A6C] mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span>
                        <span className="font-semibold text-[#0B0B45]">{property.rating}</span> rating &middot; {reviewLabel}
                      </span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-[#C49A6C] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <ReviewSection propertyId={property.id} />
        </div>
      )}

      {/* Similar properties */}
      {property && (
        <div className="mt-16 md:mt-20">
          <SimilarProperties property={property} />
        </div>
      )}

      <div className="mt-16 md:mt-24">
        <Footer />
      </div>

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
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    L.marker([Number(lat), Number(lng)], { title, alt: `Map pin for ${title}` })
      .addTo(map)
      .bindPopup(location || title || 'Property');
    return () => map.remove();
  }, [lat, lng, title, location]);

  return (
    <div className="rounded-[14px] overflow-hidden border border-[#E5E7EB] shadow-sm bg-white">
      <div ref={mapElRef} className="h-64 md:h-80 w-full" aria-label={`Map showing the location of ${title}`} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#222222] text-sm">{location}</p>
          {address && (
            <p className="text-sm text-[#6b7280] mt-0.5 break-words">{address}</p>
          )}
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 shrink-0 min-h-[44px] rounded-lg bg-[#2563EB] text-white font-semibold px-5 py-2.5 text-sm hover:bg-[#1D4ED8] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
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
