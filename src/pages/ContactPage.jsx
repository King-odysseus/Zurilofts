import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 min-h-[500px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/Ely Homes Photography (2 of 20).jpg"
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

      {/* Map Section */}
      <section className="pt-10 pb-20 md:pt-16 md:pb-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#262262] mb-4 pt-12 md:pt-20">Find Us</h2>
            <p className="text-[#6b7280] max-w-2xl mx-auto">
              Located in the heart of Westlands, Nairobi. Visit our office to discuss your stay in person.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden neu-card mb-12">
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

      {/* Email Section */}
      <section className="pb-20 md:pb-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#262262] mb-4">Send Us an Email</h2>
          <p className="text-[#6b7280] max-w-2xl mx-auto mb-8">
            Prefer to reach out digitally? Drop us a line and we will get back to you as soon as possible.
          </p>
          <a
            href="mailto:enquires@zurilofts.com"
            className="inline-block px-8 py-4 bg-[#262262] text-white font-semibold rounded-xl hover:bg-[#1e1b4f] transition-colors duration-200"
          >
            enquires@zurilofts.com
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default ContactPage;
