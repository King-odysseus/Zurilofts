import { useCallback, useEffect, useState } from 'react';
import { Button, Label, TextInput } from 'flowbite-react';
import PropTypes from 'prop-types';

import apiClient from '../api/client.js';

const EMPTY = { code: '', discountPercent: 10, validFrom: '', validUntil: '', maxDiscount: '', minBookingAmount: '', maxUses: '' };

const FIELDS = ['code', 'discountPercent', 'validFrom', 'validUntil', 'maxDiscount', 'minBookingAmount', 'maxUses'];

// Explicit labels beat a regex that has to guess where the capital letters are,
// and the optional money fields carry their unit so the value is unambiguous.
const FIELD_META = {
  code: { label: 'Code', type: 'text', required: true, hint: 'Guests type this at checkout' },
  discountPercent: { label: 'Discount %', type: 'number', required: true, min: 1, max: 100 },
  validFrom: { label: 'Valid from', type: 'date', required: true },
  validUntil: { label: 'Valid until', type: 'date', required: true },
  maxDiscount: { label: 'Max discount (KES)', type: 'number', min: 0, optional: true },
  minBookingAmount: { label: 'Min booking (KES)', type: 'number', min: 0, optional: true },
  maxUses: { label: 'Max uses', type: 'number', min: 0, optional: true },
};

const PANEL = 'min-w-0 rounded-2xl border border-[#EEF1F5] bg-[#F8FAFC] p-4 md:p-5';

const LABEL = 'mb-1.5 block text-[10px] font-extrabold text-[#475569]';

const BRONZE_BUTTON = '!bg-[#C49A6C] !text-[#0B1F42] hover:!bg-[#B8895B] focus:!ring-[#C49A6C]';

function Message({ tone, children }) {
  const isError = tone === 'error';
  return (
    <p
      role={isError ? 'alert' : 'status'}
      className={`m-0 rounded-xl px-4 py-3 text-xs font-semibold ${isError ? 'bg-[#FFF7F7] text-[#9F3A3A]' : 'bg-[#F7F1EA] text-[#0B1F42]'}`}
    >
      {children}
    </p>
  );
}

Message.propTypes = {
  tone: PropTypes.oneOf(['success', 'error']),
  children: PropTypes.node.isRequired,
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

  useEffect(() => {
    document.title = 'Discounts | ZuriLofts Host';
  }, []);

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
    setForm((current) => ({ ...current, [name]: value }));
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
    <div className="flex flex-col gap-10 text-[#334155] max-md:gap-[26px]">
      <header>
        <p className="m-0 mb-[7px] font-montserrat text-[11px] font-extrabold tracking-[1.2px] text-[#9A6A3A]">HOST WORKSPACE</p>
        <h1 className="m-0 text-[29px] leading-[1.14] text-[#0B1F42] max-md:text-[25px]">Discounts</h1>
        <p className="m-0 mt-1.5 max-w-[560px] text-[13px] text-[#64748B] max-md:text-xs">Create offers funded from your own booking earnings.</p>
      </header>

      {message.text && <Message tone={message.tone}>{message.text}</Message>}

      <form onSubmit={createPromo} className={PANEL}>
        <div className="mb-[18px]">
          <h2 className="m-0 text-[17px] leading-[1.25] text-[#0B1F42]">Create a discount</h2>
          <p className="m-0 mt-[5px] text-[11px] text-[#64748B]">Required fields are the code, the percentage, and the valid dates.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map((name) => {
            const meta = FIELD_META[name];
            return (
              <div key={name}>
                <Label htmlFor={`host-promo-${name}`} className={LABEL}>
                  {meta.label}{meta.optional ? <span className="font-medium text-[#94A3B8]"> (optional)</span> : null}
                </Label>
                <TextInput
                  id={`host-promo-${name}`}
                  type={meta.type}
                  min={meta.min}
                  max={meta.max}
                  value={form[name]}
                  onChange={(event) => updateField(name, event.target.value)}
                  required={meta.required}
                />
                {meta.hint && <p className="m-0 mt-1.5 text-[10px] text-[#94A3B8]">{meta.hint}</p>}
              </div>
            );
          })}
        </div>

        <Button type="submit" className={`mt-5 ${BRONZE_BUTTON}`} disabled={saving}>
          {saving ? 'Creating...' : 'Create discount'}
        </Button>
      </form>

      <section className={PANEL}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="m-0 text-[17px] leading-[1.25] text-[#0B1F42]">Your discounts</h2>
            <p className="m-0 mt-[5px] text-[11px] text-[#64748B]">Deactivated codes stop working immediately; existing bookings keep their discount.</p>
          </div>
          {!loading && <span className="flex-none rounded-full bg-elevated px-[9px] py-[5px] text-[10px] font-extrabold text-[#64748B]">{promos.length} code{promos.length === 1 ? '' : 's'}</span>}
        </div>

        {loading ? (
          <div className="flex flex-col gap-2" aria-label="Loading discounts" role="status">
            <span className="h-16 animate-pulse rounded-[13px] bg-elevated" />
            <span className="h-16 animate-pulse rounded-[13px] bg-elevated [animation-delay:150ms]" />
          </div>
        ) : promos.length === 0 ? (
          <div className="grid min-h-[160px] place-items-center content-center rounded-[13px] bg-elevated p-6 text-center">
            <strong className="text-xs text-[#0B1F42]">No discounts yet</strong>
            <p className="mx-auto mt-1.5 max-w-[320px] text-[10px] leading-normal text-[#94A3B8]">Create your first code above and it will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {promos.map((promo) => (
              <article key={promo.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-[13px] bg-elevated p-3.5">
                <div className="min-w-0">
                  <strong className="block font-mono text-[13px] text-[#0B1F42]">{promo.code}</strong>
                  <p className="m-0 mt-1 text-[11px] text-[#64748B]">
                    {promo.discountPercent}% off · {promo.currentUses || 0}{promo.maxUses ? ` / ${promo.maxUses}` : ''} uses
                  </p>
                </div>
                <Button color="light" onClick={() => deactivate(promo.id)} disabled={!promo.active || busyId === promo.id}>
                  {busyId === promo.id ? 'Working...' : promo.active ? 'Deactivate' : 'Inactive'}
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
