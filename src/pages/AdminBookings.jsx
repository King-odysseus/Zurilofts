import { useState, useEffect } from 'react';
import Dropdown from '../components/Dropdown.jsx';
import apiClient from '../api/client.js';

function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchBookings(); }, [statusFilter]);

  async function fetchBookings() {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get('/admin/bookings', { params });
      setBookings(res.data.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function handleStatusChange(id, status) {
    try {
      await apiClient.patch(`/admin/bookings/${id}/status`, { status });
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch {
      alert('Failed to update booking status');
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-[#262262]">Bookings</h1>
        <Dropdown
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'CONFIRMED', label: 'Confirmed' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
          triggerClassName="w-48 px-4 py-2.5 rounded-xl bg-white border border-[#D9D9D9] text-sm text-[#1f2937] focus:outline-none focus:border-[#C49A6C]"
          placeholder="All Statuses"
          ariaLabel="Filter by status"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-[#D9D9D9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8f9fa] border-b border-[#D9D9D9]">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Guest</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Property</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Check-in</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Check-out</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Guests</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-[#D9D9D9]/50 hover:bg-[#f8f9fa]">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-[#262262]">{b.user?.firstName} {b.user?.lastName}</p>
                        <p className="text-xs text-[#6b7280]">{b.user?.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">{b.property?.title}</td>
                    <td className="py-3 px-4 text-xs">{new Date(b.checkIn).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-xs">{new Date(b.checkOut).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{b.guests}</td>
                    <td className="py-3 px-4 font-semibold">KES {b.total.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                        b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{b.status}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {b.status === 'PENDING' && (
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleStatusChange(b.id, 'CONFIRMED')}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleStatusChange(b.id, 'CANCELLED')}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bookings.length === 0 && (
            <div className="text-center py-12 text-[#6b7280]">No bookings found{statusFilter ? ` with status "${statusFilter}"` : ''}.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminBookings;
