import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Label, Select, Textarea, TextInput, ToggleSwitch } from 'flowbite-react';
import { Search } from 'lucide-react';
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

function SearchIcon() {
  return <Search strokeWidth={1.8} aria-hidden="true" />;
}

function AdminAddOns() {
  const [addOns, setAddOns] = useState([]);
  const [properties, setProperties] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('success');

  function openCreate() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(addOn) {
    setEditingId(addOn.id);
    setFormData({
      name: addOn.name,
      description: addOn.description,
      price: addOn.price,
      image: addOn.image || '',
      category: addOn.category,
      active: addOn.active,
    });
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError('');
  }

  useEffect(() => {
    fetchAddOns();
    fetchProperties();
  }, []);

  async function fetchAddOns() {
    try {
      const response = await apiClient.get('/admin/addons');
      setAddOns(response.data.data || []);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Add-ons could not be loaded.');
      setMessageTone('error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchProperties() {
    try {
      // Admin-namespaced list: `/properties/mine` is host-scoped and 403s for admins.
      const response = await apiClient.get('/admin/properties');
      const rows = response.data.data || [];
      setProperties(rows);
      const assignmentMap = {};
      await Promise.all(rows.map(async (property) => {
        try {
          const addOnResponse = await apiClient.get(`/properties/${property.id}/addons`);
          const assigned = Array.isArray(addOnResponse.data.data) ? addOnResponse.data.data : [];
          assigned.forEach((addOn) => {
            if (!assignmentMap[addOn.id]) assignmentMap[addOn.id] = new Set();
            assignmentMap[addOn.id].add(property.id);
          });
        } catch { /* A property without add-ons should not block the editor. */ }
      }));
      setAssignments(assignmentMap);
    } catch { /* Property assignment is optional until the editor is opened. */ }
  }

  async function handleSubmit(event) {
    event.preventDefault();
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
      if (editingId) await apiClient.patch(`/admin/addons/${editingId}`, payload);
      else await apiClient.post('/admin/addons', payload);
      closeForm();
      setMessage(editingId ? 'Add-on updated.' : 'Add-on created.');
      setMessageTone('success');
      await fetchAddOns();
    } catch (error) {
      setFormError(error.response?.data?.error || `Failed to ${editingId ? 'update' : 'create'} add-on`);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(addOn) {
    try {
      await apiClient.patch(`/admin/addons/${addOn.id}`, { active: !addOn.active });
      setAddOns((current) => current.map((entry) => entry.id === addOn.id ? { ...entry, active: !entry.active } : entry));
      setMessage(`${addOn.name} ${addOn.active ? 'paused' : 'activated'}.`);
      setMessageTone('success');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update add-on.');
      setMessageTone('error');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this add-on permanently? This removes it from all properties and bookings.')) return;
    try {
      await apiClient.delete(`/admin/addons/${id}`);
      setAddOns((current) => current.filter((addOn) => addOn.id !== id));
      setMessage('Add-on deleted.');
      setMessageTone('success');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to delete add-on.');
      setMessageTone('error');
    }
  }

  async function toggleAssignment(propertyId, addOnId, currentlyAssigned) {
    if (assigning) return;
    setAssigning(true);
    setFormError('');
    try {
      if (currentlyAssigned) await apiClient.delete(`/admin/properties/${propertyId}/addons/${addOnId}`);
      else await apiClient.post(`/admin/properties/${propertyId}/addons`, { addOnId });
      setAssignments((current) => {
        const next = { ...current };
        const set = new Set(next[addOnId] || []);
        if (currentlyAssigned) set.delete(propertyId);
        else set.add(propertyId);
        next[addOnId] = set;
        return next;
      });
    } catch (error) {
      setFormError(error.response?.data?.error || 'Failed to update property assignment');
    } finally {
      setAssigning(false);
    }
  }

  const visibleAddOns = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return addOns;
    return addOns.filter((addOn) => [addOn.name, addOn.description, CATEGORY_LABELS[addOn.category] || addOn.category].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [addOns, search]);

  const totals = useMemo(() => {
    const active = visibleAddOns.filter((addOn) => addOn.active).length;
    const averagePrice = visibleAddOns.length ? Math.round(visibleAddOns.reduce((sum, addOn) => sum + Number(addOn.price || 0), 0) / visibleAddOns.length) : 0;
    const categories = new Set(visibleAddOns.map((addOn) => addOn.category).filter(Boolean)).size;
    const assigned = visibleAddOns.reduce((sum, addOn) => sum + (assignments[addOn.id]?.size || 0), 0);
    return { active, averagePrice, categories, assigned };
  }, [visibleAddOns, assignments]);

  return (
    <div className="op-admin-overview op-admin-catalog" data-openpencil-frame="0:7343">
      <div className="op-admin-heading op-admin-catalog-heading">
        <div>
          <p className="op-admin-eyebrow">ZURILOFTS · ADMIN · CONTENT</p>
          <h1>Add-ons</h1>
          <p>Manage guest services, pricing, availability, and property-level assignments.</p>
        </div>
        <Button className="op-admin-bronze-button" onClick={openCreate}>Create add-on</Button>
      </div>

      <div className="op-admin-metrics op-admin-catalog-metrics">
        <article><span>ACTIVE SERVICES</span><strong>{totals.active}</strong><small>Available during eligible stays</small></article>
        <article><span>AVERAGE PRICE</span><strong>KES {totals.averagePrice.toLocaleString()}</strong><small>Across services in view</small></article>
        <article><span>CATEGORIES</span><strong>{totals.categories}</strong><small>Service categories represented</small></article>
        <article><span>PROPERTY ASSIGNMENTS</span><strong>{totals.assigned}</strong><small>Active property-service links</small></article>
      </div>

      <section className="op-admin-catalog-board">
        <div className="op-admin-catalog-toolbar">
          <div className="op-admin-catalog-search"><SearchIcon /><TextInput type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search service, category or description" aria-label="Search add-ons" /></div>
          <span>{visibleAddOns.length} service{visibleAddOns.length === 1 ? '' : 's'}</span>
        </div>

        {message && <div className={`op-admin-people-message ${messageTone === 'error' ? 'is-error' : 'is-success'}`} role="status">{message}</div>}

        {loading ? (
          <div className="op-admin-catalog-empty"><span className="op-admin-booking-spinner" aria-hidden="true" /><strong>Loading add-ons</strong><p>Checking service inventory and property assignments.</p></div>
        ) : visibleAddOns.length === 0 ? (
          <div className="op-admin-catalog-empty"><span aria-hidden="true"><SearchIcon /></span><strong>No add-ons found</strong><p>Create a guest service or adjust the current search.</p></div>
        ) : (
          <div className="op-admin-catalog-list" role="table" aria-label="Add-ons">
            <div className="op-admin-catalog-columns op-admin-addon-columns" role="row">
              <span role="columnheader">SERVICE</span><span role="columnheader">CATEGORY</span><span role="columnheader">PRICE</span><span role="columnheader">PROPERTY COVERAGE</span><span role="columnheader">STATUS</span><span role="columnheader">ACTIONS</span>
            </div>
            {visibleAddOns.map((addOn) => {
              const assigned = assignments[addOn.id] || new Set();
              return (
                <article key={addOn.id} className={`op-admin-catalog-row op-admin-addon-columns ${addOn.active ? '' : 'is-muted'}`} role="row">
                  <div className="op-admin-addon-service" role="cell">
                    {addOn.image ? <img src={addOn.image} alt="" /> : <span aria-hidden="true">{String(addOn.name || 'A')[0].toUpperCase()}</span>}
                    <div><strong>{addOn.name}</strong><small>{addOn.description}</small></div>
                  </div>
                  <div role="cell"><span className="op-admin-addon-category">{CATEGORY_LABELS[addOn.category] || addOn.category}</span></div>
                  <div className="op-admin-catalog-cell" role="cell"><small>RATE</small><strong>KES {Number(addOn.price).toLocaleString()}</strong><span>Per booking or service</span></div>
                  <div className="op-admin-catalog-cell" role="cell"><small>ASSIGNED</small><strong>{assigned.size ? `${assigned.size} propert${assigned.size === 1 ? 'y' : 'ies'}` : 'Not assigned'}</strong><span>{assigned.size ? 'Visible on selected stays' : 'No property coverage'}</span></div>
                  <div role="cell"><button type="button" className={`op-admin-catalog-status ${addOn.active ? 'is-success' : 'is-neutral'}`} onClick={() => handleToggle(addOn)}>{addOn.active ? 'Active' : 'Paused'}</button></div>
                  <div className="op-admin-catalog-actions" role="cell"><button type="button" onClick={() => openEdit(addOn)}>Edit</button><button type="button" className="is-danger" onClick={() => handleDelete(addOn.id)}>Delete</button></div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showForm && (
        <div className="op-admin-dialog-backdrop" role="presentation" onMouseDown={closeForm}>
          <div className="op-admin-edit-dialog op-admin-catalog-dialog" role="dialog" aria-modal="true" aria-labelledby="addon-form-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="op-admin-dialog-heading"><div><p className="op-admin-eyebrow">ADD-ON · {editingId ? 'EDIT' : 'NEW'}</p><h2 id="addon-form-title">{editingId ? 'Edit add-on' : 'Create add-on'}</h2></div><button type="button" onClick={closeForm} aria-label="Close add-on form">&times;</button></div>
            {formError && <div className="op-admin-error" role="alert">{formError}</div>}
            <form onSubmit={handleSubmit} className="op-admin-booking-form">
              <div><Label htmlFor="addon-name">Service name</Label><TextInput id="addon-name" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} placeholder="Airport pickup" required /></div>
              <div><Label htmlFor="addon-description">Description</Label><Textarea id="addon-description" rows={3} value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} placeholder="Describe what guests receive and when." required /></div>
              <div className="op-admin-form-grid">
                <div><Label htmlFor="addon-price">Price (KES)</Label><TextInput id="addon-price" type="number" min="1" value={formData.price} onChange={(event) => setFormData({ ...formData, price: event.target.value })} required /></div>
                <div><Label htmlFor="addon-category">Category</Label><Select id="addon-category" value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value })}>{CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</Select></div>
              </div>
              <div><Label htmlFor="addon-image">Image URL (optional)</Label><TextInput id="addon-image" value={formData.image} onChange={(event) => setFormData({ ...formData, image: event.target.value })} placeholder="https://..." /></div>
              <div className="op-admin-addon-toggle"><ToggleSwitch checked={formData.active} label="Available to guests" onChange={(event) => setFormData({ ...formData, active: event.target.checked })} /></div>

              {editingId && (
                <div className="op-admin-assignment-section">
                  <div className="op-admin-assignment-heading"><div><Label>Assigned properties</Label><p>Choose which stays may offer this service.</p></div></div>
                  <div className="op-admin-assignment-list">
                    {properties.length === 0 ? <p>No properties are available.</p> : properties.map((property) => {
                      const assigned = (assignments[editingId] || new Set()).has(property.id);
                      return <Label key={property.id} className="op-admin-assignment-item"><Checkbox checked={assigned} disabled={assigning} onChange={() => toggleAssignment(property.id, editingId, assigned)} /><span><strong>{property.title}</strong><small>{property.location}</small></span></Label>;
                    })}
                  </div>
                </div>
              )}

              <div className="op-admin-dialog-actions"><Button color="light" type="button" onClick={closeForm} disabled={saving}>Cancel</Button><Button className="op-admin-bronze-button" type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create add-on'}</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAddOns;
