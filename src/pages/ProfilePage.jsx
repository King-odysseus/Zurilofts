import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';

function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('info');
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [formData, setFormData] = useState({ firstName: '', lastName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, bookingsRes] = await Promise.all([
          apiClient.get('/users/profile'),
          apiClient.get('/bookings'),
        ]);
        setProfile(profileRes.data.data);
        setBookings(bookingsRes.data.data || []);
        setFormData({
          firstName: profileRes.data.data.firstName || '',
          lastName: profileRes.data.data.lastName || '',
          phone: profileRes.data.data.phone || '',
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleProfileUpdate(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await apiClient.put('/users/profile', formData);
      setProfile(res.data.data);
      setMessage('Profile updated successfully!');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <div className="w-16 h-16 bg-[#C49A6C] rounded-full flex items-center justify-center">
                <span className="text-[#262262] font-bold text-2xl">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-[#262262]">
                  {profile?.firstName} {profile?.lastName}
                </h1>
                <p className="text-[#6b7280]">{profile?.email}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#D9D9D9] mb-8">
            {['info', 'bookings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-[#C49A6C] text-[#262262]'
                    : 'border-transparent text-[#6b7280] hover:text-[#262262]'
                }`}
              >
                {tab === 'info' ? 'My Info' : 'My Bookings'}
              </button>
            ))}
          </div>

          {/* My Info Tab */}
          {activeTab === 'info' && (
            <div className="max-w-lg">
              <div className="neu-card p-6">
                <h2 className="text-lg font-bold text-[#262262] mb-6">Personal Information</h2>
                {message && (
                  <div className={`rounded-xl px-4 py-3 mb-4 text-sm ${
                    message.includes('success')
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {message}
                  </div>
                )}
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-2">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="neu-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-2">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="neu-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="neu-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#C49A6C] text-[#262262] font-semibold px-6 py-3 rounded-full hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* My Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#D9D9D9] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[#262262] mb-1">No bookings yet</h3>
                  <p className="text-[#6b7280]">Your upcoming stays will appear here.</p>
                </div>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="neu-card p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      {booking.property?.images?.[0] && (
                        <img
                          src={booking.property.images[0]}
                          alt={booking.property.title}
                          className="w-full md:w-48 h-32 object-cover rounded-xl"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-[#262262]">{booking.property?.title}</h3>
                            <p className="text-sm text-[#6b7280]">{booking.property?.location}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[booking.status]}`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                          <div>
                            <span className="text-[#6b7280]">Check-in</span>
                            <p className="font-semibold">{new Date(booking.checkIn).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-[#6b7280]">Check-out</span>
                            <p className="font-semibold">{new Date(booking.checkOut).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-[#6b7280]">Total</span>
                            <p className="font-semibold text-[#C49A6C]">KES {booking.total.toLocaleString()}</p>
                          </div>
                        </div>
                        {booking.promoCode && (
                          <div className="mt-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              Promo: {booking.promoCode.code}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default ProfilePage;
