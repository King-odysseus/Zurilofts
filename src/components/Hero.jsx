import Navbar from './Navbar';
import { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { heroImage } from '../assets/images';

function AnimatedNumber({ value, suffix = '', duration = 2000 }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const numericValue = parseFloat(value);
    const isDecimal = value.includes('.');
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = numericValue * easeOutQuart;

      if (isDecimal) {
        setDisplayValue(currentValue.toFixed(1));
      } else {
        setDisplayValue(Math.floor(currentValue));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, value, duration]);

  return (
    <span ref={ref} className="inline-block">
      {displayValue}{suffix}
    </span>
  );
}

AnimatedNumber.propTypes = {
  value: PropTypes.string.isRequired,
  suffix: PropTypes.string,
  duration: PropTypes.number,
};

AnimatedNumber.defaultProps = {
  suffix: '',
  duration: 2000,
};

function Hero({ stats }) {
  const { rating = '5.0', stays = '50', satisfaction = '100' } = stats || {};
  return (
    <section className="relative min-h-[600px] md:min-h-[700px] flex flex-col overflow-hidden">
      {/* Background Image with Blur */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={heroImage}
          alt="ZuriLofts"
          className="w-full h-full object-cover scale-110"
          style={{ filter: 'blur(1.5px)' }}
        />
      </div>

      {/* Gradient overlay — deep indigo tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#262262]/70 via-[#262262]/40 to-[#262262]/70"></div>

      {/* Navbar */}
      <Navbar />

      <div className="relative flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full py-24">
          {/* Headline and Description */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-white/90 text-sm font-medium">Available for Booking</span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight tracking-tight drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)' }}>
              Choose <span className="text-[#C49A6C]">Luxury & Comfort</span> for Your Time Away
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              Premium furnished apartments in Nairobi. Experience comfort, convenience, and luxury all in one place.
            </p>
          </div>

          {/* Pill-shaped Search Bar */}
          <div className="max-w-[680px] mx-auto">
            <div className="bg-white rounded-full shadow-2xl px-2 py-2 flex items-center transform hover:scale-[1.02] transition-transform duration-200">
              <div className="flex-1 flex items-center px-5">
                <svg className="w-5 h-5 text-[#C49A6C] mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Where do you want to stay?"
                  className="w-full py-3 text-[#1f2937] placeholder-[#6b7280] focus:outline-none bg-transparent text-base"
                />
              </div>
              <button className="bg-[#C49A6C] text-white font-bold px-8 py-3 rounded-full hover:bg-[#b8895c] transition-all duration-200 whitespace-nowrap shadow-md hover:shadow-lg">
                Search
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-16 flex justify-center items-center space-x-8 md:space-x-16">
            <div className="text-center group cursor-default">
              <div className="text-4xl md:text-5xl font-bold text-white transform transition-all duration-500 hover:scale-110 hover:text-[#C49A6C]">
                <AnimatedNumber value={String(rating)} />
              </div>
              <div className="text-white/70 text-sm mt-1 font-medium transform transition-all duration-300 group-hover:text-white">Star Rating</div>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div className="text-center group cursor-default">
              <div className="text-4xl md:text-5xl font-bold text-white transform transition-all duration-500 hover:scale-110 hover:text-[#C49A6C]">
                <AnimatedNumber value={String(stays)} suffix="+" />
              </div>
              <div className="text-white/70 text-sm mt-1 font-medium transform transition-all duration-300 group-hover:text-white">Happy Stays</div>
            </div>
            <div className="w-px h-12 bg-white/20 hidden md:block"></div>
            <div className="text-center hidden md:block group cursor-default">
              <div className="text-4xl md:text-5xl font-bold text-white transform transition-all duration-500 hover:scale-110 hover:text-[#C49A6C]">
                <AnimatedNumber value={String(satisfaction)} suffix="%" />
              </div>
              <div className="text-white/70 text-sm mt-1 font-medium transform transition-all duration-300 group-hover:text-white">Satisfaction</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
