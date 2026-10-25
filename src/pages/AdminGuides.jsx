import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Textarea,
  TextInput,
  ToggleSwitch,
} from 'flowbite-react';
import { Search } from 'lucide-react';
import apiClient from '../api/client.js';
import TableActionsMenu from '../components/TableActionsMenu.jsx';

const EMPTY = { title: '', slug: '', excerpt: '', body: '', coverImage: '', published: false };

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatDate(value) {
  if (!value) return 'Not published';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SearchIcon() {
  return <Search strokeWidth={1.8} aria-hidden="true" />;
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

  const fetchPosts = useCallback(async () => {
    try {
      const response = await apiClient.get('/admin/guides');
      setPosts(response.data.data || []);
    } catch (requestError) {
      setMessage(requestError.response?.data?.error || 'Guides could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Stable callback, so this fetches once on mount; mutations call it directly.
  useEffect(() => { fetchPosts(); }, [fetchPosts]);

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
    <div className="space-y-6" data-openpencil-frame="0:7343">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">ZURILOFTS · ADMIN · CONTENT</p>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Travel guides</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">Publish area advice, local recommendations, and practical guest guidance.</p>
        </div>
        <Button onClick={handleCreate}>New guide</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">PUBLISHED GUIDES</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{totals.published}</strong>
          <small className="mt-1 block text-xs text-muted">Visible on the public guides route</small>
        </article>
        <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">DRAFTS</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{totals.drafts}</strong>
          <small className="mt-1 block text-xs text-muted">Waiting for review or completion</small>
        </article>
        <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">WITH COVER IMAGE</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{totals.withCover}</strong>
          <small className="mt-1 block text-xs text-muted">Ready for editorial presentation</small>
        </article>
        <article className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">GUIDES IN VIEW</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{visiblePosts.length}</strong>
          <small className="mt-1 block text-xs text-muted">Matching the current search</small>
        </article>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-elevated shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.8} aria-hidden="true" />
            <TextInput className="pl-9" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search guide title, slug or content" aria-label="Search guides" />
          </div>
          <span className="shrink-0 self-start rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted sm:self-auto">{visiblePosts.length} guide{visiblePosts.length === 1 ? '' : 's'}</span>
        </div>

        {message && <Alert color="failure" className="mx-5 mt-4" role="status">{message}</Alert>}

        {loading ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" aria-hidden="true" />
            <strong className="text-base font-semibold text-navy">Loading travel guides</strong>
            <p className="text-xs leading-relaxed text-muted">Checking editorial status and publishing metadata.</p>
          </div>
        ) : visiblePosts.length === 0 ? (
          <Alert color="info">
            <div className="flex w-full flex-col items-center gap-2 px-5 py-12 text-center">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 dark:bg-primary/15 text-navy" aria-hidden="true"><SearchIcon /></span>
              <strong className="text-base font-semibold text-navy">No guides found</strong>
              <p className="text-xs leading-relaxed text-muted">Create the first guide or adjust the current search.</p>
            </div>
          </Alert>
        ) : (
          <div>
            <Table hoverable aria-label="Travel guides">
              <TableHead>
                <TableRow>
                  <TableHeadCell>GUIDE</TableHeadCell>
                  <TableHeadCell>STATUS</TableHeadCell>
                  <TableHeadCell>EXCERPT</TableHeadCell>
                  <TableHeadCell>PUBLISHED</TableHeadCell>
                  <TableHeadCell>ACTIONS</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visiblePosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell><div className="flex items-center gap-3">
                      {post.coverImage ? <img src={post.coverImage} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary/15 text-sm font-bold text-navy" aria-hidden="true">{String(post.title || 'G')[0].toUpperCase()}</span>}
                      <div className="min-w-0">
                        <strong className="block truncate text-sm font-semibold text-navy">{post.title}</strong>
                        <small className="block truncate text-xs text-muted">/{post.slug}</small>
                      </div>
                    </div></TableCell>
                    <TableCell><Badge color={post.published ? 'success' : 'warning'}>{post.published ? 'Published' : 'Draft'}</Badge></TableCell>
                    <TableCell><div className="grid max-w-xs gap-1">
                      <p className="line-clamp-2 text-sm leading-relaxed text-charcoal">{post.excerpt || 'No editorial excerpt supplied.'}</p>
                      <span className="text-xs text-muted">{post.body ? `${post.body.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length} words` : 'No body content'}</span>
                    </div></TableCell>
                    <TableCell><div className="grid gap-1">
                      <small className="text-[11px] font-semibold uppercase tracking-wide text-muted">UPDATED</small>
                      <strong className="truncate text-sm font-semibold text-navy">{formatDate(post.updatedAt || post.createdAt)}</strong>
                      <span className="text-xs text-muted">{post.published ? 'Publicly available' : 'Not yet visible'}</span>
                    </div></TableCell>
                    <TableCell><div className="flex items-center justify-end">
                      <TableActionsMenu
                        label={`Actions for ${post.title}`}
                        actions={[
                          { label: 'Edit', icon: 'edit', onClick: () => handleEdit(post.id) },
                          { label: 'Delete', icon: 'delete', danger: true, onClick: () => handleDelete(post.id) },
                        ]}
                      />
                    </div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Modal show={Boolean(editing)} onClose={handleCancel} size="lg" dismissible>
        {editing && (
          <>
            <ModalHeader>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">GUIDE · {editing === 'new' ? 'NEW' : 'EDIT'}</span>
              <span className="block">{editing === 'new' ? 'Create travel guide' : 'Edit travel guide'}</span>
            </ModalHeader>
            <ModalBody>
              {error && <Alert color="failure" className="mb-4">{error}</Alert>}
              <form onSubmit={handleSave} className="space-y-4">
                <div><Label htmlFor="guide-title">Title</Label><TextInput id="guide-title" value={form.title} onChange={(event) => handleTitleChange(event.target.value)} placeholder="Best areas to stay in Nairobi" required /></div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="guide-slug">Slug</Label><TextInput id="guide-slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></div>
                  <div><Label htmlFor="guide-cover">Cover image URL</Label><TextInput id="guide-cover" value={form.coverImage} onChange={(event) => setForm({ ...form, coverImage: event.target.value })} placeholder="/images/..." /></div>
                </div>
                <div><Label htmlFor="guide-excerpt">Excerpt</Label><TextInput id="guide-excerpt" value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} placeholder="A concise summary for listing cards and search." /></div>
                <div><Label htmlFor="guide-body">Body (HTML)</Label><Textarea id="guide-body" rows={12} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className="font-mono" /></div>
                <div className="rounded-lg border border-border bg-surface p-3"><ToggleSwitch checked={form.published} label="Publish this guide" onChange={(event) => setForm({ ...form, published: event.target.checked })} /></div>
                <div className="flex items-center justify-end gap-2 pt-1"><Button color="light" type="button" onClick={handleCancel} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing === 'new' ? 'Create guide' : 'Save changes'}</Button></div>
              </form>
            </ModalBody>
          </>
        )}
      </Modal>
    </div>
  );
}

export default AdminGuides;
