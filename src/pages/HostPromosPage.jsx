import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Label, TextInput } from 'flowbite-react';

import apiClient from '../api/client.js';
import HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';

const EMPTY = { code: '', discountPercent: 10, validFrom: '', validUntil: '', maxDiscount: '', minBookingAmount: '', maxUses: '' };

const FIELDS = ['code', 'discountPercent', 'validFrom', 'validUntil', 'maxDiscount', 'minBookingAmount', 'maxUses'];

// Explicit labels beat a regex that has to guess where the capital letters are,
// and the optional money fields carry their unit so the value is unambiguous.
// min/max/step/minLength mirror the server schemas so the browser blocks a bad
// value before it becomes a 400 the host has to interpret.
const FIELD_META = {
  code: { label: 'Code', type: 'text', required: true, minLength: 3, maxLength: 20, hint: '3-20 characters, letters, numbers, hyphens or underscores' },
  discountPercent: { label: 'Discount %', type: 'number', required: true, min: 1, max: 100, step: 1 },
  validFrom: { label: 'Valid from', type: 'date', required: true },
  validUntil: { label: 'Valid until', type: 'date', required: true },
  // min 1, not 0: the API validates these as positive integers, so letting a
  // zero through would only produce a server rejection the host has to decode.
  maxDiscount: { label: 'Max discount (KES)', type: 'number', min: 1, step: 1, optional: true },
  minBookingAmount: { label: 'Min booking (KES)', type: 'number', min: 1, step: 1, optional: true },
  maxUses: { label: 'Max uses', type: 'number', min: 1, step: 1, optional: true },
};

export default function HostPromosPage() {
  const [promos, setPromos] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState({ tone: 'success', text: '' });
  const [saving, setSaving] = useState(false);
  // Without this the page claims "no discounts yet" for the moment before the
  // first request resolves, which reads as data loss.
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    const response = await apiClient.get('/promo/mine');
    setPromos(response.data.data || []);
  }, []);

  useEffect(() => {
    let active = true;
    load()
      .catch(() => {
        if (active) setMessage({ tone: 'error', text: 'Could not load your discounts.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [load]);

  function updateField(name, value) {
    // The API's code regex only accepts uppercase letters, so upper-casing on
    // entry keeps a lower-case code from coming back as a 400 the host has to decode.
    setForm((current) => ({ ...current, [name]: name === 'code' ? value.toUpperCase() : value }));
  }

  async function createPromo(event) {
    event.preventDefault();
    setSaving(true);
    setMessage({ tone: 'success', text: '' });
    try {
      const payload = { ...form, discountPercent: Number(form.discountPercent) };
      for (const key of ['maxDiscount', 'minBookingAmount', 'maxUses']) {
        if (payload[key] === '') delete payload[key];
        else payload[key] = Number(payload[key]);
      }
      await apiClient.post('/promo/mine', payload);
      setForm(EMPTY);
      setMessage({ tone: 'success', text: 'Discount created.' });
      await load();
    } catch (error) {
      setMessage({ tone: 'error', text: error.response?.data?.error || 'Could not create discount.' });
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id) {
    setBusyId(id);
    try {
      await apiClient.delete(`/promo/mine/${id}`);
      await load();
      setMessage({ tone: 'success', text: 'Discount deactivated.' });
    } catch (error) {
      setMessage({ tone: 'error', text: error.response?.data?.error || 'Could not update discount.' });
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className={HOST_EYEBROW}>Host workspace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">Discounts</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Create offers funded from your own booking earnings.</p>
      </header>

      {message.text && <Alert color={message.tone === 'error' ? 'failure' : 'success'}>{message.text}</Alert>}

      <HostCard title="Create a discount" description="Required fields are the code, the percentage, and the valid dates.">
        <form onSubmit={createPromo} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.map((name) => {
              const meta = FIELD_META[name];
              return (
                <div key={name}>
                  <Label htmlFor={`host-promo-${name}`} className="mb-1.5 block">
                    {meta.label}{meta.optional ? <span className="font-medium text-muted"> (optional)</span> : null}
                  </Label>
                  <TextInput
                    id={`host-promo-${name}`}
                    type={meta.type}
                    min={meta.min}
                    max={meta.max}
                    step={meta.step}
                    minLength={meta.minLength}
                    maxLength={meta.maxLength}
                    value={form[name]}
                    onChange={(event) => updateField(name, event.target.value)}
                    required={meta.required}
                  />
                  {meta.hint && <p className="mt-1.5 text-xs text-muted">{meta.hint}</p>}
                </div>
              );
            })}
          </div>

          <Button type="submit" disabled={saving} className="w-full sm:w-fit">
            {saving ? 'Creating...' : 'Create discount'}
          </Button>
        </form>
      </HostCard>

      {/* flush: the discount rows are edge to edge, so the card supplies the
          border and the rows supply their own padding. */}
      <HostCard
        flush
        title="Your discounts"
        description="Deactivated codes stop working immediately; existing bookings keep their discount."
        action={loading ? undefined : <Badge color="gray">{promos.length} {promos.length === 1 ? 'code' : 'codes'}</Badge>}
      >
        {loading ? (
          <div className="flex flex-col gap-2 px-4 py-4" aria-label="Loading discounts" role="status">
            <span className="block h-16 animate-pulse rounded-xl bg-inset" />
            <span className="block h-16 animate-pulse rounded-xl bg-inset [animation-delay:150ms]" />
          </div>
        ) : promos.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
            <strong className="text-sm font-semibold text-navy">No discounts yet</strong>
            <p className="mx-auto max-w-[320px] text-xs leading-relaxed text-muted">Create your first code above and it will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {promos.map((promo) => (
              <li key={promo.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <strong className="block truncate font-mono text-sm text-navy">{promo.code}</strong>
                  <p className="mt-0.5 text-xs text-muted">
                    {promo.discountPercent}% off · {promo.currentUses || 0}{promo.maxUses ? ` / ${promo.maxUses}` : ''} uses
                  </p>
                </div>
                <Button type="button" color="light" size="sm" onClick={() => deactivate(promo.id)} disabled={!promo.active || busyId === promo.id}>
                  {busyId === promo.id ? 'Working...' : promo.active ? 'Deactivate' : 'Inactive'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </HostCard>
    </div>
  );
}
