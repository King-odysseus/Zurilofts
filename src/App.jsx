import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import Hero from './components/Hero';
import Footer from './components/Footer';
import { useState, useEffect } from 'react';
import PropertyPage from './components/PropertyPage';
import ContactPage from './pages/ContactPage';
import PropertiesPage from './pages/PropertiesPage';
import BookingPage from './pages/BookingPage';
import { zuriImages } from './assets/images';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OAuthCallback from './pages/OAuthCallback';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import ChatWidget from './components/ChatWidget';
import AdminDashboard, { AdminLayout } from './pages/AdminDashboard';
import AdminProperties from './pages/AdminProperties';
import AdminPropertyForm from './pages/AdminPropertyForm';
import AdminCalendar from './pages/AdminCalendar';
import AdminBookings from './pages/AdminBookings';
import AdminEarnings from './pages/AdminEarnings';
import AdminPromos from './pages/AdminPromos';

// Home page component
function HomePage() {
  const [slide, setSlide] = useState(0);
  const totalSlides = 5;

  function nextSlide() { setSlide((s) => (s + 1) % totalSlides); }
  function prevSlide() { setSlide((s) => (s - 1 + totalSlides) % totalSlides); }

  useEffect(() => {
    const id = setInterval(nextSlide, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {/* Hero Section with integrated Navbar */}
      <Hero />
      
      {/* Properties Section */}
      <section id="properties" className="pt-24 md:pt-32 pb-16 md:pb-20 px-4 md:px-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 mt-8 md:mt-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#262262] mb-4">Our Apartments</h2>
          <p className="text-cool-grey max-w-2xl mx-auto text-lg">
            Discover our carefully curated selection of premium furnished apartments
            in prime Nairobi locations. Each property is designed for comfort and convenience.
          </p>
        </div>

        {/* Two Column Layout - Property Info & Card */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 mb-16">
          {/* Left Column - Property Location & Description */}
          <div className="flex-1 lg:pr-8 pt-4">
            <div className="mb-6">
              <span className="text-[#C49A6C] font-semibold text-sm uppercase tracking-wider">Featured Location</span>
              <h3 className="text-2xl md:text-3xl font-bold text-[#262262] mt-2">Kilimani, Nairobi</h3>
            </div>
            <p className="text-charcoal leading-relaxed mb-6 text-justify pr-4 lg:pr-8">
              Experience luxury living in the heart of Kilimani, one of Nairobi's most prestigious neighborhoods.
              This beautifully furnished apartment offers modern amenities, stunning views, and easy access to
              shopping centers, restaurants, and business districts. Perfect for business travelers and tourists
              seeking a comfortable short-term stay.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-charcoal">
                <svg className="w-5 h-5 text-[#C49A6C] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                5 minutes from Yaya Centre
              </li>
              <li className="flex items-center text-charcoal">
                <svg className="w-5 h-5 text-[#C49A6C] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Secure parking available
              </li>
              <li className="flex items-center text-charcoal">
                <svg className="w-5 h-5 text-[#C49A6C] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                24/7 security & concierge
              </li>
            </ul>
            <a
              href="/property/1"
              className="inline-block neu-btn text-[#262262] px-8 py-3 rounded-full font-semibold hover:shadow-[2px_2px_4px_#d9d9d9,-2px_-2px_4px_#ffffff] transition-all duration-200"
            >
              View Property
            </a>
          </div>
          
          {/* Right Column - Property Image Carousel */}
          <div className="w-full max-w-md">
            <div id="property-carousel" className="relative w-full h-full">
              <div className="relative h-full overflow-hidden rounded-2xl neu-card shadow-[4px_4px_8px_#d9d9d9,-4px_-4px_8px_#ffffff]">
                {[
                  zuriImages[0],
                  zuriImages[1],
                  zuriImages[2],
                  zuriImages[3],
                  zuriImages[4],
                ].map((src, i) => (
                  <div key={i} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${slide === i ? 'opacity-100' : 'opacity-0'}`}>
                    <img src={src} alt={`Slide ${i + 1}`} className="absolute block w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              <div className="absolute z-30 flex -translate-x-1/2 space-x-3 bottom-3 left-1/2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <button key={i} type="button" onClick={() => setSlide(i)} className={`w-3 h-3 rounded-full transition-colors ${slide === i ? 'bg-white' : 'bg-white/50 hover:bg-white/80'}`} aria-label={`Slide ${i + 1}`} />
                ))}
              </div>

              <button type="button" onClick={prevSlide} className="absolute top-0 left-0 z-30 flex items-center justify-center h-full px-3 cursor-pointer group focus:outline-none">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/30 group-hover:bg-white/50 transition-colors">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 19-7-7 7-7"/></svg>
                </span>
              </button>
              <button type="button" onClick={nextSlide} className="absolute top-0 right-0 z-30 flex items-center justify-center h-full px-3 cursor-pointer group focus:outline-none">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/30 group-hover:bg-white/50 transition-colors">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7"/></svg>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Experience Luxury Section */}
        <div className="text-center mb-10 mt-40 md:mt-52">
          <h2 className="text-3xl md:text-4xl font-bold text-[#262262]">Experience Luxury and Class</h2>
          <p className="text-cool-grey max-w-2xl mx-auto text-lg mt-3">
            At our lofts you get comfort delivered with a touch of luxury
          </p>
        </div>

        {/* Masonry Gallery - ZuriLofts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-16 auto-rows-[120px] md:auto-rows-[150px]">
          {/* Tall — col 1 rows 1-2 */}
          <div className="row-span-2 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={zuriImages[5]} alt="ZuriLofts interior" />
          </div>
          {/* Small — col 2 row 1 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={zuriImages[6]} alt="ZuriLofts detail" />
          </div>
          {/* Tall — col 3 rows 1-2 */}
          <div className="row-span-2 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={zuriImages[7]} alt="ZuriLofts living space" />
          </div>
          {/* Small — col 4 row 1 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={zuriImages[8]} alt="ZuriLofts room" />
          </div>

          {/* Small — col 2 row 2 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={zuriImages[9]} alt="ZuriLofts view" />
          </div>
          {/* Small — col 4 row 2 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={zuriImages[10]} alt="ZuriLofts design" />
          </div>

          {/* Small — col 1 row 3 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={zuriImages[11]} alt="ZuriLofts space" />
          </div>
          {/* Tall — col 2 rows 3-4 */}
          <div className="row-span-2 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={zuriImages[12]} alt="ZuriLofts feature" />
          </div>
          {/* Small — col 3 row 3 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={zuriImages[14]} alt="ZuriLofts area" />
          </div>
          {/* Tall — col 4 rows 3-4 */}
          <div className="row-span-2 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={zuriImages[15]} alt="ZuriLofts overview" />
          </div>

          {/* Small — col 1 row 4 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={zuriImages[16]} alt="ZuriLofts style" />
          </div>
          {/* Small — col 3 row 4 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={zuriImages[17]} alt="ZuriLofts ambiance" />
          </div>
        </div>

        {/* Recommended Places to Visit in Nairobi */}
        <div className="mt-40 md:mt-52 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#262262]">Recommended Places to Visit</h2>
            <p className="text-cool-grey max-w-2xl mx-auto text-lg mt-3">
              Explore the best of Nairobi during your stay
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: 'The Junction Mall',
                desc: 'A premier lifestyle and shopping destination right on Ngong Road. Enjoy top retail brands, restaurants, a cinema, and a vibrant food court — all just minutes away.',
                image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80',
              },
              {
                name: 'Ngong Forest Sanctuary',
                desc: 'A serene urban forest reserve off Ngong Road, perfect for morning walks, bird watching, and peaceful nature escapes from the city buzz.',
                image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
              },
              {
                name: 'Nairobi War Cemetery',
                desc: 'A beautifully maintained historical site on Ngong Road commemorating soldiers who served in the World Wars. A quiet, reflective landmark worth visiting.',
                image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80',
              },
              {
                name: 'Prestige Plaza',
                desc: 'A convenient shopping and dining hub along Ngong Road featuring Java House, local boutiques, and a variety of eateries ideal for a quick outing.',
                image: '/images/prestige-plaza.jpg',
              },
              {
                name: 'Giraffe Centre',
                desc: 'Get up close with endangered Rothschild giraffes at this acclaimed conservation center in Langata — a short drive from Kilimani via Ngong Road.',
                image: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=800&q=80',
              },
              {
                name: 'Nairobi National Park',
                desc: 'Africa\'s only wildlife park within a capital city. Spot lions, rhinos, giraffes, and zebras against Nairobi\'s skyline — easily accessible via Langata Road off Ngong Road.',
                image: 'https://images.unsplash.com/photo-1547471613-cf9af5c52d05?w=800&q=80',
              },
            ].map((place, i) => (
              <div key={i} className="neu-card overflow-hidden transition-shadow duration-300">
                <div className="h-48 overflow-hidden">
                  <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500 rounded-t-2xl" src={place.image} alt={place.name} />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-[#262262] mb-2">{place.name}</h3>
                  <p className="text-charcoal text-sm leading-relaxed">{place.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Restaurants in Nairobi */}
        <div className="mt-40 md:mt-52 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#262262]">Best Places to Eat</h2>
            <p className="text-cool-grey max-w-2xl mx-auto text-lg mt-3">
              Experience Nairobi's vibrant dining scene
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: 'Brew Bistro & Lounge',
                desc: 'A stylish spot at Piedmont Plaza on Ngong Road serving European, French, Asian, and Kenyan fusion cuisine. Great cocktails and a lively rooftop atmosphere.',
                image: 'https://images.unsplash.com/photo-1551024709-8f23befc548f?w=800&q=80',
              },
              {
                name: 'La Terrazza',
                desc: 'An intimate Italian restaurant tucked inside the Greenhouse Mall on Ngong Road. Authentic pasta, wine, and stunning 4th-floor views across Nairobi.',
                image: 'https://images.unsplash.com/photo-1473093226355-51b44c1ddd31?w=800&q=80',
              },
              {
                name: 'Mama Oliech\'s',
                desc: 'A Kilimani institution famous for authentic Kenyan fish dishes. Simple, hearty, and deeply satisfying — a must-try for lovers of local coastal cuisine.',
                image: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800&q=80',
              },
              {
                name: 'Fogo Gaucho',
                desc: 'A buzzing Brazilian churrascaria in Kilimani offering an all-you-can-eat roasted meat experience. Perfect for a celebratory dinner or a hearty group meal.',
                image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80',
              },
              {
                name: 'Cedars Restaurant',
                desc: 'A refined Lebanese restaurant in Kilimani with an extensive mezze menu, grilled meats, and warm Middle Eastern hospitality. A local favourite for fine dining.',
                image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
              },
              {
                name: 'Artcaffe Junction',
                desc: 'A popular all-day café inside The Junction Mall on Ngong Road. Great for breakfast, light lunches, pastries, and quality Kenyan coffee in a relaxed setting.',
                image: 'https://images.unsplash.com/photo-1509042239860-f519af6f3557?w=800&q=80',
              },
            ].map((place, i) => (
              <div key={i} className="neu-card overflow-hidden transition-shadow duration-300">
                <div className="h-48 overflow-hidden">
                  <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500 rounded-t-2xl" src={place.image} alt={place.name} />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-[#262262] mb-2">{place.name}</h3>
                  <p className="text-charcoal text-sm leading-relaxed">{place.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function App() {
  return (
    <Router>
      <ChatWidget />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/properties" element={<PropertiesPage />} />
        <Route path="/property/:id" element={<PropertyPage />} />
        <Route path="/booking/:id" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="properties" element={<AdminProperties />} />
          <Route path="properties/new" element={<AdminPropertyForm />} />
          <Route path="properties/:id/edit" element={<AdminPropertyForm />} />
          <Route path="properties/:id/calendar" element={<AdminCalendar />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="earnings" element={<AdminEarnings />} />
          <Route path="promos" element={<AdminPromos />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
