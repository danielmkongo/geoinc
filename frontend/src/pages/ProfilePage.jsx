import React, { useState, useEffect, useCallback } from 'react';
import {
  MdPerson, MdEmail, MdLock, MdShield, MdCheck, MdClose,
  MdVisibility, MdVisibilityOff, MdEdit, MdSave, MdCalendarToday,
  MdAccessTime,
} from 'react-icons/md';
import { profileAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

// ─── Utilities ────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

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
    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium
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

// ─── Shared input style ───────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm';

const disabledInputCls =
  'w-full px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 text-gray-400 dark:text-slate-400 text-sm cursor-not-allowed select-none';

const labelCls = 'block text-gray-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5';

// ─── Section Card ─────────────────────────────────────────────────────────────

const SectionCard = ({ icon: Icon, title, subtitle, children }) => (
  <div className="bg-white dark:bg-slate-900/70 border border-gray-200/80 dark:border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800/40">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <h2 className="text-gray-900 dark:text-white font-semibold text-base leading-tight">{title}</h2>
        {subtitle && <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

// ─── Profile Info Section ─────────────────────────────────────────────────────

const ProfileInfoSection = ({ profile, onSaved, showToast }) => {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setEmail(profile?.email || '');
    setDirty(false);
  }, [profile]);

  const handleChange = (setter) => (e) => {
    setter(e.target.value);
    setDirty(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profileAPI.updateMe({ full_name: fullName, email });
      showToast('Profile updated successfully', 'success');
      onSaved({ full_name: fullName, email });
      setDirty(false);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard icon={MdPerson} title="Profile Information" subtitle="Update your display name and email">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Full Name</label>
          <input
            className={inputCls}
            placeholder="Your full name"
            value={fullName}
            onChange={handleChange(setFullName)}
          />
        </div>
        <div>
          <label className={labelCls}>Email Address</label>
          <input
            className={inputCls}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={handleChange(setEmail)}
          />
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <MdSave size={16} />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </SectionCard>
  );
};

// ─── Change Password Section ──────────────────────────────────────────────────

const ChangePasswordSection = ({ showToast }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordMismatch = newPassword && confirmPassword && newPassword !== confirmPassword;
  const isValid = currentPassword && newPassword.length >= 6 && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    try {
      await profileAPI.changePassword(currentPassword, newPassword);
      showToast('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const PasswordInput = ({ value, onChange, placeholder, show, onToggle }) => (
    <div className="relative">
      <input
        className={`${inputCls} pr-10`}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
      >
        {show ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
      </button>
    </div>
  );

  return (
    <SectionCard icon={MdLock} title="Change Password" subtitle="Choose a strong password with at least 6 characters">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Current Password</label>
          <PasswordInput
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Your current password"
            show={showCurrent}
            onToggle={() => setShowCurrent((p) => !p)}
          />
        </div>
        <div>
          <label className={labelCls}>New Password</label>
          <PasswordInput
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            show={showNew}
            onToggle={() => setShowNew((p) => !p)}
          />
          {newPassword && newPassword.length < 6 && (
            <p className="text-red-400 text-xs mt-1">Password must be at least 6 characters</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Confirm New Password</label>
          <PasswordInput
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            show={showConfirm}
            onToggle={() => setShowConfirm((p) => !p)}
          />
          {passwordMismatch && (
            <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
          )}
          {passwordsMatch && (
            <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
              <MdCheck size={13} /> Passwords match
            </p>
          )}
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving || !isValid}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <MdLock size={16} />
            )}
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </SectionCard>
  );
};

// ─── Account Info Section ─────────────────────────────────────────────────────

const AccountInfoSection = ({ profile }) => {
  const isAdmin = profile?.role === 'admin';

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-slate-700/40 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-gray-400 dark:text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-gray-900 dark:text-white text-sm font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );

  return (
    <SectionCard icon={MdShield} title="Account Information" subtitle="Read-only account details">
      <div className="-my-0">
        <InfoRow icon={MdPerson} label="Username" value={profile?.username || '—'} />
        <div className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-slate-700/40">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
            <MdShield size={16} className="text-gray-400 dark:text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wide">Role</p>
            <div className="mt-1">
              {isAdmin ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <MdShield size={11} /> Administrator
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-slate-600/50 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600">
                  <MdPerson size={11} /> Standard User
                </span>
              )}
            </div>
          </div>
        </div>
        <InfoRow
          icon={MdCalendarToday}
          label="Member Since"
          value={formatDate(profile?.created_at)}
        />
        <InfoRow
          icon={MdAccessTime}
          label="Last Login"
          value={
            profile?.last_login
              ? `${formatDate(profile.last_login)} (${timeAgo(profile.last_login)})`
              : 'Never'
          }
        />
      </div>
    </SectionCard>
  );
};

// ─── Profile Page ─────────────────────────────────────────────────────────────

export const ProfilePage = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const res = await profileAPI.getMe();
        setProfile(res.data.user);
      } catch (err) {
        // Fall back to auth store user
        setProfile(authUser);
        showToast('Could not load profile from server', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [authUser, showToast]);

  const handleProfileSaved = (updates) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const avatarInitial = (profile?.full_name || profile?.username || 'U')[0].toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Manage your account settings and security</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Avatar hero card — full width */}
          <div className="flex items-center gap-5 bg-white dark:bg-slate-900/70 border border-gray-200/80 dark:border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-amber-500/30 flex-shrink-0">
              {avatarInitial}
            </div>
            <div className="min-w-0">
              <p className="text-gray-900 dark:text-white font-bold text-xl leading-tight">
                {profile?.full_name || profile?.username || 'User'}
              </p>
              {profile?.full_name && (
                <p className="text-gray-500 dark:text-slate-400 text-sm">@{profile?.username}</p>
              )}
              {profile?.email && (
                <div className="flex items-center gap-1.5 mt-1">
                  <MdEmail size={13} className="text-gray-400 dark:text-slate-500" />
                  <p className="text-gray-500 dark:text-slate-400 text-sm">{profile.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Two-column on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left column */}
            <div className="space-y-6">
              <ProfileInfoSection
                profile={profile}
                onSaved={handleProfileSaved}
                showToast={showToast}
              />
              <ChangePasswordSection showToast={showToast} />
            </div>
            {/* Right column */}
            <div>
              <AccountInfoSection profile={profile} />
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ProfilePage;
