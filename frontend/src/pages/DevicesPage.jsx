import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdDeviceHub, MdAdd, MdEdit, MdDelete, MdLocationOn, MdWifi, MdWifiOff,
  MdThermostat, MdWaterDrop, MdRefresh, MdOpenInNew, MdClose, MdCheck,
} from 'react-icons/md';
import { devicesAPI, adminAPI, readingsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

// ─── Utilities ────────────────────────────────────────────────────────────────

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
    className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium
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
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
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

// ─── Add/Edit Device Modal ────────────────────────────────────────────────────

const DeviceModal = ({ title, initialData, onSubmit, onClose, submitting }) => {
  const [form, setForm] = useState(
    initialData || {
      name: '',
      mqtt_topic_prefix: '',
      description: '',
      location_name: '',
      latitude: '',
      longitude: '',
    }
  );

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Device Name">
          <input
            className={inputCls}
            placeholder="Incubator A"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
          />
        </Field>
        <Field label="MQTT Topic Prefix">
          <input
            className={inputCls}
            placeholder="incubator/unit1"
            value={form.mqtt_topic_prefix}
            onChange={(e) => update('mqtt_topic_prefix', e.target.value)}
            required
          />
        </Field>
        <Field label="Location Name">
          <input
            className={inputCls}
            placeholder="Building A, Room 3"
            value={form.location_name}
            onChange={(e) => update('location_name', e.target.value)}
          />
        </Field>
        <Field label="Description">
          <input
            className={inputCls}
            placeholder="Optional description"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude">
            <input
              className={inputCls}
              placeholder="0.000000"
              value={form.latitude}
              onChange={(e) => update('latitude', e.target.value)}
              type="number"
              step="any"
            />
          </Field>
          <Field label="Longitude">
            <input
              className={inputCls}
              placeholder="0.000000"
              value={form.longitude}
              onChange={(e) => update('longitude', e.target.value)}
              type="number"
              step="any"
            />
          </Field>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {submitting && (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {initialData ? 'Save Changes' : 'Add Incubator'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

const DeleteModal = ({ device, onConfirm, onClose, submitting }) => (
  <Modal title="Delete Incubator" onClose={onClose}>
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/20 border border-red-700/40">
        <MdDelete size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-gray-900 dark:text-white font-medium">Delete "{device.name}"?</p>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            This action cannot be undone. All readings and history for this device will be permanently removed.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {submitting && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
          Delete
        </button>
      </div>
    </div>
  </Modal>
);

// ─── Map Thumbnail ────────────────────────────────────────────────────────────

const MapThumbnail = ({ lat, lng }) => {
  if (!lat || !lng) return null;
  const latN = parseFloat(lat);
  const lngN = parseFloat(lng);
  const bbox = `${lngN - 0.01},${latN - 0.01},${lngN + 0.01},${latN + 0.01}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latN},${lngN}`;

  return (
    <div className="relative overflow-hidden rounded-xl" style={{ height: '120px' }}>
      <iframe
        src={src}
        title="Map"
        className="w-full h-full border-0 pointer-events-none"
        loading="lazy"
      />
      <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-white/10" />
    </div>
  );
};

// ─── Device Card ──────────────────────────────────────────────────────────────

const DeviceCard = ({ device, reading, isAdmin, onEdit, onDelete }) => {
  const navigate = useNavigate();

  const temperature = reading?.data?.temperature ?? reading?.temperature ?? null;
  const humidity = reading?.data?.humidity ?? reading?.humidity ?? null;

  const hasLocation = device.latitude != null && device.longitude != null;

  return (
    <div className="relative flex flex-col bg-white dark:bg-slate-900/80 border border-gray-200/80 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:border-gray-300 dark:hover:border-slate-600/60 transition-all duration-200 backdrop-blur-sm">
      {/* Card header gradient band */}
      <div
        className={`h-1.5 w-full flex-shrink-0 ${
          device.online
            ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
            : 'bg-gradient-to-r from-red-700 via-rose-600 to-red-700'
        }`}
      />

      {/* Map thumbnail */}
      {hasLocation && (
        <div className="px-4 pt-4">
          <MapThumbnail lat={device.latitude} lng={device.longitude} />
        </div>
      )}

      {/* Main content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Name + status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md
                ${device.online
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                  : 'bg-gradient-to-br from-slate-600 to-slate-700'
                }`}
            >
              <MdDeviceHub size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-900 dark:text-white font-bold text-base leading-tight truncate">{device.name}</p>
              {device.description && (
                <p className="text-gray-400 dark:text-slate-500 text-xs truncate">{device.description}</p>
              )}
            </div>
          </div>

          {/* Online badge */}
          {device.online ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Offline
            </span>
          )}
        </div>

        {/* Location */}
        {(device.location_name || hasLocation) && (
          <div className="flex items-center gap-1.5 mb-3">
            <MdLocationOn size={13} className="text-gray-400 dark:text-slate-500 flex-shrink-0" />
            <p className="text-gray-500 dark:text-slate-400 text-xs truncate">
              {device.location_name || ''}
              {hasLocation && (
                <span className="text-gray-400 dark:text-slate-600 ml-1 font-mono">
                  ({parseFloat(device.latitude).toFixed(4)}, {parseFloat(device.longitude).toFixed(4)})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Sensor readings */}
        {(temperature !== null || humidity !== null) && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {temperature !== null && (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
                <MdThermostat size={16} className="text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-gray-900 dark:text-white font-bold text-sm leading-none">{parseFloat(temperature).toFixed(1)}°C</p>
                  <p className="text-gray-400 dark:text-slate-500 text-xs mt-0.5">Temp</p>
                </div>
              </div>
            )}
            {humidity !== null && (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
                <MdWaterDrop size={16} className="text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-gray-900 dark:text-white font-bold text-sm leading-none">{parseFloat(humidity).toFixed(1)}%</p>
                  <p className="text-gray-400 dark:text-slate-500 text-xs mt-0.5">Humidity</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MQTT + last update */}
        <div className="mb-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <MdWifi size={12} className="text-gray-300 dark:text-slate-600" />
            <code className="text-amber-400/80 text-xs">{device.mqtt_topic_prefix}</code>
          </div>
          <p className="text-gray-400 dark:text-slate-600 text-xs">Last update: {timeAgo(device.last_update)}</p>
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-700/40">
          <button
            onClick={() => navigate(`/?device=${device.id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-colors"
          >
            <MdOpenInNew size={15} />
            View Dashboard
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => onEdit(device)}
                className="p-2 rounded-xl bg-gray-100 dark:bg-slate-700/60 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Edit"
              >
                <MdEdit size={16} />
              </button>
              <button
                onClick={() => onDelete(device)}
                className="p-2 rounded-xl bg-gray-100 dark:bg-slate-700/60 hover:bg-red-500/20 text-gray-600 dark:text-slate-300 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <MdDelete size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ isAdmin, onAdd }) => (
  <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
    <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center mb-5">
      <MdDeviceHub size={36} className="text-gray-300 dark:text-slate-600" />
    </div>
    <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-2">No incubators found</h3>
    <p className="text-gray-500 dark:text-slate-400 text-sm mb-6 max-w-sm">
      {isAdmin
        ? 'Add your first incubator device to start monitoring temperature and humidity.'
        : 'No incubator devices have been registered yet. Contact an administrator.'}
    </p>
    {isAdmin && (
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-colors"
      >
        <MdAdd size={18} />
        Add First Incubator
      </button>
    )}
  </div>
);

// ─── Devices Page ─────────────────────────────────────────────────────────────

export const DevicesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [devices, setDevices] = useState([]);
  const [readings, setReadings] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'delete'
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await devicesAPI.getAll();
      const devList = res.data.devices || [];
      setDevices(devList);

      // Fetch latest readings in parallel
      const readingResults = await Promise.allSettled(
        devList.map((d) => readingsAPI.getLatest(d.id))
      );
      const readingMap = {};
      readingResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          readingMap[devList[idx].id] = result.value.data?.reading || result.value.data || null;
        }
      });
      setReadings(readingMap);
    } catch (err) {
      showToast('Failed to load devices', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const openAdd = () => {
    setSelectedDevice(null);
    setModal('add');
  };

  const openEdit = (device) => {
    setSelectedDevice(device);
    setModal('edit');
  };

  const openDelete = (device) => {
    setSelectedDevice(device);
    setModal('delete');
  };

  const closeModal = () => {
    setModal(null);
    setSelectedDevice(null);
  };

  const handleAdd = async (form) => {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };
      await adminAPI.createDevice(payload);
      showToast('Incubator added successfully', 'success');
      closeModal();
      loadDevices();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add device', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (form) => {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };
      await adminAPI.updateDevice(selectedDevice.id, payload);
      showToast('Incubator updated successfully', 'success');
      closeModal();
      loadDevices();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update device', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await adminAPI.deleteDevice(selectedDevice.id);
      showToast('Incubator deleted successfully', 'success');
      closeModal();
      loadDevices();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete device', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onlineCount = devices.filter((d) => d.online).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Incubators</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600">
              {devices.length}
            </span>
            {onlineCount > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {onlineCount} online
              </span>
            )}
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Monitor and manage all incubator devices</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDevices}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {isAdmin && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-colors"
            >
              <MdAdd size={18} />
              Add Incubator
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-slate-400 text-sm">Loading incubators...</p>
        </div>
      ) : devices.length === 0 ? (
        <EmptyState isAdmin={isAdmin} onAdd={openAdd} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              reading={readings[device.id]}
              isAdmin={isAdmin}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {modal === 'add' && (
        <DeviceModal
          title="Add New Incubator"
          initialData={null}
          onSubmit={handleAdd}
          onClose={closeModal}
          submitting={submitting}
        />
      )}

      {modal === 'edit' && selectedDevice && (
        <DeviceModal
          title={`Edit — ${selectedDevice.name}`}
          initialData={{
            name: selectedDevice.name || '',
            mqtt_topic_prefix: selectedDevice.mqtt_topic_prefix || '',
            description: selectedDevice.description || '',
            location_name: selectedDevice.location_name || '',
            latitude: selectedDevice.latitude != null ? String(selectedDevice.latitude) : '',
            longitude: selectedDevice.longitude != null ? String(selectedDevice.longitude) : '',
          }}
          onSubmit={handleEdit}
          onClose={closeModal}
          submitting={submitting}
        />
      )}

      {modal === 'delete' && selectedDevice && (
        <DeleteModal
          device={selectedDevice}
          onConfirm={handleDelete}
          onClose={closeModal}
          submitting={submitting}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default DevicesPage;
