import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client.js';

const PROPERTY_TYPES = ['apartment', 'studio', 'penthouse'];

// Convert a textarea of one-item-per-line into a clean string array
function linesToArray(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function arrayToLines(arr) {
  return Array.isArray(arr) ? arr.join('\n') : '';
}

function AdminPropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    location: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    rating: '',
    reviews: '',
    type: 'apartment',
    description: '',
    images: '',
    amenities: '',
    nearby: '',
    available: true,
    featured: false,
  });

  useEffect(() => {
    if (!isEdit) return;
    async function loadProperty() {
      try {
        const res = await apiClient.get(`/properties/${id}`);
        const p = res.data.data;
        setForm({
          title: p.title || '',
          location: p.location || '',
          price: p.price ?? '',
          bedrooms: p.bedrooms ?? '',
          bathrooms: p.bathrooms ?? '',
          area: p.area ?? '',
          rating: p.rating ?? '',
          reviews: p.reviews ?? '',
          type: p.type || 'apartment',
          description: p.description || '',
          images: arrayToLines(p.images),
          amenities: arrayToLines(p.amenities),
          nearby: arrayToLines(p.nearby),
          available: p.available ?? true,
          featured: p.featured ?? false,
        });
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load property');
      } finally {
        setLoading(false);
      }
    }
    loadProperty();
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const images = linesToArray(form.images);
    if (images.length === 0) {
      setError('Please add at least one image URL or path');
      setSaving(false);
      return;
    }

    const payload = {
      title: form.title.trim(),
      location: form.location.trim(),
      price: Number(form.price),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      area: Number(form.area),
      type: form.type,
      description: form.description.trim(),
      images,
      amenities: linesToArray(form.amenities),
      nearby: linesToArray(form.nearby),
      available: form.available,
      featured: form.featured,
    };
    if (form.rating !== '') payload.rating = Number(form.rating);
    if (form.reviews !== '') payload.reviews = Number(form.reviews);

    try {
      if (isEdit) {
        await apiClient.put(`/properties/${id}`, payload);
      } else {
        await apiClient.post('/properties', payload);
      }
      navigate('/admin/properties');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  const inputClass = 'neu-input w-full px-4 py-2.5 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]';
  const labelClass = 'block text-sm font-semibold text-[#1f2937] mb-1';

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#262262]">{isEdit ? 'Edit Property' : 'Add Property'}</h1>
        <Link
          to="/admin/properties"
          className="text-sm font-semibold text-[#6b7280] hover:text-[#262262] transition-colors"
        >
          ← Back to Properties
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#D9D9D9] p-6 space-y-5">
        <div>
          <label className={labelClass}>Title *</label>
          <input name="title" value={form.title} onChange={handleChange} className={inputClass} placeholder="ZuriLofts - Serenity Residency" required />
        </div>

        <div>
          <label className={labelClass}>Location *</label>
          <input name="location" value={form.location} onChange={handleChange} className={inputClass} placeholder="Kilimani, Ngong Road, Nairobi" required />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Price/Night (KES) *</label>
            <input type="number" name="price" value={form.price} onChange={handleChange} className={inputClass} min="1" required />
          </div>
          <div>
            <label className={labelClass}>Bedrooms *</label>
            <input type="number" name="bedrooms" value={form.bedrooms} onChange={handleChange} className={inputClass} min="0" required />
          </div>
          <div>
            <label className={labelClass}>Bathrooms *</label>
            <input type="number" name="bathrooms" value={form.bathrooms} onChange={handleChange} className={inputClass} min="0" required />
          </div>
          <div>
            <label className={labelClass}>Area (sq ft) *</label>
            <input type="number" name="area" value={form.area} onChange={handleChange} className={inputClass} min="1" required />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Type *</label>
            <select name="type" value={form.type} onChange={handleChange} className={`${inputClass} capitalize`} required>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Rating (0–5)</label>
            <input type="number" name="rating" value={form.rating} onChange={handleChange} className={inputClass} min="0" max="5" step="0.1" placeholder="0" />
          </div>
          <div>
            <label className={labelClass}>Reviews</label>
            <input type="number" name="reviews" value={form.reviews} onChange={handleChange} className={inputClass} min="0" placeholder="0" />
          </div>
        </div>

        <div>
          <label className={labelClass}>Description *</label>
          <textarea name="description" value={form.description} onChange={handleChange} className={`${inputClass} h-28 resize-none`} placeholder="Describe the property..." required />
        </div>

        <div>
          <label className={labelClass}>Images — one URL or path per line *</label>
          <textarea name="images" value={form.images} onChange={handleChange} className={`${inputClass} h-24 resize-none font-mono text-xs`} placeholder={'/images/Ely Homes Photography (1 of 20).jpg\nhttps://example.com/photo.jpg'} required />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Amenities — one per line</label>
            <textarea name="amenities" value={form.amenities} onChange={handleChange} className={`${inputClass} h-28 resize-none`} placeholder={'High-Speed WiFi\nSmart TV\nSecure Parking'} />
          </div>
          <div>
            <label className={labelClass}>What&apos;s Nearby — one per line</label>
            <textarea name="nearby" value={form.nearby} onChange={handleChange} className={`${inputClass} h-28 resize-none`} placeholder={'5 minutes from Yaya Centre\n10 minutes from CBD'} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="available" checked={form.available} onChange={handleChange} className="w-5 h-5 accent-[#C49A6C]" />
            <span className="text-sm font-semibold text-[#1f2937]">Available to book</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="featured" checked={form.featured} onChange={handleChange} className="w-5 h-5 accent-[#C49A6C]" />
            <span className="text-sm font-semibold text-[#1f2937]">Featured</span>
          </label>
        </div>

        <div className="flex gap-3 pt-4 border-t border-[#D9D9D9]">
          <button
            type="button"
            onClick={() => navigate('/admin/properties')}
            className="px-6 py-2.5 rounded-full font-semibold border-2 border-[#D9D9D9] text-[#6b7280] hover:border-[#262262] hover:text-[#262262] transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-full font-semibold bg-[#C49A6C] text-[#262262] hover:bg-[#b8895c] transition-all duration-200 text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Property'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminPropertyForm;
