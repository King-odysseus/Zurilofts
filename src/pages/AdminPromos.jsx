import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Label, TextInput } from 'flowbite-react';
import { Search } from 'lucide-react';
import apiClient from '../api/client.js';
import TableActionsMenu from '../components/TableActionsMenu.jsx';

const EMPTY_FORM = {
  code: '',
  discountPercent: 10,
  validFrom: '',
  validUntil: '',
  maxUses: '',
  minBookingAmount: '',
  maxDiscount: '',
  propertyIds: [],
};

function formatDate(value) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

function SearchIcon() {
  return <Search strokeWidth={1.8} aria-hidden="true" />;
}

function AdminPromos() {
  const [promos, setPromos] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('success');

  function openCreate() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(promo) {
    setEditingId(promo.id);
    setFormData({
      code: promo.code,
      discountPercent: promo.discountPercent,
      validFrom: promo.validFrom ? new Date(promo.validFrom).toISOString().slice(0, 10) : '',
      validUntil: promo.validUntil ? new Date(promo.validUntil).toISOString().slice(0, 10) : '',
      maxUses: promo.maxUses ?? '',
      minBookingAmount: promo.minBookingAmount ?? '',
      maxDiscount: promo.maxDiscount ?? '',
      propertyIds: promo.properties?.map((property) => property.id) || [],
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
    fetchPromos();
    fetchProperties();
  }, []);

  async function fetchPromos() {
    try {
      const response = await apiClient.get('/promo');
      setPromos(response.data.data || []);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Promo codes could not be loaded.');
      setMessageTone('error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchProperties() {
    try {
      // Admin-namespaced list: `/properties/mine` is host-scoped and 403s for admins.
      const response = await apiClient.get('/admin/properties');
      setProperties(response.data.data || []);
    } catch { /* Property targeting is optional for promo creation. */ }
  }

  async function handleSubmit(event) {
    event.preventDefault();
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
      if (editingId) await apiClient.patch(`/promo/${editingId}`, { code: formData.code.toUpperCase(), ...payload });
      else await apiClient.post('/promo', { code: formData.code.toUpperCase(), ...payload });
      closeForm();
      setMessage(editingId ? 'Promo code updated.' : 'Promo code created.');
      setMessageTone('success');
      await fetchPromos();
    } catch (error) {
      setFormError(error.response?.data?.error || `Failed to ${editingId ? 'update' : 'create'} promo code`);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(promo) {
    try {
      await apiClient.patch(`/promo/${promo.id}`, { active: !promo.active });
      setPromos((current) => current.map((entry) => entry.id === promo.id ? { ...entry, active: !entry.active } : entry));
      setMessage(`${promo.code} ${promo.active ? 'paused' : 'activated'}.`);
      setMessageTone('success');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update promo code.');
      setMessageTone('error');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this promo code permanently?')) return;
    try {
      await apiClient.delete(`/promo/${id}`);
      setPromos((current) => current.filter((promo) => promo.id !== id));
      setMessage('Promo code deleted.');
      setMessageTone('success');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to delete promo code.');
      setMessageTone('error');
    }
  }

  const visiblePromos = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return promos;
    return promos.filter((promo) => [
      promo.code,
      promo.discountPercent,
      ...(promo.properties || []).map((property) => property.title),
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [promos, search]);

  const allPropertiesSelected = properties.length > 0 && properties.every((property) => formData.propertyIds.includes(property.id));
  const totals = useMemo(() => {
    const active = visiblePromos.filter((promo) => promo.active).length;
    const uses = visiblePromos.reduce((sum, promo) => sum + (Number(promo.currentUses) || 0), 0);
    const expiring = visiblePromos.filter((promo) => promo.active && daysUntil(promo.validUntil) >= 0 && daysUntil(promo.validUntil) <= 30).length;
    const scopedProperties = new Set(visiblePromos.flatMap((promo) => promo.properties?.map((property) => property.id) || []));
    const wholePortfolio = visiblePromos.some((promo) => !promo.properties?.length);
    return { active, uses, expiring, coverage: wholePortfolio ? properties.length : scopedProperties.size };
  }, [visiblePromos, properties.length]);

  return (
    <div className="op-admin-overview op-admin-catalog" data-openpencil-frame="0:7343">
      <div className="op-admin-heading op-admin-catalog-heading">
        <div>
          <p className="op-admin-eyebrow">ZURILOFTS · ADMIN · CONTENT</p>
          <h1>Promo codes</h1>
          <p>Control guest offers, validity windows, use limits, and listing eligibility.</p>
        </div>
        <Button className="op-admin-bronze-button" onClick={openCreate}>Create promo</Button>
      </div>

      <div className="op-admin-metrics op-admin-catalog-metrics">
        <article><span>ACTIVE OFFERS</span><strong>{totals.active}</strong><small>Available to eligible guests</small></article>
        <article><span>TOTAL REDEMPTIONS</span><strong>{totals.uses}</strong><small>Across the current view</small></article>
        <article><span>EXPIRING SOON</span><strong>{totals.expiring}</strong><small>Active codes ending in 30 days</small></article>
        <article><span>LISTINGS COVERED</span><strong>{totals.coverage}</strong><small>Targeted properties in scope</small></article>
      </div>

      <section className="op-admin-catalog-board">
        <div className="op-admin-catalog-toolbar">
          <div className="op-admin-catalog-search">
            <SearchIcon />
            <TextInput type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search promo code or property" aria-label="Search promo codes" />
          </div>
          <span>{visiblePromos.length} code{visiblePromos.length === 1 ? '' : 's'}</span>
        </div>

        {message && <div className={`op-admin-people-message ${messageTone === 'error' ? 'is-error' : 'is-success'}`} role="status">{message}</div>}

        {loading ? (
          <div className="op-admin-catalog-empty"><span className="op-admin-booking-spinner" aria-hidden="true" /><strong>Loading promo codes</strong><p>Checking active offers, redemption limits, and listing scope.</p></div>
        ) : visiblePromos.length === 0 ? (
          <div className="op-admin-catalog-empty"><span aria-hidden="true"><SearchIcon /></span><strong>No promo codes found</strong><p>Create an offer or adjust the current search.</p></div>
        ) : (
          <div className="op-admin-catalog-list" role="table" aria-label="Promo codes">
            <div className="op-admin-catalog-columns op-admin-promo-columns" role="row">
              <span role="columnheader">CODE</span><span role="columnheader">OFFER</span><span role="columnheader">USAGE</span><span role="columnheader">VALIDITY</span><span role="columnheader">LISTINGS</span><span role="columnheader">STATUS</span><span role="columnheader">ACTIONS</span>
            </div>
            {visiblePromos.map((promo) => {
              const remainingDays = daysUntil(promo.validUntil);
              const expired = remainingDays < 0;
              return (
                <article key={promo.id} className={`op-admin-catalog-row op-admin-promo-columns ${promo.active && !expired ? '' : 'is-muted'}`} role="row">
                  <div className="op-admin-promo-code" role="cell"><strong>{promo.code}</strong><small>{expired ? 'Expired' : promo.active ? 'Live offer' : 'Paused'}</small></div>
                  <div className="op-admin-catalog-cell" role="cell"><small>DISCOUNT</small><strong>{promo.discountPercent}% off</strong><span>{promo.maxDiscount ? `Max KES ${Number(promo.maxDiscount).toLocaleString()}` : 'No maximum'}</span></div>
                  <div className="op-admin-catalog-cell" role="cell"><small>REDEMPTIONS</small><strong>{promo.currentUses || 0}{promo.maxUses ? ` / ${promo.maxUses}` : ''}</strong><span>{promo.maxUses ? 'Limited uses' : 'Unlimited uses'}</span></div>
                  <div className="op-admin-catalog-cell" role="cell"><small>VALIDITY</small><strong>{formatDate(promo.validFrom)}</strong><span>to {formatDate(promo.validUntil)}{!expired && remainingDays <= 30 ? ` · ${remainingDays}d left` : ''}</span></div>
                  <div className="op-admin-catalog-cell" role="cell"><small>LISTINGS</small><strong>{promo.properties?.length ? `${promo.properties.length} targeted` : 'Whole portfolio'}</strong><span>{promo.properties?.map((property) => property.title).join(', ') || 'Applies to every stay'}</span></div>
                  <div role="cell"><button type="button" className={`op-admin-catalog-status ${promo.active && !expired ? 'is-success' : expired ? 'is-danger' : 'is-neutral'}`} onClick={() => handleToggle(promo)}>{expired ? 'Expired' : promo.active ? 'Active' : 'Paused'}</button></div>
                  <div className="op-admin-catalog-actions" role="cell">
                    <TableActionsMenu
                      label={`Actions for ${promo.code}`}
                      actions={[
                        { label: 'Edit', icon: 'edit', onClick: () => openEdit(promo) },
                        { label: 'Delete', icon: 'delete', danger: true, onClick: () => handleDelete(promo.id) },
                      ]}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showForm && (
        <div className="op-admin-dialog-backdrop" role="presentation" onMouseDown={closeForm}>
          <div className="op-admin-edit-dialog op-admin-catalog-dialog" role="dialog" aria-modal="true" aria-labelledby="promo-form-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="op-admin-dialog-heading">
              <div><p className="op-admin-eyebrow">PROMO · {editingId ? 'EDIT' : 'NEW'}</p><h2 id="promo-form-title">{editingId ? 'Edit promo code' : 'Create promo code'}</h2></div>
              <button type="button" onClick={closeForm} aria-label="Close promo form">&times;</button>
            </div>
            {formError && <div className="op-admin-error" role="alert">{formError}</div>}
            <form onSubmit={handleSubmit} className="op-admin-booking-form">
              <div className="op-admin-form-grid">
                <div><Label htmlFor="promo-code">Promo code</Label><TextInput id="promo-code" value={formData.code} onChange={(event) => setFormData({ ...formData, code: event.target.value })} placeholder="SUMMER2026" required className="uppercase" /></div>
                <div><Label htmlFor="promo-discount">Discount percent</Label><TextInput id="promo-discount" type="number" min="1" max="100" value={formData.discountPercent} onChange={(event) => setFormData({ ...formData, discountPercent: event.target.value })} required /></div>
              </div>
              <div className="op-admin-form-grid">
                <div><Label htmlFor="promo-valid-from">Valid from</Label><TextInput id="promo-valid-from" type="date" value={formData.validFrom} onChange={(event) => setFormData({ ...formData, validFrom: event.target.value })} required /></div>
                <div><Label htmlFor="promo-valid-until">Valid until</Label><TextInput id="promo-valid-until" type="date" value={formData.validUntil} onChange={(event) => setFormData({ ...formData, validUntil: event.target.value })} required /></div>
              </div>
              <div className="op-admin-form-grid">
                <div><Label htmlFor="promo-max-uses">Maximum uses</Label><TextInput id="promo-max-uses" type="number" min="1" value={formData.maxUses} onChange={(event) => setFormData({ ...formData, maxUses: event.target.value })} placeholder="Unlimited" /></div>
                <div><Label htmlFor="promo-min-booking">Minimum booking (KES)</Label><TextInput id="promo-min-booking" type="number" min="0" value={formData.minBookingAmount} onChange={(event) => setFormData({ ...formData, minBookingAmount: event.target.value })} placeholder="No minimum" /></div>
              </div>
              <div><Label htmlFor="promo-max-discount">Maximum discount (KES)</Label><TextInput id="promo-max-discount" type="number" min="1" value={formData.maxDiscount} onChange={(event) => setFormData({ ...formData, maxDiscount: event.target.value })} placeholder="No cap" /></div>

              <div className="op-admin-assignment-section">
                <div className="op-admin-assignment-heading"><div><Label>Applies to properties</Label><p>Leave all unchecked to apply the offer to every listing.</p></div><Button color="light" size="xs" type="button" onClick={() => setFormData({ ...formData, propertyIds: allPropertiesSelected ? [] : properties.map((property) => property.id) })}>{allPropertiesSelected ? 'Clear all' : 'Select all'}</Button></div>
                <div className="op-admin-assignment-list">
                  {properties.length === 0 ? <p>No properties are available.</p> : properties.map((property) => (
                    <Label key={property.id} className="op-admin-assignment-item">
                      <Checkbox checked={formData.propertyIds.includes(property.id)} onChange={(event) => setFormData({ ...formData, propertyIds: event.target.checked ? [...formData.propertyIds, property.id] : formData.propertyIds.filter((id) => id !== property.id) })} />
                      <span><strong>{property.title}</strong><small>{property.location}</small></span>
                    </Label>
                  ))}
                </div>
              </div>

              <div className="op-admin-dialog-actions"><Button color="light" type="button" onClick={closeForm} disabled={saving}>Cancel</Button><Button className="op-admin-bronze-button" type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create promo'}</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPromos;
