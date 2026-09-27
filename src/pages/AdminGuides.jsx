import { useState, useEffect } from 'react';
import apiClient from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const EMPTY = { title: '', slug: '', excerpt: '', body: '', coverImage: '', published: false };

function AdminGuides() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPosts = async () => {
    try {
      const res = await apiClient.get('/admin/guides');
      setPosts(res.data.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleCreate = () => { setEditing('new'); setForm(EMPTY); setError(''); };
  const handleEdit = async (id) => {
    try {
      const res = await apiClient.get(`/admin/guides/${id}`);
      const p = res.data.data;
      setForm({ title: p.title, slug: p.slug, excerpt: p.excerpt || '', body: p.body, coverImage: p.coverImage || '', published: p.published });
      setEditing(id);
      setError('');
    } catch (err) { console.error(err); }
  };
  const handleCancel = () => { setEditing(null); setForm(EMPTY); setError(''); };

  const handleSave = async () => {
    if (!form.title.trim()) return setError('Title is required');
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') {
        await apiClient.post('/admin/guides', form);
      } else {
        await apiClient.put(`/admin/guides/${editing}`, form);
      }
      setEditing(null);
      setForm(EMPTY);
      fetchPosts();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this guide?')) return;
    try { await apiClient.delete(`/admin/guides/${id}`); fetchPosts(); } catch (err) { console.error(err); }
  };

  const handleTitleChange = (t) => {
    setForm((prev) => {
      const slug = editing === 'new' ? slugify(t) : prev.slug;
      return { ...prev, title: t, slug };
    });
  };

  if (loading) return <div className="p-8 flex justify-center"><Spinner /></div>;

  // No width cap or padding on the wrapper - the admin layout already supplies
  // p-4 md:p-8, and admin pages are full-bleed (see CLAUDE.md).
  return (
    <div>
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#E3E8EF] bg-white px-5 py-5 shadow-[0_4px_16px_rgba(11,31,66,0.04)] sm:px-6">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C49A6C]">Content workspace</p><h2 className="mt-1 text-2xl font-bold text-[#0B1F42]">Travel Guides</h2><p className="mt-1 text-sm text-[#5B6B82]">Create and publish practical Nairobi guidance for guests.</p></div>
        {!editing && (
          <button onClick={handleCreate} className="min-h-[44px] rounded-[10px] bg-[#0B1F42] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#07072E]">
            + New Guide
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {[
          ['Total guides', posts.length],
          ['Published', posts.filter((post) => post.published).length],
          ['Drafts', posts.filter((post) => !post.published).length],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#E3E8EF] bg-white p-4 shadow-[0_4px_16px_rgba(11,31,66,0.04)]"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">{label}</p><p className="mt-2 text-2xl font-bold text-[#0B1F42]">{value}</p></div>)}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="mb-6 rounded-2xl border border-[#E3E8EF] bg-white p-4 shadow-[0_4px_16px_rgba(11,31,66,0.04)] md:p-6">
          <h3 className="mb-4 text-lg font-bold text-[#0B1F42]">{editing === 'new' ? 'New Guide' : 'Edit Guide'}</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0B1F42]">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="min-h-[44px] w-full rounded-[10px] border-0 bg-[#F7F4EF] px-4 py-2.5 text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40 transition-colors"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#222222] mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="min-h-[44px] w-full rounded-[10px] border-0 bg-[#F7F4EF] px-4 py-2.5 text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#222222] mb-1">Cover Image URL</label>
                <input
                  type="text"
                  value={form.coverImage}
                  onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                  placeholder="/images/..."
                  className="min-h-[44px] w-full rounded-[10px] border-0 bg-[#F7F4EF] px-4 py-2.5 text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#222222] mb-1">Excerpt</label>
              <input
                type="text"
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                className="min-h-[44px] w-full rounded-[10px] border-0 bg-[#F7F4EF] px-4 py-2.5 text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#222222] mb-1">Body (HTML)</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={12}
                className="w-full rounded-[10px] border-0 bg-[#F7F4EF] px-4 py-3 font-mono text-sm text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="h-4 w-4 rounded text-[#0B1F42]"
              />
              <label htmlFor="published" className="text-sm font-semibold text-[#0B1F42]">Published</label>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="min-h-[44px] rounded-[10px] bg-[#0B1F42] px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#07072E] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={handleCancel} className="min-h-[44px] rounded-[10px] border border-[#E3E8EF] px-6 py-2.5 text-sm font-semibold text-[#0B1F42] hover:bg-[#F7F4EF] transition-shadow">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts list */}
      <div className="overflow-x-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
        <table className="w-full text-sm">
          <thead className="bg-[#F7F4EF] text-left">
            <tr>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Title</th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6b7280] hidden md:table-cell">Status</th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6b7280] hidden md:table-cell">Date</th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6b7280] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {posts.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#6b7280]">No guides yet. Create your first one.</td></tr>
            )}
            {posts.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-[#F7F4EF]">
                <td className="px-4 py-3">
                  <span className="font-semibold text-[#0B1F42]">{p.title}</span>
                  <span className="block text-xs text-[#6b7280] md:hidden">{p.published ? 'Published' : 'Draft'} · {new Date(p.createdAt).toLocaleDateString()}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${p.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#6b7280] hidden md:table-cell">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleEdit(p.id)} className="mr-3 font-semibold text-[#0B1F42] transition-colors hover:text-[#07072E]">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 font-semibold hover:text-red-600 transition-colors">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminGuides;
