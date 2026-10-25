import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Alert, Button, Checkbox, Label, Textarea, TextInput, ToggleSwitch } from 'flowbite-react';
import { Check, ChevronLeft, Eye, MapPin, Upload, X } from 'lucide-react';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';
import SelectMenu from '../components/SelectMenu.jsx';
import { findSearchLocation, isNairobiSearchLocation, SEARCH_LOCATION_GROUPS } from '../data/searchLocations.js';

// SelectMenu renders a flat option list, so the optgroups the native select used
// are flattened here. Area names are unique across the groups, so no value is lost.
const AREA_OPTIONS = SEARCH_LOCATION_GROUPS.flatMap((group) => (
  group.options.map((area) => ({ value: area, label: area }))
));

const PROPERTY_TYPE_OPTIONS = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'studio', label: 'Studio' },
  { value: 'penthouse', label: 'Penthouse' },
];

const EMPTY = {
  title: '',
  location: '',
  neighborhood: 'Nairobi',
  price: '',
  price1Bed: '',
  price2Bed: '',
  bathrooms1Bed: '',
  bathrooms2Bed: '',
  bedrooms: 1,
  bathrooms: 1,
  area: '',
  description: '',
  type: 'apartment',
  available: true,
  featured: false,
  images: [], // array of image paths/URLs
  amenities: '',
  nearby: '',
  // Legacy pin coordinates. The map picker was removed, so lat/lng are no
  // longer editable - they are only loaded and re-sent so editing a listing
  // cannot silently drop a pin that is already stored. address IS editable and
  // is what the Google Maps link uses.
  lat: '',
  lng: '',
  address: '',
};

const EDITOR_STEPS = [
  { key: 'basics', label: 'Basics' },
  { key: 'photos', label: 'Photos' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'pricing', label: 'Pricing' },
];

// Shared with the host application form so both multi-step host forms read identically.
const CARD_CLASS = 'rounded-xl border border-border bg-elevated p-5 shadow-sm sm:p-6';
const STEP_BUTTON_BASE = 'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface';
const STEP_CIRCLE_BASE = 'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-bold';

