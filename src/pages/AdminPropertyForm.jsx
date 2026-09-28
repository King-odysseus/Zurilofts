import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Button, Checkbox, Label, Select, Textarea, TextInput, ToggleSwitch } from 'flowbite-react';
import { Check, Eye, MapPin, Upload, X } from 'lucide-react';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';
import { findSearchLocation, isNairobiSearchLocation, SEARCH_LOCATION_GROUPS } from '../data/searchLocations.js';

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
};

const EDITOR_STEPS = [
  { key: 'basics', label: 'Basics' },
  { key: 'photos', label: 'Photos' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'pricing', label: 'Pricing' },
];

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

function AdminPropertyForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  // Shared between the admin control centre (/admin/*) and the host workspace
  // (/host/*). Build frontend links against the active base so a host never
  // lands on an /admin/* URL. Backend endpoints are unchanged.
  const base = location.pathname.startsWith('/host') ? '/host' : '/admin';

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

    if (payload.images.length === 0) {
      setError('Add at least one image');
      setSaving(false);
      return;
    }

    try {
      if (isEdit) {
        await apiClient.put(`/properties/${id}`, payload);
        navigate(`${base}/properties`);
      } else {
        const res = await apiClient.post('/properties', payload);
        // Go to edit so seasonal pricing & calendar (which need an id) are available
        navigate(`${base}/properties/${res.data.data.id}/edit`);
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
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="op-host-listing-editor">
      <header className="op-host-editor-heading">
        <div>
          <Link to={`${base}/properties`} className="op-host-editor-back">&larr; Listings</Link>
          <p className="op-host-editor-eyebrow">HOST SETUP</p>
          <h1>{isEdit ? 'Edit listing' : 'Create a listing'}</h1>
          <span>Prepare the basics, photos, amenities and pricing guests will see.</span>
        </div>
        <div className="op-host-editor-heading-actions">
          <Button type="button" color="light" className="op-host-editor-outline" onClick={() => setShowFullPreview(true)}>
            <Eye strokeWidth={1.5} aria-hidden="true" />
            Preview listing
          </Button>
          {isEdit && <Link to={`${base}/properties/${id}/calendar`} className="op-host-editor-outline">Manage calendar</Link>}
        </div>
      </header>

      {showFullPreview && (
        <FullPagePreview form={form} onClose={() => setShowFullPreview(false)} />
      )}

      {error && (
        <div className="op-host-editor-error" role="alert">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="op-host-editor-form">
        <div className="op-host-editor-layout">
          <aside className="op-host-editor-progress-panel">
            <div className="op-host-editor-progress-heading">
              <span>Your progress</span>
              <strong>{completedCount} of 4 steps complete</strong>
              <div className="op-host-editor-progress-track" aria-hidden="true">
                <i style={{ width: `${(completedCount / EDITOR_STEPS.length) * 100}%` }} />
              </div>
            </div>
            <nav className="op-host-editor-steps" aria-label="Listing setup steps">
              {EDITOR_STEPS.map((step, index) => {
                const item = completionItems.find((entry) => entry.key === step.key);
                return (
                  <button
                    key={step.key}
                    type="button"
                    className={`${activeStep === step.key ? 'is-active' : ''} ${item?.complete ? 'is-complete' : ''}`}
                    onClick={() => goToStep(step.key)}
                    aria-current={activeStep === step.key ? 'step' : undefined}
                  >
                    <span>{item?.complete ? '✓' : index + 1}</span>
                    <span>
                      <strong>{step.label}</strong>
                      <small>{item?.complete ? 'Complete' : item?.detail || 'Needs attention'}</small>
                    </span>
                  </button>
                );
              })}
            </nav>
            <p className="op-host-editor-autosave">Your progress is saved when you submit this listing.</p>
          </aside>

          <div className="op-host-editor-main">
            <section id="host-editor-basics" className="op-host-editor-card">
              <header>
                <span>Step 1</span>
                <div><h2>Listing basics</h2><p>Tell guests what makes your stay special.</p></div>
              </header>
              <div className="op-host-editor-field-grid">
                <div>
                  <Label htmlFor="listing-title" className="op-host-editor-label">Listing title</Label>
                  <TextInput id="listing-title" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Bright two-bedroom loft" required />
                </div>
                <div>
                  <Label htmlFor="listing-neighborhood" className="op-host-editor-label">Area</Label>
                  <Select id="listing-neighborhood" value={form.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} required>
                    {SEARCH_LOCATION_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map((area) => <option key={`${group.label}-${area}`} value={area}>{area}</option>)}
                      </optgroup>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="listing-location" className="op-host-editor-label">Location details</Label>
                  <TextInput id="listing-location" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Street, building or landmark" required />
                </div>
                <div className="op-host-editor-field-full">
                  <Label htmlFor="listing-description" className="op-host-editor-label">Description</Label>
                  <Textarea id="listing-description" rows={5} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Share the layout, views and details guests should know before booking." required />
                </div>
              </div>
            </section>

            <section id="host-editor-photos" className="op-host-editor-card">
              <header>
                <span>Step 2</span>
                <div><h2>Photos</h2><p>Add clear, well-lit images. The first photo becomes the cover.</p></div>
              </header>
              {form.images.length > 0 && (
                <div className="op-host-editor-photo-grid">
                  {form.images.map((src, i) => (
                    <div key={src + i} className="op-host-editor-photo">
                      <img src={src} alt={`Property photo ${i + 1}`} />
                      {i === 0 && <span>Cover</span>}
                      <button type="button" onClick={() => removeImage(i)} aria-label="Remove image">
                        <X strokeWidth={2} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className={`op-host-editor-upload ${uploading ? 'is-uploading' : ''}`}>
                {uploading ? (
                  <>
                    <span className="op-host-editor-spinner" aria-hidden="true" />
                    <strong>Uploading and optimizing...</strong>
                  </>
                ) : (
                  <>
                    <Upload strokeWidth={1.5} aria-hidden="true" />
                    <strong>Add photos</strong>
                    <span>JPEG, PNG or WebP. Up to 10 at a time.</span>
                  </>
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} disabled={uploading} />
              </label>
            </section>

            <section id="host-editor-amenities" className="op-host-editor-card">
              <header>
                <span>Step 3</span>
                <div><h2>Amenities and rules</h2><p>List the essentials and useful places around the stay.</p></div>
              </header>
              <div className="op-host-editor-field-grid">
                <div>
                  <Label htmlFor="listing-amenities" className="op-host-editor-label">Amenities</Label>
                  <Textarea id="listing-amenities" rows={5} placeholder={'WiFi\nPool\nParking'} value={form.amenities} onChange={(e) => update('amenities', e.target.value)} />
                  <small className="op-host-editor-help">Enter one item per line.</small>
                </div>
                <div>
                  <Label htmlFor="listing-nearby" className="op-host-editor-label">What&apos;s nearby</Label>
                  <Textarea id="listing-nearby" rows={5} placeholder={'Airport - 20 min\nVillage Market - 8 min'} value={form.nearby} onChange={(e) => update('nearby', e.target.value)} />
                  <small className="op-host-editor-help">Enter one item per line.</small>
                </div>
              </div>
            </section>

            <section id="host-editor-pricing" className="op-host-editor-card">
          <header>
            <span>Step 4</span>
            <div><h2>Pricing and availability</h2><p>Set the nightly rate, capacity and booking state.</p></div>
          </header>
              <div className="op-host-editor-field-grid op-host-editor-field-grid-four">
                <div>
                  <Label htmlFor="listing-price" className="op-host-editor-label">Base price / night (KES)</Label>
                  <TextInput id="listing-price" type="number" min="1" value={form.price} onChange={(e) => update('price', e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="listing-area" className="op-host-editor-label">Area (sq ft)</Label>
                  <TextInput id="listing-area" type="number" min="1" value={form.area} onChange={(e) => update('area', e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="listing-bedrooms" className="op-host-editor-label">Bedrooms</Label>
                  <TextInput id="listing-bedrooms" type="number" min="0" value={form.bedrooms} onChange={(e) => update('bedrooms', e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="listing-bathrooms" className="op-host-editor-label">Bathrooms</Label>
                  <TextInput id="listing-bathrooms" type="number" min="0" value={form.bathrooms} onChange={(e) => update('bathrooms', e.target.value)} required />
                </div>
              </div>

              <div className="op-host-editor-subpanel">
                <div className="op-host-editor-subpanel-heading">
                  <h3>Bed size options</h3>
                  <p>Add a one-bed or two-bed rate when the same stay can be booked at different capacities.</p>
                </div>
                <div className="op-host-editor-variant-grid">
                  <div className={`op-host-editor-variant ${form.price1Bed !== '' ? 'is-selected' : ''}`}>
                    <Checkbox
                      id="listing-variant-1"
                      checked={form.price1Bed !== ''}
                      onChange={(e) => {
                        update('price1Bed', e.target.checked ? (form.price || '') : '');
                        if (!e.target.checked) update('bathrooms1Bed', '');
                      }}
                    />
                    <div>
                      <Label htmlFor="listing-variant-1">List as 1-bed</Label>
                      <span>Appears as a separate one-bedroom option.</span>
                      {form.price1Bed !== '' && (
                        <div className="op-host-editor-variant-fields">
                          <TextInput type="number" min="1" placeholder="Price per night" value={form.price1Bed} onChange={(e) => update('price1Bed', e.target.value)} required />
                          <TextInput type="number" min="0" placeholder="Bathrooms" value={form.bathrooms1Bed} onChange={(e) => update('bathrooms1Bed', e.target.value)} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`op-host-editor-variant ${form.price2Bed !== '' ? 'is-selected' : ''}`}>
                    <Checkbox
                      id="listing-variant-2"
                      checked={form.price2Bed !== ''}
                      onChange={(e) => {
                        update('price2Bed', e.target.checked ? (form.price || '') : '');
                        if (!e.target.checked) update('bathrooms2Bed', '');
                      }}
                    />
                    <div>
                      <Label htmlFor="listing-variant-2">List as 2-bed</Label>
                      <span>Appears as a separate two-bedroom option.</span>
                      {form.price2Bed !== '' && (
                        <div className="op-host-editor-variant-fields">
                          <TextInput type="number" min="1" placeholder="Price per night" value={form.price2Bed} onChange={(e) => update('price2Bed', e.target.value)} required />
                          <TextInput type="number" min="0" placeholder="Bathrooms" value={form.bathrooms2Bed} onChange={(e) => update('bathrooms2Bed', e.target.value)} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="op-host-editor-field-grid">
                <div>
                  <Label htmlFor="listing-type" className="op-host-editor-label">Property type</Label>
                  <Select id="listing-type" value={form.type} onChange={(e) => update('type', e.target.value)}>
                    <option value="apartment">Apartment</option>
                    <option value="studio">Studio</option>
                    <option value="penthouse">Penthouse</option>
                  </Select>
                </div>
                <div className="op-host-editor-toggle-stack">
                  <div className="op-host-editor-toggle">
                    <div><strong>Available for bookings</strong><span>Guests can reserve open dates.</span></div>
                    <ToggleSwitch checked={form.available} onChange={(checked) => update('available', checked)} aria-label="Available for bookings" />
                  </div>
                  <div className="op-host-editor-toggle">
                    <div><strong>Featured listing</strong><span>Highlight this stay in discovery.</span></div>
                    <ToggleSwitch checked={form.featured} onChange={(checked) => update('featured', checked)} aria-label="Featured listing" />
                  </div>
                </div>
              </div>
            </section>

            {isEdit && <SeasonalPricing propertyId={id} />}
          </div>

          <aside className="op-host-editor-preview-panel">
            <header>
              <div><span>GUEST PREVIEW</span><h2>Listing card</h2></div>
              <Button type="button" color="light" onClick={() => setShowFullPreview(true)}>Open</Button>
            </header>
            <PropertyPreview form={form} />
            <p>This card updates as you edit the listing.</p>
          </aside>
        </div>

        <div className="op-host-editor-actions">
          <Button type="submit" disabled={saving} className="op-host-editor-save">
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create listing'}
          </Button>
          <Link to={`${base}/properties`}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}

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

// Live preview of the public PropertyCard, driven by the current form values
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
    <div className="bg-white rounded-2xl shadow-md border border-[#D9D9D9] overflow-hidden max-w-sm">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f0f0f0]">
        {cover ? (
          <img src={cover} alt={form.title || 'Property'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#6b7280] text-sm">No photo yet</div>
        )}
        {form.featured && (
          <span className="absolute top-4 left-4 bg-[#C49A6C] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">Featured</span>
        )}
        {!form.available && (
          <span className="absolute top-4 right-4 bg-[#0B0B45] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">Unavailable</span>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-[#1f2937] leading-tight">{form.title || 'Property title'}</h3>
        <div className="flex items-center text-[#6b7280] mt-1 mb-3">
          <MapPin className="w-4 h-4 mr-2 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
          <span className="text-sm truncate">{buildLocationLabel(form.location, form.neighborhood) || 'Location'}</span>
        </div>

        <div className="flex items-center justify-between mb-3 py-3 border-y border-[#D9D9D9] text-center">
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#0B0B45]">{bedrooms}</p>
            <p className="text-xs text-[#6b7280]">Beds</p>
          </div>
          <div className="flex-1 border-x border-[#D9D9D9]">
            <p className="text-sm font-semibold text-[#0B0B45]">{bathrooms}</p>
            <p className="text-xs text-[#6b7280]">Baths</p>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#0B0B45]">{area}</p>
            <p className="text-xs text-[#6b7280]">Sqft</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-[#6b7280]">per night</span>
            <div className="text-xl font-bold text-[#C49A6C]">KES {price.toLocaleString()}</div>
          </div>
          <span className="bg-[#C49A6C] text-white font-semibold px-4 py-2 rounded-full text-sm">Book Now</span>
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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl my-8 shadow-2xl overflow-hidden">
        {/* Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#0B0B45] text-white px-5 py-3">
          <span className="text-sm font-semibold">Page preview - not yet saved</span>
          <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close preview">
            <X className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 md:p-8">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-[#0B0B45] mb-1">{form.title || 'Property title'}</h1>
          <div className="flex items-center text-[#6b7280] mb-6">
            <MapPin className="w-5 h-5 mr-1" strokeWidth={2} aria-hidden="true" />
            {buildLocationLabel(form.location, form.neighborhood) || 'Location'}
          </div>

          {/* Gallery */}
          {images.length > 0 ? (
            <div className="mb-8">
              <img src={featured} alt={form.title} className="w-full h-64 md:h-[420px] object-cover rounded-2xl" />
              {images.length > 1 && (
                <div className="grid grid-cols-5 gap-2 md:gap-3 mt-3">
                  {images.slice(0, 5).map((img, i) => (
                    <button
                      type="button"
                      key={img + i}
                      onClick={() => setActive(i)}
                      className={`overflow-hidden rounded-xl transition-all ${active === i ? 'ring-2 ring-[#C49A6C]' : 'opacity-70 hover:opacity-100'}`}
                    >
                      <img src={img} alt={`${form.title} ${i + 1}`} className="w-full h-16 md:h-20 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-8 w-full h-64 md:h-[420px] rounded-2xl bg-[#f0f0f0] flex items-center justify-center text-[#6b7280]">No photos uploaded yet</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {/* Stats */}
              <div className="flex flex-wrap gap-8 pb-6 mb-6 border-b border-[#D9D9D9]">
                <div>
                  <p className="font-bold text-[#0B0B45]">{bedLabel(form)}</p>
                  <p className="text-sm text-[#6b7280]">Bedrooms</p>
                </div>
                <div>
                  <p className="font-bold text-[#0B0B45]">{bedBathLabel(form)}</p>
                  <p className="text-sm text-[#6b7280]">Bathrooms</p>
                </div>
                <div>
                  <p className="font-bold text-[#0B0B45]">{form.area === '' ? '-' : `${form.area} sq ft`}</p>
                  <p className="text-sm text-[#6b7280]">Area</p>
                </div>
                <div>
                  <p className="font-bold text-[#0B0B45] capitalize">{form.type}</p>
                  <p className="text-sm text-[#6b7280]">Type</p>
                </div>
              </div>

              {/* Description */}
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">About this property</h2>
              <p className="text-[#1f2937] leading-relaxed whitespace-pre-line mb-8">{form.description || 'No description yet.'}</p>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-[#0B0B45] mb-3">Amenities</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {amenities.map((a, i) => (
                      <div key={i} className="flex items-center text-[#1f2937]">
                        <Check className="w-5 h-5 text-[#C49A6C] mr-2" strokeWidth={2} aria-hidden="true" />
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nearby */}
              {nearby.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-[#0B0B45] mb-3">What&apos;s nearby</h2>
                  <ul className="space-y-2">
                    {nearby.map((n, i) => (
                      <li key={i} className="flex items-center text-[#1f2937]">
                        <MapPin className="w-5 h-5 text-[#C49A6C] mr-2" strokeWidth={2} aria-hidden="true" />
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Booking card */}
            <div className="lg:col-span-1">
              <div className="border border-[#D9D9D9] rounded-2xl p-6 sticky top-20">
                <span className="text-3xl font-bold text-[#0B0B45]">KES {price.toLocaleString()}</span>
                <span className="text-[#6b7280]"> / night</span>
                <div className="block w-full bg-[#C49A6C] text-white font-bold py-3 rounded-xl text-center mt-4">Book Now</div>
                {!form.available && (
                  <p className="text-center text-sm text-red-600 mt-3 font-medium">Currently marked unavailable</p>
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
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ name: '', start: '', end: '', price: '' });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get(`/admin/properties/${propertyId}/price-rules`);
      setRules(res.data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addRule(e) {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post(`/admin/properties/${propertyId}/price-rules`, {
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
      await apiClient.delete(`/admin/properties/${propertyId}/price-rules/${ruleId}`);
      setRules((r) => r.filter((x) => x.id !== ruleId));
    } catch {
      alert('Failed to delete rule');
    }
  }

  const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="bg-white rounded-2xl border border-[#D9D9D9] p-6">
      <h2 className="text-lg font-bold text-[#0B0B45] mb-1">Seasonal Pricing</h2>
      <p className="text-sm text-[#6b7280] mb-4">Override the base nightly price for specific date ranges (e.g. peak season). The base price applies on any date with no rule.</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 mb-4 text-sm">{error}</div>}

      {loading ? (
        <p className="text-sm text-[#6b7280]">Loading...</p>
      ) : rules.length > 0 ? (
        <div className="space-y-2 mb-4">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-[#f8f9fa] rounded-xl px-4 py-2.5 text-sm">
              <div>
                <span className="font-semibold text-[#0B0B45]">{r.name || 'Rate'}</span>
                <span className="text-[#6b7280] ml-2">{fmt(r.start)} &rarr; {fmt(r.end)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#0B0B45]">KES {r.price.toLocaleString()}/night</span>
                <button type="button" onClick={() => removeRule(r.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Remove</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#6b7280] mb-4">No seasonal rates yet.</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div className="col-span-2 md:col-span-1">
          <Label htmlFor="seasonal-name" className="op-host-editor-label">Name</Label>
          <TextInput id="seasonal-name" placeholder="Peak" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="seasonal-start" className="op-host-editor-label">From</Label>
          <TextInput id="seasonal-start" type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="seasonal-end" className="op-host-editor-label">To</Label>
          <TextInput id="seasonal-end" type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="seasonal-price" className="op-host-editor-label">Price / night</Label>
          <TextInput id="seasonal-price" type="number" min="1" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
        </div>
        <Button type="button" color="dark" onClick={addRule} className="op-host-editor-rule-add">Add rate</Button>
      </div>
    </div>
  );
}

export default AdminPropertyForm;
