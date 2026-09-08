import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Dropdown from '../components/Dropdown';
import Pagination from '../components/Pagination.jsx';

const roleColors = {
  USER: 'bg-gray-100 text-gray-700',
  HOST: 'bg-[#2563EB]/20 text-[#2563EB]',
  ADMIN: 'bg-[#222222]/10 text-[#222222]',
};

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '',
  bankName: '', bankAccountNo: '', bankCode: '', payoutFrequency: '',
};

function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  // Debounced copy of the search box, so the list only refetches after a pause.
  const [appliedSearch, setAppliedSearch] = useState('');
  const [busyId, setBusyId] = useState('');

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

  // Admin password replacement modal. Passwords are only sent to the server
  // and never retained in the users table response or UI state after closing.
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [replacementPassword, setReplacementPassword] = useState('');
  const [confirmReplacementPassword, setConfirmReplacementPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (roleFilter) params.role = roleFilter;
      if (appliedSearch) params.search = appliedSearch;
      const res = await apiClient.get('/admin/users', { params });
      setUsers(res.data.data || []);
      setPagination(res.data.pagination || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, appliedSearch]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Debounce the search box, then reset to page 1 because the results shift.
  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedSearch(search.trim());
      setPage(1);
    }, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [search]);

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

  function openPasswordReset(u) {
    setPasswordTarget(u);
    setReplacementPassword('');
    setConfirmReplacementPassword('');
    setPasswordError('');
  }

  function closePasswordReset() {
    if (busyId) return;
    setPasswordTarget(null);
    setReplacementPassword('');
    setConfirmReplacementPassword('');
    setPasswordError('');
  }

  async function handlePasswordReset(e) {
    e.preventDefault();
    if (!passwordTarget) return;
    if (replacementPassword !== confirmReplacementPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (!/(?=.*[A-Z])(?=.*[0-9]).{8,}/.test(replacementPassword)) {
      setPasswordError('Use at least 8 characters, including an uppercase letter and a number.');
      return;
    }
    setBusyId(passwordTarget.id);
    setPasswordError('');
    setMessage('');
    try {
      const res = await apiClient.put(`/admin/users/${passwordTarget.id}/password`, { newPassword: replacementPassword });
      setMessage(`${passwordTarget.firstName} ${passwordTarget.lastName}: ${res.data.message || 'password updated.'}`);
      setPasswordTarget(null);
      setReplacementPassword('');
      setConfirmReplacementPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setBusyId('');
    }
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
      if (users.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await loadUsers();
      }
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete the account');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 sm:px-6 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-[#222222]">Users &amp; Hosts</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[#222222] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 w-56"
          />
          <Dropdown
            value={roleFilter}
            onChange={(v) => { setPage(1); setRoleFilter(v); }}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'USER', label: 'Users' },
              { value: 'HOST', label: 'Hosts' },
              { value: 'ADMIN', label: 'Admins' },
            ]}
            triggerClassName=" min-h-[44px] px-4 py-2 bg-white border border-[#E5E7EB] text-[#222222] rounded-xl text-sm"
            ariaLabel="Filter by role"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Users in view', users.length],
          ['Hosts', users.filter((u) => u.role === 'HOST').length],
          ['Admins', users.filter((u) => u.role === 'ADMIN').length],
          ['Suspended', users.filter((u) => u.suspended).length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">{label}</p>
            <p className="mt-2 text-2xl font-bold text-[#222222]">{value}</p>
          </div>
        ))}
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm font-medium ${message.toLowerCase().includes('fail') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6b7280]">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#6b7280]">
            {pagination && pagination.totalPages > 1
              ? 'No users on this page.'
              : 'No users found.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[14px] shadow-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-left">
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Name</th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Contact</th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Role</th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Properties</th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Wallet (KES)</th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Status</th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const busy = busyId === u.id;
                return (
                  <tr key={u.id} className={`border-b border-[#E5E7EB]/50 hover:bg-[#222222]/5 ${u.suspended ? 'opacity-60' : ''}`}>
                    <td className="p-4">
                      <div className="font-medium text-[#222222]">
                        {u.firstName} {u.lastName}
                        {isSelf && <span className="ml-2 text-xs text-[#2563EB]">(you)</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-[#222222]">{u.email}</div>
                      <div className="text-xs text-[#6b7280]">{u.phone || '-'}</div>
                    </td>
                    <td className="p-4">
                      {isSelf ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleColors[u.role]}`}>{u.role}</span>
                      ) : (
                        <Dropdown
                          value={u.role}
                          onChange={(role) => changeRole(u, role)}
                          options={[
                            { value: 'USER', label: 'User' },
                            { value: 'HOST', label: 'Host' },
                            { value: 'ADMIN', label: 'Admin' },
                          ]}
                          triggerClassName="px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#222222] rounded-lg text-xs"
                          ariaLabel="Change role"
                        />
                      )}
                    </td>
                    <td className="p-4">{u._count?.properties ?? 0}</td>
                    <td className="p-4">{u.wallet?.balance != null ? u.wallet.balance.toLocaleString() : '-'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {u.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(u)}
                          className="text-xs font-semibold text-[#2563EB] hover:text-[#222222] transition-colors"
                        >
                          Edit
                        </button>
                        {!isSelf && (
                          <>
                            <button
                              onClick={() => toggleSuspend(u)}
                              disabled={busy}
                              className={`text-xs font-semibold transition-colors disabled:opacity-50 ${u.suspended ? 'text-green-600 hover:text-green-700' : 'text-red-500 hover:text-red-600'}`}
                            >
                              {busy ? '...' : u.suspended ? 'Reactivate' : 'Suspend'}
                            </button>
                            <button
                              onClick={() => openPasswordReset(u)}
                              disabled={busy}
                              className="text-xs font-semibold text-[#222222] hover:text-[#2563EB] transition-colors disabled:opacity-50"
                            >
                              Set password
                            </button>
                            <button
                              onClick={() => openDelete(u)}
                              disabled={busy}
                              className="text-xs font-semibold text-red-700 hover:text-red-900 transition-colors disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={pagination?.page ?? page}
        totalPages={pagination?.totalPages ?? 1}
        total={pagination?.total}
        limit={PAGE_SIZE}
        itemLabel="users"
        onPageChange={(p) => {
          setPage(p);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Password replacement modal */}
      {passwordTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closePasswordReset}>
          <div className="bg-white rounded-[14px] shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#E5E7EB]">
              <h2 className="text-lg font-bold text-[#222222]">Set user password</h2>
              <p className="text-sm text-[#6b7280] mt-2">
                Set a replacement password for {passwordTarget.firstName} {passwordTarget.lastName}. This immediately signs them out on all devices. Share it with them securely.
              </p>
            </div>
            <form onSubmit={handlePasswordReset} className="p-6 space-y-4" autoComplete="off">
              {passwordError && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm" role="alert">{passwordError}</div>}
              <div>
                <label className="block text-sm font-semibold text-[#222222] mb-1" htmlFor="admin-new-password">New password</label>
                <input
                  id="admin-new-password"
                  type="password"
                  value={replacementPassword}
                  onChange={(e) => setReplacementPassword(e.target.value)}
                  minLength={8}
                  required
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[#222222] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
                <p className="text-xs text-[#6b7280] mt-1">At least 8 characters, with an uppercase letter and a number.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#222222] mb-1" htmlFor="admin-confirm-password">Confirm new password</label>
                <input
                  id="admin-confirm-password"
                  type="password"
                  value={confirmReplacementPassword}
                  onChange={(e) => setConfirmReplacementPassword(e.target.value)}
                  minLength={8}
                  required
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[#222222] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closePasswordReset} disabled={busyId === passwordTarget.id} className="inline-flex items-center min-h-[44px] px-5 rounded-lg text-sm font-semibold border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={busyId === passwordTarget.id} className="bg-[#C49A6C] text-white font-semibold min-h-[44px] px-5 py-2 rounded-lg text-sm hover:bg-[#B8895C] disabled:opacity-50">
                  {busyId === passwordTarget.id ? 'Saving...' : 'Set password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/20 z-50 flex justify-end" onClick={closeEdit}>
          <div className="bg-white border-l border-[#E5E7EB] shadow-2xl w-full max-w-md h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">People</p>
                <h2 className="mt-1 text-lg font-bold text-[#222222]">Edit user</h2>
                <p className="mt-1 text-sm text-[#6b7280]">{editing.firstName} {editing.lastName}</p>
              </div>
              <button onClick={closeEdit} className="rounded-lg p-2 text-xl leading-none text-[#6b7280] hover:bg-[#F7F7F5]" aria-label="Close edit panel">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{formError}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name" value={formData.firstName} onChange={(v) => setFormData({ ...formData, firstName: v })} />
                <Field label="Last Name" value={formData.lastName} onChange={(v) => setFormData({ ...formData, lastName: v })} />
              </div>
              <Field label="Email" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} />
              <Field label="Phone" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} />

              <div className="pt-2 border-t border-[#E5E7EB]">
                <p className="text-sm font-semibold text-[#222222] mt-3 mb-1">Host Payout Details</p>
                <p className="text-xs text-[#6b7280] mb-3">Used for bank transfers to hosts. Leave blank for non-hosts.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Bank Name" value={formData.bankName} onChange={(v) => setFormData({ ...formData, bankName: v })} />
                  <Field label="Account No." value={formData.bankAccountNo} onChange={(v) => setFormData({ ...formData, bankAccountNo: v })} />
                  <Field label="Bank Code" value={formData.bankCode} onChange={(v) => setFormData({ ...formData, bankCode: v })} />
                  <div>
                    <label className="block text-sm font-semibold text-[#222222] mb-1">Payout Frequency</label>
                    <Dropdown
                      value={formData.payoutFrequency}
                      onChange={(v) => setFormData({ ...formData, payoutFrequency: v })}
                      options={[
                        { value: '', label: 'Not set' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'biweekly', label: 'Biweekly' },
                        { value: 'monthly', label: 'Monthly' },
                      ]}
                      triggerClassName="w-full min-h-[44px] px-3 py-2 bg-white border border-[#E5E7EB] text-[#222222] rounded-xl text-sm"
                      ariaLabel="Payout frequency"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeEdit} className="inline-flex items-center min-h-[44px] px-5 rounded-lg text-sm font-semibold border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="bg-[#C49A6C] text-white font-semibold min-h-[44px] px-5 py-2 rounded-lg text-sm hover:bg-[#B8895C] transition-all duration-200 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account erasure modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeDelete}>
          <div className="bg-white rounded-[14px] shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-red-100">
              <h2 className="text-lg font-bold text-red-700">Delete user account</h2>
              <p className="text-sm text-[#6b7280] mt-2">
                You are deleting {deleteTarget.firstName} {deleteTarget.lastName} ({deleteTarget.email}).
                Personal data will be erased. Records required for bookings, payouts, and legal compliance
                will be retained only in anonymised form. This cannot be undone.
              </p>
            </div>
            <div className="p-6 space-y-4">
              {deleteError && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{deleteError}</div>}
              <div>
                <label className="block text-sm font-semibold text-[#222222] mb-1">Reason for deletion</label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => { setDeleteReason(e.target.value); setDeleteError(''); }}
                  rows={3}
                  maxLength={500}
                  placeholder="For example: Customer requested account erasure"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-[#222222] text-sm focus:outline-none focus:border-red-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#222222] mb-1">
                  Type <span className="font-mono text-red-700">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(''); }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-[#222222] text-sm focus:outline-none focus:border-red-400"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeDelete} disabled={Boolean(busyId)} className="inline-flex items-center min-h-[44px] px-5 rounded-lg text-sm font-semibold border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] disabled:opacity-50">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={Boolean(busyId) || deleteConfirm !== 'DELETE' || deleteReason.trim().length < 3}
                  className="bg-red-600 text-white font-semibold min-h-[44px] px-5 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {busyId ? 'Deleting...' : 'Delete account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#222222] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[#222222] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
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
