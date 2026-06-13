import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { zuriImages } from '../assets/images';
import apiClient from '../api/client.js';

function PropertyPage() {
  const { id } = useParams();
  const [featuredImage, setFeaturedImage] = useState(0);
  const [thumbStart, setThumbStart] = useState(0);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProperty() {
      try {
        setLoading(true);
        const res = await apiClient.get(`/properties/${id}`);
        setProperty(res.data.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load property');
      } finally {
        setLoading(false);
      }
    }
    fetchProperty();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#6b7280]">Loading property...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#262262] mb-2">Property Not Found</h2>
            <p className="text-[#6b7280] mb-4">{error || 'This property could not be loaded.'}</p>
            <Link to="/properties" className="inline-block bg-[#C49A6C] text-[#262262] px-6 py-2 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200">
              View All Properties
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const images = property.images || zuriImages;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Header with back button */}
      <div className="bg-[#262262] py-4 px-6 pt-24">
        <div className="max-w-7xl mx-auto flex items-center">
          <Link 
            to="/properties" 
            className="flex items-center text-white hover:text-[#C49A6C] transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Properties
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16">
        {/* Property Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#262262] mb-2">{property.title}</h1>
          <div className="flex items-center text-[#6b7280]">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {property.location}
          </div>
        </div>

        {/* Featured Image Gallery */}
        <div className="mb-12">
          <div className="relative">
            <img
              className="w-full h-64 md:h-[400px] lg:h-[500px] object-cover rounded-2xl neu-card"
              src={images[featuredImage]}
              alt={property.title}
            />
            <button
              onClick={() => setFeaturedImage((prev) => (prev - 1 + images.length) % images.length)}
              className="absolute top-1/2 -translate-y-1/2 left-3 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-md"
            >
              <svg className="w-5 h-5 text-[#262262]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setFeaturedImage((prev) => (prev + 1) % images.length)}
              className="absolute top-1/2 -translate-y-1/2 right-3 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-md"
            >
              <svg className="w-5 h-5 text-[#262262]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 mt-4">
            {images.slice(thumbStart, thumbStart + 5).map((img, i) => {
              const actualIndex = thumbStart + i;
              return (
                <div
                  key={actualIndex}
                  onClick={() => setFeaturedImage(actualIndex)}
                  className={`cursor-pointer overflow-hidden rounded-xl transition-all duration-200 ${
                    featuredImage === actualIndex
                      ? 'ring-2 ring-[#C49A6C] scale-95'
                      : 'hover:scale-105 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    className="w-full h-20 object-cover rounded-xl"
                    src={img}
                    alt={`${property.title} ${actualIndex + 1}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Property Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column - Details */}
          <div className="lg:col-span-2">
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-6 md:gap-8 mb-8 py-10 md:py-14 border-b border-[#D9D9D9]">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-[#C49A6C] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <div>
                  <p className="font-bold text-[#262262]">{property.bedrooms}</p>
                  <p className="text-sm text-[#6b7280]">Bedrooms</p>
                </div>
              </div>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-[#C49A6C] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <div>
                  <p className="font-bold text-[#262262]">{property.bathrooms}</p>
                  <p className="text-sm text-[#6b7280]">Bathrooms</p>
                </div>
              </div>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-[#C49A6C] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <div>
                  <p className="font-bold text-[#262262]">{property.area} sq ft</p>
                  <p className="text-sm text-[#6b7280]">Area</p>
                </div>
              </div>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-[#C49A6C] mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <div>
                  <p className="font-bold text-[#262262]">{property.rating}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#262262] mb-4">About this property</h2>
              <p className="text-[#1f2937] leading-relaxed">{property.description}</p>
            </div>

            {/* Amenities */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#262262] mb-4">Amenities</h2>
              <div className="grid grid-cols-2 gap-4">
                {property.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center">
                    <svg className="w-5 h-5 text-[#C49A6C] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[#1f2937]">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nearby */}
            <div>
              <h2 className="text-2xl font-bold text-[#262262] mb-4">What's nearby</h2>
              <ul className="space-y-3">
                {property.nearby.map((item, index) => (
                  <li key={index} className="flex items-center text-[#1f2937]">
                    <svg className="w-5 h-5 text-[#C49A6C] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <div className="neu-card p-5 md:p-6 pt-10 md:pt-12 sticky top-24">
              <div className="mb-6">
                <span className="text-3xl font-bold text-[#262262]">KES {property.price.toLocaleString()}</span>
                <span className="text-[#6b7280]"> / night</span>
              </div>

              <Link
                to={`/booking/${property.id}`}
                className="block w-full bg-[#C49A6C] text-[#262262] font-bold py-4 rounded-xl hover:bg-[#b8895c] active:bg-[#a6794d] transition-all duration-200 text-center"
              >
                Book Now
              </Link>

              <p className="text-center text-sm text-[#6b7280] mt-4">
                You won't be charged yet
              </p>

              <div className="mt-6 pt-6 border-t border-[#D9D9D9]">
                <h4 className="font-semibold text-[#262262] mb-3">Why book with us?</h4>
                <ul className="space-y-2 text-sm text-[#6b7280]">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-[#C49A6C] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Best price guarantee
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-[#C49A6C] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Instant confirmation
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-[#C49A6C] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    24/7 customer support
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-24">
        <Footer />
      </div>
    </div>
  );
}

export default PropertyPage;
