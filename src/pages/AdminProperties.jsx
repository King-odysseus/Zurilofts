import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client.js';

function AdminProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  async function fetchProperties() {
    try {
      const res = await apiClient.get('/properties/mine');
      setProperties(res.data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this property?')) return;
    setDeleting(id);
    try {
      await apiClient.delete(`/properties/${id}`);
      setProperties((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert('Failed to delete property');
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleAvailable(property) {
    try {
      await apiClient.put(`/properties/${property.id}`, { available: !property.available });
      setProperties((prev) =>
        prev.map((p) => (p.id === property.id ? { ...p, available: !p.available } : p))
      );
    } catch {
      alert('Failed to update property');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0B0B45]">Properties</h1>
        <Link
          to="/admin/properties/new"
          className="bg-[#C49A6C] text-white px-5 py-2.5 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200 text-sm"
        >
          + Add Property
        </Link>
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
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Property</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Location</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Price/Night</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr key={p.id} className="border-b border-[#D9D9D9]/50 hover:bg-[#f8f9fa]">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <img src={p.images?.[0]} alt="" className="w-12 h-12 object-cover rounded-lg" />
                        <Link to={`/property/${p.id}`} className="font-semibold text-[#0B0B45] hover:text-[#C49A6C]">{p.title}</Link>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#6b7280]">{p.location}</td>
                    <td className="py-3 px-4 capitalize">{p.type}</td>
                    <td className="py-3 px-4 font-semibold">KES {p.price.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleAvailable(p)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          p.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {p.available ? 'Available' : 'Unavailable'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/admin/properties/${p.id}/calendar`}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#D9D9D9] text-[#6b7280] hover:border-[#C49A6C] hover:text-[#C49A6C] transition-colors"
                        >
                          Calendar
                        </Link>
                        <Link
                          to={`/admin/properties/${p.id}/edit`}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#D9D9D9] text-[#6b7280] hover:border-[#C49A6C] hover:text-[#C49A6C] transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {deleting === p.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {properties.length === 0 && (
            <div className="text-center py-12 text-[#6b7280]">No properties found. Add your first property!</div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminProperties;
