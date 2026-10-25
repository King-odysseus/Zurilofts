import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Badge, Button, Label, Modal, ModalBody, ModalFooter, ModalHeader, Select,
  Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Textarea, TextInput,
} from 'flowbite-react';
import { Search } from 'lucide-react';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TableActionsMenu from '../components/TableActionsMenu.jsx';

const ROLE_LABELS = {
  USER: 'Guest',
  HOST: 'Host',
  ADMIN: 'Admin',
};

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '',
  bankName: '', bankAccountNo: '', bankCode: '', payoutFrequency: '',
};

function userInitials(user) {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.trim();
  return initials ? initials.toUpperCase() : 'ZL';
}

function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

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

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (search.trim()) params.search = search.trim();
      const res = await apiClient.get('/admin/users', { params });
      setUsers(res.data.data || []);
      setLoadError('');
    } catch (err) {
      // Must not be silent: an empty list and a failed request look identical
      // on screen, so a server outage would read as "you have no users".
      setUsers([]);
      setLoadError(err.response?.data?.error || 'Could not load accounts. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  // Debounce search; refetch on role change
  useEffect(() => {
    const t = setTimeout(loadUsers, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [loadUsers, search]);

  // Admins and your own account are never bulk-selectable, so a bulk suspend cannot lock the console.
  const selectableUsers = users.filter((u) => u.role !== 'ADMIN' && u.id !== currentUser?.id);

  function toggleSelected(id) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  async function bulkSetSuspended(suspended) {
    if (!selectedIds.length) return;
    if (!window.confirm(`${suspended ? 'Suspend' : 'Reactivate'} ${selectedIds.length} account(s)?`)) return;
    setBusyId('bulk');
    setMessage('');
    const results = await Promise.allSettled(selectedIds.map((id) => apiClient.patch(`/admin/users/${id}/suspend`, { suspended })));
    const failed = results.filter((result) => result.status === 'rejected').length;
    setMessage(failed ? `Failed to update ${failed} of ${results.length} accounts` : `${results.length} accounts ${suspended ? 'suspended' : 'reactivated'}`);
    setSelectedIds([]);
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
      loadUsers();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to change role');
    } finally {
      setBusyId('');
    }
  }

  async function toggleSuspend(u) {
    const next = !u.suspended;
    if (!window.confirm(next
      ? `Suspend ${u.firstName} ${u.lastName}? They will be unable to log in and their listings will be hidden.`
      : `Reactivate ${u.firstName} ${u.lastName}?`)) return;
    setBusyId(u.id);
    setMessage('');
    try {
      await apiClient.patch(`/admin/users/${u.id}/suspend`, { suspended: next });
      setMessage(`${u.firstName} ${u.lastName} ${next ? 'suspended' : 'reactivated'}`);
      loadUsers();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to update status');
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
    <div className="op-admin-overview op-admin-people" data-openpencil-frame="0:7228">
      <div className="op-admin-heading op-admin-people-heading">
        <div>
          <p className="op-admin-eyebrow">ZURILOFTS · ADMIN · PEOPLE</p>
          <h1>Users &amp; hosts</h1>
          <p>Manage guest accounts, host access, payout details, and account safety.</p>
        </div>
      </div>

      <div className="op-admin-metrics op-admin-people-metrics">
        <article><span>PEOPLE IN VIEW</span><strong>{viewTotals.total}</strong><small>Matching the current filters</small></article>
        <article><span>GUESTS</span><strong>{viewTotals.guests}</strong><small>Travelling accounts</small></article>
        <article><span>HOSTS</span><strong>{viewTotals.hosts}</strong><small>Workspace access</small></article>
        <article><span>SUSPENDED</span><strong>{viewTotals.suspended}</strong><small>Accounts currently restricted</small></article>
      </div>

      <section className="op-admin-people-board">
        <div className="op-admin-people-toolbar">
          <div className="op-admin-people-search">
            <Search strokeWidth={1.8} aria-hidden="true" />
            <TextInput
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email"
              aria-label="Search users by name or email"
            />
          </div>
          <Select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="op-admin-people-filter"
          >
            <option value="">All roles</option>
            <option value="USER">Guests</option>
            <option value="HOST">Hosts</option>
            <option value="ADMIN">Admins</option>
          </Select>
        </div>

        {message && (
          <div className={`op-admin-people-message ${message.toLowerCase().includes('fail') ? 'is-error' : 'is-success'}`} role="status">
            {message}
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="op-admin-people-bulk" role="toolbar" aria-label="Bulk actions">
            <strong>{selectedIds.length} selected</strong>
            <Button size="xs" color="light" type="button" disabled={busyId === 'bulk'} onClick={() => bulkSetSuspended(true)}>Suspend</Button>
            <Button size="xs" color="light" type="button" disabled={busyId === 'bulk'} onClick={() => bulkSetSuspended(false)}>Reactivate</Button>
            <Button size="xs" color="light" type="button" onClick={() => setSelectedIds([])}>Clear</Button>
          </div>
        )}

        {loading ? (
          <div className="op-admin-people-empty">
            <span className="op-admin-booking-spinner" aria-hidden="true" />
            <strong>Loading people</strong>
            <p>Fetching guest, host, and administrator accounts.</p>
          </div>
        ) : loadError ? (
          <div className="op-admin-people-empty" role="alert">
            <strong>Could not load accounts</strong>
            <p>{loadError}</p>
            <Button color="light" type="button" onClick={loadUsers}>Try again</Button>
          </div>
        ) : users.length === 0 ? (
          <Alert color="info" className="op-admin-people-empty">
            <strong>No accounts found</strong>
            <p>Try a different search or role filter.</p>
          </Alert>
        ) : (
          <div className="op-admin-people-scroll">
            <Table hoverable aria-label="Users and hosts">
              <TableHead>
                <TableRow>
                  <TableHeadCell>
                    <input
                      type="checkbox"
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
                          <input type="checkbox" aria-label={`Select ${u.firstName} ${u.lastName}`} checked={selectedIds.includes(u.id)} onChange={() => toggleSelected(u.id)} />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="op-admin-people-avatar" aria-hidden="true">{userInitials(u)}</span>
                          <div className="min-w-0">
                            <strong className="block truncate">{u.firstName} {u.lastName}{isSelf && <small> · you</small>}</strong>
                            <span className="block truncate text-xs">{u.email}</span>
                            <small className="block truncate">{u.phone || 'Phone not added'}</small>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isSelf || u.role === 'ADMIN' ? (
                          <Badge color="gray">Admin</Badge>
                        ) : (
                          <Select
                            sizing="sm"
                            value={u.role}
                            onChange={(event) => changeRole(u, event.target.value)}
                            disabled={busy}
                            aria-label={`Change role for ${u.firstName} ${u.lastName}`}
                            className="op-admin-people-role-select"
                          >
                            <option value="USER">Guest</option>
                            <option value="HOST">Host</option>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <strong>{u._count?.properties ?? 0}</strong>
                          <small>properties</small>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <strong>{u.wallet?.balance != null ? `KES ${Number(u.wallet.balance).toLocaleString()}` : '-'}</strong>
                          <small>host balance</small>
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
                                { label: u.suspended ? 'Reactivate' : 'Suspend', icon: u.suspended ? 'refresh' : 'pause', disabled: busy, onClick: () => toggleSuspend(u) },
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
      </section>

      {/* Edit modal */}
      {editing && (
        <Modal show onClose={closeEdit} size="lg" dismissible>
          <ModalHeader>
            <span className="block op-admin-eyebrow">ACCOUNT · {ROLE_LABELS[editing.role] || editing.role}</span>
            <span className="block">Edit {editing.firstName} {editing.lastName}</span>
          </ModalHeader>
          <form onSubmit={handleSave}>
            <ModalBody>
              {formError && <Alert color="failure" className="op-admin-error">{formError}</Alert>}

              <div className="op-admin-form-grid">
                <Field label="First Name" value={formData.firstName} onChange={(v) => setFormData({ ...formData, firstName: v })} />
                <Field label="Last Name" value={formData.lastName} onChange={(v) => setFormData({ ...formData, lastName: v })} />
              </div>
              <Field label="Email" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} />
              <Field label="Phone" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} />

              <div className="op-admin-people-form-section">
                <p>Host payout details</p>
                <span>Used for bank transfers to hosts. Leave blank for non-hosts.</span>
                <div className="op-admin-form-grid">
                  <Field label="Bank Name" value={formData.bankName} onChange={(v) => setFormData({ ...formData, bankName: v })} />
                  <Field label="Account No." value={formData.bankAccountNo} onChange={(v) => setFormData({ ...formData, bankAccountNo: v })} />
                  <Field label="Bank Code" value={formData.bankCode} onChange={(v) => setFormData({ ...formData, bankCode: v })} />
                  <div>
                    <Label htmlFor="user-payout-frequency">Payout frequency</Label>
                    <Select
                      id="user-payout-frequency"
                      value={formData.payoutFrequency}
                      onChange={(event) => setFormData({ ...formData, payoutFrequency: event.target.value })}
                    >
                      <option value="">Not set</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                    </Select>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="light" type="button" onClick={closeEdit} disabled={saving}>Cancel</Button>
              <Button className="op-admin-bronze-button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* Account erasure modal */}
      {deleteTarget && (
        <Modal show onClose={closeDelete} size="lg" dismissible>
          <ModalHeader>
            <span className="block op-admin-eyebrow">ACCOUNT ERASURE</span>
            <span className="block">Delete user account</span>
          </ModalHeader>
          <ModalBody>
            <p className="op-admin-people-delete-copy">
              You are deleting {deleteTarget.firstName} {deleteTarget.lastName} ({deleteTarget.email}).
              Personal data will be erased. Records required for bookings, payouts, and legal compliance
              will be retained only in anonymised form. This cannot be undone.
            </p>
            {deleteError && <Alert color="failure" className="op-admin-error">{deleteError}</Alert>}
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
              onClick={handleDeleteUser}
              disabled={Boolean(busyId) || deleteConfirm !== 'DELETE' || deleteReason.trim().length < 3}
              className="op-admin-danger-button"
            >
              {busyId ? 'Deleting...' : 'Delete account'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
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
