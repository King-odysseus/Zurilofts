import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Dropdown from '../components/Dropdown.jsx';
import PropertyLocationPicker from '../components/PropertyLocationPicker.jsx';
import apiClient from '../api/client.js';

const EMPTY = {
  title: '',
  location: '',
  lat: null,
  lng: null,
  address: '',
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

const labelCls = 'mb-2 block text-sm font-medium text-[#0B1F42]';
const inputCls =
  'h-12 w-full rounded-[10px] border-0 bg-[#F7F4EF] px-3 text-sm text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40';

// textarea where each non-empty line is one array item
function linesToArray(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await apiClient.get(`/properties/${id}`);
        const p = res.data.data;
        setForm({
          title: p.title || '',
          location: p.location || '',
          lat: p.lat ?? null,
          lng: p.lng ?? null,
          address: p.address || '',
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
      location: form.location,
      price: Number(form.price),
      // Pin-confirmed coordinates + address. Only sent when present (null would
      // fail zod's optional-number check on update).
      ...(Number.isFinite(form.lat) && Number.isFinite(form.lng)
        ? { lat: Number(form.lat), lng: Number(form.lng) }
        : {}),
      ...(form.address ? { address: form.address } : {}),
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

    // New listings must pin their exact location so guests can get directions.
    // Edits to legacy listings without a pin are still allowed to save.
    if (!isEdit && (form.lat == null || form.lng == null)) {
      setError('Confirm the exact property location by dropping a pin on the map.');
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#C49A6C] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-[#E3E8EF] bg-white px-5 py-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)] sm:flex-row sm:items-center sm:px-6">
        <div>
          <Link to={`${base}/properties`} className="text-sm font-semibold text-[#52606F] transition-colors hover:text-[#C49A6C]">&larr; Back to properties</Link>
          <h1 className="mt-1 text-2xl font-bold text-[#0B1F42]">{isEdit ? 'Edit Property' : 'Add Property'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFullPreview(true)}
            className="flex min-h-[44px] items-center rounded-lg bg-[#0B1F42] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#07072E]"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview page
          </button>
          {isEdit && (
            <Link
              to={`${base}/properties/${id}/calendar`}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-[#E3E8EF] px-4 text-sm font-semibold text-[#0B1F42] transition-colors hover:bg-[#F7F4EF]"
            >
              Manage Calendar &rarr;
            </Link>
          )}
        </div>
      </div>

      {showFullPreview && (
        <FullPagePreview form={form} onClose={() => setShowFullPreview(false)} />
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">{error}</div>
      )}

      <nav className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Listing editor sections">
        {[
          ['Basics', '#listing-basics'], ['Photos', '#listing-photos'], ['Location', '#listing-location'],
          ['Amenities', '#listing-amenities'], ['Pricing', '#listing-pricing'], ['Review', '#listing-review'],
        ].map(([label, href], index) => (
          <a key={label} href={href} className="flex min-h-[44px] items-center gap-2 rounded-[10px] border border-[#E3E8EF] bg-white px-3 py-2 shadow-sm hover:border-[#C49A6C]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FDE8D8] text-xs font-bold text-[#9A4A1D]">{index + 1}</span>
            <span className="text-xs font-semibold text-[#0B1F42] sm:text-sm">{label}</span>
          </a>
        ))}
      </nav>
      <div className="mb-6 rounded-2xl border border-[#E3E8EF] bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-bold text-[#0B1F42]">Publish readiness</p><p className="mt-1 text-xs text-[#52606F]">Complete the essentials below before sending your listing for review.</p></div>
          <span className="rounded-full bg-[#FDE8D8] px-3 py-1 text-xs font-semibold text-[#9A4A1D]">Draft workspace</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[['Title and location', Boolean(form.title && form.location)], ['Pricing and capacity', Boolean(form.price && form.bedrooms !== '' && form.bathrooms !== '')], ['Photos and description', Boolean((form.images || []).length && form.description)]].map(([label, complete]) => (
            <div key={label} className="flex items-center gap-2 text-xs font-medium text-[#5B6B82]">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${complete ? 'bg-[#E8F4EC] text-[#287A45]' : 'bg-[#F7F4EF] text-[#5B6B82]'}`}>{complete ? '✓' : '·'}</span>
              {label}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div id="listing-basics" className="scroll-mt-24 space-y-5 rounded-2xl border border-[#E3E8EF] bg-white p-6 shadow-[0_8px_28px_rgba(11,31,66,0.08)]">
          <div>
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={form.title} onChange={(e) => update('title', e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input className={inputCls} value={form.location} onChange={(e) => update('location', e.target.value)} required />
          </div>
          <div id="listing-location" className="scroll-mt-24 rounded-2xl bg-[#F7F4EF] p-4 sm:p-5">
            <p className="text-sm font-semibold text-[#0B1F42]">Confirm exact location on a map</p>
            <p className="mb-3 text-xs text-[#52606F]">
              Drop a pin at the property&apos;s entrance. Guests see this pin and can open it in Google Maps for directions.
            </p>
            <PropertyLocationPicker
              lat={form.lat}
              lng={form.lng}
              address={form.address}
              onChange={(part) => setForm((f) => ({ ...f, ...part }))}
            />
            {form.lat != null && form.lng != null && (
              <p className="text-xs text-[#5B6B82] mt-2">Coordinates: {Number(form.lat).toFixed(5)}, {Number(form.lng).toFixed(5)}</p>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Base Price/Night (KES)</label>
              <input type="number" min="1" className={inputCls} value={form.price} onChange={(e) => update('price', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Area (sqft)</label>
              <input type="number" min="1" className={inputCls} value={form.area} onChange={(e) => update('area', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Bedrooms</label>
              <input type="number" min="0" className={inputCls} value={form.bedrooms} onChange={(e) => update('bedrooms', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Bathrooms</label>
              <input type="number" min="0" className={inputCls} value={form.bathrooms} onChange={(e) => update('bathrooms', e.target.value)} required />
            </div>
          </div>

          {/* Bed variant pricing */}
          <div id="listing-pricing" className="scroll-mt-24 bg-canvas rounded-xl p-4 space-y-4">
            <p className="text-sm font-semibold text-[#0B1F42]">Bed Variant Pricing &amp; Bathrooms</p>
            <p className="-mt-3 text-xs text-[#5B6B82]">Each variant can have its own price and bathroom count. Leave unchecked to not list.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 bg-white rounded-[10px] shadow-[0_8px_28px_rgba(11,31,66,0.08)] p-4 cursor-pointer hover:shadow-[0_10px_30px_rgba(196,154,108,0.18)] transition-all duration-200">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 flex-shrink-0 accent-[#C49A6C]"
                  checked={form.price1Bed !== ''}
                  onChange={(e) => {
                    update('price1Bed', e.target.checked ? (form.price || '') : '');
                    if (!e.target.checked) update('bathrooms1Bed', '');
                  }}
                />
                <div className="flex-1">
                  <span className="block text-sm font-semibold text-[#0B1F42]">List as 1-Bed</span>
                  <span className="block text-xs text-[#5B6B82] mb-2">Appears as a separate 1-bed card</span>
                  {form.price1Bed !== '' && (
                    <div className="space-y-3">
                      <input
                        type="number"
                        min="1"
                        placeholder="1-Bed price per night"
                        className={inputCls}
                        value={form.price1Bed}
                        onChange={(e) => update('price1Bed', e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Bathrooms (e.g. 1)"
                        className={inputCls}
                        value={form.bathrooms1Bed}
                        onChange={(e) => update('bathrooms1Bed', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </label>
              <label className="flex items-start gap-3 bg-white rounded-[10px] shadow-[0_8px_28px_rgba(11,31,66,0.08)] p-4 cursor-pointer hover:shadow-[0_10px_30px_rgba(196,154,108,0.18)] transition-all duration-200">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 flex-shrink-0 accent-[#C49A6C]"
                  checked={form.price2Bed !== ''}
                  onChange={(e) => {
                    update('price2Bed', e.target.checked ? (form.price || '') : '');
                    if (!e.target.checked) update('bathrooms2Bed', '');
                  }}
                />
                <div className="flex-1">
                  <span className="block text-sm font-semibold text-[#0B1F42]">List as 2-Bed</span>
                  <span className="block text-xs text-[#5B6B82] mb-2">Appears as a separate 2-bed card</span>
                  {form.price2Bed !== '' && (
                    <div className="space-y-3">
                      <input
                        type="number"
                        min="1"
                        placeholder="2-Bed price per night"
                        className={inputCls}
                        value={form.price2Bed}
                        onChange={(e) => update('price2Bed', e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Bathrooms (e.g. 2)"
                        className={inputCls}
                        value={form.bathrooms2Bed}
                        onChange={(e) => update('bathrooms2Bed', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type</label>
              <Dropdown
                value={form.type}
                onChange={(v) => update('type', v)}
                options={[
                  { value: 'apartment', label: 'Apartment' },
                  { value: 'studio', label: 'Studio' },
                  { value: 'penthouse', label: 'Penthouse' },
                ]}
                triggerClassName={inputCls}
                ariaLabel="Property type"
              />
            </div>
            <div className="flex items-end gap-6 pb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#0B1F42]">
                <input type="checkbox" checked={form.available} onChange={(e) => update('available', e.target.checked)} className="h-4 w-4 accent-[#C49A6C]" />
                Available
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-[#0B1F42]">
                <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} className="h-4 w-4 accent-[#C49A6C]" />
                Featured
              </label>
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea rows={4} className={inputCls} value={form.description} onChange={(e) => update('description', e.target.value)} required />
          </div>
        </div>

        <div id="listing-photos" className="scroll-mt-24 space-y-5 rounded-2xl border border-[#E3E8EF] bg-white p-6 shadow-sm">
          <div>
            <label className={labelCls}>Photos</label>
            <p className="text-sm text-[#5B6B82] mb-3">Upload images from your device. They&apos;re automatically resized and compressed for the website. The first photo is used as the cover.</p>

            {form.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {form.images.map((src, i) => (
                  <div key={src + i} className="relative group aspect-[4/3] rounded-xl overflow-hidden shadow-sm">
                    <img src={src} alt={`Property photo ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-[#C49A6C] px-2 py-0.5 text-[10px] font-bold text-white">Cover</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      aria-label="Remove image"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E3E8EF] py-8 transition-colors hover:border-[#C49A6C] hover:bg-[#FDE8D8]/40 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
              {uploading ? (
                <>
                  <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#C49A6C] border-t-transparent"></div>
                  <span className="text-sm text-[#5B6B82]">Uploading & optimizing...</span>
                </>
              ) : (
                <>
                    <svg className="mb-2 h-8 w-8 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm font-semibold text-[#0B1F42]">Click to upload photos</span>
                  <span className="text-xs text-[#5B6B82] mt-1">JPEG, PNG or WebP · up to 10 at a time</span>
                </>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
            </label>
          </div>

          <div id="listing-amenities" className="scroll-mt-24 grid grid-cols-1 md:grid-cols-2 gap-4">
            <p className="md:col-span-2 text-sm text-[#5B6B82] -mb-1">Enter one item per line.</p>
            <div>
              <label className={labelCls}>Amenities</label>
              <textarea rows={4} className={inputCls} placeholder="WiFi&#10;Pool" value={form.amenities} onChange={(e) => update('amenities', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Nearby</label>
              <textarea rows={4} className={inputCls} placeholder="Airport - 20min" value={form.nearby} onChange={(e) => update('nearby', e.target.value)} />
            </div>
          </div>
        </div>

        {isEdit && (
          <div className="space-y-6">
            <SeasonalPricing propertyId={id} />
            <AutomatedMessages propertyId={id} />
          </div>
        )}

        <div id="listing-review" className="sticky bottom-4 z-20 flex scroll-mt-24 items-center gap-3 rounded-2xl border border-[#E3E8EF] bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#C49A6C] text-white font-semibold min-h-[44px] px-6 py-2.5 rounded-lg hover:bg-[#B8895C] transition-all duration-200 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Property'}
          </button>
          <Link to={`${base}/properties`} className="inline-flex min-h-[44px] items-center rounded-lg border border-[#E3E8EF] px-6 font-semibold text-[#0B1F42] hover:bg-[#F7F4EF]">Cancel</Link>
        </div>
      </form>

      {/* Live preview - collapsible drawer docked to the right edge */}
      <button
        type="button"
        onClick={() => setPreviewOpen((o) => !o)}
        aria-label={previewOpen ? 'Hide preview' : 'Show preview'}
        className={`fixed top-1/2 -translate-y-1/2 z-40 bg-[#C49A6C] text-white px-2 py-4 rounded-l-xl shadow-lg hover:bg-[#B8895C] transition-all duration-300 ${
          previewOpen ? 'right-[372px]' : 'right-0'
        }`}
        style={{ writingMode: 'vertical-rl' }}
      >
        <span className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          <svg className={`w-4 h-4 transition-transform ${previewOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ writingMode: 'horizontal-tb' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {previewOpen ? 'Hide preview' : 'Live preview'}
        </span>
      </button>

      <aside
        className={`fixed top-0 right-0 z-30 h-full w-[372px] max-w-[90vw] bg-canvas shadow-2xl transition-transform duration-300 overflow-y-auto ${
          previewOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[#0B1F42]">Live preview</p>
            <button type="button" onClick={() => setPreviewOpen(false)} className="text-[#5B6B82] hover:text-[#0B1F42]" aria-label="Collapse preview">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <PropertyPreview form={form} />
          <p className="text-xs text-[#5B6B82] mt-3">This is how the property appears as a card on the website. It updates as you edit.</p>
        </div>
      </aside>
    </div>
  );
}

// Derive the bed count shown on a card from the bed-variant selection.
// 1-Bed -> 1, 2-Bed -> 2, both -> "1 & 2", neither -> the raw Bedrooms field.
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
    <div className="bg-white rounded-[14px] shadow-md overflow-hidden max-w-sm">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F7F4EF]">
        {cover ? (
          <img src={cover} alt={form.title || 'Property'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#5B6B82] text-sm">No photo yet</div>
        )}
        {form.featured && (
          <span className="absolute top-4 left-4 bg-[#0B1F42] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">Featured</span>
        )}
        {!form.available && (
          <span className="absolute top-4 right-4 bg-[#5B6B82] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">Unavailable</span>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-[#0B1F42] leading-tight">{form.title || 'Property title'}</h3>
        <div className="flex items-center text-[#5B6B82] mt-1 mb-3">
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm truncate">{form.location || 'Location'}</span>
        </div>

        <div className="flex items-center justify-between mb-3 py-3 border-y border-[#E3E8EF] text-center">
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#0B1F42]">{bedrooms}</p>
            <p className="text-xs text-[#5B6B82]">Beds</p>
          </div>
          <div className="flex-1 border-x border-[#E3E8EF]">
            <p className="text-sm font-semibold text-[#0B1F42]">{bathrooms}</p>
            <p className="text-xs text-[#5B6B82]">Baths</p>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#0B1F42]">{area}</p>
            <p className="text-xs text-[#5B6B82]">Sqft</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5B6B82]">per night</span>
            <div className="text-xl font-bold text-[#0B1F42]">KES {price.toLocaleString()}</div>
          </div>
          <span className="bg-[#C49A6C] text-white font-semibold px-4 py-2 rounded-lg text-sm">Book Now</span>
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
      <div className="bg-white rounded-[14px] w-full max-w-5xl my-8 shadow-2xl overflow-hidden">
        {/* Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-[#E5E7EB] text-[#222222] px-5 py-3">
          <span className="text-sm font-semibold">Page preview - not yet saved</span>
          <button onClick={onClose} className="text-[#6b7280] hover:text-[#222222]" aria-label="Close preview">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 md:p-8">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-[#222222] mb-1">{form.title || 'Property title'}</h1>
          <div className="flex items-center text-[#6b7280] mb-6">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {form.location || 'Location'}
          </div>

          {/* Gallery */}
          {images.length > 0 ? (
            <div className="mb-8">
              <img src={featured} alt={form.title} className="w-full h-64 md:h-[420px] object-cover rounded-[14px]" />
              {images.length > 1 && (
                <div className="grid grid-cols-5 gap-2 md:gap-3 mt-3">
                  {images.slice(0, 5).map((img, i) => (
                    <button
                      type="button"
                      key={img + i}
                      onClick={() => setActive(i)}
                      className={`overflow-hidden rounded-[10px] transition-all ${active === i ? 'ring-2 ring-[#C49A6C]' : 'opacity-70 hover:opacity-100'}`}
                    >
                      <img src={img} alt={`${form.title} ${i + 1}`} className="w-full h-16 md:h-20 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-8 w-full h-64 md:h-[420px] rounded-[14px] bg-[#f0f0f0] flex items-center justify-center text-[#6b7280]">No photos uploaded yet</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {/* Stats */}
              <div className="flex flex-wrap gap-8 pb-6 mb-6 border-b border-[#E5E7EB]">
                <div>
                  <p className="font-bold text-[#222222]">{bedLabel(form)}</p>
                  <p className="text-sm text-[#6b7280]">Bedrooms</p>
                </div>
                <div>
                  <p className="font-bold text-[#222222]">{bedBathLabel(form)}</p>
                  <p className="text-sm text-[#6b7280]">Bathrooms</p>
                </div>
                <div>
                  <p className="font-bold text-[#222222]">{form.area === '' ? '-' : `${form.area} sq ft`}</p>
                  <p className="text-sm text-[#6b7280]">Area</p>
                </div>
                <div>
                  <p className="font-bold text-[#222222] capitalize">{form.type}</p>
                  <p className="text-sm text-[#6b7280]">Type</p>
                </div>
              </div>

              {/* Description */}
              <h2 className="text-xl font-bold text-[#222222] mb-3">About this property</h2>
              <p className="text-[#222222] leading-relaxed whitespace-pre-line mb-8">{form.description || 'No description yet.'}</p>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-[#222222] mb-3">Amenities</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {amenities.map((a, i) => (
                      <div key={i} className="flex items-center text-[#222222]">
                        <svg className="w-5 h-5 text-[#9A744A] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nearby */}
              {nearby.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-[#222222] mb-3">What&apos;s nearby</h2>
                  <ul className="space-y-2">
                    {nearby.map((n, i) => (
                      <li key={i} className="flex items-center text-[#222222]">
                        <svg className="w-5 h-5 text-[#9A744A] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Booking card */}
            <div className="lg:col-span-1">
              <div className="rounded-[14px] p-6 sticky top-20 shadow-sm bg-white">
                <span className="text-3xl font-bold text-[#222222]">KES {price.toLocaleString()}</span>
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
    } catch (err) {
      console.error(err);
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
    <div className="bg-white rounded-[14px] p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#222222] mb-1">Seasonal Pricing</h2>
      <p className="text-sm text-[#6b7280] mb-4">Override the base nightly price for specific date ranges (e.g. peak season). The base price applies on any date with no rule.</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 mb-4 text-sm">{error}</div>}

      {loading ? (
        <p className="text-sm text-[#6b7280]">Loading...</p>
      ) : rules.length > 0 ? (
        <div className="space-y-2 mb-4">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-canvas rounded-xl px-4 py-2.5 text-sm">
              <div>
                <span className="font-semibold text-[#222222]">{r.name || 'Rate'}</span>
                <span className="text-[#6b7280] ml-2">{fmt(r.start)} &rarr; {fmt(r.end)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#222222]">KES {r.price.toLocaleString()}/night</span>
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
          <label className={labelCls}>Name</label>
          <input className={inputCls} placeholder="Peak" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>From</label>
          <input type="date" className={inputCls} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>To</label>
          <input type="date" className={inputCls} value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Price/Night</label>
          <input type="number" min="1" className={inputCls} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
        </div>
        <button type="button" onClick={addRule} className="bg-[#C49A6C] text-white font-semibold min-h-[44px] px-4 rounded-lg hover:bg-[#B8895C] transition-colors">Add</button>
      </div>
    </div>
  );
}

// Placeholders hosts can drop into an automated message. Rendered server-side
// against each booking; unknown tokens are left as-is so text stays safe.
const MESSAGE_TOKENS = [
  '{guestFirstName}',
  '{guestName}',
  '{hostFirstName}',
  '{property}',
  '{location}',
  '{neighborhood}',
  '{address}',
  '{checkIn}',
  '{checkOut}',
  '{guests}',
  '{nights}',
  '{totalKes}',
  '{daysUntilCheckIn}',
  '{checkInTime}',
  '{checkOutTime}',
];

function Toggle({ on, onClick, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-[#0B1F42]' : 'bg-[#E3E8EF]'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`}
      />
    </button>
  );
}

Toggle.propTypes = {
  on: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};

function AutomatedMessages({ propertyId }) {
  // trigger -> { label, description, offsetLabel }
  const [meta, setMeta] = useState({});
  // Canonical order from the server: full 5-trigger set, defaults merged in.
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get(`/properties/${propertyId}/auto-messages`);
      setMeta(res.data.data?.triggers || {});
      setRows(res.data.data?.templates || []);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load automated messages');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  function patchRow(trigger, patch) {
    setRows((rs) => rs.map((r) => (r.trigger === trigger ? { ...r, ...patch } : r)));
    setDirty(true);
    setError('');
  }

  function insertToken(trigger, token) {
    setRows((rs) =>
      rs.map((r) => (r.trigger === trigger ? { ...r, body: `${r.body}${r.body ? ' ' : ''}${token}` } : r))
    );
    setDirty(true);
    setError('');
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const res = await apiClient.put(`/properties/${propertyId}/auto-messages`, {
        templates: rows.map((r) => ({
          trigger: r.trigger,
          enabled: r.enabled,
          offsetDays: meta[r.trigger]?.offsetLabel ? (r.offsetDays ?? null) : null,
          body: r.body,
        })),
      });
      setRows(res.data.data?.templates || rows);
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to save automated messages');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-[14px] p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h2 className="text-lg font-bold text-[#222222]">Automated Messages</h2>
          <p className="text-sm text-[#6b7280] max-w-2xl">
            Send your guests helpful messages automatically as their booking progresses. Each message is delivered
            to the booking&apos;s chat thread from your account. Write in your own voice, or start from a template
            and drop in placeholders like {'{guestFirstName}'} or {'{checkIn}'}.
          </p>
        </div>
        {!loading && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`text-xs font-medium ${dirty ? 'text-amber-600' : 'text-[#6b7280]'}`}>
              {dirty ? 'Unsaved changes' : savedAt ? `Saved at ${savedAt}` : ''}
            </span>
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="bg-[#C49A6C] text-white font-semibold min-h-[44px] px-5 py-2 rounded-lg hover:bg-[#B8895C] transition-colors disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save messages'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 mb-4 mt-3 text-sm">{error}</div>}

      {loading ? (
        <p className="text-sm text-[#6b7280] mt-4">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[#6b7280] mt-4">No message triggers available.</p>
      ) : (
        <div className="space-y-3 mt-4">
          {rows.map((row) => {
            const m = meta[row.trigger] || {};
            return (
              <div key={row.trigger} className="bg-canvas rounded-[14px] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#222222] flex items-center gap-2">
                      {m.label || row.trigger}
                      {row.enabled && row.saved && (
                        <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">ON</span>
                      )}
                    </p>
                    <p className="text-xs text-[#6b7280]">{m.description}</p>
                  </div>
                  <Toggle
                    on={row.enabled}
                    onClick={() => patchRow(row.trigger, { enabled: !row.enabled })}
                    label={`Toggle ${m.label || row.trigger}`}
                  />
                </div>

                {row.enabled && (
                  <div className="mt-3 space-y-3">
                    <div>
                      {m.offsetLabel && (
                        <div className="flex items-center gap-2 mb-2">
                          <label className="text-xs font-semibold text-[#222222]" htmlFor={`offset-${row.trigger}`}>
                            {m.offsetLabel}
                          </label>
                          <input
                            id={`offset-${row.trigger}`}
                            type="number"
                            min={1}
                            max={60}
                            className="w-20 px-3 py-1.5 rounded-[10px] bg-white border border-[#E3E8EF] text-sm text-[#0B1F42] focus:outline-none focus:border-[#C49A6C] focus:ring-2 focus:ring-[#C49A6C]/20"
                            value={row.offsetDays ?? ''}
                            onChange={(e) => patchRow(row.trigger, { offsetDays: e.target.value === '' ? null : Number(e.target.value) })}
                          />
                        </div>
                      )}
                      <textarea
                        rows={3}
                        aria-label={`Message body for ${m.label || row.trigger}`}
                        className={inputCls}
                        value={row.body}
                        maxLength={2000}
                        onChange={(e) => patchRow(row.trigger, { body: e.target.value })}
                      />
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-xs text-[#6b7280] mr-1">Insert:</span>
                        {MESSAGE_TOKENS.map((tok) => (
                          <button
                            key={tok}
                            type="button"
                            onClick={() => insertToken(row.trigger, tok)}
                            className="text-[11px] font-medium text-[#0B1F42] bg-white rounded-full px-2 py-0.5 shadow-sm hover:text-[#9A744A] transition-colors"
                          >
                            {tok}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

AutomatedMessages.propTypes = {
  propertyId: PropTypes.string.isRequired,
};

export default AdminPropertyForm;
