import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Alert, Button, Label, Select, TextInput } from 'flowbite-react';
import { BadgeCheck, Banknote, CircleAlert, Smartphone } from 'lucide-react';
import apiClient from '../api/client.js';

// Host settings, inside the host workspace. Payouts and profile links used to
// send a host to /profile, which is the traveller account page and reads as the
// wrong side of the product. The same endpoints back both, so nothing about the
// money moved; only the place a host lands did.

const CARD = 'rounded-xl border border-border bg-elevated shadow-sm';
const PANEL_HEAD = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600';
const FIELD = 'w-full rounded-xl border border-border bg-elevated text-sm text-navy';

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'on_demand', label: 'As soon as funds are released' },
];

function Section({ title, description, children, icon: Icon }) {
  return <section className={`${CARD} p-4`}>
    <div className="flex items-start gap-3">
      {Icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-primary-600"><Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /></span>}
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-navy">{title}</h2>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>}
      </div>
    </div>
    <div className="mt-3">{children}</div>
  </section>;
}

Section.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.node.isRequired,
  icon: PropTypes.elementType,
};

function Message({ tone, children }) {
  if (!children) return null;
  return <p className={`mt-2 text-xs ${tone === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{children}</p>;
}

Message.propTypes = { tone: PropTypes.string, children: PropTypes.node };

export default function HostSettingsPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  const [payoutMethod, setPayoutMethod] = useState('mpesa');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [bankForm, setBankForm] = useState({ bankName: '', bankAccountNo: '', bankCode: '' });
  const [banks, setBanks] = useState([]);
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState('');
  const [payoutError, setPayoutError] = useState('');

  const [frequency, setFrequency] = useState('monthly');
  const [savingFrequency, setSavingFrequency] = useState(false);
  const [frequencyMessage, setFrequencyMessage] = useState('');
  const [frequencyError, setFrequencyError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/users/profile');
      const data = response.data.data;
      setProfile(data);
      setForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
      });
      setPayoutMethod(data.payoutMethod || (data.mpesaPhone ? 'mpesa' : 'mpesa'));
      setMpesaPhone(data.mpesaPhone || data.phone || '');
      setBankForm({
        bankName: data.bankName || '',
        bankAccountNo: data.bankAccountNo || '',
        bankCode: data.bankCode || '',
      });
      setFrequency(data.payoutFrequency || 'monthly');
    } catch {
      setError('Could not load your host settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (payoutMethod !== 'bank' || banks.length > 0) return undefined;
    let cancelled = false;
    apiClient.get('/payments/banks')
      .then((response) => {
        if (!cancelled) setBanks(response.data?.data || []);
      })
      .catch((bankError) => {
        console.error('Could not load the bank list:', bankError);
      });
    return () => { cancelled = true; };
  }, [payoutMethod, banks.length]);

  async function saveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    setProfileError('');
    try {
      const response = await apiClient.put('/users/profile', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
      });
      setProfile((previous) => ({ ...previous, ...response.data.data }));
      setProfileMessage('Your details were saved.');
    } catch (saveError) {
      setProfileError(saveError.response?.data?.error || 'Could not save your details.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePayout(event) {
    event.preventDefault();
    setSavingPayout(true);
    setPayoutMessage('');
    setPayoutError('');
    try {
      const payload = payoutMethod === 'bank'
        ? {
          payoutMethod: 'bank',
          bankName: bankForm.bankName.trim(),
          bankAccountNo: bankForm.bankAccountNo.trim(),
          bankCode: bankForm.bankCode.trim(),
        }
        : { payoutMethod: 'mpesa', mpesaPhone: mpesaPhone.trim() };
      const response = await apiClient.put('/users/profile/payout-destination', payload);
      setProfile((previous) => ({ ...previous, ...response.data.data }));
      setPayoutMessage('Your payout destination was saved.');
    } catch (saveError) {
      setPayoutError(saveError.response?.data?.error || 'Could not save your payout destination.');
    } finally {
      setSavingPayout(false);
    }
  }

  async function saveFrequency(next) {
    setFrequency(next);
    setSavingFrequency(true);
    setFrequencyMessage('');
    setFrequencyError('');
    try {
      const response = await apiClient.put('/users/profile/payout-frequency', { frequency: next });
      setProfile((previous) => ({ ...previous, payoutFrequency: response.data.data.payoutFrequency }));
      setFrequencyMessage('Payout timing updated.');
    } catch (saveError) {
      setFrequencyError(saveError.response?.data?.error || 'Could not update your payout timing.');
    } finally {
      setSavingFrequency(false);
    }
  }

  if (loading) {
    return <div className="space-y-3" aria-label="Loading host settings">
      <span className="block h-24 animate-pulse rounded-xl bg-surface" />
      <span className="block h-40 animate-pulse rounded-xl bg-surface" />
      <span className="block h-28 animate-pulse rounded-xl bg-surface" />
    </div>;
  }

  if (error) {
    return <div className={`${CARD} px-5 py-12 text-center`}>
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-surface text-primary-600">
        <CircleAlert className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm text-muted">{error}</p>
      <Button className="mx-auto mt-4 w-fit" size="sm" onClick={load}>Try again</Button>
    </div>;
  }

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Host';
  const hasDestination = Boolean(profile?.payoutMethod || profile?.mpesaPhone || profile?.bankAccountNo);

  return <div className="space-y-4">
    <header>
      <p className={PANEL_HEAD}>HOST WORKSPACE</p>
      <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Host settings</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Your host profile, how you get paid, and when funds reach you.</p>
    </header>

    <section className={`${CARD} flex flex-wrap items-center justify-between gap-3 p-4`}>
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-navy-bg text-sm font-bold text-white">
          {profile?.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : displayName[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-navy">{displayName}</p>
          <p className="truncate text-xs text-muted">{profile?.email}</p>
        </div>
      </div>
      <Button as={Link} to="/verify-identity" color="light" size="sm">
        <BadgeCheck className="mr-1.5 h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        Verification status
      </Button>
    </section>

    <Section
      title="Your details"
      description="The name guests see when they book, and the number we use to reach you about a stay."
      icon={BadgeCheck}
    >
      <form onSubmit={saveProfile} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="host-first-name" value="First name" />
            <TextInput
              id="host-first-name"
              className={`mt-1 ${FIELD}`}
              value={form.firstName}
              onChange={(event) => setForm((previous) => ({ ...previous, firstName: event.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="host-last-name" value="Last name" />
            <TextInput
              id="host-last-name"
              className={`mt-1 ${FIELD}`}
              value={form.lastName}
              onChange={(event) => setForm((previous) => ({ ...previous, lastName: event.target.value }))}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="host-phone" value="Phone" />
          <TextInput
            id="host-phone"
            className={`mt-1 ${FIELD}`}
            value={form.phone}
            onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
            placeholder="+254 7xx xxx xxx"
          />
        </div>
        <div>
          <Label htmlFor="host-email" value="Email" />
          <TextInput id="host-email" className={`mt-1 ${FIELD}`} value={profile?.email || ''} readOnly disabled />
          <p className="mt-1 text-[11px] text-muted">Email changes go through support so your booking history stays attached.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save details'}</Button>
          <Message>{profileMessage}</Message>
          <Message tone="error">{profileError}</Message>
        </div>
      </form>
    </Section>

    <Section
      title="How you get paid"
      description={hasDestination ? 'Guests pay the platform; your share is paid out to this destination.' : 'Add a destination so your earnings can be paid out.'}
      icon={Banknote}
    >
      <form onSubmit={savePayout} className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Payout destination type">
          {[
            { key: 'mpesa', label: 'M-PESA', icon: Smartphone },
            { key: 'bank', label: 'Bank account', icon: Banknote },
          ].map(({ key, label, icon: Icon }) => <button
            key={key}
            type="button"
            onClick={() => setPayoutMethod(key)}
            aria-pressed={payoutMethod === key}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${payoutMethod === key ? 'bg-navy-bg text-white' : 'border border-border text-muted hover:text-navy'}`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
            {label}
          </button>)}
        </div>

        {payoutMethod === 'mpesa' ? <div>
          <Label htmlFor="host-mpesa" value="M-PESA number" />
          <TextInput
            id="host-mpesa"
            className={`mt-1 ${FIELD}`}
            value={mpesaPhone}
            onChange={(event) => setMpesaPhone(event.target.value)}
            placeholder="07xx xxx xxx"
          />
          <p className="mt-1 text-[11px] text-muted">Use the Safaricom number registered in your name.</p>
        </div> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="host-bank-name" value="Bank" />
            {banks.length > 0 ? <Select
              id="host-bank-name"
              className={`mt-1 ${FIELD}`}
              value={bankForm.bankCode}
              onChange={(event) => {
                const bank = banks.find((entry) => String(entry.code) === event.target.value);
                setBankForm((previous) => ({
                  ...previous,
                  bankCode: event.target.value,
                  bankName: bank?.name || previous.bankName,
                }));
              }}
            >
              <option value="">Choose your bank</option>
              {banks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
            </Select> : <TextInput
              id="host-bank-name"
              className={`mt-1 ${FIELD}`}
              value={bankForm.bankName}
              onChange={(event) => setBankForm((previous) => ({ ...previous, bankName: event.target.value }))}
              placeholder="Bank name"
            />}
          </div>
          <div>
            <Label htmlFor="host-bank-account" value="Account number" />
            <TextInput
              id="host-bank-account"
              className={`mt-1 ${FIELD}`}
              value={bankForm.bankAccountNo}
              onChange={(event) => setBankForm((previous) => ({ ...previous, bankAccountNo: event.target.value }))}
              inputMode="numeric"
            />
          </div>
          <div>
            <Label htmlFor="host-bank-code" value="Bank code" />
            <TextInput
              id="host-bank-code"
              className={`mt-1 ${FIELD}`}
              value={bankForm.bankCode}
              onChange={(event) => setBankForm((previous) => ({ ...previous, bankCode: event.target.value }))}
            />
          </div>
        </div>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={savingPayout}>{savingPayout ? 'Saving...' : 'Save payout destination'}</Button>
          <Message>{payoutMessage}</Message>
          <Message tone="error">{payoutError}</Message>
        </div>
      </form>
    </Section>

    <Section
      title="When you get paid"
      description="Funds are held for a short window after check-in so a problem can be resolved before money moves."
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Payout timing">
        {FREQUENCY_OPTIONS.map((option) => <button
          key={option.value}
          type="button"
          onClick={() => saveFrequency(option.value)}
          aria-pressed={frequency === option.value}
          disabled={savingFrequency}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${frequency === option.value ? 'bg-navy-bg text-white' : 'border border-border text-muted hover:text-navy'}`}
        >
          {option.label}
        </button>)}
      </div>
      <Message>{frequencyMessage}</Message>
      <Message tone="error">{frequencyError}</Message>
      <p className="mt-3 text-[11px] text-muted">
        See <Link to="/host/payouts" className="underline underline-offset-2 hover:text-navy">payout history</Link> for what has already been paid.
      </p>
    </Section>

    <Alert color="info">
      <p className="text-xs leading-relaxed">
        A guest is never charged a platform fee. The platform earns a commission from your side of the booking, and it is shown on every reservation under &quot;What you earn&quot;.
      </p>
    </Alert>
  </div>;
}
