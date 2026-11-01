import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import {
  Alert, Badge, Button, Checkbox, Label, Modal, ModalBody, ModalFooter, ModalHeader,
  Spinner, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Textarea, TextInput,
} from 'flowbite-react';
import { Search } from 'lucide-react';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TableActionsMenu from '../components/TableActionsMenu.jsx';
import SelectMenu from '../components/SelectMenu.jsx';
import AdminPageHeader from '../components/admin/AdminPageHeader.jsx';
import AdminPagination from '../components/admin/AdminPagination.jsx';
import ConfirmDialog from '../components/admin/ConfirmDialog.jsx';
import MetricCard from '../components/admin/MetricCard.jsx';

const ROLE_LABELS = {
  USER: 'Guest',
  HOST: 'Host',
  ADMIN: 'Admin',
};

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '',
  bankName: '', bankAccountNo: '', bankCode: '', payoutFrequency: '',
};

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'USER', label: 'Guests' },
  { value: 'HOST', label: 'Hosts' },
  { value: 'ADMIN', label: 'Admins' },
];

// Rebuilt on every render of every row if left inline, so the option lists live
// at module scope instead.
const ASSIGNABLE_ROLE_OPTIONS = [
  { value: 'USER', label: 'Guest' },
  { value: 'HOST', label: 'Host' },
];

const PAYOUT_FREQUENCY_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
];

// Server-side page size. The API caps a request at 100 and defaults to 20, so
// the screen asks for an explicit size instead of silently taking the default.
const PAGE_SIZE = 20;

function userInitials(user) {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.trim();
  return initials ? initials.toUpperCase() : 'ZL';
}

