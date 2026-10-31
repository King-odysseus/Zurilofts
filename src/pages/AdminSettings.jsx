import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Label, Spinner, TextInput } from 'flowbite-react';
import { Camera, CircleAlert, LockKeyhole, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

// Admin account settings, inside the admin workspace. /profile is the traveller
// side of the product: it carries bookings, favourites, verification and payout
// fields an administrator never touches, and leaving /admin to correct a name
// reads as the wrong section. Same endpoints back both, so no server work.

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600';
const CARD = 'rounded-xl border border-border bg-elevated p-5 shadow-sm';
const CHIP_ICON = 'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-50 dark:bg-primary/15 text-primary-600';

function Panel({ title, description, icon: Icon, children }) {
  return (
    <section className={CARD}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-navy">{title}</h2>
          {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
        </div>
        {Icon && (
          <span className={CHIP_ICON}>
            <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Message({ tone, children }) {
  if (!children) return null;
  const isError = tone === 'error';
  return (
    <p
      role={isError ? 'alert' : 'status'}
      className={`rounded-lg px-3 py-2 text-sm ${isError ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-green-200 bg-green-50 text-green-700'}`}
    >
      {children}
    </p>
  );
}

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Mirrors passwordChangeSchema, so the form refuses what the API would reject
// instead of spending a round trip to say the same thing.
function passwordProblem(next, confirmation) {
  if (next.length < 8) return 'The new password must be at least 8 characters.';
  if (!/[A-Z]/.test(next)) return 'The new password needs at least one uppercase letter.';
  if (!/[0-9]/.test(next)) return 'The new password needs at least one number.';
  if (next !== confirmation) return 'The two new passwords do not match.';
  return '';
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const fileInput = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [detailsMessage, setDetailsMessage] = useState('');

  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    apiClient.get('/users/profile')
      .then((response) => {
        if (cancelled) return;
        const data = response.data.data;
        setProfile(data);
        setForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
        });
      })
      .catch((cause) => {
        if (!cancelled) setLoadError(cause.response?.data?.error || 'Could not load your account.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function saveDetails(event) {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setDetailsError('First and last name are both required.');
      setDetailsMessage('');
      return;
    }
    setSavingDetails(true);
    setDetailsError('');
    setDetailsMessage('');
    try {
      const response = await apiClient.put('/users/profile', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
      });
      const saved = response.data.data;
      setProfile((previous) => ({ ...previous, ...saved }));
      // The header and sidebar read the name and avatar from auth state, so a
      // save that only updated this page would look like it silently failed.
      // setUser takes a plain object, not an updater, hence the manual spread.
      setUser({ ...user, ...saved });
      setDetailsMessage('Your details were saved.');
    } catch (cause) {
      setDetailsError(cause.response?.data?.error || 'Could not save your details.');
    } finally {
      setSavingDetails(false);
    }
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    // Reset the field so picking the same file again after a failure still fires.
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Choose a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('The photo must be 5MB or smaller.');
      return;
    }
    setAvatarBusy(true);
    setAvatarError('');
    try {
      const body = new FormData();
      body.append('avatar', file);
      const response = await apiClient.post('/users/avatar', body);
      // The route answers with the whole updated user, not just the new URL.
      const saved = response.data.data;
      setProfile((previous) => ({ ...previous, ...saved }));
      setUser({ ...user, ...saved });
    } catch (cause) {
      setAvatarError(cause.response?.data?.error || 'Could not upload that photo.');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    const problem = passwordProblem(passwords.next, passwords.confirm);
    if (!passwords.current) {
      setPasswordError('Enter your current password.');
      setPasswordMessage('');
      return;
    }
    if (problem) {
      setPasswordError(problem);
      setPasswordMessage('');
      return;
    }
    setSavingPassword(true);
    setPasswordError('');
    setPasswordMessage('');
    try {
      await apiClient.put('/users/password', {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordMessage('Password updated. Every other session has been signed out, and this one ends when the current access token expires.');
    } catch (cause) {
      setPasswordError(cause.response?.data?.error || 'Could not change your password.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logout();
      navigate('/');
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-elevated px-5 py-16 text-center shadow-sm" role="status" aria-label="Loading account settings">
          <Spinner size="lg" aria-hidden="true" />
          <strong className="text-sm font-semibold text-navy">Loading account...</strong>
          <p className="text-xs text-muted">Fetching your admin profile.</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <p className={EYEBROW}>ZURILOFTS · ADMIN · ACCOUNT</p>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Account settings</h1>
        </div>
        <section className={`${CARD} text-center`}>
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-primary-50 dark:bg-primary/15 text-primary-600">
            <CircleAlert className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <p role="alert" className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            {loadError || 'Your account could not be loaded.'}
          </p>
          <Button className="mx-auto mt-4 w-fit" size="sm" onClick={() => window.location.reload()}>Try again</Button>
        </section>
      </div>
    );
  }

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Administrator';
  const initials = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || 'A';
  const usesGoogleSignIn = Boolean(profile.googleId);

  return (
    <div className="space-y-6">
      <div>
        <p className={EYEBROW}>ZURILOFTS · ADMIN · ACCOUNT</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Account settings</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
          Your own administrator account: the name and photo on admin actions, and the password that protects them.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel
            title="Your details"
            description="Shown beside every decision you record in the admin workspace."
            icon={UserRound}
          >
            <form onSubmit={saveDetails} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="admin-first-name" className="mb-1.5 block">First name</Label>
                  <TextInput
                    id="admin-first-name"
                    value={form.firstName}
                    onChange={(event) => setForm((previous) => ({ ...previous, firstName: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="admin-last-name" className="mb-1.5 block">Last name</Label>
                  <TextInput
                    id="admin-last-name"
                    value={form.lastName}
                    onChange={(event) => setForm((previous) => ({ ...previous, lastName: event.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="admin-phone" className="mb-1.5 block">Phone</Label>
                <TextInput
                  id="admin-phone"
                  value={form.phone}
                  onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
                  placeholder="+254 7xx xxx xxx"
                  maxLength={20}
                />
              </div>
              <div>
                <Label htmlFor="admin-email" className="mb-1.5 block">Email</Label>
                <TextInput id="admin-email" value={profile.email || ''} readOnly disabled />
                {/* This address is the login credential and the send target for
                    account recovery; a silent self-service change locks people out. */}
                <p className="mt-1.5 text-xs text-muted">Email changes go through support so sign-in and account history stay attached.</p>
              </div>
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <Button type="submit" disabled={savingDetails} className="w-full sm:w-fit">
                  {savingDetails ? 'Saving...' : 'Save details'}
                </Button>
                <Message tone="error">{detailsError}</Message>
                <Message>{detailsMessage}</Message>
              </div>
            </form>
          </Panel>

          <Panel
            title="Password"
            description={usesGoogleSignIn
              ? 'This account signs in with Google, so there is no password to manage here.'
              : 'Changing it ends every other session on this account.'}
            icon={LockKeyhole}
          >
            {usesGoogleSignIn ? (
              <p className="text-sm leading-relaxed text-muted">
                Sign-in runs through Google. Manage the credential in your Google account, or contact support to add a password.
              </p>
            ) : (
              <form onSubmit={savePassword} className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="admin-current-password" className="mb-1.5 block">Current password</Label>
                  <TextInput
                    id="admin-current-password"
                    type="password"
                    autoComplete="current-password"
                    value={passwords.current}
                    onChange={(event) => setPasswords((previous) => ({ ...previous, current: event.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="admin-new-password" className="mb-1.5 block">New password</Label>
                    <TextInput
                      id="admin-new-password"
                      type="password"
                      autoComplete="new-password"
                      value={passwords.next}
                      onChange={(event) => setPasswords((previous) => ({ ...previous, next: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-confirm-password" className="mb-1.5 block">Confirm new password</Label>
                    <TextInput
                      id="admin-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={passwords.confirm}
                      onChange={(event) => setPasswords((previous) => ({ ...previous, confirm: event.target.value }))}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted">At least 8 characters, with one uppercase letter and one number.</p>
                <div className="flex flex-col gap-2 border-t border-border pt-4">
                  <Button type="submit" disabled={savingPassword} className="w-full sm:w-fit">
                    {savingPassword ? 'Updating...' : 'Update password'}
                  </Button>
                  <Message tone="error">{passwordError}</Message>
                  <Message>{passwordMessage}</Message>
                </div>
              </form>
            )}
          </Panel>
        </div>

        <aside className="space-y-6">
          <section className={CARD}>
            <h2 className="text-base font-semibold text-navy">Your account</h2>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-navy-bg text-sm font-bold text-white">
                {profile.avatar
                  ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
                  : initials}
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-sm font-semibold text-navy">{displayName}</strong>
                <span className="block truncate text-xs text-muted">{profile.email}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary-50 dark:bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-navy">
                {profile.role || 'ADMIN'}
              </span>
              <span className="text-xs text-muted">Member since {formatDate(profile.createdAt)}</span>
            </div>

            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} aria-label="Upload a new profile photo" />
            <Button
              color="light"
              size="sm"
              className="mt-4 w-full"
              disabled={avatarBusy}
              onClick={() => fileInput.current?.click()}
            >
              <Camera className="mr-1.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              {avatarBusy ? 'Uploading...' : 'Change photo'}
            </Button>
            <div className="mt-2">
              <Message tone="error">{avatarError}</Message>
            </div>
            <p className="mt-2 text-xs text-muted">JPEG, PNG or WebP, up to 5MB.</p>
          </section>

          <section className={CARD}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-navy">This session</h2>
              <span className={CHIP_ICON}>
                <ShieldCheck className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              You are signed in as <span className="font-medium text-charcoal">{profile.email}</span>. Admin access is limited to
              reviews, accounts and platform settings.
            </p>
            <Button color="light" size="sm" className="mt-4 w-full" disabled={signingOut} onClick={handleSignOut}>
              <LogOut className="mr-1.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              {signingOut ? 'Signing out...' : 'Sign out'}
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}
