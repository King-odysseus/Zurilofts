import { useState, useEffect } from 'react';
import apiClient from '../api/client.js';
import TableActionsMenu from '../components/TableActionsMenu.jsx';

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
    } catch (err) { console.error(err); }
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
        } catch (err) { console.error(err); }
      }));
      setAssignments(map);
    } catch (err) { console.error(err); }
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
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#E3E8EF] bg-white px-5 py-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)] sm:px-6">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#C49A6C]">Workspace / Catalog</p><h1 className="text-2xl font-bold text-[#0B1F42]">Add-ons</h1></div>
        <button
          onClick={openCreate}
          className="bg-[#C49A6C] text-white min-h-[44px] px-5 py-2.5 rounded-lg font-semibold hover:bg-[#B8895C] transition-all duration-200 text-sm"
        >
          + Create Add-on
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {[
          ['Total add-ons', addOns.length],
          ['Active', addOns.filter((addOn) => addOn.active).length],
          ['Categories', new Set(addOns.map((addOn) => addOn.category)).size],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#E3E8EF] bg-white p-4 shadow-[0_4px_16px_rgba(11,31,66,0.04)]"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">{label}</p><p className="mt-2 text-2xl font-bold text-[#0B1F42]">{value}</p></div>)}
      </div>

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E3E8EF] bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-[#0B1F42]">{editingId ? 'Edit Add-on' : 'Create Add-on'}</h2>
            {formError && <div className="mb-4 rounded-2xl border border-[#F1C9C9] bg-[#FDECEC] px-4 py-2 text-sm text-[#B42318]">{formError}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0B1F42]">Name</label>
                <input
                  type="text" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="min-h-[44px] w-full rounded-[10px] border border-[#E3E8EF] bg-white px-4 py-2.5 text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/30"
                  placeholder="Airport pickup" required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0B1F42]">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[44px] h-20 w-full resize-none rounded-[10px] border border-[#E3E8EF] bg-white px-4 py-2.5 text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/30"
                  placeholder="Describe the service" required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0B1F42]">Price (KES)</label>
                  <input
                    type="number" value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="min-h-[44px] w-full rounded-[10px] border border-[#E3E8EF] bg-white px-4 py-2.5 text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/30" min="1" required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0B1F42]">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="min-h-[44px] w-full rounded-[10px] border border-[#E3E8EF] bg-white px-4 py-2.5 text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/30"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0B1F42]">Image URL (optional)</label>
                <input
                  type="text" value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="min-h-[44px] w-full rounded-[10px] border border-[#E3E8EF] bg-white px-4 py-2.5 text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/30"
                  placeholder="https://..."
                />
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4 accent-[#C49A6C]"
                />
                <span className="text-sm font-semibold text-[#0B1F42]">Active</span>
              </label>

              {/* Property assignment - only when editing an existing add-on */}
              {editingId && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#0B1F42]">Assigned to Properties</label>
                  <div className="shadow-[0_8px_28px_rgba(11,31,66,0.06)] rounded-[10px] p-3 max-h-40 overflow-y-auto">
                    {properties.length === 0 ? (
                      <p className="text-xs text-[#5B6B82]">No properties available.</p>
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
                              className="h-4 w-4 accent-[#C49A6C]"
                            />
                            <span className="text-sm text-[#0B1F42]">{prop.title}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <p className="text-xs text-[#5B6B82] mt-1">Assign this add-on to the properties that should offer it.</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="min-h-[44px] flex-1 rounded-[10px] border border-[#E3E8EF] py-2.5 text-sm font-semibold text-[#0B1F42] transition-colors hover:bg-[#F7F4EF]">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 min-h-[44px] py-2.5 rounded-lg font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-all duration-200 text-sm disabled:opacity-50">
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
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#C49A6C] border-t-transparent"></div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E3E8EF] bg-white shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#E3E8EF] bg-[#F7F4EF]">
                <tr>
                  <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#5B6B82]">Name</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#5B6B82]">Category</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#5B6B82]">Price</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#5B6B82]">Properties</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#5B6B82]">Status</th>
                  <th className="text-right py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#5B6B82]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {addOns.map((a) => {
                  const assignedProps = assignments[a.id] || new Set();
                  return (
                    <tr key={a.id} className="border-b border-[#E5E7EB]/50 hover:bg-[#F7F4EF]">
                      <td className="px-4 py-3 font-semibold text-[#0B1F42]">{a.name}</td>
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-[#FDE8D8] px-2.5 py-0.5 text-xs font-semibold capitalize text-[#9A4A1D]">
                          {CATEGORY_LABELS[a.category] || a.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">KES {a.price.toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs">
                        {assignedProps.size > 0 ? (
                          <span className="text-[#222222]">{assignedProps.size} property{assignedProps.size > 1 ? 'ies' : 'y'}</span>
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
                        <TableActionsMenu actions={[{ label: 'Edit add-on', icon: '✎', onClick: () => openEdit(a) }, { label: 'Delete add-on', icon: '×', danger: true, onClick: () => handleDelete(a.id) }]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {addOns.length === 0 && (
            <div className="text-center py-12 text-[#5B6B82]">No add-ons yet. Create your first!</div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminAddOns;
