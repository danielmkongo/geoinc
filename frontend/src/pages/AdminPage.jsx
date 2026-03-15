import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MdPeople, MdAdd, MdEdit, MdDelete, MdLockReset,
  MdCheck, MdClose, MdVisibility, MdVisibilityOff, MdRefresh,
  MdShield, MdPerson, MdSystemUpdate, MdCancel, MdContentCopy,
  MdRouter, MdCloudUpload, MdLocationOn, MdSearch, MdSatellite, MdMap,
} from 'react-icons/md';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { adminAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { formatRelativeTime, isWithinMinutes } from '../utils/formatters';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Map helpers ──────────────────────────────────────────────────────────────

// Flies map to a position when flyTo changes
const MapController = ({ flyTo }) => {
  const map = useMap();
  useEffect(() => {
    if (flyTo) map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 13, { duration: 1.2 });
  }, [flyTo, map]);
  return null;
};

const TILES = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
};

// Map with search + satellite toggle — used in logger modals
const LoggerMap = ({ position, onChange }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [layer, setLayer] = useState('street');
  const [flyTo, setFlyTo] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      setResults(await res.json());
    } catch (_) {
      // network error — results stay empty
    } finally {
      setSearching(false);
    }
  };

  const pickResult = (r) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    onChange({ lat, lng });
    setFlyTo({ lat, lng, zoom: 14 });
    setResults([]);
    setQuery(r.display_name.split(',')[0]);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search location…"
          className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-gray-400 dark:placeholder-slate-500"
        />
        <button
          type="submit"
          disabled={searching}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {searching ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MdSearch size={16} />}
          Search
        </button>
        {/* Search results dropdown */}
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-16 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-[1000] overflow-hidden">
            {results.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onClick={() => pickResult(r)}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-b border-gray-100 dark:border-slate-700 last:border-0 truncate"
              >
                <span className="font-medium">{r.display_name.split(',')[0]}</span>
                <span className="text-gray-400 dark:text-slate-500 text-xs ml-1">{r.display_name.split(',').slice(1, 3).join(',')}</span>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Layer toggle + selected coords */}
      <div className="flex items-center justify-between">
        {position ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            Selected: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
          </p>
        ) : (
          <p className="text-xs text-gray-400 dark:text-slate-500">Click map to place pin</p>
        )}
        <button
          type="button"
          onClick={() => setLayer((l) => l === 'street' ? 'satellite' : 'street')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
        >
          {layer === 'street' ? <><MdSatellite size={14} /> Satellite</> : <><MdMap size={14} /> Street</>}
        </button>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600" style={{ height: 280 }}>
        <MapContainer center={[-1.286389, 36.817223]} zoom={6} style={{ height: '100%', width: '100%' }} attributionControl={false}>
          <TileLayer url={TILES[layer].url} />
          <MapController flyTo={flyTo} />
          <MapPinPicker position={position} onChange={onChange} />
        </MapContainer>
      </div>
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────

const Toast = ({ message, type, onClose }) => (
  <div
    className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all
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

const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto shadow-2xl`}>
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

// ─── Map Pin Picker ───────────────────────────────────────────────────────────

const MapPinPicker = ({ position, onChange }) => {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return position ? <Marker position={[position.lat, position.lng]} /> : null;
};

// ─── Admin Page ───────────────────────────────────────────────────────────────

export const AdminPage = () => {
  const { user: currentUser } = useAuth();
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('users');

  // ── Users ──────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Firmware ───────────────────────────────────────────────────────────────
  const [firmware, setFirmware] = useState([]);
  const [firmwareLoading, setFirmwareLoading] = useState(true);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // ── Data Loggers ───────────────────────────────────────────────────────────
  const [loggers, setLoggers] = useState([]);
  const [loggersLoading, setLoggersLoading] = useState(true);
  const [loggerPin, setLoggerPin] = useState(null); // { lat, lng }
  const [copiedKey, setCopiedKey] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data.users);
    } catch {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadFirmware = useCallback(async () => {
    setFirmwareLoading(true);
    try {
      const res = await adminAPI.getFirmware();
      setFirmware(res.data.firmware);
    } catch {
      showToast('Failed to load firmware list', 'error');
    } finally {
      setFirmwareLoading(false);
    }
  }, [showToast]);

  const loadLoggers = useCallback(async () => {
    setLoggersLoading(true);
    try {
      const res = await adminAPI.getDataLoggers();
      setLoggers(res.data.loggers);
    } catch {
      showToast('Failed to load data loggers', 'error');
    } finally {
      setLoggersLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadUsers();
    loadFirmware();
    loadLoggers();
  }, [loadUsers, loadFirmware, loadLoggers]);

  // ── User helpers ───────────────────────────────────────────────────────────

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
    setSelectedFile(null);
    setLoggerPin(null);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminAPI.createUser(formData);
      showToast('User created successfully');
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
      showToast('User updated successfully');
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
      showToast('Password reset successfully');
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
      showToast('User deleted successfully');
      closeModal();
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Firmware helpers ───────────────────────────────────────────────────────

  const handlePushFirmware = async (e) => {
    e.preventDefault();
    if (!selectedFile) { showToast('Please select a .bin file', 'error'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('version', formData.version || '');
      await adminAPI.pushFirmware(fd);
      showToast('Firmware uploaded — device will receive it on next reconnect');
      closeModal();
      loadFirmware();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to push firmware', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateFirmware = async (id) => {
    try {
      await adminAPI.deactivateFirmware(id);
      showToast('Firmware deactivated');
      loadFirmware();
    } catch {
      showToast('Failed to deactivate firmware', 'error');
    }
  };

  const handleDeleteFirmware = async (id) => {
    try {
      await adminAPI.deleteFirmware(id);
      showToast('Firmware entry deleted');
      loadFirmware();
    } catch {
      showToast('Failed to delete firmware entry', 'error');
    }
  };

  // ── Data Logger helpers ────────────────────────────────────────────────────

  const openRegisterLogger = () => {
    setFormData({ name: '', serial_number: '', description: '' });
    setLoggerPin(null);
    setModal('logger_add');
  };

  const openEditLogger = (logger) => {
    setSelectedUser(logger); // reuse selectedUser slot
    setFormData({
      name: logger.name || '',
      serial_number: logger.serial_number || '',
      description: logger.description || '',
    });
    setLoggerPin(logger.latitude && logger.longitude ? { lat: logger.latitude, lng: logger.longitude } : null);
    setModal('logger_edit');
  };

  const openDeleteLogger = (logger) => {
    setSelectedUser(logger);
    setModal('logger_delete');
  };

  const handleRegisterLogger = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminAPI.createDataLogger({
        ...formData,
        latitude: loggerPin?.lat ?? null,
        longitude: loggerPin?.lng ?? null,
      });
      showToast('Data logger registered');
      closeModal();
      loadLoggers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to register logger', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLogger = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminAPI.updateDataLogger(selectedUser.id, {
        ...formData,
        latitude: loggerPin?.lat ?? null,
        longitude: loggerPin?.lng ?? null,
      });
      showToast('Data logger updated');
      closeModal();
      loadLoggers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update logger', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLogger = async () => {
    setSubmitting(true);
    try {
      await adminAPI.deleteDataLogger(selectedUser.id);
      showToast('Data logger deleted');
      closeModal();
      loadLoggers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete logger', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const copyApiKey = (key, id) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const update = (key, val) => setFormData((p) => ({ ...p, [key]: val }));

  // ─── Tab config ────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'users', label: 'Users', icon: <MdPeople size={16} /> },
    { id: 'loggers', label: 'Data Loggers', icon: <MdRouter size={16} /> },
    { id: 'firmware', label: 'Firmware (OTA)', icon: <MdSystemUpdate size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-semibold">
              <MdShield size={13} /> Admin Panel
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Manage users, data loggers, and firmware updates</p>
        </div>
        <button
          onClick={() => { loadUsers(); loadFirmware(); loadLoggers(); }}
          className="p-2.5 rounded-xl bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Refresh all"
        >
          <MdRefresh size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-200/60 dark:bg-slate-800/60 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
              ${activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════
          USERS TAB
      ═══════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-700/50 rounded-2xl p-5 lg:p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Users</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">{users.length} registered accounts</p>
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-colors"
            >
              <MdAdd size={18} /> Add User
            </button>
          </div>

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
                      <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
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
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">{formatRelativeTime(u.last_login)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors" title="Edit">
                            <MdEdit size={16} />
                          </button>
                          <button onClick={() => openReset(u)} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Reset password">
                            <MdLockReset size={16} />
                          </button>
                          <button
                            onClick={() => openDelete(u)}
                            disabled={u.id === currentUser?.id}
                            className={`p-1.5 rounded-lg transition-colors ${u.id === currentUser?.id ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed' : 'text-gray-400 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10'}`}
                            title={u.id === currentUser?.id ? 'Cannot delete yourself' : 'Delete'}
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
      )}

      {/* ═══════════════════════════════════════════════════
          DATA LOGGERS TAB
      ═══════════════════════════════════════════════════ */}
      {activeTab === 'loggers' && (
        <div className="bg-white dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-700/50 rounded-2xl p-5 lg:p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Data Loggers</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">{loggers.length} registered stations</p>
            </div>
            <button
              onClick={openRegisterLogger}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
            >
              <MdAdd size={18} /> Register Logger
            </button>
          </div>

          {loggersLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : loggers.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-slate-500">
              <MdRouter size={40} className="mx-auto mb-3 opacity-40" />
              <p>No data loggers registered yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Serial</th>
                    <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">API Key</th>
                    <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Location</th>
                    <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Last Seen</th>
                    <th className="text-right px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {loggers.map((lg) => (
                    <tr key={lg.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                            <MdRouter size={14} className="text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">{lg.name}</p>
                            {lg.description && <p className="text-gray-500 dark:text-slate-400 text-xs truncate max-w-[160px]">{lg.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600 dark:text-slate-300 text-xs">{lg.serial_number || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-500 dark:text-slate-400 text-xs truncate max-w-[120px]">{lg.api_key}</span>
                          <button
                            onClick={() => copyApiKey(lg.api_key, lg.id)}
                            className="p-1 rounded text-gray-400 hover:text-emerald-500 transition-colors flex-shrink-0"
                            title="Copy API key"
                          >
                            {copiedKey === lg.id ? <MdCheck size={14} className="text-emerald-500" /> : <MdContentCopy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">
                        {lg.latitude != null
                          ? <span className="flex items-center gap-1"><MdLocationOn size={13} className="text-emerald-500" />{lg.latitude.toFixed(4)}, {lg.longitude.toFixed(4)}</span>
                          : '—'
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">{formatRelativeTime(lg.last_seen)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditLogger(lg)} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors" title="Edit">
                            <MdEdit size={16} />
                          </button>
                          <button onClick={() => openDeleteLogger(lg)} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
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
      )}

      {/* ═══════════════════════════════════════════════════
          FIRMWARE TAB
      ═══════════════════════════════════════════════════ */}
      {activeTab === 'firmware' && (
        <div className="bg-white dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-700/50 rounded-2xl p-5 lg:p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-gray-900 dark:text-white font-semibold text-lg flex items-center gap-2">
                <MdSystemUpdate size={20} className="text-blue-400" /> Firmware Updates (OTA)
              </h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">
                Upload a .bin file — device receives it on next reconnect if its version is older
              </p>
            </div>
            <button
              onClick={() => { setFormData({ version: '' }); setSelectedFile(null); setModal('firmware'); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
            >
              <MdCloudUpload size={18} /> Push Update
            </button>
          </div>

          {firmwareLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : firmware.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">
              <MdSystemUpdate size={36} className="mx-auto mb-3 opacity-40" />
              <p>No firmware entries yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Version</th>
                    <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Download URL</th>
                    <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Size</th>
                    <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Created</th>
                    <th className="text-right px-4 py-3 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {firmware.map((fw) => (
                    <tr key={fw.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-white">{fw.version}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 max-w-xs truncate text-xs" title={fw.download_url}>{fw.download_url}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{fw.file_size ? (fw.file_size / 1024).toFixed(1) + ' KB' : '—'}</td>
                      <td className="px-4 py-3">
                        {fw.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-slate-600/50 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">{formatRelativeTime(fw.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {fw.is_active && (
                            <button onClick={() => handleDeactivateFirmware(fw.id)} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors" title="Deactivate">
                              <MdCancel size={16} />
                            </button>
                          )}
                          <button onClick={() => handleDeleteFirmware(fw.id)} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
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
      )}

      {/* ═══════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════ */}

      {/* Add User */}
      {modal === 'add' && (
        <Modal title="Add New User" onClose={closeModal}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Field label="Username">
              <input className={inputCls} placeholder="e.g. john_doe" value={formData.username} onChange={(e) => update('username', e.target.value)} required autoComplete="off" />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input className={`${inputCls} pr-10`} type={showPassword ? 'text' : 'password'} placeholder="Minimum 6 characters" value={formData.password} onChange={(e) => update('password', e.target.value)} required autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200">
                  {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>
            </Field>
            <Field label="Email">
              <input className={inputCls} type="email" placeholder="user@example.com" value={formData.email} onChange={(e) => update('email', e.target.value)} />
            </Field>
            <Field label="Full Name">
              <input className={inputCls} placeholder="John Doe" value={formData.full_name} onChange={(e) => update('full_name', e.target.value)} />
            </Field>
            <Field label="Role">
              <select className={inputCls} value={formData.role} onChange={(e) => update('role', e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-colors disabled:opacity-50">
                {submitting && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Create User
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User */}
      {modal === 'edit' && selectedUser && (
        <Modal title={`Edit User — ${selectedUser.username}`} onClose={closeModal}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="Email">
              <input className={inputCls} type="email" placeholder="user@example.com" value={formData.email} onChange={(e) => update('email', e.target.value)} />
            </Field>
            <Field label="Full Name">
              <input className={inputCls} placeholder="John Doe" value={formData.full_name} onChange={(e) => update('full_name', e.target.value)} />
            </Field>
            <Field label="Role">
              <select className={inputCls} value={formData.role} onChange={(e) => update('role', e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-colors disabled:opacity-50">
                {submitting && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset Password */}
      {modal === 'reset' && selectedUser && (
        <Modal title={`Reset Password — ${selectedUser.username}`} onClose={closeModal}>
          <form onSubmit={handleReset} className="space-y-4">
            <Field label="New Password">
              <div className="relative">
                <input className={`${inputCls} pr-10`} type={showPassword ? 'text' : 'password'} placeholder="Minimum 6 characters" value={formData.newPassword} onChange={(e) => update('newPassword', e.target.value)} required autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400">
                  {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                {submitting && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Reset Password
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete User */}
      {modal === 'delete' && selectedUser && activeTab === 'users' && (
        <Modal title="Delete User" onClose={closeModal}>
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40">
              <MdDelete size={20} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Delete "{selectedUser.username}"?</p>
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={submitting} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                {submitting && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Delete User
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Register Logger */}
      {modal === 'logger_add' && (
        <Modal title="Register Data Logger" onClose={closeModal} wide>
          <form onSubmit={handleRegisterLogger} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Station Name">
                <input className={inputCls} placeholder="e.g. Nairobi Station" value={formData.name} onChange={(e) => update('name', e.target.value)} required />
              </Field>
              <Field label="Serial Number">
                <input className={inputCls} placeholder="e.g. WS-001" value={formData.serial_number} onChange={(e) => update('serial_number', e.target.value)} />
              </Field>
            </div>
            <Field label="Description">
              <input className={inputCls} placeholder="Optional description" value={formData.description} onChange={(e) => update('description', e.target.value)} />
            </Field>

            <div>
              <label className={labelCls}>
                <MdLocationOn size={13} className="inline mr-1" />
                Pin Location
              </label>
              <LoggerMap position={loggerPin} onChange={setLoggerPin} />
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-400 text-xs">
              An API key will be auto-generated. Devices must include it as <code className="font-mono">api_key</code> in POST /api/data-loggers/ingest payloads.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                {submitting && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Register
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Logger */}
      {modal === 'logger_edit' && selectedUser && (
        <Modal title={`Edit Logger — ${selectedUser.name}`} onClose={closeModal} wide>
          <form onSubmit={handleUpdateLogger} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Station Name">
                <input className={inputCls} placeholder="e.g. Nairobi Station" value={formData.name} onChange={(e) => update('name', e.target.value)} required />
              </Field>
              <Field label="Serial Number">
                <input className={inputCls} placeholder="e.g. WS-001" value={formData.serial_number} onChange={(e) => update('serial_number', e.target.value)} />
              </Field>
            </div>
            <Field label="Description">
              <input className={inputCls} placeholder="Optional description" value={formData.description} onChange={(e) => update('description', e.target.value)} />
            </Field>

            <div>
              <label className={labelCls}>
                <MdLocationOn size={13} className="inline mr-1" />
                Pin Location
              </label>
              <LoggerMap position={loggerPin} onChange={setLoggerPin} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-colors disabled:opacity-50">
                {submitting && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Logger */}
      {modal === 'logger_delete' && selectedUser && (
        <Modal title="Delete Data Logger" onClose={closeModal}>
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40">
              <MdDelete size={20} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Delete "{selectedUser.name}"?</p>
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">All weather readings for this logger will also be permanently deleted.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors">Cancel</button>
              <button onClick={handleDeleteLogger} disabled={submitting} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                {submitting && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Delete Logger
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Push Firmware */}
      {modal === 'firmware' && (
        <Modal title="Push Firmware Update" onClose={closeModal}>
          <form onSubmit={handlePushFirmware} className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs">
              The device will receive this update on its next reconnect, only if its reported firmware version is older than the version entered here.
            </div>
            <Field label="Version (e.g. 1.6)">
              <input className={inputCls} placeholder="1.6" value={formData.version} onChange={(e) => update('version', e.target.value)} required />
            </Field>
            <Field label="Firmware File (.bin)">
              <div
                className="relative border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".bin"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
                <MdCloudUpload size={28} className="mx-auto mb-2 text-gray-400 dark:text-slate-500" />
                {selectedFile ? (
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 dark:text-slate-300 text-sm font-medium">Click to select file</p>
                    <p className="text-gray-400 dark:text-slate-500 text-xs mt-0.5">.bin files only, max 4 MB</p>
                  </div>
                )}
              </div>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={submitting || !selectedFile} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                {submitting && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Upload & Push
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AdminPage;
