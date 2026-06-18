import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Dropdown from '../components/Dropdown';

const roleColors = {
  USER: 'bg-gray-100 text-gray-700',
  HOST: 'bg-[#C49A6C]/20 text-[#8a6a3f]',
  ADMIN: 'bg-[#0B0B45]/10 text-[#0B0B45]',
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
  const [busyId, setBusyId] = useState('');

  // Edit modal
  const [editing, setEditing] = useState(null); // the user being edited
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (search.trim()) params.search = search.trim();
      const res = await apiClient.get('/admin/users', { params });
      setUsers(res.data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  // Debounce search; refetch on role change
  useEffect(() => {
    const t = setTimeout(loadUsers, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [loadUsers, search]);

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
    // Only send non-empty fields; payoutFrequency '' means "leave unset"
    const payload = {};
    for (const [k, v] of Object.entries(formData)) {
      if (v !== '' && v !== null && v !== undefined) payload[k] = v;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-[#0B0B45]">Users &amp; Hosts</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="px-4 py-2 rounded-xl border border-[#D9D9D9] text-[#1f2937] text-sm focus:outline-none focus:border-[#C49A6C] w-56"
          />
          <Dropdown
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'USER', label: 'Users' },
              { value: 'HOST', label: 'Hosts' },
              { value: 'ADMIN', label: 'Admins' },
            ]}
            triggerClassName="neu-input px-4 py-2 bg-white text-[#1f2937] rounded-xl text-sm"
            ariaLabel="Filter by role"
          />
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm font-medium ${message.toLowerCase().includes('fail') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6b7280]">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#6b7280]">No users found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-[#D9D9D9] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#D9D9D9] text-left">
                <th className="p-4 font-semibold text-[#0B0B45]">Name</th>
                <th className="p-4 font-semibold text-[#0B0B45]">Contact</th>
                <th className="p-4 font-semibold text-[#0B0B45]">Role</th>
                <th className="p-4 font-semibold text-[#0B0B45]">Properties</th>
                <th className="p-4 font-semibold text-[#0B0B45]">Wallet (KES)</th>
                <th className="p-4 font-semibold text-[#0B0B45]">Status</th>
                <th className="p-4 font-semibold text-[#0B0B45]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const busy = busyId === u.id;
                return (
                  <tr key={u.id} className={`border-b border-[#D9D9D9]/50 hover:bg-[#0B0B45]/5 ${u.suspended ? 'opacity-60' : ''}`}>
                    <td className="p-4">
                      <div className="font-medium text-[#1f2937]">
                        {u.firstName} {u.lastName}
                        {isSelf && <span className="ml-2 text-xs text-[#C49A6C]">(you)</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-[#1f2937]">{u.email}</div>
                      <div className="text-xs text-[#6b7280]">{u.phone || '—'}</div>
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
                          triggerClassName="px-3 py-1.5 bg-white border border-[#D9D9D9] text-[#1f2937] rounded-lg text-xs"
                          ariaLabel="Change role"
                        />
                      )}
                    </td>
                    <td className="p-4">{u._count?.properties ?? 0}</td>
                    <td className="p-4">{u.wallet?.balance != null ? u.wallet.balance.toLocaleString() : '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {u.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(u)}
                          className="text-xs font-semibold text-[#C49A6C] hover:text-[#0B0B45] transition-colors"
                        >
                          Edit
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => toggleSuspend(u)}
                            disabled={busy}
                            className={`text-xs font-semibold transition-colors disabled:opacity-50 ${u.suspended ? 'text-green-600 hover:text-green-700' : 'text-red-500 hover:text-red-600'}`}
                          >
                            {busy ? '...' : u.suspended ? 'Reactivate' : 'Suspend'}
                          </button>
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

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeEdit}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[#D9D9D9]">
              <h2 className="text-lg font-bold text-[#0B0B45]">Edit {editing.firstName} {editing.lastName}</h2>
              <button onClick={closeEdit} className="text-[#6b7280] hover:text-[#0B0B45] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{formError}</div>}

              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" value={formData.firstName} onChange={(v) => setFormData({ ...formData, firstName: v })} />
                <Field label="Last Name" value={formData.lastName} onChange={(v) => setFormData({ ...formData, lastName: v })} />
              </div>
              <Field label="Email" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} />
              <Field label="Phone" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} />

              <div className="pt-2 border-t border-[#D9D9D9]">
                <p className="text-sm font-semibold text-[#0B0B45] mt-3 mb-1">Host Payout Details</p>
                <p className="text-xs text-[#6b7280] mb-3">Used for bank transfers to hosts. Leave blank for non-hosts.</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Bank Name" value={formData.bankName} onChange={(v) => setFormData({ ...formData, bankName: v })} />
                  <Field label="Account No." value={formData.bankAccountNo} onChange={(v) => setFormData({ ...formData, bankAccountNo: v })} />
                  <Field label="Bank Code" value={formData.bankCode} onChange={(v) => setFormData({ ...formData, bankCode: v })} />
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-1">Payout Frequency</label>
                    <Dropdown
                      value={formData.payoutFrequency}
                      onChange={(v) => setFormData({ ...formData, payoutFrequency: v })}
                      options={[
                        { value: '', label: 'Not set' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'biweekly', label: 'Biweekly' },
                        { value: 'monthly', label: 'Monthly' },
                      ]}
                      triggerClassName="w-full px-3 py-2 bg-white border border-[#D9D9D9] text-[#1f2937] rounded-xl text-sm"
                      ariaLabel="Payout frequency"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeEdit} className="px-5 py-2 rounded-full text-sm font-semibold text-[#6b7280] hover:text-[#0B0B45] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="bg-[#C49A6C] text-white font-semibold px-5 py-2 rounded-full text-sm hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#1f2937] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-[#D9D9D9] text-[#1f2937] text-sm focus:outline-none focus:border-[#C49A6C]"
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
