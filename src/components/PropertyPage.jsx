import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import Lightbox from './Lightbox.jsx';
import ReviewSection from './ReviewSection.jsx';
import BookingSummaryCard from './BookingSummaryCard';
import PropertyTrustPanel from './PropertyTrustPanel';
import SimilarProperties from './SimilarProperties';
import AddOnsSection from './AddOnsSection';

import apiClient from '../api/client.js';
import { recordView } from '../utils/recentlyViewed.js';

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
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="pt-24 flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading property">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="pt-24 flex items-center justify-center min-h-[60vh]" role="alert">
          <div className="text-center px-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#0B0B45] mb-2">Property Not Found</h2>
            <p className="text-[#6b7280] mb-4">{error || 'This property could not be loaded.'}</p>
            <Link to="/properties" className="inline-block bg-[#C49A6C] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#b8895c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C] transition-all duration-200">
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
      <Navbar />

      {/* ── Back navigation bar ─────────────────────────────────── */}
      <nav className="bg-[#0B0B45] py-4 px-4 sm:px-6 pt-24" aria-label="Breadcrumb">
        <div className="max-w-7xl mx-auto">
          <Link
            to="/properties"
            className="inline-flex items-center text-white hover:text-[#C49A6C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Properties
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-16 py-6 md:py-10 lg:py-14">
        {/* ── Property identity: title, location, rating ────────── */}
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0B0B45] mb-2 leading-tight">
            {property.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[#6b7280]">
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-5 h-5 text-[#C49A6C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {property.location}
            </span>
            {typeof property.rating === 'number' && property.rating > 0 && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#0B0B45]" aria-label={`Rated ${property.rating} out of 5 from ${property.reviews || 0} reviews`}>
                <svg className="w-4 h-4 text-[#C49A6C]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

        {/* ── Image gallery ──────────────────────────────────────── */}
        {images.length > 0 && (
          <section className="mt-8 mb-10 md:mb-14" aria-label="Property photo gallery">
            {/* Main image */}
            <div className="relative">
              <img
                className="w-full h-56 sm:h-72 md:h-[400px] lg:h-[500px] object-cover rounded-2xl neu-card cursor-pointer"
                src={images[featuredImage]}
                alt={`${property.title} - photo ${featuredImage + 1} of ${images.length}`}
                onClick={() => { setLightboxIndex(featuredImage); setLightboxOpen(true); }}
              />
              {/* Previous / Next - only show when there are multiple images */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    className="absolute top-1/2 -translate-y-1/2 left-3 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C] transition-colors shadow-md"
                    aria-label="Previous photo"
                  >
                    <svg className="w-5 h-5 text-[#0B0B45]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute top-1/2 -translate-y-1/2 right-3 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C] transition-colors shadow-md"
                    aria-label="Next photo"
                  >
                    <svg className="w-5 h-5 text-[#0B0B45]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip - show up to 5 */}
            <div className="grid grid-cols-3 min-[480px]:grid-cols-4 md:grid-cols-5 gap-2 md:gap-3 mt-3 md:mt-4" role="list" aria-label="Photo thumbnails">
              {images.slice(0, 5).map((img, i) => (
                <button
                  key={i}
                  onClick={() => { setFeaturedImage(i); setLightboxIndex(i); setLightboxOpen(true); }}
                  className={`cursor-pointer overflow-hidden rounded-xl transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C] ${
                    featuredImage === i
                      ? 'ring-2 ring-[#C49A6C] scale-95'
                      : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                  aria-label={`View photo ${i + 1}`}
                  aria-current={featuredImage === i ? 'true' : undefined}
                  role="listitem"
                >
                  <img
                    className="w-full h-16 sm:h-20 object-cover rounded-xl"
                    src={img}
                    alt={`${property.title} - thumbnail ${i + 1}`}
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Two-column body ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
          {/* ── Left column - property details ─────────────────── */}
          <div className="lg:col-span-2">
            {/* Quick facts */}
            <section className="flex flex-wrap gap-5 sm:gap-8 mb-8 py-8 md:py-10 border-b border-[#D9D9D9]" aria-label="Key facts">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-[#C49A6C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
                </svg>
                <div>
                  <p className="font-bold text-[#0B0B45]">{displayBedrooms}</p>
                  <p className="text-sm text-[#6b7280]">{displayBedrooms === 1 ? 'Bedroom' : 'Bedrooms'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-[#C49A6C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <div>
                  <p className="font-bold text-[#0B0B45]">{displayBathrooms}</p>
                  <p className="text-sm text-[#6b7280]">{displayBathrooms === 1 ? 'Bathroom' : 'Bathrooms'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-[#C49A6C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <div>
                  <p className="font-bold text-[#0B0B45]">{property.area} sq ft</p>
                  <p className="text-sm text-[#6b7280]">Area</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-[#C49A6C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div>
                  <p className="font-bold text-[#0B0B45]">{typeLabel}</p>
                  <p className="text-sm text-[#6b7280]">Type</p>
                </div>
              </div>
            </section>

            {/* Description */}
            <section className="mb-8 md:mb-10" aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-xl sm:text-2xl font-bold text-[#0B0B45] mb-4">About this {typeLabel.toLowerCase()}</h2>
              <div className="text-[#1f2937] leading-relaxed space-y-3">
                {(property.description || 'No description provided.').replace(/<[^>]*>?/gm, '').split('\n').filter(Boolean).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Amenities */}
            {amenities.length > 0 && (
              <section className="mb-8 md:mb-10" aria-labelledby="amenities-heading">
                <h2 id="amenities-heading" className="text-xl sm:text-2xl font-bold text-[#0B0B45] mb-4">What this place offers</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
                  {amenities.map((amenity, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-[#C49A6C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                <h2 id="nearby-heading" className="text-xl sm:text-2xl font-bold text-[#0B0B45] mb-4">What&apos;s nearby</h2>
                <ul className="space-y-3" role="list">
                  {nearby.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-[#1f2937]">
                      <svg className="w-5 h-5 text-[#C49A6C] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Add-ons - renders nothing when the property has none */}
            <AddOnsSection propertyId={property.id} />

            {/* No-content fallback when all optional sections are empty */}
            {amenities.length === 0 && nearby.length === 0 && (
              <p className="text-[#6b7280] py-4">Additional details about this property are being prepared.</p>
            )}
          </div>

          {/* ── Right column - booking card ─────────────────────── */}
          <aside className="lg:col-span-1" aria-label="Booking">
            <BookingSummaryCard
              price={displayPrice}
              bookingHref={bookingHref}
              rating={property.rating}
              reviewCount={property.reviews}
              variantLabel={variantLabel}
            />
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

export default PropertyPage;
