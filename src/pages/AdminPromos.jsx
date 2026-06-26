import { useState, useEffect } from 'react';
import apiClient from '../api/client.js';

function AdminPromos() {
  const [promos, setPromos] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: '', discountPercent: 10, validFrom: '', validUntil: '', maxUses: '', minBookingAmount: '', maxDiscount: '', propertyIds: [],
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const EMPTY_FORM = { code: '', discountPercent: 10, validFrom: '', validUntil: '', maxUses: '', minBookingAmount: '', maxDiscount: '', propertyIds: [] };

  function openCreate() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(p) {
    setEditingId(p.id);
    setFormData({
      code: p.code,
      discountPercent: p.discountPercent,
      validFrom: p.validFrom ? new Date(p.validFrom).toISOString().slice(0, 10) : '',
      validUntil: p.validUntil ? new Date(p.validUntil).toISOString().slice(0, 10) : '',
      maxUses: p.maxUses ?? '',
      minBookingAmount: p.minBookingAmount ?? '',
      maxDiscount: p.maxDiscount ?? '',
      propertyIds: p.properties?.map((prop) => prop.id) || [],
    });
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }

  useEffect(() => { fetchPromos(); fetchProperties(); }, []);

  async function fetchPromos() {
    try {
      const res = await apiClient.get('/promo');
      setPromos(res.data.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function fetchProperties() {
    try {
      const res = await apiClient.get('/properties/mine');
      setProperties(res.data.data || []);
    } catch { /* silent */ }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const payload = {
      discountPercent: Number(formData.discountPercent),
      validFrom: new Date(formData.validFrom).toISOString(),
      validUntil: new Date(formData.validUntil).toISOString(),
      maxUses: formData.maxUses ? Number(formData.maxUses) : undefined,
      minBookingAmount: formData.minBookingAmount ? Number(formData.minBookingAmount) : undefined,
      maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
      propertyIds: formData.propertyIds.length > 0 ? formData.propertyIds : undefined,
    };

    try {
      if (editingId) {
        await apiClient.patch(`/promo/${editingId}`, { code: formData.code.toUpperCase(), ...payload });
      } else {
        await apiClient.post('/promo', { code: formData.code.toUpperCase(), ...payload });
      }
      closeForm();
      fetchPromos();
    } catch (err) {
      setFormError(err.response?.data?.error || `Failed to ${editingId ? 'update' : 'create'} promo code`);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id, active) {
    try {
      await apiClient.patch(`/promo/${id}`, { active: !active });
      setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, active: !active } : p)));
    } catch {
      alert('Failed to update promo code');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this promo code permanently?')) return;
    try {
      await apiClient.delete(`/promo/${id}`);
      setPromos((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert('Failed to delete promo code');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0B0B45]">Promo Codes</h1>
        <button
          onClick={openCreate}
          className="bg-[#C49A6C] text-white px-5 py-2.5 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200 text-sm"
        >
          + Create Promo
        </button>
      </div>

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-[#0B0B45] mb-4">{editingId ? 'Edit Promo Code' : 'Create Promo Code'}</h2>
            {formError && <div className="bg-red-50 text-red-700 rounded-xl px-4 py-2 mb-4 text-sm">{formError}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1f2937] mb-1">Code</label>
                <input
                  type="text" value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className=" w-full px-4 py-2.5 focus:outline-none bg-white text-[#1f2937] uppercase"
                  placeholder="SUMMER2026" required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1">Discount %</label>
                  <input
                    type="number" value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    className=" w-full px-4 py-2.5 focus:outline-none bg-white" min="1" max="100" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1">Max Discount (KES)</label>
                  <input
                    type="number" value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    className=" w-full px-4 py-2.5 focus:outline-none bg-white" placeholder="Optional"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1">Valid From</label>
                  <input
                    type="date" value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className=" w-full px-4 py-2.5 focus:outline-none bg-white" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1">Valid Until</label>
                  <input
                    type="date" value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className=" w-full px-4 py-2.5 focus:outline-none bg-white" required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1">Max Uses</label>
                  <input
                    type="number" value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    className=" w-full px-4 py-2.5 focus:outline-none bg-white" placeholder="Unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1">Min Booking (KES)</label>
                  <input
                    type="number" value={formData.minBookingAmount}
                    onChange={(e) => setFormData({ ...formData, minBookingAmount: e.target.value })}
                    className=" w-full px-4 py-2.5 focus:outline-none bg-white" placeholder="No minimum"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-[#1f2937]">Applies to Properties</label>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = properties.map((p) => p.id);
                      const allSelected = allIds.length > 0 && allIds.every((id) => formData.propertyIds.includes(id));
                      setFormData({ ...formData, propertyIds: allSelected ? [] : allIds });
                    }}
                    className="text-xs font-semibold text-[#C49A6C] hover:text-[#b8895c] transition-colors"
                  >
                    {properties.length > 0 && properties.every((p) => formData.propertyIds.includes(p.id)) ? 'Clear All' : 'Select All'}
                  </button>
                </div>
                <div className="border border-[#D9D9D9] rounded-xl p-3 max-h-40 overflow-y-auto">
                  {properties.length === 0 ? (
                    <p className="text-xs text-[#6b7280]">No properties available.</p>
                  ) : (
                    properties.map((prop) => (
                      <label key={prop.id} className="flex items-center space-x-2 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.propertyIds.includes(prop.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...formData.propertyIds, prop.id]
                              : formData.propertyIds.filter((id) => id !== prop.id);
                            setFormData({ ...formData, propertyIds: ids });
                          }}
                          className="w-4 h-4 accent-[#C49A6C]"
                        />
                        <span className="text-sm text-[#1f2937]">{prop.title}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-[#6b7280] mt-1">Leave unchecked to apply to all properties.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="flex-1 py-2.5 rounded-full font-semibold border-2 border-[#D9D9D9] text-[#6b7280] hover:border-[#0B0B45] hover:text-[#0B0B45] transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-full font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200 text-sm disabled:opacity-50">
                  {saving ? (editingId ? 'Saving...' : 'Creating...') : (editingId ? 'Save Changes' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
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
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Discount</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Usage</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Valid Period</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Properties</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id} className="border-b border-[#D9D9D9]/50 hover:bg-[#f8f9fa]">
                    <td className="py-3 px-4 font-mono font-bold text-[#0B0B45]">{p.code}</td>
                    <td className="py-3 px-4">
                      {p.discountPercent}%
                      {p.maxDiscount && <span className="text-[#6b7280] text-xs ml-1">(max KES {p.maxDiscount.toLocaleString()})</span>}
                    </td>
                    <td className="py-3 px-4">
                      {p.currentUses}{p.maxUses ? ` / ${p.maxUses}` : ''}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {new Date(p.validFrom).toLocaleDateString()} — {new Date(p.validUntil).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {p.properties?.length > 0 ? (
                        <span className="inline-flex flex-wrap gap-1">
                          {p.properties.map((prop) => (
                            <span key={prop.id} className="px-2 py-0.5 bg-[#f8f9fa] rounded-md text-[#0B0B45]">{prop.title}</span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-[#6b7280]">All properties</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggle(p.id, p.active)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          p.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {p.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#D9D9D9] text-[#6b7280] hover:border-[#C49A6C] hover:text-[#C49A6C] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {promos.length === 0 && (
            <div className="text-center py-12 text-[#6b7280]">No promo codes yet. Create your first!</div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPromos;
