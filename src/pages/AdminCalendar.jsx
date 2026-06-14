import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client.js';

const labelCls = 'block text-sm font-semibold text-[#1f2937] mb-2';
const inputCls =
  'w-full px-4 py-2.5 rounded-xl border border-[#D9D9D9] focus:outline-none focus:border-[#C49A6C] bg-white text-[#1f2937]';

const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

function AdminCalendar() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [sourceDraft, setSourceDraft] = useState({ name: '', url: '' });
  const [blockDraft, setBlockDraft] = useState({ start: '', end: '', summary: '' });

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get(`/admin/properties/${id}/calendar`);
      setData(res.data.data);
    } catch {
      setError('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addSource(e) {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post(`/admin/properties/${id}/calendar/sources`, sourceDraft);
      setSourceDraft({ name: '', url: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to add source');
    }
  }

  async function removeSource(sourceId) {
    if (!confirm('Remove this calendar feed and its imported blocks?')) return;
    try {
      await apiClient.delete(`/admin/properties/${id}/calendar/sources/${sourceId}`);
      load();
    } catch {
      alert('Failed to remove source');
    }
  }

  async function syncNow() {
    setSyncing(true);
    setError('');
    try {
      await apiClient.post(`/admin/properties/${id}/calendar/sync`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function addBlock(e) {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post(`/admin/properties/${id}/calendar/blocks`, {
        start: blockDraft.start,
        end: blockDraft.end,
        summary: blockDraft.summary || undefined,
      });
      setBlockDraft({ start: '', end: '', summary: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to add block');
    }
  }

  async function removeBlock(blockId) {
    try {
      await apiClient.delete(`/admin/properties/${id}/calendar/blocks/${blockId}`);
      setData((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== blockId) }));
    } catch {
      alert('Failed to remove block');
    }
  }

  function copyFeed() {
    navigator.clipboard?.writeText(data.feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-red-600">{error || 'Calendar unavailable'}</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <Link to={`/admin/properties/${id}/edit`} className="text-sm text-[#6b7280] hover:text-[#C49A6C]">&larr; Back to property</Link>
        <h1 className="text-2xl font-bold text-[#262262] mt-1">Calendar: {data.property.title}</h1>
        <p className="text-sm text-[#6b7280]">Two-way sync with Airbnb, Booking.com, VRBO and other platforms using iCal feeds.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">{error}</div>}

      {/* Outbound feed */}
      <section className="bg-white rounded-2xl border border-[#D9D9D9] p-6 mb-6">
        <h2 className="text-lg font-bold text-[#262262] mb-1">Export this calendar</h2>
        <p className="text-sm text-[#6b7280] mb-4">Paste this link into Airbnb / Booking.com so they block the dates booked on ZuriLofts.</p>
        <div className="flex items-center gap-2">
          <input readOnly value={data.feedUrl} className={`${inputCls} font-mono text-xs`} onFocus={(e) => e.target.select()} />
          <button onClick={copyFeed} className="shrink-0 bg-[#262262] text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-[#1d1a4d] transition-colors text-sm">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </section>

      {/* Imported feeds */}
      <section className="bg-white rounded-2xl border border-[#D9D9D9] p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-[#262262]">Imported calendars</h2>
          <button
            onClick={syncNow}
            disabled={syncing || data.sources.length === 0}
            className="text-sm font-semibold px-4 py-2 rounded-full border border-[#D9D9D9] text-[#262262] hover:border-[#C49A6C] hover:text-[#C49A6C] transition-colors disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync now'}
          </button>
        </div>
        <p className="text-sm text-[#6b7280] mb-4">Add the iCal export URL from each platform to pull in their bookings.</p>

        {data.sources.length > 0 ? (
          <div className="space-y-2 mb-5">
            {data.sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-[#f8f9fa] rounded-xl px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-[#262262]">{s.name}</p>
                  <p className="text-[#6b7280] text-xs truncate max-w-md">{s.url}</p>
                  <p className={`text-xs mt-0.5 ${s.lastStatus?.startsWith('ERROR') ? 'text-red-600' : 'text-green-700'}`}>
                    {s.lastSyncedAt ? `${s.lastStatus} · ${new Date(s.lastSyncedAt).toLocaleString()}` : 'Not synced yet'}
                  </p>
                </div>
                <button onClick={() => removeSource(s.id)} className="shrink-0 text-red-600 hover:text-red-800 text-xs font-semibold ml-3">Remove</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6b7280] mb-5">No external calendars connected.</p>
        )}

        <form onSubmit={addSource} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className={labelCls}>Platform</label>
            <input className={inputCls} placeholder="Airbnb" value={sourceDraft.name} onChange={(e) => setSourceDraft({ ...sourceDraft, name: e.target.value })} required />
          </div>
          <div className="md:col-span-7">
            <label className={labelCls}>iCal URL</label>
            <input className={inputCls} placeholder="https://www.airbnb.com/calendar/ical/....ics" value={sourceDraft.url} onChange={(e) => setSourceDraft({ ...sourceDraft, url: e.target.value })} required />
          </div>
          <button type="submit" className="md:col-span-2 bg-[#C49A6C] text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-[#b8895c] transition-colors">Add feed</button>
        </form>
      </section>

      {/* Blocked dates */}
      <section className="bg-white rounded-2xl border border-[#D9D9D9] p-6">
        <h2 className="text-lg font-bold text-[#262262] mb-1">Blocked dates</h2>
        <p className="text-sm text-[#6b7280] mb-4">Imported bookings (read-only) and manual blocks. Blocked ranges can't be booked on ZuriLofts.</p>

        {data.blocks.length > 0 ? (
          <div className="space-y-2 mb-5">
            {data.blocks.map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-[#f8f9fa] rounded-xl px-4 py-2.5 text-sm">
                <div>
                  <span className="font-semibold text-[#262262]">{fmt(b.start)} &rarr; {fmt(b.end)}</span>
                  <span className="text-[#6b7280] ml-2">{b.summary || 'Blocked'}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${b.manual ? 'bg-[#C49A6C]/15 text-[#8a6a3e]' : 'bg-blue-100 text-blue-700'}`}>
                    {b.manual ? 'Manual' : b.sourceName || 'Imported'}
                  </span>
                </div>
                {b.manual && (
                  <button onClick={() => removeBlock(b.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Remove</button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6b7280] mb-5">No blocked dates.</p>
        )}

        <form onSubmit={addBlock} className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className={labelCls}>From</label>
            <input type="date" className={inputCls} value={blockDraft.start} onChange={(e) => setBlockDraft({ ...blockDraft, start: e.target.value })} required />
          </div>
          <div className="md:col-span-3">
            <label className={labelCls}>To</label>
            <input type="date" className={inputCls} value={blockDraft.end} onChange={(e) => setBlockDraft({ ...blockDraft, end: e.target.value })} required />
          </div>
          <div className="md:col-span-4">
            <label className={labelCls}>Reason</label>
            <input className={inputCls} placeholder="Maintenance" value={blockDraft.summary} onChange={(e) => setBlockDraft({ ...blockDraft, summary: e.target.value })} />
          </div>
          <button type="submit" className="md:col-span-2 bg-[#262262] text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-[#1d1a4d] transition-colors">Block</button>
        </form>
      </section>
    </div>
  );
}

export default AdminCalendar;
