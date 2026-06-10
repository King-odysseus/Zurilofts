function Contact() {
  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you soon.');
  };

  return (
    <section id="contact" className="py-10 md:py-16 bg-[#D9D9D9]">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#262262] mb-4">Contact Us</h2>
          <p className="text-[#6b7280] max-w-2xl mx-auto">
            Have questions about our apartment? We would love to hear from you.
            Send us a message and we will respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h3 className="text-xl font-semibold text-[#262262] mb-6">Send us a Message</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-2">First Name</label>
                  <input
                    type="text"
                    placeholder="John"
                    className="w-full px-5 py-3 border border-[#D9D9D9] rounded-full focus:outline-none focus:border-[#C49A6C] transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-2">Last Name</label>
                  <input
                    type="text"
                    placeholder="Doe"
                    className="w-full px-5 py-3 border border-[#D9D9D9] rounded-full focus:outline-none focus:border-[#C49A6C] transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1f2937] mb-2">Email</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  className="w-full px-5 py-3 border border-[#D9D9D9] rounded-full focus:outline-none focus:border-[#C49A6C] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1f2937] mb-2">Phone</label>
                <input
                  type="tel"
                  placeholder="+254 712 345 678"
                  className="w-full px-5 py-3 border border-[#D9D9D9] rounded-full focus:outline-none focus:border-[#C49A6C] transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1f2937] mb-2">Message</label>
                <textarea
                  placeholder="Tell us about your inquiry..."
                  className="w-full px-5 py-3 border border-[#D9D9D9] rounded-2xl focus:outline-none focus:border-[#C49A6C] transition-colors h-32 resize-none"
                  required
                ></textarea>
              </div>

              <button type="submit" className="w-full bg-[#C49A6C] text-[#262262] font-semibold py-3 rounded-full hover:bg-[#b8895c] transition-all duration-200">
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <div className="bg-[#262262] text-white rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-[#C49A6C] mb-6">Get in Touch</h3>
              <div className="space-y-5">
                {[
                  {
                    label: 'Address', value: 'Westlands, Nairobi, Kenya',
                    icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></>
                  },
                  {
                    label: 'Phone', value: '+254 712 345 678',
                    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  },
                  {
                    label: 'Email', value: 'enquires@thezurilofts.com',
                    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-[#C49A6C] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-[#262262]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {icon}
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#C49A6C] mb-1">{label}</h4>
                      <p className="text-white/80">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-[#C49A6C] rounded-2xl p-8 text-center">
              <svg className="w-12 h-12 text-[#262262] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-[#262262] mb-2">Fast Response</h3>
              <p className="text-[#262262]/80">We typically respond within 2 hours during business hours.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Contact;
