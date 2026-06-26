import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import apiClient from '../api/client.js';

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await apiClient.post('/contact', form);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message. Please email us directly.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-green-800 mb-2">Message Sent!</h3>
        <p className="text-green-700">We&apos;ll get back to you within 2 hours during business hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><label className="block text-sm font-semibold text-[#1f2937] mb-2">Name *</label><input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your full name" className=" w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937]" required /></div>
        <div><label className="block text-sm font-semibold text-[#1f2937] mb-2">Email *</label><input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="your@email.com" className=" w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937]" required /></div>
      </div>
      <div><label className="block text-sm font-semibold text-[#1f2937] mb-2">Phone</label><input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+254 712 345 678" className=" w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937]" /></div>
      <div><label className="block text-sm font-semibold text-[#1f2937] mb-2">Message *</label><textarea value={form.message} onChange={e => update('message', e.target.value)} placeholder="Tell us about your inquiry..." className=" w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937] h-32 resize-none" required /></div>
      <button type="submit" disabled={sending} className="w-full bg-[#C49A6C] text-white font-semibold py-3 rounded-full hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50">{sending ? 'Sending...' : 'Send Message'}</button>
    </form>
  );
}

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
          <div className="absolute inset-0 bg-[#0B0B45]/70"></div>
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
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B0B45] mb-4 pt-12 md:pt-20">Find Us</h2>
            <p className="text-[#6b7280] max-w-2xl mx-auto">
              We operate in Nairobi, Kenya.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm mb-12">
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

      {/* Contact Form Section */}
      <section className="pb-20 md:pb-32 bg-white">
        <div className="max-w-2xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0B0B45] mb-4">Send Us a Message</h2>
          <p className="text-[#6b7280] max-w-2xl mx-auto mb-8">
            Fill out the form below and we&apos;ll get back to you as soon as possible.
          </p>
          <ContactForm />
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default ContactPage;