// textarea where each non-empty line is one array item
function linesToArray(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function buildLocationLabel(location, neighborhood) {
  const details = String(location || '').trim();
  const area = String(neighborhood || '').trim();
  const label = !area || details.toLowerCase().includes(area.toLowerCase()) ? details : details ? `${details}, ${area}` : area;
  if (isNairobiSearchLocation(area) && !label.toLowerCase().includes('nairobi')) {
    return `${label}, Nairobi`;
  }
  return label;
}

function SectionHeader({ step, title, description }) {
  return (
    <header className="flex items-start gap-3 border-b border-border pb-4">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary/15 text-xs font-bold text-navy">{step}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        <p className="text-xs text-muted">{description}</p>
      </div>
    </header>
  );
}

function AdminPropertyForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  // Host-only screen. Listing writes go to /properties (host-scoped) and the
  // listing index lives at /host/listings; /admin/properties is review-only.

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [activeStep, setActiveStep] = useState('basics');

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await apiClient.get(`/properties/${id}`);
        const p = res.data.data;
        setForm({
          title: p.title || '',
          location: p.location || '',
          neighborhood: p.neighborhood || findSearchLocation(p.location) || 'Nairobi',
          price: p.price ?? '',
          price1Bed: p.price1Bed ?? '',
          price2Bed: p.price2Bed ?? '',
          bathrooms1Bed: p.bathrooms1Bed ?? '',
          bathrooms2Bed: p.bathrooms2Bed ?? '',
          bedrooms: p.bedrooms ?? 1,
          bathrooms: p.bathrooms ?? 1,
          area: p.area ?? '',
          description: p.description || '',
          type: p.type || 'apartment',
          available: p.available ?? true,
          featured: p.featured ?? false,
          images: p.images || [],
          amenities: (p.amenities || []).join('\n'),
          nearby: (p.nearby || []).join('\n'),
          lat: p.lat ?? '',
          lng: p.lng ?? '',
          address: p.address || '',
        });
      } catch {
        setError('Failed to load property');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Upload selected files to the backend, which optimizes them and returns paths
  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file
    if (files.length === 0) return;

    setUploading(true);
    setError('');
    try {
      const data = new FormData();
      files.forEach((f) => data.append('images', f));
      const res = await apiClient.post('/uploads', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const urls = res.data.data?.urls || [];
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    } catch (err) {
      setError(err.response?.data?.error || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      title: form.title,
      location: buildLocationLabel(form.location, form.neighborhood),
      neighborhood: form.neighborhood,
      price: Number(form.price),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      area: Number(form.area),
      description: form.description,
      type: form.type,
      available: form.available,
      featured: form.featured,
      images: form.images,
      amenities: linesToArray(form.amenities),
      nearby: linesToArray(form.nearby),
    };

    if (form.price1Bed !== '') payload.price1Bed = Number(form.price1Bed);
    if (form.price2Bed !== '') payload.price2Bed = Number(form.price2Bed);
    if (form.bathrooms1Bed !== '') payload.bathrooms1Bed = Number(form.bathrooms1Bed);
    if (form.bathrooms2Bed !== '') payload.bathrooms2Bed = Number(form.bathrooms2Bed);

    // Coordinates are no longer collected in the editor, but a pin already on
    // the listing is carried through so saving cannot drop it.
    if (form.lat !== '' && form.lat !== null && form.lat !== undefined) {
      payload.lat = Number(form.lat);
      payload.lng = Number(form.lng);
    }
    // Always sent, including when blank, so clearing the field clears the stored
    // address instead of leaving a stale street name behind.
    payload.address = form.address ? form.address : null;

    if (payload.images.length === 0) {
      setError('Add at least one image');
      setSaving(false);
      return;
    }

    try {
      // Host-scoped endpoint; requireHostWorkspace rejects ADMIN, so the admin
      // control centre no longer offers listing writes at all.
      const endpoint = '/properties';
      if (isEdit) {
        await apiClient.put(`${endpoint}/${id}`, payload);
        navigate('/host/listings');
      } else {
        const res = await apiClient.post(endpoint, payload);
        // Go to edit so seasonal pricing & calendar (which need an id) are available
        navigate(`/host/properties/${res.data.data.id}/edit`);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  }

  const basicsComplete = [form.title, form.location, form.area, form.description, form.price].filter(Boolean).length;
  const amenitiesCount = linesToArray(form.amenities).length;
  const nearbyCount = linesToArray(form.nearby).length;
  const completionItems = [
    { key: 'basics', label: 'Basics', complete: basicsComplete === 5, detail: `${basicsComplete} of 5 complete` },
    { key: 'photos', label: 'Photos', complete: form.images.length > 0, detail: `${form.images.length} photo${form.images.length === 1 ? '' : 's'} added` },
    { key: 'amenities', label: 'Amenities', complete: amenitiesCount > 0, detail: `${amenitiesCount} amenit${amenitiesCount === 1 ? 'y' : 'ies'} · ${nearbyCount} nearby` },
    { key: 'pricing', label: 'Pricing', complete: Boolean(form.price && form.bedrooms && form.bathrooms), detail: form.price ? `KES ${Number(form.price).toLocaleString()} / night` : 'Rate not set' },
  ];
  const completedCount = completionItems.filter((item) => item.complete).length;

  function goToStep(step) {
    setActiveStep(step);
    const target = document.getElementById(`host-editor-${step}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/host/listings" className="inline-flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-navy">
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            Listings
          </Link>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">Host setup</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{isEdit ? 'Edit listing' : 'Create a listing'}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Prepare the basics, photos, amenities and pricing guests will see.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" color="light" onClick={() => setShowFullPreview(true)}>
            <Eye className="mr-2 h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Preview listing
          </Button>
          {isEdit && <Button as={Link} to={`/host/calendar/${id}`} color="light">Manage calendar</Button>}
        </div>
      </header>

      {showFullPreview && (
        <FullPagePreview form={form} onClose={() => setShowFullPreview(false)} />
      )}

      {error && (
        <Alert color="failure" role="alert">{error}</Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[230px_minmax(0,1fr)_300px] lg:items-start">
          <aside className="space-y-2 rounded-xl border border-border bg-elevated p-5 shadow-sm lg:sticky lg:top-24">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">Listing progress</span>
              <strong className="mt-1 block text-sm font-semibold text-navy">{completedCount} of 4 steps complete</strong>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface" aria-hidden="true">
                <i className="block h-full rounded-full bg-primary" style={{ width: `${(completedCount / EDITOR_STEPS.length) * 100}%` }} />
              </div>
            </div>
            <nav className="space-y-2 pt-2" aria-label="Listing setup steps">
              {EDITOR_STEPS.map((step, index) => {
                const item = completionItems.find((entry) => entry.key === step.key);
                const active = activeStep === step.key;
                return (
                  <button
                    key={step.key}
                    type="button"
                    className={`${STEP_BUTTON_BASE} ${active ? 'bg-primary/10 font-semibold text-navy' : ''} ${item?.complete ? 'text-navy' : 'text-muted'}`}
                    onClick={() => goToStep(step.key)}
                    aria-current={active ? 'step' : undefined}
                  >
                    <span className={`${STEP_CIRCLE_BASE} ${item?.complete || active ? 'bg-primary-50 dark:bg-primary/15 text-navy' : 'text-muted'}`}>
                      {item?.complete ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" /> : index + 1}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <strong className="text-sm font-semibold text-navy">{step.label}</strong>
                      <small className="truncate text-xs text-muted">{item?.complete ? 'Complete' : item?.detail || 'Needs attention'}</small>
                    </span>
                  </button>
                );
              })}
            </nav>
            <p className="border-t border-border pt-3 text-xs text-muted">Your progress is saved when you submit this listing.</p>
          </aside>

          <div className="space-y-5">
            <section id="host-editor-basics" className={`${CARD_CLASS} scroll-mt-24`}>
              <SectionHeader step="1" title="Listing basics" description="Tell guests what makes your stay special." />
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="listing-title">Listing title</Label>
                  <TextInput id="listing-title" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Bright two-bedroom loft" required />
                </div>
                <div>
                  <Label htmlFor="listing-neighborhood">Area</Label>
                  <SelectMenu id="listing-neighborhood" ariaLabel="Area" value={form.neighborhood} onChange={(next) => update('neighborhood', next)} options={AREA_OPTIONS} />
                </div>
                <div>
                  <Label htmlFor="listing-location">Location details</Label>
                  <TextInput id="listing-location" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Street, building or landmark" required />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="listing-address">Street address (optional)</Label>
                  <TextInput
                    id="listing-address"
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="Building name, street or nearest landmark"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Shown to guests and used for the Google Maps link. Leave empty to use the location above.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="listing-description">Description</Label>
                  <Textarea id="listing-description" rows={5} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Share the layout, views and details guests should know before booking." required />
                </div>
              </div>
            </section>

            <section id="host-editor-photos" className={`${CARD_CLASS} scroll-mt-24`}>
              <SectionHeader step="2" title="Photos" description="Add clear, well-lit images. The first photo becomes the cover." />
              {form.images.length > 0 && (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {form.images.map((src, i) => (
                    <div key={src + i} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                      <img src={src} alt={`Property photo ${i + 1}`} className="h-full w-full object-cover" />
                      {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-navy-bg/85 px-2 py-0.5 text-[10px] font-semibold text-white">Cover</span>}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        aria-label="Remove image"
                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-navy shadow-sm hover:bg-white"
                      >
                        <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted hover:border-primary">
                {uploading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
                    <strong className="text-sm font-semibold text-navy">Uploading and optimizing...</strong>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                    <strong className="text-sm font-semibold text-navy">Add photos</strong>
                    <span className="text-xs">JPEG, PNG or WebP. Up to 10 at a time.</span>
                  </>
                )}
                <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} disabled={uploading} />
              </label>
            </section>

            <section id="host-editor-amenities" className={`${CARD_CLASS} scroll-mt-24`}>
              <SectionHeader step="3" title="Amenities and rules" description="List the essentials and useful places around the stay." />
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="listing-amenities">Amenities</Label>
                  <Textarea id="listing-amenities" rows={5} placeholder={'WiFi\nPool\nParking'} value={form.amenities} onChange={(e) => update('amenities', e.target.value)} />
                  <p className="mt-1 text-xs text-muted">Enter one item per line.</p>
                </div>
                <div>
                  <Label htmlFor="listing-nearby">What&apos;s nearby</Label>
                  <Textarea id="listing-nearby" rows={5} placeholder={'Airport - 20 min\nVillage Market - 8 min'} value={form.nearby} onChange={(e) => update('nearby', e.target.value)} />
                  <p className="mt-1 text-xs text-muted">Enter one item per line.</p>
                </div>
              </div>
            </section>

            <section id="host-editor-pricing" className={`${CARD_CLASS} scroll-mt-24`}>
              <SectionHeader step="4" title="Pricing and availability" description="Set the nightly rate, capacity and booking state." />
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="listing-price">Base price / night (KES)</Label>
                  <TextInput id="listing-price" type="number" min="1" value={form.price} onChange={(e) => update('price', e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="listing-area">Area (sq ft)</Label>
                  <TextInput id="listing-area" type="number" min="1" value={form.area} onChange={(e) => update('area', e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="listing-bedrooms">Bedrooms</Label>
                  <TextInput id="listing-bedrooms" type="number" min="0" value={form.bedrooms} onChange={(e) => update('bedrooms', e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="listing-bathrooms">Bathrooms</Label>
                  <TextInput id="listing-bathrooms" type="number" min="0" value={form.bathrooms} onChange={(e) => update('bathrooms', e.target.value)} required />
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-border bg-surface p-4">
                <div>
                  <h3 className="text-sm font-semibold text-navy">Bed size options</h3>
                  <p className="mt-1 text-xs text-muted">Add a one-bed or two-bed rate when the same stay can be booked at different capacities.</p>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className={`flex items-start gap-3 rounded-lg border p-3 ${form.price1Bed !== '' ? 'border-primary bg-primary-50 dark:bg-primary/15' : 'border-border bg-elevated'}`}>
                    <Checkbox
                      id="listing-variant-1"
                      checked={form.price1Bed !== ''}
                      onChange={(e) => {
                        update('price1Bed', e.target.checked ? (form.price || '') : '');
                        if (!e.target.checked) update('bathrooms1Bed', '');
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <Label htmlFor="listing-variant-1">List as 1-bed</Label>
                      <span className="block text-xs text-muted">Appears as a separate one-bedroom option.</span>
                      {form.price1Bed !== '' && (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <TextInput type="number" min="1" placeholder="Price per night" value={form.price1Bed} onChange={(e) => update('price1Bed', e.target.value)} required />
                          <TextInput type="number" min="0" placeholder="Bathrooms" value={form.bathrooms1Bed} onChange={(e) => update('bathrooms1Bed', e.target.value)} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-start gap-3 rounded-lg border p-3 ${form.price2Bed !== '' ? 'border-primary bg-primary-50 dark:bg-primary/15' : 'border-border bg-elevated'}`}>
                    <Checkbox
                      id="listing-variant-2"
                      checked={form.price2Bed !== ''}
                      onChange={(e) => {
                        update('price2Bed', e.target.checked ? (form.price || '') : '');
                        if (!e.target.checked) update('bathrooms2Bed', '');
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <Label htmlFor="listing-variant-2">List as 2-bed</Label>
                      <span className="block text-xs text-muted">Appears as a separate two-bedroom option.</span>
                      {form.price2Bed !== '' && (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <TextInput type="number" min="1" placeholder="Price per night" value={form.price2Bed} onChange={(e) => update('price2Bed', e.target.value)} required />
                          <TextInput type="number" min="0" placeholder="Bathrooms" value={form.bathrooms2Bed} onChange={(e) => update('bathrooms2Bed', e.target.value)} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="listing-type">Property type</Label>
                  <SelectMenu id="listing-type" ariaLabel="Property type" value={form.type} onChange={(next) => update('type', next)} options={PROPERTY_TYPE_OPTIONS} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div>
                      <strong className="block text-sm font-semibold text-navy">Available for bookings</strong>
                      <span className="text-xs text-muted">Guests can reserve open dates.</span>
                    </div>
                    <ToggleSwitch checked={form.available} onChange={(checked) => update('available', checked)} aria-label="Available for bookings" />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div>
                      <strong className="block text-sm font-semibold text-navy">Featured listing</strong>
                      <span className="text-xs text-muted">Highlight this stay in discovery.</span>
                    </div>
                    <ToggleSwitch checked={form.featured} onChange={(checked) => update('featured', checked)} aria-label="Featured listing" />
                  </div>
                </div>
              </div>
            </section>

            {isEdit && <SeasonalPricing propertyId={id} />}
          </div>

          <aside className="space-y-3 rounded-xl border border-border bg-elevated p-5 shadow-sm lg:sticky lg:top-24">
            <header className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">GUEST PREVIEW</span>
                <h2 className="text-base font-semibold text-navy">Listing card</h2>
              </div>
              <Button type="button" color="light" size="sm" onClick={() => setShowFullPreview(true)}>Open</Button>
            </header>
            <PropertyPreview form={form} />
            <p className="text-xs text-muted">This card updates as you edit the listing.</p>
          </aside>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create listing'}
          </Button>
          <Link to="/host/listings" className="text-sm font-semibold text-muted transition-colors hover:text-navy">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

SectionHeader.propTypes = {
  step: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};

// Derive the bed count shown on a card from the bed-variant selection.
// 1-Bed → 1, 2-Bed → 2, both → "1 & 2", neither → the raw Bedrooms field.
function bedLabel(form) {
  const has1 = form.price1Bed !== '' && form.price1Bed != null;
  const has2 = form.price2Bed !== '' && form.price2Bed != null;
  if (has1 && has2) return '1 & 2';
  if (has1) return 1;
  if (has2) return 2;
  return form.bedrooms === '' ? '-' : form.bedrooms;
}

// Derive the bathroom count shown on a card from the bed-variant selection,
// using per-variant bathrooms when set, otherwise falling back to the base.
function bedBathLabel(form) {
  const has1 = form.price1Bed !== '' && form.price1Bed != null;
  const has2 = form.price2Bed !== '' && form.price2Bed != null;
  const b1 = form.bathrooms1Bed !== '' && form.bathrooms1Bed != null ? Number(form.bathrooms1Bed) : null;
  const b2 = form.bathrooms2Bed !== '' && form.bathrooms2Bed != null ? Number(form.bathrooms2Bed) : null;
  if (has1 && has2) {
    const v1 = b1 ?? form.bathrooms;
    const v2 = b2 ?? form.bathrooms;
    return v1 === v2 ? v1 : `${v1} & ${v2}`;
  }
  if (has1) return b1 ?? (form.bathrooms === '' ? '-' : form.bathrooms);
  if (has2) return b2 ?? (form.bathrooms === '' ? '-' : form.bathrooms);
  return form.bathrooms === '' ? '-' : form.bathrooms;
}

// Live preview of the public listing card, driven by the current form values
function PropertyPreview({ form }) {
  const cover = form.images?.[0];
  const price = Number(form.price) || 0;
  // The bed-variant checkboxes drive the card's bed count: a property listed as
  // 1-Bed shows 1, as 2-Bed shows 2, as both shows "1 & 2". Only when neither
  // variant is selected does the raw Bedrooms field apply.
  const bedrooms = bedLabel(form);
  const bathrooms = bedBathLabel(form);
  const area = form.area === '' ? '-' : form.area;

  return (
    <div className="max-w-sm overflow-hidden rounded-xl border border-border bg-elevated shadow-sm">
      <div className="relative">
        {cover ? (
          <img src={cover} alt={form.title || 'Property'} className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center bg-surface text-sm text-muted">No photo yet</div>
        )}
        {form.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-navy-bg">Featured</span>
        )}
        {!form.available && (
          <span className="absolute right-3 top-3 rounded-full bg-navy-bg px-3 py-1 text-[10px] font-semibold text-white">Unavailable</span>
        )}
      </div>

      <div className="space-y-3 p-4">
        <h3 className="text-base font-semibold leading-tight text-navy">{form.title || 'Property title'}</h3>
        <div className="flex items-center text-muted">
          <MapPin className="mr-2 h-4 w-4 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
          <span className="truncate text-sm">{buildLocationLabel(form.location, form.neighborhood) || 'Location'}</span>
        </div>

        <div className="flex items-center justify-between border-y border-border py-3 text-center">
          <div className="flex-1">
            <p className="text-sm font-semibold text-navy">{bedrooms}</p>
            <p className="text-xs text-muted">Beds</p>
          </div>
          <div className="flex-1 border-x border-border">
            <p className="text-sm font-semibold text-navy">{bathrooms}</p>
            <p className="text-xs text-muted">Baths</p>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-navy">{area}</p>
            <p className="text-xs text-muted">Sqft</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-muted">per night</span>
            <div className="text-xl font-bold text-primary-600">KES {price.toLocaleString()}</div>
          </div>
          <span className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-navy-bg">Book Now</span>
        </div>
      </div>
    </div>
  );
}

PropertyPreview.propTypes = {
  form: PropTypes.object.isRequired,
};

// Full property-detail page preview (modal) built from current form values
function FullPagePreview({ form, onClose }) {
  const images = form.images || [];
  const [active, setActive] = useState(0);
  const amenities = linesToArray(form.amenities);
  const nearby = linesToArray(form.nearby);
  const price = Number(form.price) || 0;
  const featured = images[Math.min(active, Math.max(images.length - 1, 0))];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-8 w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-elevated shadow-lg">
        {/* Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-navy-bg px-5 py-3 text-white">
          <span className="text-sm font-semibold">Page preview - not yet saved</span>
          <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close preview">
            <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 md:p-8">
          {/* Title */}
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-navy md:text-3xl">{form.title || 'Property title'}</h1>
          <div className="mb-6 flex items-center text-muted">
            <MapPin className="mr-1 h-5 w-5" strokeWidth={2} aria-hidden="true" />
            {buildLocationLabel(form.location, form.neighborhood) || 'Location'}
          </div>

          {/* Gallery */}
          {images.length > 0 ? (
            <div className="mb-8">
              <img src={featured} alt={form.title} className="h-64 w-full rounded-xl object-cover md:h-[420px]" />
              {images.length > 1 && (
                <div className="mt-3 grid grid-cols-5 gap-2 md:gap-3">
                  {images.slice(0, 5).map((img, i) => (
                    <button
                      type="button"
                      key={img + i}
                      onClick={() => setActive(i)}
                      className={`overflow-hidden rounded-lg transition-all ${active === i ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'}`}
                    >
                      <img src={img} alt={`${form.title} ${i + 1}`} className="h-16 w-full object-cover md:h-20" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-8 flex h-64 w-full items-center justify-center rounded-xl bg-surface text-muted md:h-[420px]">No photos uploaded yet</div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {/* Stats */}
              <div className="mb-6 flex flex-wrap gap-8 border-b border-border pb-6">
                <div>
                  <p className="font-bold text-navy">{bedLabel(form)}</p>
                  <p className="text-sm text-muted">Bedrooms</p>
                </div>
                <div>
                  <p className="font-bold text-navy">{bedBathLabel(form)}</p>
                  <p className="text-sm text-muted">Bathrooms</p>
                </div>
                <div>
                  <p className="font-bold text-navy">{form.area === '' ? '-' : `${form.area} sq ft`}</p>
                  <p className="text-sm text-muted">Area</p>
                </div>
                <div>
                  <p className="font-bold capitalize text-navy">{form.type}</p>
                  <p className="text-sm text-muted">Type</p>
                </div>
              </div>

              {/* Description */}
              <h2 className="mb-3 text-xl font-bold text-navy">About this property</h2>
              <p className="mb-8 whitespace-pre-line leading-relaxed text-charcoal">{form.description || 'No description yet.'}</p>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div className="mb-8">
                  <h2 className="mb-3 text-xl font-bold text-navy">Amenities</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {amenities.map((a, i) => (
                      <div key={i} className="flex items-center text-charcoal">
                        <Check className="mr-2 h-5 w-5 text-primary-600" strokeWidth={2} aria-hidden="true" />
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nearby */}
              {nearby.length > 0 && (
                <div>
                  <h2 className="mb-3 text-xl font-bold text-navy">What&apos;s nearby</h2>
                  <ul className="space-y-2">
                    {nearby.map((n, i) => (
                      <li key={i} className="flex items-center text-charcoal">
                        <MapPin className="mr-2 h-5 w-5 text-primary-600" strokeWidth={2} aria-hidden="true" />
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Booking card */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 rounded-xl border border-border bg-elevated p-6 shadow-sm">
                <span className="text-3xl font-bold text-navy">KES {price.toLocaleString()}</span>
                <span className="text-muted"> / night</span>
                <div className="mt-4 block w-full rounded-full bg-primary py-3 text-center font-bold text-navy-bg">Book Now</div>
                {!form.available && (
                  <p className="mt-3 text-center text-sm font-medium text-red-600">Currently marked unavailable</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

FullPagePreview.propTypes = {
  form: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ---- Seasonal pricing (price rules) - only available once a property exists ----
function SeasonalPricing({ propertyId }) {
  // Price rules are host-scoped; the old admin namespace no longer exists, so
  // there is a single path to read and write here.
  const rulesPath = `/properties/${propertyId}/price-rules`;
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ name: '', start: '', end: '', price: '' });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get(rulesPath);
      setRules(res.data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
    // rulesPath is derived from propertyId, so it already invalidates the
    // callback whenever the property changes; listing propertyId too is redundant.
  }, [rulesPath]);

  useEffect(() => {
    load();
  }, [load]);

  async function addRule(e) {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post(rulesPath, {
        name: draft.name || undefined,
        start: draft.start,
        end: draft.end,
        price: Number(draft.price),
      });
      setDraft({ name: '', start: '', end: '', price: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to add rule');
    }
  }

  async function removeRule(ruleId) {
    try {
      await apiClient.delete(`${rulesPath}/${ruleId}`);
      setRules((r) => r.filter((x) => x.id !== ruleId));
    } catch {
      alert('Failed to delete rule');
    }
  }

  const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <section className={CARD_CLASS}>
      <h2 className="text-base font-semibold text-navy">Seasonal Pricing</h2>
      <p className="mt-1 text-xs text-muted">Override the base nightly price for specific date ranges (e.g. peak season). The base price applies on any date with no rule.</p>

      {error && <Alert color="failure" className="mt-4">{error}</Alert>}

      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading...</p>
      ) : rules.length > 0 ? (
        <div className="mt-4 space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg bg-surface px-4 py-2.5 text-sm">
              <div>
                <span className="font-semibold text-navy">{r.name || 'Rate'}</span>
                <span className="ml-2 text-muted">{fmt(r.start)} &rarr; {fmt(r.end)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-navy">KES {r.price.toLocaleString()}/night</span>
                <button type="button" onClick={() => removeRule(r.id)} className="text-xs font-semibold text-red-600 hover:text-red-800">Remove</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">No seasonal rates yet.</p>
      )}

      <div className="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-1">
          <Label htmlFor="seasonal-name">Name</Label>
          <TextInput id="seasonal-name" placeholder="Peak" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="seasonal-start">From</Label>
          <TextInput id="seasonal-start" type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="seasonal-end">To</Label>
          <TextInput id="seasonal-end" type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="seasonal-price">Price / night</Label>
          <TextInput id="seasonal-price" type="number" min="1" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
        </div>
        <Button type="button" onClick={addRule}>Add rate</Button>
      </div>
    </section>
  );
}

export default AdminPropertyForm;
