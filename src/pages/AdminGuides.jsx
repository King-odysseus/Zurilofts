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
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
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
    try { await apiClient.delete(`/admin/guides/${id}`); fetchPosts(); } catch { /* ignore */ }
  };

  const handleTitleChange = (t) => {
    setForm((prev) => {
      const slug = editing === 'new' ? slugify(t) : prev.slug;
      return { ...prev, title: t, slug };
    });
  };

  if (loading) return <div className="p-8 flex justify-center"><Spinner /></div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#0B0B45]">Travel Guides</h2>
        {!editing && (
          <button onClick={handleCreate} className="bg-[#C49A6C] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#b8895c] transition-all duration-200">
            + New Guide
          </button>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="bg-white rounded-2xl border border-[#D9D9D9] p-4 md:p-6 mb-6">
          <h3 className="text-lg font-bold text-[#0B0B45] mb-4">{editing === 'new' ? 'New Guide' : 'Edit Guide'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#1f2937] mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 focus:outline-none focus:border-[#C49A6C] transition-colors"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1f2937] mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 focus:outline-none focus:border-[#C49A6C] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1f2937] mb-1">Cover Image URL</label>
                <input
                  type="text"
                  value={form.coverImage}
                  onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                  placeholder="/images/..."
                  className="w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 focus:outline-none focus:border-[#C49A6C] transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1f2937] mb-1">Excerpt</label>
              <input
                type="text"
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                className="w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 focus:outline-none focus:border-[#C49A6C] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1f2937] mb-1">Body (HTML)</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={12}
                className="w-full rounded-xl border border-[#D9D9D9] px-4 py-3 focus:outline-none focus:border-[#C49A6C] transition-colors font-mono text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="w-4 h-4 text-[#C49A6C] rounded"
              />
              <label htmlFor="published" className="text-sm font-semibold text-[#1f2937]">Published</label>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#C49A6C] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={handleCancel} className="border-2 border-[#D9D9D9] text-[#6b7280] px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#D9D9D9]/20 transition-all duration-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts list */}
      <div className="bg-white rounded-2xl border border-[#D9D9D9] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0B0B45]/5 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-[#0B0B45]">Title</th>
              <th className="px-4 py-3 font-semibold text-[#0B0B45] hidden md:table-cell">Status</th>
              <th className="px-4 py-3 font-semibold text-[#0B0B45] hidden md:table-cell">Date</th>
              <th className="px-4 py-3 font-semibold text-[#0B0B45] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9D9D9]">
            {posts.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#6b7280]">No guides yet. Create your first one.</td></tr>
            )}
            {posts.map((p) => (
              <tr key={p.id} className="hover:bg-[#D9D9D9]/10 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-semibold text-[#0B0B45]">{p.title}</span>
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
                  <button onClick={() => handleEdit(p.id)} className="text-[#C49A6C] font-semibold hover:text-[#b8895c] transition-colors mr-3">
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
