import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Label, TextInput } from 'flowbite-react';

import apiClient from '../api/client.js';
import HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const EMPTY = { code: '', discountPercent: 10, validFrom: '', validUntil: '', maxDiscount: '', minBookingAmount: '', maxUses: '' };

const FIELDS = ['code', 'discountPercent', 'validFrom', 'validUntil', 'maxDiscount', 'minBookingAmount', 'maxUses'];

// Explicit labels beat a regex that has to guess where the capital letters are,
// and the optional money fields carry their unit so the value is unambiguous.
// min/max/step/minLength mirror the server schemas so the browser blocks a bad
// value before it becomes a 400 the host has to interpret.
const FIELD_META = {
  code: { label: 'hostaccount.fieldCode', type: 'text', required: true, minLength: 3, maxLength: 20, hint: 'hostaccount.fieldCodeHint' },
  discountPercent: { label: 'hostaccount.fieldPercent', type: 'number', required: true, min: 1, max: 100, step: 1 },
  validFrom: { label: 'hostaccount.fieldValidFrom', type: 'date', required: true },
  validUntil: { label: 'hostaccount.fieldValidUntil', type: 'date', required: true },
  // min 1, not 0: the API validates these as positive integers, so letting a
  // zero through would only produce a server rejection the host has to decode.
  maxDiscount: { label: 'hostaccount.fieldMaxDiscount', type: 'number', min: 1, step: 1, optional: true },
  minBookingAmount: { label: 'hostaccount.fieldMinBooking', type: 'number', min: 1, step: 1, optional: true },
  maxUses: { label: 'hostaccount.fieldMaxUses', type: 'number', min: 1, step: 1, optional: true },
};

export default function HostPromosPage() {
  const { t } = useLanguage();
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
    <div className="flex flex-col gap-6 lg:gap-8">
      <header>
        <p className={HOST_EYEBROW}>{t('host.workspace')}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{t('hostaccount.discountsTitle')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t('hostaccount.discountsDescription')}</p>
      </header>

      {message.text && <Alert color={message.tone === 'error' ? 'failure' : 'success'}>{message.text}</Alert>}

      <HostCard title={t('hostaccount.createDiscount')} description={t('hostaccount.createDiscountHint')}>
        <form onSubmit={createPromo} className="flex flex-col gap-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.map((name) => {
              const meta = FIELD_META[name];
              return (
                <div key={name}>
                  <Label htmlFor={`host-promo-${name}`} className="mb-1.5 block">
                    {t(meta.label)}{meta.optional ? <span className="font-medium text-muted"> {t('hostaccount.fieldOptional')}</span> : null}
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
                  {meta.hint && <p className="mt-1.5 text-xs text-muted">{t(meta.hint)}</p>}
                </div>
              );
            })}
          </div>

          <Button type="submit" disabled={saving} className="w-full sm:w-fit">
            {saving ? t('hostaccount.creating') : t('hostaccount.createDiscountAction')}
          </Button>
        </form>
      </HostCard>

      {/* flush: the discount rows are edge to edge, so the card supplies the
          border and the rows supply their own padding. */}
      <HostCard
        flush
        title={t('hostaccount.yourDiscounts')}
        description={t('hostaccount.yourDiscountsHint')}
        action={loading ? undefined : <Badge color="gray">{t(promos.length === 1 ? 'hostaccount.codeSingular' : 'hostaccount.codePlural', { count: promos.length })}</Badge>}
      >
        {loading ? (
          <div className="flex flex-col gap-3 px-4 py-4" aria-label={t('hostaccount.loadingDiscounts')} role="status">
            <span className="block h-16 animate-pulse rounded-xl bg-inset" />
            <span className="block h-16 animate-pulse rounded-xl bg-inset [animation-delay:150ms]" />
          </div>
        ) : promos.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
            <strong className="text-sm font-semibold text-navy">{t('hostaccount.noDiscounts')}</strong>
            <p className="mx-auto max-w-[320px] text-xs leading-relaxed text-muted">{t('hostaccount.noDiscountsHint')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {promos.map((promo) => (
              <li key={promo.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div className="min-w-0">
                  <strong className="block truncate font-mono text-sm text-navy">{promo.code}</strong>
                  <p className="mt-1.5 text-xs text-muted">
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
