import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Alert, Button, Label, TextInput } from 'flowbite-react';
import { BadgeCheck, Banknote, CircleAlert, Smartphone } from 'lucide-react';
import apiClient from '../api/client.js';
import HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import SelectMenu from '../components/SelectMenu.jsx';

// Host settings, inside the host workspace. Payouts and profile links used to
// send a host to /profile, which is the traveller account page and reads as the
// wrong side of the product. The same endpoints back both, so nothing about the
// money moved; only the place a host lands did.

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'hostaccount.weekly' },
  { value: 'monthly', label: 'hostaccount.monthly' },
  { value: 'on_demand', label: 'hostaccount.onDemand' },
];

function Section({ title, description, children, icon: Icon }) {
  // The shared card head carries the title and description; the section glyph is
  // demoted to a quiet mark on the right so every section title starts at one x.
  return <HostCard
    title={title}
    description={description}
    action={Icon
      ? <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-muted"><Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /></span>
      : undefined}
  >
    <div className="flex flex-col gap-6">{children}</div>
  </HostCard>;
}

Section.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.node.isRequired,
  icon: PropTypes.elementType,
};

function Message({ tone, children }) {
  if (!children) return null;
  return <p className={`text-xs leading-relaxed ${tone === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{children}</p>;
}

Message.propTypes = { tone: PropTypes.string, children: PropTypes.node };

export default function HostSettingsPage() {
  const { t } = useLanguage();
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
    return <div className="flex flex-col gap-4" role="status" aria-label={t('hostaccount.loadingSettings')}>
      <span className="block h-24 animate-pulse rounded-2xl bg-inset" />
      <span className="block h-40 animate-pulse rounded-2xl bg-inset" />
      <span className="block h-28 animate-pulse rounded-2xl bg-inset" />
    </div>;
  }

  if (error) {
    return <HostCard>
      <div className="py-6 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-surface text-muted">
          <CircleAlert className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm text-muted">{error}</p>
        <Button className="mt-4 min-h-[44px] w-full sm:mx-auto sm:w-fit" size="sm" onClick={load}>{t('common.retry')}</Button>
      </div>
    </HostCard>;
  }

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Host';
  const hasDestination = Boolean(profile?.payoutMethod || profile?.mpesaPhone || profile?.bankAccountNo);

  return <div className="flex flex-col gap-6 lg:gap-8">
    <header>
      <p className={HOST_EYEBROW}>{t('host.workspace')}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{t('hostaccount.settingsTitle')}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t('hostaccount.settingsDescription')}</p>
    </header>

    <HostCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-navy-bg text-sm font-bold text-white">
            {profile?.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : displayName[0]?.toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy">{displayName}</p>
            <p className="truncate text-xs text-muted">{profile?.email}</p>
          </div>
        </div>
        <Button as={Link} to="/host/verification" color="light" size="sm" className="min-h-[44px] w-full sm:w-fit">
          <BadgeCheck className="mr-1.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          Verification status
        </Button>
      </div>
    </HostCard>

    <Section
      title={t('hostaccount.yourDetails')}
      description={t('hostaccount.yourDetailsDescription')}
      icon={BadgeCheck}
    >
      {/* One rhythm for every group: label above field, gap-6 between groups,
          one full-width action at the end of the form. */}
      <form onSubmit={saveProfile} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="host-first-name" className="mb-1.5 block">{t('hostaccount.firstName')}</Label>
            <TextInput
              id="host-first-name"
              value={form.firstName}
              onChange={(event) => setForm((previous) => ({ ...previous, firstName: event.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="host-last-name" className="mb-1.5 block">{t('hostaccount.lastName')}</Label>
            <TextInput
              id="host-last-name"
              value={form.lastName}
              onChange={(event) => setForm((previous) => ({ ...previous, lastName: event.target.value }))}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="host-phone" className="mb-1.5 block">{t('hostaccount.phone')}</Label>
          <TextInput
            id="host-phone"
            value={form.phone}
            onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
            placeholder="+254 7xx xxx xxx"
          />
        </div>
        <div>
          <Label htmlFor="host-email" className="mb-1.5 block">{t('hostaccount.email')}</Label>
          <TextInput id="host-email" value={profile?.email || ''} readOnly disabled />
          <p className="mt-1.5 text-xs text-muted">{t('hostaccount.emailLocked')}</p>
        </div>
        <div className="flex flex-col gap-1 border-t border-border pt-6">
          <Button type="submit" disabled={savingProfile} className="min-h-[44px] w-full sm:w-fit">{savingProfile ? t('common.saving') : t('hostaccount.saveDetails')}</Button>
          <Message>{profileMessage}</Message>
          <Message tone="error">{profileError}</Message>
        </div>
      </form>
    </Section>

    <Section
      title={t('hostaccount.howYouGetPaid')}
      description={hasDestination ? 'Guests pay the platform; your share is paid out to this destination.' : 'Add a destination so your earnings can be paid out.'}
      icon={Banknote}
    >
      <form onSubmit={savePayout} className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('hostaccount.destinationType')}>
          {[
            { key: 'mpesa', label: t('booking.payByMpesa'), icon: Smartphone },
            { key: 'bank', label: t('hostaccount.bank'), icon: Banknote },
          ].map(({ key, label, icon: Icon }) => <button
            key={key}
            type="button"
            onClick={() => setPayoutMethod(key)}
            aria-pressed={payoutMethod === key}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${payoutMethod === key ? 'bg-navy-bg text-white hover:bg-navy-hover' : 'border border-border text-muted hover:text-navy'}`}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            {label}
          </button>)}
        </div>

        {payoutMethod === 'mpesa' ? <div>
          <Label htmlFor="host-mpesa" className="mb-1.5 block">{t('hostaccount.mpesaNumber')}</Label>
          <TextInput
            id="host-mpesa"
            value={mpesaPhone}
            onChange={(event) => setMpesaPhone(event.target.value)}
            placeholder="07xx xxx xxx"
          />
          <p className="mt-1.5 text-xs text-muted">{t('hostaccount.mpesaHint')}</p>
        </div> : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="host-bank-name" className="mb-1.5 block">{t('hostaccount.bank')}</Label>
            {/* SelectMenu, not Flowbite's Select: a native <select> opens the
                operating system's blue option list, which ignores the palette.
                Codes are compared as strings so Paystack codes that start with a
                zero ("011") survive the trip. */}
            {banks.length > 0 ? <SelectMenu
              id="host-bank-name"
              value={bankForm.bankCode}
              onChange={(next) => {
                const bank = banks.find((entry) => String(entry.code) === next);
                setBankForm((previous) => ({
                  ...previous,
                  bankCode: next,
                  bankName: bank?.name || previous.bankName,
                }));
              }}
              options={[
                { value: '', label: t('hostaccount.chooseBank') },
                ...banks.map((bank) => ({ value: String(bank.code), label: bank.name })),
              ]}
              ariaLabel={t('a11y2.bank')}
              placeholder={t('a11y2.chooseYourBank')}
            /> : <TextInput
              id="host-bank-name"
              value={bankForm.bankName}
              onChange={(event) => setBankForm((previous) => ({ ...previous, bankName: event.target.value }))}
              placeholder={t('hostaccount.bankName')}
            />}
          </div>
          <div>
            <Label htmlFor="host-bank-account" className="mb-1.5 block">{t('hostaccount.accountNumber')}</Label>
            <TextInput
              id="host-bank-account"
              value={bankForm.bankAccountNo}
              onChange={(event) => setBankForm((previous) => ({ ...previous, bankAccountNo: event.target.value }))}
              inputMode="numeric"
            />
          </div>
          <div>
            <Label htmlFor="host-bank-code" className="mb-1.5 block">{t('hostaccount.bankCode')}</Label>
            <TextInput
              id="host-bank-code"
              value={bankForm.bankCode}
              onChange={(event) => setBankForm((previous) => ({ ...previous, bankCode: event.target.value }))}
            />
          </div>
        </div>}

        <div className="flex flex-col gap-1 border-t border-border pt-6">
          <Button type="submit" disabled={savingPayout} className="min-h-[44px] w-full sm:w-fit">{savingPayout ? t('common.saving') : t('hostaccount.savePayoutDestination')}</Button>
          <Message>{payoutMessage}</Message>
          <Message tone="error">{payoutError}</Message>
        </div>
      </form>
    </Section>

    <Section
      title={t('hostaccount.whenYouGetPaid')}
      description={t('hostaccount.whenYouGetPaidDescription')}
    >
      {/* The section body already spaces its children, so no extra wrapper. */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('hostaccount.payoutTiming')}>
        {FREQUENCY_OPTIONS.map((option) => <button
          key={option.value}
          type="button"
          onClick={() => saveFrequency(option.value)}
          aria-pressed={frequency === option.value}
          disabled={savingFrequency}
          className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${frequency === option.value ? 'bg-navy-bg text-white hover:bg-navy-hover' : 'bg-surface text-muted hover:bg-inset hover:text-navy'}`}
        >
          {t(option.label)}
        </button>)}
      </div>
      <div className="flex flex-col gap-1">
        <Message>{frequencyMessage}</Message>
        <Message tone="error">{frequencyError}</Message>
      </div>
      <p className="text-xs text-muted">
        {t('hostaccount.seeHistoryPrefix')} <Link to="/host/payouts" className="font-semibold text-navy underline underline-offset-2">{t('hostaccount.payoutHistoryLink')}</Link> {t('hostaccount.seeHistorySuffix')}
      </p>
    </Section>

    <Alert color="info">
      <p className="text-xs leading-relaxed">
        {t('hostaccount.commissionNote')}
      </p>
    </Alert>
  </div>;
}
