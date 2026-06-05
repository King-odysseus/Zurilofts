import { useState, useEffect } from 'react';
import apiClient from '../api/client.js';

function AdminPromos() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '', discountPercent: 10, validFrom: '', validUntil: '', maxUses: '', minBookingAmount: '', maxDiscount: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => { fetchPromos(); }, []);

  async function fetchPromos() {
    try {
      const res = await apiClient.get('/promo');
      setPromos(res.data.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await apiClient.post('/promo', {
        code: formData.code.toUpperCase(),
        discountPercent: Number(formData.discountPercent),
        validFrom: new Date(formData.validFrom).toISOString(),
        validUntil: new Date(formData.validUntil).toISOString(),
        maxUses: formData.maxUses ? Number(formData.maxUses) : undefined,
        minBookingAmount: formData.minBookingAmount ? Number(formData.minBookingAmount) : undefined,
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
      });
      setShowForm(false);
      setFormData({ code: '', discountPercent: 10, validFrom: '', validUntil: '', maxUses: '', minBookingAmount: '', maxDiscount: '' });
      fetchPromos();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create promo code');
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
    if (!confirm('Deactivate this promo code?')) return;
    try {
      await apiClient.delete(`/promo/${id}`);
      setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, active: false } : p)));
    } catch {
      alert('Failed to delete promo code');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#262262]">Promo Codes</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#C49A6C] text-[#262262] px-5 py-2.5 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200 text-sm"
        >
          + Create Promo
        </button>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-[#262262] mb-4">Create Promo Code</h2>
            {formError && <div className="bg-red-50 text-red-700 rounded-xl px-4 py-2 mb-4 text-sm">{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1f2937] mb-1">Code</label>
                <input
                  type="text" value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="neu-input w-full px-4 py-2.5 focus:outline-none bg-white text-[#1f2937] uppercase"
                  placeholder="SUMMER2026" required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1">Discount %</label>
                  <input
                    type="number" value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    className="neu-input w-full px-4 py-2.5 focus:outline-none bg-white" min="1" max="100" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1">Max Discount (KES)</label>
                  <input
                    type="number" value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    className="neu-input w-full px-4 py-2.5 focus:outline-none bg-white" placeholder="Optional"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1">Valid From</label>
                  <input
                    type="date" value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="neu-input w-full px-4 py-2.5 focus:outline-none bg-white" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1">Valid Until</label>
                  <input
                    type="date" value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="neu-input w-full px-4 py-2.5 focus:outline-none bg-white" required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1">Max Uses</label>
                  <input
                    type="number" value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    className="neu-input w-full px-4 py-2.5 focus:outline-none bg-white" placeholder="Unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1">Min Booking (KES)</label>
                  <input
                    type="number" value={formData.minBookingAmount}
                    onChange={(e) => setFormData({ ...formData, minBookingAmount: e.target.value })}
                    className="neu-input w-full px-4 py-2.5 focus:outline-none bg-white" placeholder="No minimum"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-full font-semibold border-2 border-[#D9D9D9] text-[#6b7280] hover:border-[#262262] hover:text-[#262262] transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-full font-semibold bg-[#C49A6C] text-[#262262] hover:bg-[#b8895c] transition-all duration-200 text-sm disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create'}
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
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Discount</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Usage</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Valid Period</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#262262]">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#262262]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id} className="border-b border-[#D9D9D9]/50 hover:bg-[#f8f9fa]">
                    <td className="py-3 px-4 font-mono font-bold text-[#262262]">{p.code}</td>
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
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        {p.active ? 'Deactivate' : 'Remove'}
                      </button>
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
