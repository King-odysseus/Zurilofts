import { useCallback, useEffect, useState } from 'react';
import { Button, Label, TextInput } from 'flowbite-react';
import apiClient from '../api/client.js';

const EMPTY = { code: '', discountPercent: 10, validFrom: '', validUntil: '', maxDiscount: '', minBookingAmount: '', maxUses: '' };

export default function HostPromosPage() {
  const [promos, setPromos] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await apiClient.get('/promo/mine');
    setPromos(response.data.data || []);
  }, []);

  useEffect(() => { load().catch(() => setMessage('Could not load your discounts.')); }, [load]);

  function updateField(name, value) { setForm((current) => ({ ...current, [name]: value })); }

  async function createPromo(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = { ...form, discountPercent: Number(form.discountPercent) };
      for (const key of ['maxDiscount', 'minBookingAmount', 'maxUses']) {
        if (payload[key] === '') delete payload[key]; else payload[key] = Number(payload[key]);
      }
      await apiClient.post('/promo/mine', payload);
      setForm(EMPTY);
      setMessage('Discount created.');
      await load();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Could not create discount.');
    } finally { setSaving(false); }
  }

  async function deactivate(id) {
    try { await apiClient.delete(`/promo/mine/${id}`); await load(); setMessage('Discount deactivated.'); }
    catch (error) { setMessage(error.response?.data?.error || 'Could not update discount.'); }
  }

  return <div className="mx-auto max-w-5xl space-y-8">
    <div><p className="text-xs font-semibold tracking-[0.18em] text-[#C49A6C]">HOST WORKSPACE</p><h1 className="mt-2 text-3xl font-semibold text-[#0B1F42]">Discounts</h1><p className="mt-2 text-sm text-[#64748B]">Create offers funded from your own booking earnings.</p></div>
    {message && <p role="status" className="rounded-xl bg-[#F7F1EA] px-4 py-3 text-sm text-[#0B1F42]">{message}</p>}
    <form onSubmit={createPromo} className="rounded-2xl border border-[#E3E8EF] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#0B1F42]">Create a discount</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {['code', 'discountPercent', 'validFrom', 'validUntil', 'maxDiscount', 'minBookingAmount', 'maxUses'].map((name) => <div key={name}><Label htmlFor={`host-promo-${name}`}>{name === 'code' ? 'Code' : name.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase())}</Label><TextInput id={`host-promo-${name}`} type={name.includes('valid') ? 'date' : name === 'code' ? 'text' : 'number'} min={name === 'discountPercent' ? 1 : 0} max={name === 'discountPercent' ? 100 : undefined} value={form[name]} onChange={(event) => updateField(name, event.target.value)} required={['code', 'discountPercent', 'validFrom', 'validUntil'].includes(name)} /></div>)}
      </div>
      <Button type="submit" className="mt-5 bg-[#C49A6C] text-[#0B1F42]" disabled={saving}>{saving ? 'Creating...' : 'Create discount'}</Button>
    </form>
    <section className="space-y-3">{promos.length === 0 ? <p className="text-sm text-[#64748B]">You have not created any discounts yet.</p> : promos.map((promo) => <article key={promo.id} className="flex items-center justify-between rounded-2xl border border-[#E3E8EF] bg-white p-5"><div><strong className="text-[#0B1F42]">{promo.code}</strong><p className="mt-1 text-sm text-[#64748B]">{promo.discountPercent}% off, {promo.currentUses || 0}{promo.maxUses ? ` / ${promo.maxUses}` : ''} uses</p></div><Button color="light" onClick={() => deactivate(promo.id)} disabled={!promo.active}>{promo.active ? 'Deactivate' : 'Inactive'}</Button></article>)}</section>
  </div>;
}
