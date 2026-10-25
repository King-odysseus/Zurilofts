import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Textarea,
  TextInput,
  ToggleSwitch,
} from 'flowbite-react';
import { Search } from 'lucide-react';
import apiClient from '../api/client.js';
import SelectMenu from '../components/SelectMenu.jsx';
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

  const fetchAddOns = useCallback(async () => {
    try {
      const response = await apiClient.get('/admin/addons');
      setAddOns(response.data.data || []);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Add-ons could not be loaded.');
      setMessageTone('error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProperties = useCallback(async () => {
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
        } catch { /* A property without add-ons must not block the rest of the editor. */ }
      }));
      setAssignments(assignmentMap);
    } catch { /* Property coverage is optional until the editor is opened. */ }
  }, []);

  // Fetchers are stable callbacks, so this runs once on mount and after each mutation
  // that calls them directly - no dependency-array suppression needed.
  useEffect(() => {
    fetchAddOns();
    fetchProperties();
  }, [fetchAddOns, fetchProperties]);

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
    <div className="space-y-6" data-openpencil-frame="0:7343">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">ZURILOFTS · ADMIN · CONTENT</p>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Add-ons</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">Manage guest services, pricing, availability, and property-level assignments.</p>
        </div>
        <Button onClick={openCreate}>Create add-on</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">ACTIVE SERVICES</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{totals.active}</strong>
          <small className="mt-1 block text-xs text-muted">Available during eligible stays</small>
        </article>
        <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">AVERAGE PRICE</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">KES {totals.averagePrice.toLocaleString()}</strong>
          <small className="mt-1 block text-xs text-muted">Across services in view</small>
        </article>
        <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">CATEGORIES</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{totals.categories}</strong>
          <small className="mt-1 block text-xs text-muted">Service categories represented</small>
        </article>
        <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">PROPERTY ASSIGNMENTS</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{totals.assigned}</strong>
          <small className="mt-1 block text-xs text-muted">Active property-service links</small>
        </article>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-elevated shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.8} aria-hidden="true" />
            <TextInput className="pl-9" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search service, category or description" aria-label="Search add-ons" />
          </div>
          <span className="shrink-0 self-start rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted sm:self-auto">{visibleAddOns.length} service{visibleAddOns.length === 1 ? '' : 's'}</span>
        </div>

        {message && <Alert color={messageTone === 'error' ? 'failure' : 'success'} className="mx-5 mt-4" role="status">{message}</Alert>}

        {loading ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" aria-hidden="true" />
            <strong className="text-base font-semibold text-navy">Loading add-ons</strong>
            <p className="text-xs leading-relaxed text-muted">Checking service inventory and property coverage.</p>
          </div>
        ) : visibleAddOns.length === 0 ? (
          <Alert color="info">
            <div className="flex w-full flex-col items-center gap-2 px-5 py-12 text-center">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 dark:bg-primary/15 text-navy" aria-hidden="true"><SearchIcon /></span>
              <strong className="text-base font-semibold text-navy">No add-ons found</strong>
              <p className="text-xs leading-relaxed text-muted">Create a guest service or adjust the current search.</p>
            </div>
          </Alert>
        ) : (
          <div>
            <Table hoverable aria-label="Add-ons">
              <TableHead>
                <TableRow>
                  <TableHeadCell>SERVICE</TableHeadCell>
                  <TableHeadCell>CATEGORY</TableHeadCell>
                  <TableHeadCell>PRICE</TableHeadCell>
                  <TableHeadCell>PROPERTY COVERAGE</TableHeadCell>
                  <TableHeadCell>STATUS</TableHeadCell>
                  <TableHeadCell>ACTIONS</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleAddOns.map((addOn) => {
                  const assigned = assignments[addOn.id] || new Set();
                  return (
                    <TableRow key={addOn.id}>
                      <TableCell><div className="flex items-center gap-3">
                        {addOn.image ? <img src={addOn.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary/15 text-sm font-bold text-navy" aria-hidden="true">{String(addOn.name || 'A')[0].toUpperCase()}</span>}
                        <div className="min-w-0">
                          <strong className="block truncate text-sm font-semibold text-navy">{addOn.name}</strong>
                          <small className="block truncate text-xs text-muted">{addOn.description}</small>
                        </div>
                      </div></TableCell>
                      <TableCell><span className="inline-flex whitespace-nowrap rounded-full bg-primary-50 dark:bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-navy">{CATEGORY_LABELS[addOn.category] || addOn.category}</span></TableCell>
                      <TableCell><div className="grid gap-1">
                        <small className="text-[11px] font-semibold uppercase tracking-wide text-muted">RATE</small>
                        <strong className="truncate text-sm font-semibold text-navy">KES {Number(addOn.price).toLocaleString()}</strong>
                        <span className="text-xs text-muted">Per booking or service</span>
                      </div></TableCell>
                      <TableCell><div className="grid gap-1">
                        <small className="text-[11px] font-semibold uppercase tracking-wide text-muted">ASSIGNED</small>
                        <strong className="truncate text-sm font-semibold text-navy">{assigned.size ? `${assigned.size} propert${assigned.size === 1 ? 'y' : 'ies'}` : 'Not assigned'}</strong>
                        <span className="text-xs text-muted">{assigned.size ? 'Offered on selected stays' : 'No property coverage'}</span>
                      </div></TableCell>
                      <TableCell><Button size="xs" color={addOn.active ? 'success' : 'warning'} onClick={() => handleToggle(addOn)}>{addOn.active ? 'Active' : 'Paused'}</Button></TableCell>
                      <TableCell><div className="flex items-center justify-end">
                        <TableActionsMenu
                          label={`Actions for ${addOn.name}`}
                          actions={[
                            { label: 'Edit', icon: 'edit', onClick: () => openEdit(addOn) },
                            { label: 'Delete', icon: 'delete', danger: true, onClick: () => handleDelete(addOn.id) },
                          ]}
                        />
                      </div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Modal show={showForm} onClose={closeForm} size="lg" dismissible>
        {showForm && (
          <>
            <ModalHeader>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">ADD-ON · {editingId ? 'EDIT' : 'NEW'}</span>
              <span className="block">{editingId ? 'Edit add-on' : 'Create add-on'}</span>
            </ModalHeader>
            <ModalBody>
              {formError && <Alert color="failure" className="mb-4">{formError}</Alert>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><Label htmlFor="addon-name">Service name</Label><TextInput id="addon-name" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} placeholder="Airport pickup" required /></div>
                <div><Label htmlFor="addon-description">Description</Label><Textarea id="addon-description" rows={3} value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} placeholder="Describe what guests receive and when." required /></div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="addon-price">Price (KES)</Label><TextInput id="addon-price" type="number" min="1" value={formData.price} onChange={(event) => setFormData({ ...formData, price: event.target.value })} required /></div>
                  <div><Label htmlFor="addon-category">Category</Label><SelectMenu id="addon-category" ariaLabel="Category" value={formData.category} onChange={(next) => setFormData({ ...formData, category: next })} options={CATEGORIES.map((category) => ({ value: category, label: CATEGORY_LABELS[category] }))} /></div>
                </div>
                <div><Label htmlFor="addon-image">Image URL (optional)</Label><TextInput id="addon-image" value={formData.image} onChange={(event) => setFormData({ ...formData, image: event.target.value })} placeholder="https://..." /></div>
                <div className="rounded-lg border border-border bg-surface p-3"><ToggleSwitch checked={formData.active} label="Available to guests" onChange={(event) => setFormData({ ...formData, active: event.target.checked })} /></div>

                {editingId && (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3"><div><Label>Assigned properties</Label><p className="mt-1 text-xs text-muted">Choose which stays may offer this service.</p></div></div>
                    <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-elevated p-2">
                      {properties.length === 0 ? <p className="p-2 text-xs text-muted">No properties are available.</p> : properties.map((property) => {
                        const assigned = (assignments[editingId] || new Set()).has(property.id);
                        return <Label key={property.id} className="flex items-center gap-3 rounded-md px-2 py-2"><Checkbox checked={assigned} disabled={assigning} onChange={() => toggleAssignment(property.id, editingId, assigned)} /><span className="min-w-0"><strong className="block truncate text-sm font-semibold text-navy">{property.title}</strong><small className="block truncate text-xs text-muted">{property.location}</small></span></Label>;
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1"><Button color="light" type="button" onClick={closeForm} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create add-on'}</Button></div>
              </form>
            </ModalBody>
          </>
        )}
      </Modal>
    </div>
  );
}

export default AdminAddOns;
