import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';

const EMPTY = {
  title: '',
  location: '',
  price: '',
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

const labelCls = 'block text-sm font-semibold text-[#1f2937] mb-2';
const inputCls =
  'w-full px-4 py-2.5 rounded-xl border border-[#D9D9D9] focus:outline-none focus:border-[#C49A6C] bg-white text-[#1f2937]';

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
          price: p.price ?? '',
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

    if (payload.images.length === 0) {
      setError('Add at least one image');
      setSaving(false);
      return;
    }

    try {
      if (isEdit) {
        await apiClient.put(`/properties/${id}`, payload);
        navigate('/admin/properties');
      } else {
        const res = await apiClient.post('/properties', payload);
        // Go to edit so seasonal pricing & calendar (which need an id) are available
        navigate(`/admin/properties/${res.data.data.id}/edit`);
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
        <div className="w-8 h-8 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/admin/properties" className="text-sm text-[#6b7280] hover:text-[#C49A6C]">&larr; Back to properties</Link>
          <h1 className="text-2xl font-bold text-[#262262] mt-1">{isEdit ? 'Edit Property' : 'Add Property'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFullPreview(true)}
            className="flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-[#262262] text-white hover:bg-[#1d1a4d] transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview page
          </button>
          {isEdit && (
            <Link
              to={`/admin/properties/${id}/calendar`}
              className="px-4 py-2 rounded-full text-sm font-semibold border border-[#D9D9D9] text-[#262262] hover:border-[#C49A6C] hover:text-[#C49A6C] transition-colors"
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#D9D9D9] p-6 space-y-5">
          <div>
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={form.title} onChange={(e) => update('title', e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input className={inputCls} value={form.location} onChange={(e) => update('location', e.target.value)} required />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.type} onChange={(e) => update('type', e.target.value)}>
                <option value="apartment">Apartment</option>
                <option value="studio">Studio</option>
                <option value="penthouse">Penthouse</option>
              </select>
            </div>
            <div className="flex items-end gap-6 pb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1f2937]">
                <input type="checkbox" checked={form.available} onChange={(e) => update('available', e.target.checked)} className="accent-[#C49A6C] w-4 h-4" />
                Available
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-[#1f2937]">
                <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} className="accent-[#C49A6C] w-4 h-4" />
                Featured
              </label>
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea rows={4} className={inputCls} value={form.description} onChange={(e) => update('description', e.target.value)} required />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D9D9D9] p-6 space-y-5">
          <div>
            <label className={labelCls}>Photos</label>
            <p className="text-sm text-[#6b7280] mb-3">Upload images from your device — they&apos;re automatically resized and compressed for the website. The first photo is used as the cover.</p>

            {form.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {form.images.map((src, i) => (
                  <div key={src + i} className="relative group aspect-[4/3] rounded-xl overflow-hidden border border-[#D9D9D9]">
                    <img src={src} alt={`Property photo ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-1.5 left-1.5 bg-[#C49A6C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Cover</span>
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

            <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed border-[#D9D9D9] rounded-xl py-8 cursor-pointer hover:border-[#C49A6C] hover:bg-[#C49A6C]/5 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
              {uploading ? (
                <>
                  <div className="w-6 h-6 border-2 border-[#C49A6C] border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="text-sm text-[#6b7280]">Uploading & optimizing...</span>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 text-[#C49A6C] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm font-semibold text-[#262262]">Click to upload photos</span>
                  <span className="text-xs text-[#6b7280] mt-1">JPEG, PNG or WebP · up to 10 at a time</span>
                </>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <p className="md:col-span-2 text-sm text-[#6b7280] -mb-1">Enter one item per line.</p>
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

        {isEdit && <SeasonalPricing propertyId={id} />}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#C49A6C] text-white font-semibold px-6 py-2.5 rounded-full hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Property'}
          </button>
          <Link to="/admin/properties" className="px-6 py-2.5 rounded-full font-semibold text-[#6b7280] hover:text-[#262262]">Cancel</Link>
        </div>
      </form>

      {/* Live preview — collapsible drawer docked to the right edge */}
      <button
        type="button"
        onClick={() => setPreviewOpen((o) => !o)}
        aria-label={previewOpen ? 'Hide preview' : 'Show preview'}
        className={`fixed top-1/2 -translate-y-1/2 z-40 bg-[#262262] text-white px-2 py-4 rounded-l-xl shadow-lg hover:bg-[#1d1a4d] transition-all duration-300 ${
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
        className={`fixed top-0 right-0 z-30 h-full w-[372px] max-w-[90vw] bg-[#f8f9fa] border-l border-[#D9D9D9] shadow-2xl transition-transform duration-300 overflow-y-auto ${
          previewOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[#262262]">Live preview</p>
            <button type="button" onClick={() => setPreviewOpen(false)} className="text-[#6b7280] hover:text-[#262262]" aria-label="Collapse preview">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <PropertyPreview form={form} />
          <p className="text-xs text-[#6b7280] mt-3">This is how the property appears as a card on the website. It updates as you edit.</p>
        </div>
      </aside>
    </div>
  );
}

// Live preview of the public PropertyCard, driven by the current form values
function PropertyPreview({ form }) {
  const cover = form.images?.[0];
  const price = Number(form.price) || 0;
  const bedrooms = form.bedrooms === '' ? '—' : form.bedrooms;
  const bathrooms = form.bathrooms === '' ? '—' : form.bathrooms;
  const area = form.area === '' ? '—' : form.area;

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
          <span className="absolute top-4 right-4 bg-[#262262] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">Unavailable</span>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-[#1f2937] leading-tight">{form.title || 'Property title'}</h3>
        <div className="flex items-center text-[#6b7280] mt-1 mb-3">
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm truncate">{form.location || 'Location'}</span>
        </div>

        <div className="flex items-center justify-between mb-3 py-3 border-y border-[#D9D9D9] text-center">
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#262262]">{bedrooms}</p>
            <p className="text-xs text-[#6b7280]">Beds</p>
          </div>
          <div className="flex-1 border-x border-[#D9D9D9]">
            <p className="text-sm font-semibold text-[#262262]">{bathrooms}</p>
            <p className="text-xs text-[#6b7280]">Baths</p>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#262262]">{area}</p>
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
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#262262] text-white px-5 py-3">
          <span className="text-sm font-semibold">Page preview — not yet saved</span>
          <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close preview">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 md:p-8">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-[#262262] mb-1">{form.title || 'Property title'}</h1>
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
                  <p className="font-bold text-[#262262]">{form.bedrooms === '' ? '—' : form.bedrooms}</p>
                  <p className="text-sm text-[#6b7280]">Bedrooms</p>
                </div>
                <div>
                  <p className="font-bold text-[#262262]">{form.bathrooms === '' ? '—' : form.bathrooms}</p>
                  <p className="text-sm text-[#6b7280]">Bathrooms</p>
                </div>
                <div>
                  <p className="font-bold text-[#262262]">{form.area === '' ? '—' : `${form.area} sq ft`}</p>
                  <p className="text-sm text-[#6b7280]">Area</p>
                </div>
                <div>
                  <p className="font-bold text-[#262262] capitalize">{form.type}</p>
                  <p className="text-sm text-[#6b7280]">Type</p>
                </div>
              </div>

              {/* Description */}
              <h2 className="text-xl font-bold text-[#262262] mb-3">About this property</h2>
              <p className="text-[#1f2937] leading-relaxed whitespace-pre-line mb-8">{form.description || 'No description yet.'}</p>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-[#262262] mb-3">Amenities</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {amenities.map((a, i) => (
                      <div key={i} className="flex items-center text-[#1f2937]">
                        <svg className="w-5 h-5 text-[#C49A6C] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <h2 className="text-xl font-bold text-[#262262] mb-3">What&apos;s nearby</h2>
                  <ul className="space-y-2">
                    {nearby.map((n, i) => (
                      <li key={i} className="flex items-center text-[#1f2937]">
                        <svg className="w-5 h-5 text-[#C49A6C] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="border border-[#D9D9D9] rounded-2xl p-6 sticky top-20">
                <span className="text-3xl font-bold text-[#262262]">KES {price.toLocaleString()}</span>
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

// ---- Seasonal pricing (price rules) — only available once a property exists ----
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
      <h2 className="text-lg font-bold text-[#262262] mb-1">Seasonal Pricing</h2>
      <p className="text-sm text-[#6b7280] mb-4">Override the base nightly price for specific date ranges (e.g. peak season). The base price applies on any date with no rule.</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 mb-4 text-sm">{error}</div>}

      {loading ? (
        <p className="text-sm text-[#6b7280]">Loading...</p>
      ) : rules.length > 0 ? (
        <div className="space-y-2 mb-4">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-[#f8f9fa] rounded-xl px-4 py-2.5 text-sm">
              <div>
                <span className="font-semibold text-[#262262]">{r.name || 'Rate'}</span>
                <span className="text-[#6b7280] ml-2">{fmt(r.start)} &rarr; {fmt(r.end)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#262262]">KES {r.price.toLocaleString()}/night</span>
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
        <button type="button" onClick={addRule} className="bg-[#262262] text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-[#1d1a4d] transition-colors">Add</button>
      </div>
    </div>
  );
}

export default AdminPropertyForm;
