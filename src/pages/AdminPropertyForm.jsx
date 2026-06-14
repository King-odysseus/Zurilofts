import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  images: '',
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
          images: (p.images || []).join('\n'),
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
      images: linesToArray(form.images),
      amenities: linesToArray(form.amenities),
      nearby: linesToArray(form.nearby),
    };

    if (payload.images.length === 0) {
      setError('Add at least one image URL');
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
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/admin/properties" className="text-sm text-[#6b7280] hover:text-[#C49A6C]">&larr; Back to properties</Link>
          <h1 className="text-2xl font-bold text-[#262262] mt-1">{isEdit ? 'Edit Property' : 'Add Property'}</h1>
        </div>
        {isEdit && (
          <Link
            to={`/admin/properties/${id}/calendar`}
            className="px-4 py-2 rounded-full text-sm font-semibold border border-[#D9D9D9] text-[#262262] hover:border-[#C49A6C] hover:text-[#C49A6C] transition-colors"
          >
            Manage Calendar &rarr;
          </Link>
        )}
      </div>

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
          <p className="text-sm text-[#6b7280]">Enter one item per line.</p>
          <div>
            <label className={labelCls}>Image URLs</label>
            <textarea rows={4} className={inputCls} placeholder="https://...jpg" value={form.images} onChange={(e) => update('images', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            className="bg-[#C49A6C] text-[#262262] font-semibold px-6 py-2.5 rounded-full hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Property'}
          </button>
          <Link to="/admin/properties" className="px-6 py-2.5 rounded-full font-semibold text-[#6b7280] hover:text-[#262262]">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

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