function AdminUsers() {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
  const [message, setMessage] = useState('');
  // Success and failure used to share one string and be told apart by looking
  // for the word "fail", which mislabelled any server message containing it.
  const [messageTone, setMessageTone] = useState('success');
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  // The page on screen, and the server's own pagination block. Without the
  // latter the screen could not tell that more accounts existed.
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
  // Destructive actions open a styled dialog instead of the browser confirm.
  const [bulkTarget, setBulkTarget] = useState(null); // { suspended: boolean }
  const [suspendTarget, setSuspendTarget] = useState(null); // the user object
  const [actionError, setActionError] = useState('');

  // Edit modal
  const [editing, setEditing] = useState(null); // the user being edited
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Account erasure modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const loadUsers = useCallback(async (pageToLoad = page) => {
    setLoading(true);
    try {
      const params = { page: pageToLoad, limit: PAGE_SIZE };
      if (roleFilter) params.role = roleFilter;
      if (search.trim()) params.search = search.trim();
      const res = await apiClient.get('/admin/users', { params });
      setUsers(res.data.data || []);
      // Keep the server's block. The screen used to discard it, which is why
      // only the first page of accounts was ever reachable.
      setPagination(res.data.pagination || {
        page: pageToLoad,
        limit: PAGE_SIZE,
        total: res.data.data?.length || 0,
        totalPages: 1,
      });
      setLoadError('');
    } catch (err) {
      // Must not be silent: an empty list and a failed request look identical
      // on screen, so a server outage would read as "you have no users".
      setUsers([]);
      setPagination({ page: pageToLoad, limit: PAGE_SIZE, total: 0, totalPages: 0 });
      setLoadError(err.response?.data?.error || 'Could not load accounts. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, page]);

  // The header search links here as ?search=<email>, which can arrive while this
  // page is already mounted. useState reads the URL only once, so without this
  // the second search would land on an unchanged list and look like a no-op.
  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get('search') || '';
    setSearch((current) => (current === fromUrl ? current : fromUrl));
    // A new term means page 1 of a new result set, and rows selected under the
    // old term are no longer on screen to act on.
    setPage(1);
    setSelectedIds([]);
  }, [location.search]);

  // Debounce search; refetch when the term, the role filter or the page changes.
  useEffect(() => {
    const t = setTimeout(() => loadUsers(page), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [loadUsers, search, page]);

  // Admins and your own account are never bulk-selectable, so a bulk suspend cannot lock the console.
  const selectableUsers = users.filter((u) => u.role !== 'ADMIN' && u.id !== currentUser?.id);

  function toggleSelected(id) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  async function runBulkSetSuspended() {
    if (!selectedIds.length || !bulkTarget) return;
    const { suspended } = bulkTarget;
    setBusyId('bulk');
    setActionError('');
    const results = await Promise.allSettled(selectedIds.map((id) => apiClient.patch(`/admin/users/${id}/suspend`, { suspended })));
    const failed = results.filter((result) => result.status === 'rejected').length;
    setMessage(failed
      ? `Failed to update ${failed} of ${results.length} accounts`
      : `${results.length} accounts ${suspended ? 'suspended' : 'reactivated'}`);
    setMessageTone(failed ? 'failure' : 'success');
    setSelectedIds([]);
    setBulkTarget(null);
    setBusyId('');
    loadUsers();
  }

  function openEdit(u) {
    setEditing(u);
    setFormData({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      phone: u.phone || '',
      bankName: u.bankName || '',
      bankAccountNo: u.bankAccountNo || '',
      bankCode: u.bankCode || '',
      payoutFrequency: u.payoutFrequency || '',
    });
    setFormError('');
  }

  function closeEdit() {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setFormError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    // Send all fields except null/undefined so admins can clear values.
    // payoutFrequency '' is sent explicitly to unset the frequency.
    const payload = {};
    for (const [k, v] of Object.entries(formData)) {
      if (v !== null && v !== undefined) payload[k] = v;
    }
    try {
      await apiClient.patch(`/admin/users/${editing.id}`, payload);
      closeEdit();
      loadUsers();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(u, role) {
    if (role === u.role) return;
    setBusyId(u.id);
    setMessage('');
    try {
      await apiClient.patch(`/admin/users/${u.id}/role`, { role });
      setMessage(`${u.firstName} ${u.lastName} is now ${role}`);
      setMessageTone('success');
      loadUsers();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to change role');
      setMessageTone('failure');
    } finally {
      setBusyId('');
    }
  }

  // The dialog drives the request; a row action only opens it.
  async function runToggleSuspend() {
    const u = suspendTarget;
    if (!u) return;
    const next = !u.suspended;
    setBusyId(u.id);
    setActionError('');
    try {
      await apiClient.patch(`/admin/users/${u.id}/suspend`, { suspended: next });
      setMessage(`${u.firstName} ${u.lastName} ${next ? 'suspended' : 'reactivated'}`);
      setMessageTone('success');
      setSuspendTarget(null);
      loadUsers();
    } catch (err) {
      // Kept inside the dialog so the reason sits next to the action that failed.
      setActionError(err.response?.data?.error || 'Failed to update status');
    } finally {
      setBusyId('');
    }
  }

  function openDelete(u) {
    setDeleteTarget(u);
    setDeleteConfirm('');
    setDeleteReason('');
    setDeleteError('');
  }

  function closeDelete() {
    if (busyId) return;
    setDeleteTarget(null);
    setDeleteConfirm('');
    setDeleteReason('');
    setDeleteError('');
  }

  async function handleDeleteUser() {
    if (!deleteTarget || deleteConfirm !== 'DELETE' || deleteReason.trim().length < 3) return;
    setBusyId(deleteTarget.id);
    setDeleteError('');
    setMessage('');
    try {
      const res = await apiClient.delete(`/admin/users/${deleteTarget.id}`, {
        data: { confirm: 'DELETE', reason: deleteReason.trim() },
      });
      setMessage(res.data.data?.message || 'The account was deleted.');
      setMessageTone('success');
      setDeleteTarget(null);
      setDeleteConfirm('');
      setDeleteReason('');
      await loadUsers();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete the account');
    } finally {
      setBusyId('');
    }
  }

  const viewTotals = {
    total: users.length,
    guests: users.filter((entry) => entry.role === 'USER').length,
    hosts: users.filter((entry) => entry.role === 'HOST').length,
    suspended: users.filter((entry) => entry.suspended).length,
  };

  return (
    <div className="space-y-8">
      {/* The shell already names the section, so the page prints one title and
          drops the uppercase eyebrow that used to repeat it. */}
      <AdminPageHeader
        title="Users & hosts"
        description="Manage guest accounts, host access, payout details, and account safety."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Matching accounts"
          value={pagination.total}
          note={roleFilter || search.trim() ? 'Across all pages, after filters' : 'Every account on the platform'}
        />
        <MetricCard label="Guests on this page" value={viewTotals.guests} note="Travelling accounts" />
        <MetricCard label="Hosts on this page" value={viewTotals.hosts} note="Workspace access" />
        <MetricCard
          label="Suspended on this page"
          value={viewTotals.suspended}
          note="Accounts currently restricted"
          tone={viewTotals.suspended > 0 ? 'warning' : 'default'}
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-elevated shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" strokeWidth={1.8} aria-hidden="true" />
            <TextInput
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); setSelectedIds([]); }}
              placeholder="Search name or email"
              aria-label="Search users by name or email"
              className="pl-9"
            />
          </div>
          <SelectMenu
            ariaLabel="Filter by role"
            value={roleFilter}
            onChange={(next) => { setRoleFilter(next); setPage(1); setSelectedIds([]); }}
            wrapperClassName="sm:w-44"
            options={ROLE_FILTER_OPTIONS}
          />
        </div>

        {message && (
          <Alert color={messageTone} className="mx-5 mt-5" role="status">
            {message}
          </Alert>
        )}

        {selectedIds.length > 0 && (
          <div className="mx-5 mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3" role="toolbar" aria-label="Bulk actions">
            <strong className="mr-auto text-sm font-semibold text-navy">{selectedIds.length} selected</strong>
            <Button size="xs" color="light" type="button" disabled={busyId === 'bulk'} onClick={() => { setActionError(''); setBulkTarget({ suspended: true }); }}>Suspend</Button>
            <Button size="xs" color="light" type="button" disabled={busyId === 'bulk'} onClick={() => { setActionError(''); setBulkTarget({ suspended: false }); }}>Reactivate</Button>
            <Button size="xs" color="light" type="button" onClick={() => setSelectedIds([])}>Clear</Button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Spinner size="lg" />
            <strong className="text-sm font-semibold text-navy">Loading people</strong>
            <p className="text-xs text-muted">Fetching guest, host, and administrator accounts.</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center" role="alert">
            <strong className="text-sm font-semibold text-navy">Could not load accounts</strong>
            <p className="text-xs text-muted">{loadError}</p>
            <Button color="light" type="button" onClick={loadUsers}>Try again</Button>
          </div>
        ) : users.length === 0 ? (
          <Alert color="info" className="m-5">
            <strong className="block">No accounts found</strong>
            <p>Try a different search or role filter.</p>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table hoverable aria-label="Users and hosts">
              <TableHead>
                <TableRow>
                  <TableHeadCell>
                    <Checkbox
                      aria-label="Select all accounts"
                      checked={selectableUsers.length > 0 && selectedIds.length === selectableUsers.length}
                      onChange={(event) => setSelectedIds(event.target.checked ? selectableUsers.map((u) => u.id) : [])}
                    />
                  </TableHeadCell>
                  <TableHeadCell>PERSON</TableHeadCell>
                  <TableHeadCell>ROLE</TableHeadCell>
                  <TableHeadCell>LISTINGS</TableHeadCell>
                  <TableHeadCell>WALLET</TableHeadCell>
                  <TableHeadCell>STATUS</TableHeadCell>
                  <TableHeadCell>ACTIONS</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const busy = busyId === u.id;
                  return (
                    <TableRow key={u.id} className={u.suspended ? 'opacity-70' : undefined}>
                      <TableCell>
                        {!isSelf && u.role !== 'ADMIN' && (
                          <Checkbox aria-label={`Select ${u.firstName} ${u.lastName}`} checked={selectedIds.includes(u.id)} onChange={() => toggleSelected(u.id)} />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary/15 text-xs font-semibold text-primary-600 dark:text-primary-300" aria-hidden="true">{userInitials(u)}</span>
                          <div className="min-w-0">
                            <strong className="block truncate text-sm font-semibold text-navy">{u.firstName} {u.lastName}{isSelf && <small> · you</small>}</strong>
                            <span className="block truncate text-xs text-charcoal">{u.email}</span>
                            <small className="block truncate text-xs text-muted">{u.phone || 'Phone not added'}</small>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isSelf || u.role === 'ADMIN' ? (
                          <Badge color="gray">Admin</Badge>
                        ) : (
                          <SelectMenu
                            sizing="sm"
                            value={u.role}
                            onChange={(next) => changeRole(u, next)}
                            disabled={busy}
                            ariaLabel={`Change role for ${u.firstName} ${u.lastName}`}
                            wrapperClassName="min-w-[120px]"
                            options={ASSIGNABLE_ROLE_OPTIONS}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <strong className="text-sm font-semibold text-navy">{u._count?.properties ?? 0}</strong>
                          <small className="text-xs text-muted">properties</small>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <strong className="text-sm font-semibold text-navy">{u.wallet?.balance != null ? `KES ${Number(u.wallet.balance).toLocaleString()}` : '-'}</strong>
                          <small className="text-xs text-muted">host balance</small>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge color={u.suspended ? 'failure' : 'success'}>{u.suspended ? 'Suspended' : 'Active'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <TableActionsMenu
                            label={`Actions for ${u.firstName} ${u.lastName}`}
                            actions={[
                              { label: 'Edit', icon: 'edit', onClick: () => openEdit(u) },
                              // Suspend and Delete are withheld on your own account: an admin
                              // removing themselves here would lock the console.
                              ...(!isSelf ? [
                                { label: u.suspended ? 'Reactivate' : 'Suspend', icon: u.suspended ? 'refresh' : 'pause', disabled: busy, onClick: () => { setActionError(''); setSuspendTarget(u); } },
                                { label: 'Delete', icon: 'delete', danger: true, disabled: busy, onClick: () => openDelete(u) },
                              ] : []),
                            ]}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && !loadError && users.length > 0 && (
          <div className="border-t border-border px-5 py-3">
            <AdminPagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              noun="account"
              onChange={(next) => { setPage(next); setSelectedIds([]); }}
            />
          </div>
        )}
      </section>

      {/* Edit modal */}
      {editing && (
        <Modal show onClose={closeEdit} size="lg" dismissible>
          <ModalHeader>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">ACCOUNT · {ROLE_LABELS[editing.role] || editing.role}</span>
            <span className="block text-base font-semibold text-navy">Edit {editing.firstName} {editing.lastName}</span>
          </ModalHeader>
          <form onSubmit={handleSave}>
            <ModalBody className="space-y-5">
              {formError && <Alert color="failure">{formError}</Alert>}

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Field label="First Name" value={formData.firstName} onChange={(v) => setFormData({ ...formData, firstName: v })} />
                <Field label="Last Name" value={formData.lastName} onChange={(v) => setFormData({ ...formData, lastName: v })} />
              </div>
              <Field label="Email" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} />
              <Field label="Phone" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} />

              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm font-semibold text-navy">Host payout details</p>
                <span className="mt-0.5 block text-xs text-muted">Used for bank transfers to hosts. Leave blank for non-hosts.</span>
                <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <Field label="Bank Name" value={formData.bankName} onChange={(v) => setFormData({ ...formData, bankName: v })} />
                  <Field label="Account No." value={formData.bankAccountNo} onChange={(v) => setFormData({ ...formData, bankAccountNo: v })} />
                  <Field label="Bank Code" value={formData.bankCode} onChange={(v) => setFormData({ ...formData, bankCode: v })} />
                  <div>
                    <Label htmlFor="user-payout-frequency">Payout frequency</Label>
                    <SelectMenu
                      id="user-payout-frequency"
                      value={formData.payoutFrequency}
                      onChange={(next) => setFormData({ ...formData, payoutFrequency: next })}
                      options={PAYOUT_FREQUENCY_OPTIONS}
                      ariaLabel="Payout frequency"
                    />
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="light" type="button" onClick={closeEdit} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* Account erasure modal */}
      {deleteTarget && (
        <Modal show onClose={closeDelete} size="lg" dismissible>
          <ModalHeader>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">ACCOUNT ERASURE</span>
            <span className="block text-base font-semibold text-navy">Delete user account</span>
          </ModalHeader>
          <ModalBody className="space-y-5">
            <p className="text-sm leading-relaxed text-charcoal">
              You are deleting {deleteTarget.firstName} {deleteTarget.lastName} ({deleteTarget.email}).
              Personal data will be erased. Records required for bookings, payouts, and legal compliance
              will be retained only in anonymised form. This cannot be undone.
            </p>
            {deleteError && <Alert color="failure">{deleteError}</Alert>}
            <div>
              <Label htmlFor="delete-user-reason">Reason for deletion</Label>
              <Textarea
                id="delete-user-reason"
                value={deleteReason}
                onChange={(e) => { setDeleteReason(e.target.value); setDeleteError(''); }}
                rows={3}
                maxLength={500}
                placeholder="For example: Customer requested account erasure"
              />
            </div>
            <div>
              <Label htmlFor="delete-user-confirm">Type DELETE to confirm</Label>
              <TextInput
                id="delete-user-confirm"
                type="text"
                value={deleteConfirm}
                onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(''); }}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="light" type="button" onClick={closeDelete} disabled={Boolean(busyId)}>Cancel</Button>
            <Button
              type="button"
              color="failure"
              onClick={handleDeleteUser}
              disabled={Boolean(busyId) || deleteConfirm !== 'DELETE' || deleteReason.trim().length < 3}
            >
              {busyId ? 'Deleting...' : 'Delete account'}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(bulkTarget)}
        title={bulkTarget?.suspended ? 'Suspend selected accounts' : 'Reactivate selected accounts'}
        description={bulkTarget?.suspended
          ? `${selectedIds.length} account(s) will be unable to log in and their listings will be hidden.`
          : `${selectedIds.length} account(s) will be able to log in again and their listings will be visible.`}
        confirmLabel={bulkTarget?.suspended ? 'Suspend accounts' : 'Reactivate accounts'}
        tone={bulkTarget?.suspended ? 'danger' : 'warning'}
        busy={busyId === 'bulk'}
        error={actionError}
        onConfirm={runBulkSetSuspended}
        onCancel={() => { setBulkTarget(null); setActionError(''); }}
      />

      <ConfirmDialog
        open={Boolean(suspendTarget)}
        title={suspendTarget?.suspended ? 'Reactivate account' : 'Suspend account'}
        description={suspendTarget
          ? (suspendTarget.suspended
            ? `${suspendTarget.firstName} ${suspendTarget.lastName} will be able to log in again.`
            : `${suspendTarget.firstName} ${suspendTarget.lastName} will be unable to log in and their listings will be hidden.`)
          : ''}
        confirmLabel={suspendTarget?.suspended ? 'Reactivate' : 'Suspend'}
        tone={suspendTarget?.suspended ? 'warning' : 'danger'}
        busy={Boolean(busyId) && busyId !== 'bulk'}
        error={actionError}
        onConfirm={runToggleSuspend}
        onCancel={() => { setSuspendTarget(null); setActionError(''); }}
      />
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  const id = `admin-user-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <TextInput
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

Field.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
};

export default AdminUsers;
