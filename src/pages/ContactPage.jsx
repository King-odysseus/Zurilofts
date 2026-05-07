import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function ContactPage() {
  const contactInfo = [
    {
      label: 'Address',
      value: 'Westlands, Nairobi, Kenya',
      icon: (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </>
      ),
    },
    {
      label: 'Phone',
      value: '+254 712 345 678',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />,
    },
    {
      label: 'Email',
      value: 'info@zurilofts.co.ke',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    },
    {
      label: 'WhatsApp',
      value: '+254 712 345 678',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80"
            alt="Contact Hero Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#262262]/70"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Contact Us</h1>
          <p className="text-white/80 max-w-2xl mx-auto text-lg">
            Have questions about our apartments? We would love to hear from you.
            Our team is ready to help you find the perfect stay.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 space-y-20">
          {/* Combined Info Card - Get in Touch + Business Hours + Fast Response */}
          <div className="neu-card p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#D9D9D9]">
              {/* Get in Touch */}
              <div className="pb-6 md:pb-0 md:pr-8">
                <h2 className="text-xl font-bold text-[#C49A6C] mb-6">Get in Touch</h2>
                <div className="space-y-5">
                  {contactInfo.map(({ label, value, icon }) => (
                    <div key={label} className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-[#C49A6C] rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#262262]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {icon}
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#262262] text-sm">{label}</h4>
                        <p className="text-[#6b7280] text-sm">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Business Hours */}
              <div className="py-6 md:py-0 md:px-8">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-[#C49A6C]/10 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[#262262]">Business Hours</h3>
                </div>
                <div className="space-y-3 text-sm text-[#1f2937]">
                  <div className="flex justify-between">
                    <span>Monday - Friday</span>
                    <span className="font-semibold">8:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span className="font-semibold">9:00 AM - 4:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span className="font-semibold">10:00 AM - 2:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Fast Response */}
              <div className="pt-6 md:pt-0 md:pl-8 text-center">
                <svg className="w-10 h-10 text-[#C49A6C] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-lg font-bold text-[#262262] mb-2">Fast Response</h3>
                <p className="text-[#6b7280] text-sm">We typically respond within 2 hours during business hours.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#262262] mb-4">Find Us</h2>
            <p className="text-[#6b7280] max-w-2xl mx-auto">
              Located in the heart of Westlands, Nairobi. Visit our office to discuss your stay in person.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden neu-card">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255281.19891802623!2d36.7203769!3d-1.3028611!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f1172d84d49a7%3A0xf7cf0254b297924c!2sNairobi%2C%20Kenya!5e0!3m2!1sen!2sus!4v1704067200000!5m2!1sen!2sus"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full"
            ></iframe>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default ContactPage;
