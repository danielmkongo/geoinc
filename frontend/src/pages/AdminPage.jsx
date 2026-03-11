import React, { useState, useEffect, useCallback } from 'react';
import {
  MdPeople, MdAdd, MdEdit, MdDelete, MdLockReset,
  MdCheck, MdClose, MdVisibility, MdVisibilityOff, MdRefresh,
  MdShield, MdPerson,
} from 'react-icons/md';
import { adminAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

// ─── Utility ─────────────────────────────────────────────────────────────────

const timeAgo = (date) => {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
};

// ─── Toast ────────────────────────────────────────────────────────────────────

const Toast = ({ message, type, onClose }) => (
  <div
    className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all
      ${type === 'success'
        ? 'bg-emerald-900/90 border-emerald-700 text-emerald-300'
        : 'bg-red-900/90 border-red-700 text-red-300'
      }`}
  >
    {type === 'success' ? <MdCheck size={18} /> : <MdClose size={18} />}
    <span>{message}</span>
    <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
      <MdClose size={16} />
    </button>
  </div>
);

// ─── Modal wrapper ────────────────────────────────────────────────────────────

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
        <h2 className="text-gray-900 dark:text-white font-semibold text-lg">{title}</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <MdClose size={20} />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

// ─── Input helpers ────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm';

const labelCls = 'block text-gray-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wide mb-1.5';

const Field = ({ label, children }) => (
  <div>
    <label className={labelCls}>{label}</label>
    {children}
  </div>
);

// ─── Role Badge ───────────────────────────────────────────────────────────────

const RoleBadge = ({ role }) =>
  role === 'admin' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
      <MdShield size={11} /> admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-slate-600/50 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600">
      <MdPerson size={11} /> user
    </span>
  );

// ─── Admin Page ───────────────────────────────────────────────────────────────

export const AdminPage = () => {
  const { user: currentUser } = useAuth();
  const [toast, setToast] = useState(null);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'reset' | 'delete'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data.users);
    } catch (err) {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openAdd = () => {
    setFormData({ username: '', password: '', email: '', full_name: '', role: 'user' });
    setShowPassword(false);
    setModal('add');
  };

  const openEdit = (user) => {
    setSelectedUser(user);
    setFormData({ email: user.email || '', full_name: user.full_name || '', role: user.role });
    setModal('edit');
  };

  const openReset = (user) => {
    setSelectedUser(user);
    setFormData({ newPassword: '' });
    setShowPassword(false);
    setModal('reset');
  };

  const openDelete = (user) => {
    setSelectedUser(user);
    setModal('delete');
  };

  const closeModal = () => {
    setModal(null);
    setSelectedUser(null);
    setFormData({});
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminAPI.createUser(formData);
      showToast('User created successfully', 'success');
      closeModal();
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminAPI.updateUser(selectedUser.id, formData);
      showToast('User updated successfully', 'success');
      closeModal();
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminAPI.resetPassword(selectedUser.id, formData.newPassword);
      showToast('Password reset successfully', 'success');
      closeModal();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reset password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await adminAPI.deleteUser(selectedUser.id);
      showToast('User deleted successfully', 'success');
      closeModal();
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const update = (key, val) => setFormData((p) => ({ ...p, [key]: val }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-semibold">
              <MdShield size={13} /> Admin Panel
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Manage system user accounts</p>
        </div>
        <button
          onClick={loadUsers}
          className="p-2.5 rounded-xl bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Refresh"
        >
          <MdRefresh size={18} />
        </button>
      </div>

      {/* Users section */}
      <div className="bg-white dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-700/50 rounded-2xl p-5 lg:p-6 backdrop-blur-sm">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Users</h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">{users.length} registered accounts</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-colors"
          >
            <MdAdd size={18} />
            Add User
          </button>
        </div>

        {/* Users table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">
            <MdPeople size={40} className="mx-auto mb-3 opacity-40" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Last Login</th>
                  <th className="text-right px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(u.username?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">{u.username}</p>
                          {u.full_name && <p className="text-gray-500 dark:text-slate-400 text-xs">{u.full_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-slate-600/50 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-400" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">{timeAgo(u.last_login)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title="Edit user"
                        >
                          <MdEdit size={16} />
                        </button>
                        <button
                          onClick={() => openReset(u)}
                          className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Reset password"
                        >
                          <MdLockReset size={16} />
                        </button>
                        <button
                          onClick={() => openDelete(u)}
                          disabled={u.id === currentUser?.id}
                          className={`p-1.5 rounded-lg transition-colors
                            ${u.id === currentUser?.id
                              ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
                              : 'text-gray-400 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                            }`}
                          title={u.id === currentUser?.id ? 'Cannot delete yourself' : 'Delete user'}
                        >
                          <MdDelete size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {modal === 'add' && (
        <Modal title="Add New User" onClose={closeModal}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Field label="Username">
              <input
                className={inputCls}
                placeholder="e.g. john_doe"
                value={formData.username}
                onChange={(e) => update('username', e.target.value)}
                required
                autoComplete="off"
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  className={`${inputCls} pr-10`}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => update('password', e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>
            </Field>
            <Field label="Email">
              <input
                className={inputCls}
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </Field>
            <Field label="Full Name">
              <input
                className={inputCls}
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => update('full_name', e.target.value)}
              />
            </Field>
            <Field label="Role">
              <select
                className={inputCls}
                value={formData.role}
                onChange={(e) => update('role', e.target.value)}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {submitting && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Create User
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {modal === 'edit' && selectedUser && (
        <Modal title={`Edit User — ${selectedUser.username}`} onClose={closeModal}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="Email">
              <input
                className={inputCls}
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </Field>
            <Field label="Full Name">
              <input
                className={inputCls}
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => update('full_name', e.target.value)}
              />
            </Field>
            <Field label="Role">
              <select
                className={inputCls}
                value={formData.role}
                onChange={(e) => update('role', e.target.value)}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {submitting && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {modal === 'reset' && selectedUser && (
        <Modal title={`Reset Password — ${selectedUser.username}`} onClose={closeModal}>
          <form onSubmit={handleReset} className="space-y-4">
            <Field label="New Password">
              <div className="relative">
                <input
                  className={`${inputCls} pr-10`}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={formData.newPassword}
                  onChange={(e) => update('newPassword', e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {submitting && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Reset Password
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {modal === 'delete' && selectedUser && (
        <Modal title="Delete User" onClose={closeModal}>
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/20 border border-red-700/40">
              <MdDelete size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Delete "{selectedUser.username}"?</p>
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                  This action cannot be undone. The user account and all associated data will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {submitting && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Delete User
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AdminPage;
