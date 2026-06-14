import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client.js';

function AdminEarnings() {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ bookings: 0, confirmedBookings: 0, earnings: 0, confirmedEarnings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get('/admin/analytics/properties');
        setRows(res.data.data?.properties || []);
        setTotals(res.data.data?.totals || { bookings: 0, confirmedBookings: 0, earnings: 0, confirmedEarnings: 0 });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards = [
    { label: 'Total Bookings', value: totals.bookings.toLocaleString(), color: 'bg-[#262262]' },
    { label: 'Confirmed Bookings', value: totals.confirmedBookings.toLocaleString(), color: 'bg-[#C49A6C]' },
    { label: 'Total Earnings (KES)', value: totals.earnings.toLocaleString(), color: 'bg-green-600' },
    { label: 'Confirmed Earnings (KES)', value: totals.confirmedEarnings.toLocaleString(), color: 'bg-purple-600' },
  ];

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold text-[#262262] mb-2">Earnings</h1>
      <p className="text-sm text-[#6b7280] mb-6">
        Bookings and recorded earnings per property. Earnings include pending and confirmed bookings; cancelled bookings are excluded.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-[#D9D9D9]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#6b7280]">{label}</span>
              <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
            </div>
            <p className="text-2xl font-bold text-[#262262]">{value}</p>
          </div>
        ))}
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
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Property</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Location</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262]">Times Booked</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262]">Confirmed</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262]">Earnings (KES)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[#D9D9D9]/50 hover:bg-[#f8f9fa]">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        {r.image ? (
                          <img src={r.image} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#D9D9D9] flex-shrink-0" />
                        )}
                        <Link to={`/property/${r.id}`} className="font-semibold text-[#262262] hover:text-[#C49A6C]">{r.title}</Link>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#6b7280]">{r.location}</td>
                    <td className="py-3 px-4 text-right font-semibold">{r.bookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{r.confirmedBookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-bold text-[#C49A6C]">KES {r.earnings.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#D9D9D9] bg-[#f8f9fa] font-bold text-[#262262]">
                    <td className="py-3 px-4" colSpan={2}>Total</td>
                    <td className="py-3 px-4 text-right">{totals.bookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{totals.confirmedBookings.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-[#C49A6C]">KES {totals.earnings.toLocaleString()}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {rows.length === 0 && (
            <div className="text-center py-12 text-[#6b7280]">No properties yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminEarnings;
