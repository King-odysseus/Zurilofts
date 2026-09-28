import { useEffect, useMemo, useState } from 'react';
import { Button, Label, Textarea, TextInput, ToggleSwitch } from 'flowbite-react';
import apiClient from '../api/client.js';

const EMPTY = { title: '', slug: '', excerpt: '', body: '', coverImage: '', published: false };

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatDate(value) {
  if (!value) return 'Not published';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SearchIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function AdminGuides() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  async function fetchPosts() {
    try {
      const response = await apiClient.get('/admin/guides');
      setPosts(response.data.data || []);
    } catch (requestError) {
      setMessage(requestError.response?.data?.error || 'Guides could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPosts(); }, []);

  function handleCreate() {
    setEditing('new');
    setForm(EMPTY);
    setError('');
    setMessage('');
  }

  async function handleEdit(id) {
    setError('');
    setMessage('');
    try {
      const response = await apiClient.get(`/admin/guides/${id}`);
      const post = response.data.data;
      setForm({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        body: post.body,
        coverImage: post.coverImage || '',
        published: post.published,
      });
      setEditing(id);
    } catch (requestError) {
      setMessage(requestError.response?.data?.error || 'Guide could not be opened.');
    }
  }

  function handleCancel() {
    setEditing(null);
    setForm(EMPTY);
    setError('');
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') await apiClient.post('/admin/guides', form);
      else await apiClient.put(`/admin/guides/${editing}`, form);
      setEditing(null);
      setForm(EMPTY);
      setMessage(editing === 'new' ? 'Guide created.' : 'Guide updated.');
      await fetchPosts();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this guide?')) return;
    try {
      await apiClient.delete(`/admin/guides/${id}`);
      setMessage('Guide deleted.');
      await fetchPosts();
    } catch (requestError) {
      setMessage(requestError.response?.data?.error || 'Guide could not be deleted.');
    }
  }

  function handleTitleChange(title) {
    setForm((current) => ({ ...current, title, slug: editing === 'new' ? slugify(title) : current.slug }));
  }

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter((post) => [post.title, post.slug, post.excerpt, post.body].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [posts, search]);

  const totals = useMemo(() => ({
    published: visiblePosts.filter((post) => post.published).length,
    drafts: visiblePosts.filter((post) => !post.published).length,
    withCover: visiblePosts.filter((post) => post.coverImage).length,
  }), [visiblePosts]);

  return (
    <div className="op-admin-overview op-admin-guides" data-openpencil-frame="0:7343">
      <div className="op-admin-heading op-admin-catalog-heading">
        <div>
          <p className="op-admin-eyebrow">ZURILOFTS · ADMIN · CONTENT</p>
          <h1>Travel guides</h1>
          <p>Publish area advice, local recommendations, and practical guest guidance.</p>
        </div>
        <Button className="op-admin-bronze-button" onClick={handleCreate}>New guide</Button>
      </div>

      <div className="op-admin-metrics op-admin-catalog-metrics">
        <article><span>PUBLISHED GUIDES</span><strong>{totals.published}</strong><small>Visible on the public guides route</small></article>
        <article><span>DRAFTS</span><strong>{totals.drafts}</strong><small>Waiting for review or completion</small></article>
        <article><span>WITH COVER IMAGE</span><strong>{totals.withCover}</strong><small>Ready for editorial presentation</small></article>
        <article><span>GUIDES IN VIEW</span><strong>{visiblePosts.length}</strong><small>Matching the current search</small></article>
      </div>

      <section className="op-admin-catalog-board">
        <div className="op-admin-catalog-toolbar">
          <div className="op-admin-catalog-search"><SearchIcon /><TextInput type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search guide title, slug or content" aria-label="Search guides" /></div>
          <span>{visiblePosts.length} guide{visiblePosts.length === 1 ? '' : 's'}</span>
        </div>

        {message && <div className="op-admin-people-message is-error" role="status">{message}</div>}

        {loading ? (
          <div className="op-admin-catalog-empty"><span className="op-admin-booking-spinner" aria-hidden="true" /><strong>Loading travel guides</strong><p>Checking editorial status and publishing metadata.</p></div>
        ) : visiblePosts.length === 0 ? (
          <div className="op-admin-catalog-empty"><span aria-hidden="true"><SearchIcon /></span><strong>No guides found</strong><p>Create the first guide or adjust the current search.</p></div>
        ) : (
          <div className="op-admin-catalog-list" role="table" aria-label="Travel guides">
            <div className="op-admin-catalog-columns op-admin-guide-columns" role="row">
              <span role="columnheader">GUIDE</span><span role="columnheader">STATUS</span><span role="columnheader">EXCERPT</span><span role="columnheader">PUBLISHED</span><span role="columnheader">ACTIONS</span>
            </div>
            {visiblePosts.map((post) => (
              <article key={post.id} className={`op-admin-catalog-row op-admin-guide-row op-admin-guide-columns ${post.published ? '' : 'is-muted'}`} role="row">
                <div className="op-admin-guide-title" role="cell">
                  {post.coverImage ? <img src={post.coverImage} alt="" /> : <span aria-hidden="true">{String(post.title || 'G')[0].toUpperCase()}</span>}
                  <div><strong>{post.title}</strong><small>/{post.slug}</small></div>
                </div>
                <div role="cell"><span className={`op-admin-catalog-status ${post.published ? 'is-success' : 'is-neutral'}`}>{post.published ? 'Published' : 'Draft'}</span></div>
                <div className="op-admin-guide-excerpt" role="cell"><p>{post.excerpt || 'No editorial excerpt supplied.'}</p><span>{post.body ? `${post.body.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length} words` : 'No body content'}</span></div>
                <div className="op-admin-catalog-cell" role="cell"><small>UPDATED</small><strong>{formatDate(post.updatedAt || post.createdAt)}</strong><span>{post.published ? 'Publicly available' : 'Not yet visible'}</span></div>
                <div className="op-admin-catalog-actions" role="cell"><button type="button" onClick={() => handleEdit(post.id)}>Edit</button><button type="button" className="is-danger" onClick={() => handleDelete(post.id)}>Delete</button></div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <div className="op-admin-dialog-backdrop" role="presentation" onMouseDown={handleCancel}>
          <div className="op-admin-edit-dialog op-admin-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-form-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="op-admin-dialog-heading"><div><p className="op-admin-eyebrow">GUIDE · {editing === 'new' ? 'NEW' : 'EDIT'}</p><h2 id="guide-form-title">{editing === 'new' ? 'Create travel guide' : 'Edit travel guide'}</h2></div><button type="button" onClick={handleCancel} aria-label="Close guide form">&times;</button></div>
            {error && <div className="op-admin-error" role="alert">{error}</div>}
            <form onSubmit={handleSave} className="op-admin-booking-form">
              <div><Label htmlFor="guide-title">Title</Label><TextInput id="guide-title" value={form.title} onChange={(event) => handleTitleChange(event.target.value)} placeholder="Best areas to stay in Nairobi" required /></div>
              <div className="op-admin-form-grid">
                <div><Label htmlFor="guide-slug">Slug</Label><TextInput id="guide-slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></div>
                <div><Label htmlFor="guide-cover">Cover image URL</Label><TextInput id="guide-cover" value={form.coverImage} onChange={(event) => setForm({ ...form, coverImage: event.target.value })} placeholder="/images/..." /></div>
              </div>
              <div><Label htmlFor="guide-excerpt">Excerpt</Label><TextInput id="guide-excerpt" value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} placeholder="A concise summary for listing cards and search." /></div>
              <div><Label htmlFor="guide-body">Body (HTML)</Label><Textarea id="guide-body" rows={12} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className="font-mono" /></div>
              <div className="op-admin-addon-toggle"><ToggleSwitch checked={form.published} label="Publish this guide" onChange={(event) => setForm({ ...form, published: event.target.checked })} /></div>
              <div className="op-admin-dialog-actions"><Button color="light" type="button" onClick={handleCancel} disabled={saving}>Cancel</Button><Button className="op-admin-bronze-button" type="submit" disabled={saving}>{saving ? 'Saving...' : editing === 'new' ? 'Create guide' : 'Save changes'}</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminGuides;
