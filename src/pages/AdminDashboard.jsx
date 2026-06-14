import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import logoImg from '../assets/zurilofts-logo.png';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', exact: true },
  { path: '/admin/properties', label: 'Properties', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/admin/bookings', label: 'Bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { path: '/admin/promos', label: 'Promo Codes', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
];

function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#262262] text-white hidden md:flex flex-col fixed inset-y-0 left-0 z-10">
        <div className="p-6">
          <Link to="/" className="inline-block bg-white rounded-xl px-3 py-2 mb-4">
            <img src={logoImg} alt="ZuriLofts" className="h-10 w-auto" />
          </Link>
          <span className="block text-[#C49A6C] text-xs font-semibold uppercase tracking-wider">Admin Panel</span>
        </div>
        <nav className="flex-1 px-3">
          {navItems.map(({ path, label, icon, exact }) => {
            const active = exact ? location.pathname === path : location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-[#C49A6C] text-[#262262]'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-[#C49A6C] rounded-full flex items-center justify-center text-xs font-bold text-[#262262]">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="text-sm">
              <p className="font-medium">{user?.firstName}</p>
              <p className="text-white/50 text-xs">Admin</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center text-white/60 hover:text-white text-sm transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed top-0 w-full bg-[#262262] z-10 p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="bg-white rounded-lg px-2 py-1">
            <img src={logoImg} alt="ZuriLofts" className="h-6 w-auto" />
          </div>
          <span className="text-[#C49A6C] text-xs font-semibold uppercase tracking-wider">Admin</span>
        </Link>
        <div className="flex space-x-2">
          {navItems.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === path
                  ? 'bg-[#C49A6C] text-[#262262]'
                  : 'text-white/70'
              }`}
            >
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
              <span className="sr-only">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8">
        <Outlet />
      </main>
    </div>
  );
}

// Dashboard Overview
function DashboardOverview() {
  const [stats, setStats] = useState({ properties: 0, bookings: 0, promos: 0, revenue: 0 });
  const [recentBookings, setRecentBookings] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [propsRes, bookingsRes, promosRes] = await Promise.all([
          apiClient.get('/properties'),
          apiClient.get('/admin/bookings', { params: { limit: 5 } }),
          apiClient.get('/promo'),
        ]);
        const bookings = bookingsRes.data.data || [];
        const totalRevenue = bookings.reduce((sum, b) => sum + b.total, 0);
        setStats({
          properties: propsRes.data.pagination?.total || 0,
          bookings: bookingsRes.data.pagination?.total || 0,
          promos: promosRes.data.data?.length || 0,
          revenue: totalRevenue,
        });
        setRecentBookings(bookings);
      } catch {
        // silent
      }
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#262262] mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Properties', value: stats.properties, color: 'bg-[#262262]', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
          { label: 'Total Bookings', value: stats.bookings, color: 'bg-[#C49A6C]', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { label: 'Active Promos', value: stats.promos, color: 'bg-green-600', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
          { label: 'Revenue (KES)', value: stats.revenue.toLocaleString(), color: 'bg-purple-600', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-[#D9D9D9]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#6b7280]">{label}</span>
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-[#262262]">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#D9D9D9] p-6">
        <h2 className="text-lg font-bold text-[#262262] mb-4">Recent Bookings</h2>
        {recentBookings.length === 0 ? (
          <p className="text-[#6b7280] text-sm">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[#D9D9D9]">
                  <th className="pb-3 font-semibold text-[#262262]">Guest</th>
                  <th className="pb-3 font-semibold text-[#262262]">Property</th>
                  <th className="pb-3 font-semibold text-[#262262]">Dates</th>
                  <th className="pb-3 font-semibold text-[#262262]">Total</th>
                  <th className="pb-3 font-semibold text-[#262262]">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id} className="border-b border-[#D9D9D9]/50">
                    <td className="py-3">{b.user?.firstName} {b.user?.lastName}</td>
                    <td className="py-3">{b.property?.title}</td>
                    <td className="py-3 text-xs">{new Date(b.checkIn).toLocaleDateString()} — {new Date(b.checkOut).toLocaleDateString()}</td>
                    <td className="py-3 font-semibold">KES {b.total.toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                        b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{b.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  return <DashboardOverview />;
}

export { AdminLayout };
export default AdminDashboard;
