import { useState, useEffect } from 'react';
import apiClient from '../api/client.js';

const CATEGORIES = ['transport', 'catering', 'housekeeping', 'concierge'];

const CATEGORY_LABELS = {
  transport: 'Transport',
  catering: 'Catering',
  housekeeping: 'Housekeeping',
  concierge: 'Concierge',
};

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  image: '',
  category: 'transport',
  active: true,
};

function AdminAddOns() {
  const [addOns, setAddOns] = useState([]);
  const [properties, setProperties] = useState([]);
  const [assignments, setAssignments] = useState({}); // addOnId -> Set(propertyId)
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [assigning, setAssigning] = useState(false);

  function openCreate() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(a) {
    setEditingId(a.id);
    setFormData({
      name: a.name,
      description: a.description,
      price: a.price,
      image: a.image || '',
      category: a.category,
      active: a.active,
    });
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }

  useEffect(() => {
    fetchAddOns();
    fetchProperties();
  }, []);

  async function fetchAddOns() {
    try {
      const res = await apiClient.get('/admin/addons');
      setAddOns(res.data.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  // Fetch all properties and, for each, its assigned add-ons so we can show
  // current assignments in the edit form. Uses the public per-property endpoint.
  async function fetchProperties() {
    try {
      const res = await apiClient.get('/properties/mine');
      const props = res.data.data || [];
      setProperties(props);
      const map = {};
      await Promise.all(props.map(async (p) => {
        try {
          const r = await apiClient.get(`/properties/${p.id}/addons`);
          const list = Array.isArray(r.data.data) ? r.data.data : [];
          list.forEach((a) => {
            if (!map[a.id]) map[a.id] = new Set();
            map[a.id].add(p.id);
          });
        } catch { /* skip property */ }
      }));
      setAssignments(map);
    } catch { /* silent */ }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const payload = {
      name: formData.name,
      description: formData.description,
      price: Number(formData.price),
      category: formData.category,
      image: formData.image || undefined,
      active: formData.active,
    };

    try {
      if (editingId) {
        await apiClient.patch(`/admin/addons/${editingId}`, payload);
      } else {
        await apiClient.post('/admin/addons', payload);
      }
      closeForm();
      fetchAddOns();
    } catch (err) {
      setFormError(err.response?.data?.error || `Failed to ${editingId ? 'update' : 'create'} add-on`);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id, active) {
    try {
      await apiClient.patch(`/admin/addons/${id}`, { active: !active });
      setAddOns((prev) => prev.map((a) => (a.id === id ? { ...a, active: !active } : a)));
    } catch {
      alert('Failed to update add-on');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this add-on permanently? This also removes it from all properties and bookings.')) return;
    try {
      await apiClient.delete(`/admin/addons/${id}`);
      setAddOns((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert('Failed to delete add-on');
    }
  }

  // Toggle an add-on's assignment to a property via the dedicated endpoints.
  async function toggleAssignment(propertyId, addOnId, currentlyAssigned) {
    if (assigning) return;
    setAssigning(true);
    setFormError('');
    try {
      if (currentlyAssigned) {
        await apiClient.delete(`/admin/properties/${propertyId}/addons/${addOnId}`);
      } else {
        await apiClient.post(`/admin/properties/${propertyId}/addons`, { addOnId });
      }
      setAssignments((prev) => {
        const next = { ...prev };
        const set = new Set(next[addOnId] || []);
        if (currentlyAssigned) set.delete(propertyId);
        else set.add(propertyId);
        next[addOnId] = set;
        return next;
      });
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to update property assignment');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0B0B45]">Add-ons</h1>
        <button
          onClick={openCreate}
          className="bg-[#C49A6C] text-white px-5 py-2.5 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200 text-sm"
        >
          + Create Add-on
        </button>
      </div>

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[#0B0B45] mb-4">{editingId ? 'Edit Add-on' : 'Create Add-on'}</h2>
            {formError && <div className="bg-red-50 text-red-700 rounded-xl px-4 py-2 mb-4 text-sm">{formError}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1f2937] mb-1">Name</label>
                <input
                  type="text" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D9D9D9] focus:outline-none focus:border-[#C49A6C] bg-white text-[#1f2937]"
                  placeholder="Airport pickup" required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1f2937] mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D9D9D9] focus:outline-none focus:border-[#C49A6C] bg-white text-[#1f2937] h-20 resize-none"
                  placeholder="Describe the service" required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1">Price (KES)</label>
                  <input
                    type="number" value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D9D9D9] focus:outline-none focus:border-[#C49A6C] bg-white" min="1" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D9D9D9] focus:outline-none focus:border-[#C49A6C] bg-white text-[#1f2937]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1f2937] mb-1">Image URL (optional)</label>
                <input
                  type="text" value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D9D9D9] focus:outline-none focus:border-[#C49A6C] bg-white text-[#1f2937]"
                  placeholder="https://..."
                />
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 accent-[#C49A6C]"
                />
                <span className="text-sm font-semibold text-[#1f2937]">Active</span>
              </label>

              {/* Property assignment - only when editing an existing add-on */}
              {editingId && (
                <div>
                  <label className="block text-sm font-semibold text-[#1f2937] mb-2">Assigned to Properties</label>
                  <div className="border border-[#D9D9D9] rounded-xl p-3 max-h-40 overflow-y-auto">
                    {properties.length === 0 ? (
                      <p className="text-xs text-[#6b7280]">No properties available.</p>
                    ) : (
                      properties.map((prop) => {
                        const assigned = (assignments[editingId] || new Set()).has(prop.id);
                        return (
                          <label key={prop.id} className="flex items-center space-x-2 py-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={assigned}
                              onChange={() => toggleAssignment(prop.id, editingId, assigned)}
                              disabled={assigning}
                              className="w-4 h-4 accent-[#C49A6C]"
                            />
                            <span className="text-sm text-[#1f2937]">{prop.title}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <p className="text-xs text-[#6b7280] mt-1">Assign this add-on to the properties that should offer it.</p>
                </div>
              )}

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
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Properties</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0B0B45]">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#0B0B45]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {addOns.map((a) => {
                  const assignedProps = assignments[a.id] || new Set();
                  return (
                    <tr key={a.id} className="border-b border-[#D9D9D9]/50 hover:bg-[#f8f9fa]">
                      <td className="py-3 px-4 font-semibold text-[#0B0B45]">{a.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 bg-[#C49A6C]/10 text-[#0B0B45] rounded-full text-xs font-semibold capitalize">
                          {CATEGORY_LABELS[a.category] || a.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">KES {a.price.toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs">
                        {assignedProps.size > 0 ? (
                          <span className="text-[#0B0B45]">{assignedProps.size} property{assignedProps.size > 1 ? 'ies' : 'y'}</span>
                        ) : (
                          <span className="text-[#6b7280]">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggle(a.id, a.active)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                            a.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {a.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openEdit(a)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#D9D9D9] text-[#6b7280] hover:border-[#C49A6C] hover:text-[#C49A6C] transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {addOns.length === 0 && (
            <div className="text-center py-12 text-[#6b7280]">No add-ons yet. Create your first!</div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminAddOns;
