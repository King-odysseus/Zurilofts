import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Label, TextInput } from 'flowbite-react';
import PropTypes from 'prop-types';
import {
  CalendarDays,
  ChevronLeft,
  CircleAlert,
  Copy,
  Link2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import apiClient from '../api/client.js';

const formatDate = (value) => new Date(value).toLocaleDateString('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function CalendarState({ icon, title, copy, children }) {
  return (
    <div className="op-admin-calendar-state">
      <span aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      <p>{copy}</p>
      {children}
    </div>
  );
}

CalendarState.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  copy: PropTypes.string.isRequired,
  children: PropTypes.node,
};

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
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/admin/properties/${id}/calendar`);
      setData(res.data.data);
    } catch {
      setError('Failed to load the availability calendar.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addSource(event) {
    event.preventDefault();
    setError('');
    try {
      await apiClient.post(`/admin/properties/${id}/calendar/sources`, sourceDraft);
      setSourceDraft({ name: '', url: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to add the calendar feed.');
    }
  }

  async function removeSource(sourceId) {
    if (!window.confirm('Remove this calendar feed and its imported blocks?')) return;
    try {
      await apiClient.delete(`/admin/properties/${id}/calendar/sources/${sourceId}`);
      await load();
    } catch {
      setError('Failed to remove the calendar feed.');
    }
  }

  async function syncNow() {
    setSyncing(true);
    setError('');
    try {
      await apiClient.post(`/admin/properties/${id}/calendar/sync`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Calendar sync failed.');
    } finally {
      setSyncing(false);
    }
  }

  async function addBlock(event) {
    event.preventDefault();
    setError('');
    try {
      await apiClient.post(`/admin/properties/${id}/calendar/blocks`, {
        start: blockDraft.start,
        end: blockDraft.end,
        summary: blockDraft.summary || undefined,
      });
      setBlockDraft({ start: '', end: '', summary: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to block the selected dates.');
    }
  }

  async function removeBlock(blockId) {
    try {
      await apiClient.delete(`/admin/properties/${id}/calendar/blocks/${blockId}`);
      setData((current) => ({
        ...current,
        blocks: current.blocks.filter((block) => block.id !== blockId),
      }));
    } catch {
      setError('Failed to remove the blocked dates.');
    }
  }

  async function copyFeed() {
    try {
      await navigator.clipboard?.writeText(data.feedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Unable to copy the calendar link. Select the link and copy it manually.');
    }
  }

  if (loading && !data) {
    return (
      <CalendarState
        icon={<RefreshCw className="is-spinning" />}
        title="Loading calendar"
        copy="Checking imported feeds and blocked dates for this listing."
      />
    );
  }

  if (!data) {
    return (
      <CalendarState
        icon={<CircleAlert />}
        title="Calendar unavailable"
        copy={error || 'The listing calendar could not be loaded.'}
      >
        <Button color="dark" className="op-admin-calendar-primary" onClick={load}>Try again</Button>
      </CalendarState>
    );
  }

  return (
    <div className="op-admin-calendar">
      <header className="op-admin-calendar-heading">
        <div>
          <Link to={`/admin/properties/${id}/edit`} className="op-admin-calendar-back">
            <ChevronLeft aria-hidden="true" />
            Back to listing
          </Link>
          <p className="op-admin-eyebrow">ZURILOFTS · ADMIN · CALENDAR</p>
          <h1>Availability calendar</h1>
          <span>{data.property.title} · Manage external feeds and manual closures.</span>
        </div>
        <Badge color="info" className="op-admin-calendar-badge">
          <CalendarDays aria-hidden="true" />
          iCal sync
        </Badge>
      </header>

      {error && (
        <Alert color="failure" icon={CircleAlert} className="op-admin-calendar-alert">
          {error}
        </Alert>
      )}

      <section className="op-admin-calendar-card">
        <header className="op-admin-calendar-card-head">
          <span className="op-admin-calendar-card-icon" aria-hidden="true"><Link2 /></span>
          <div>
            <h2>Export this calendar</h2>
            <p>Use this feed in Airbnb, Booking.com or another channel to keep their dates in sync.</p>
          </div>
        </header>
        <div className="op-admin-calendar-copy-row">
          <TextInput
            readOnly
            value={data.feedUrl}
            className="op-admin-calendar-feed"
            aria-label="Calendar export URL"
            onFocus={(event) => event.target.select()}
          />
          <Button color="dark" className="op-admin-calendar-primary" onClick={copyFeed}>
            <Copy aria-hidden="true" />
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
      </section>

      <section className="op-admin-calendar-card">
        <header className="op-admin-calendar-card-head">
          <span className="op-admin-calendar-card-icon" aria-hidden="true"><RefreshCw /></span>
          <div>
            <h2>Imported calendars</h2>
            <p>Connect external iCal feeds so their reservations block the same dates here.</p>
          </div>
          <Button
            color="light"
            className="op-admin-calendar-outline"
            onClick={syncNow}
            disabled={syncing || data.sources.length === 0}
          >
            <RefreshCw aria-hidden="true" className={syncing ? 'is-spinning' : ''} />
            {syncing ? 'Syncing' : 'Sync now'}
          </Button>
        </header>

        {data.sources.length > 0 ? (
          <div className="op-admin-calendar-list">
            {data.sources.map((source) => (
              <article key={source.id} className="op-admin-calendar-row">
                <div>
                  <strong>{source.name}</strong>
                  <span>{source.url}</span>
                  <small className={source.lastStatus?.startsWith('ERROR') ? 'is-error' : ''}>
                    {source.lastSyncedAt
                      ? `${source.lastStatus} · ${new Date(source.lastSyncedAt).toLocaleString()}`
                      : 'Not synced yet'}
                  </small>
                </div>
                <Button color="light" size="xs" className="op-admin-calendar-danger" onClick={() => removeSource(source.id)}>
                  <Trash2 aria-hidden="true" />
                  Remove
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="op-admin-calendar-empty">
            <Link2 aria-hidden="true" />
            <strong>No external calendars connected</strong>
            <span>Add the export URL from the platform you use.</span>
          </div>
        )}

        <form onSubmit={addSource} className="op-admin-calendar-form is-source-form">
          <div>
            <Label htmlFor="calendar-platform">Platform</Label>
            <TextInput
              id="calendar-platform"
              placeholder="Airbnb"
              value={sourceDraft.name}
              onChange={(event) => setSourceDraft({ ...sourceDraft, name: event.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="calendar-feed-url">iCal URL</Label>
            <TextInput
              id="calendar-feed-url"
              type="url"
              placeholder="https://www.airbnb.com/calendar/ical/....ics"
              value={sourceDraft.url}
              onChange={(event) => setSourceDraft({ ...sourceDraft, url: event.target.value })}
              required
            />
          </div>
          <Button type="submit" className="op-admin-calendar-bronze">
            <Plus aria-hidden="true" />
            Add feed
          </Button>
        </form>
      </section>

      <section className="op-admin-calendar-card">
        <header className="op-admin-calendar-card-head">
          <span className="op-admin-calendar-card-icon" aria-hidden="true"><CalendarDays /></span>
          <div>
            <h2>Blocked dates</h2>
            <p>Imported reservations are read-only. Manual blocks stop guests booking those dates.</p>
          </div>
        </header>

        {data.blocks.length > 0 ? (
          <div className="op-admin-calendar-list">
            {data.blocks.map((block) => (
              <article key={block.id} className="op-admin-calendar-row">
                <div>
                  <strong>{formatDate(block.start)} → {formatDate(block.end)}</strong>
                  <span>{block.summary || 'Blocked dates'}</span>
                  <Badge color={block.manual ? 'warning' : 'info'} className="op-admin-calendar-source-badge">
                    {block.manual ? 'Manual block' : block.sourceName || 'Imported'}
                  </Badge>
                </div>
                {block.manual && (
                  <Button color="light" size="xs" className="op-admin-calendar-danger" onClick={() => removeBlock(block.id)}>
                    <Trash2 aria-hidden="true" />
                    Remove
                  </Button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="op-admin-calendar-empty">
            <CalendarDays aria-hidden="true" />
            <strong>No blocked dates</strong>
            <span>Imported bookings and manual closures will appear here.</span>
          </div>
        )}

        <form onSubmit={addBlock} className="op-admin-calendar-form is-block-form">
          <div>
            <Label htmlFor="calendar-block-start">From</Label>
            <TextInput
              id="calendar-block-start"
              type="date"
              value={blockDraft.start}
              onChange={(event) => setBlockDraft({ ...blockDraft, start: event.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="calendar-block-end">To</Label>
            <TextInput
              id="calendar-block-end"
              type="date"
              value={blockDraft.end}
              onChange={(event) => setBlockDraft({ ...blockDraft, end: event.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="calendar-block-reason">Reason</Label>
            <TextInput
              id="calendar-block-reason"
              placeholder="Maintenance"
              value={blockDraft.summary}
              onChange={(event) => setBlockDraft({ ...blockDraft, summary: event.target.value })}
            />
          </div>
          <Button type="submit" color="dark" className="op-admin-calendar-primary">
            <CalendarDays aria-hidden="true" />
            Block dates
          </Button>
        </form>
      </section>
    </div>
  );
}

export default AdminCalendar;
