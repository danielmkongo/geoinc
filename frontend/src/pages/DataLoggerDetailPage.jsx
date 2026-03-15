import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MdArrowBack, MdRefresh, MdDownload, MdCalendarToday, MdFilterList,
  MdLocationOn, MdSensors, MdTableChart, MdBarChart,
} from 'react-icons/md';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import * as XLSX from 'xlsx';
import { dataLoggersAPI } from '../services/api';
import { parseDate, formatRelativeTime } from '../utils/formatters';

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── helpers ──────────────────────────────────────────────────────────────────

const toInputValue = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'custom', label: 'Custom' },
];

const getPresetRange = (id) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (id === 'today') return { start: today, end: now };
  if (id === '7d') { const s = new Date(today); s.setDate(s.getDate() - 7); return { start: s, end: now }; }
  if (id === '30d') { const s = new Date(today); s.setDate(s.getDate() - 30); return { start: s, end: now }; }
  return null;
};

const TZ = 'Africa/Dar_es_Salaam';

const fmt = (ts) =>
  parseDate(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ });

const fmtShort = (ts) =>
  parseDate(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: TZ });

// ── chart configs ─────────────────────────────────────────────────────────────

const CHARTS = [
  { key: 'temperature',         label: 'Temperature (°C)',        color: '#f97316', unit: '°C' },
  { key: 'humidity',            label: 'Humidity (%)',             color: '#3b82f6', unit: '%' },
  { key: 'atmospheric_pressure',label: 'Pressure (hPa)',           color: '#8b5cf6', unit: ' hPa' },
  { key: 'wind_speed',          label: 'Wind Speed (m/s)',         color: '#06b6d4', unit: ' m/s' },
  { key: 'wind_gust',           label: 'Wind Gust (m/s)',          color: '#0ea5e9', unit: ' m/s' },
  { key: 'dew_point',           label: 'Dew Point (°C)',           color: '#10b981', unit: '°C' },
  { key: 'light_intensity',     label: 'Light Intensity (lux)',    color: '#eab308', unit: ' lux' },
  { key: 'water_temp',          label: 'Water Temp (°C)',          color: '#14b8a6', unit: '°C' },
  { key: 'rainfall',            label: 'Rainfall (mm)',            color: '#6366f1', unit: ' mm' },
  { key: 'battery_voltage',     label: 'Battery Voltage (V)',      color: '#84cc16', unit: ' V' },
];

const TABLE_COLS = [
  { key: 'timestamp',             label: 'Timestamp' },
  { key: 'temperature',           label: 'Temp (°C)' },
  { key: 'humidity',              label: 'Humidity (%)' },
  { key: 'atmospheric_pressure',  label: 'Pressure (hPa)' },
  { key: 'wind_speed',            label: 'Wind (m/s)' },
  { key: 'wind_direction',        label: 'Dir (°)' },
  { key: 'wind_gust',             label: 'Gust (m/s)' },
  { key: 'dew_point',             label: 'Dew Pt (°C)' },
  { key: 'light_intensity',       label: 'Light (lux)' },
  { key: 'water_temp',            label: 'H₂O Temp (°C)' },
  { key: 'rainfall',              label: 'Rain (mm)' },
  { key: 'battery_voltage',       label: 'Battery (V)' },
];

// ── small components ──────────────────────────────────────────────────────────

const StatCard = ({ label, value, unit, color }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-4">
    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">{label}</p>
    <p className={`text-2xl font-bold ${color}`}>
      {value !== null && value !== undefined ? `${Number(value).toFixed(1)}${unit}` : '—'}
    </p>
  </div>
);

const MiniChart = ({ data, dataKey, label, color, unit }) => {
  const points = [...data].reverse().slice(-60);
  if (!points.some((r) => r[dataKey] !== null)) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">{label}</h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={points} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
          <XAxis dataKey="timestamp" tickFormatter={fmt} tick={{ fontSize: 10, fill: '#9ca3af' }} minTickGap={40} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} width={40} />
          <Tooltip
            labelFormatter={(v) => fmtShort(v)}
            formatter={(v) => [`${Number(v).toFixed(2)}${unit}`, label]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── main page ─────────────────────────────────────────────────────────────────

export const DataLoggerDetailPage = () => {
  const { id } = useParams();
  const [logger, setLogger] = useState(null);
  const [latest, setLatest] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [activePreset, setActivePreset] = useState('7d');
  const [customStart, setCustomStart] = useState(() => toInputValue(new Date(Date.now() - 7 * 86400000)));
  const [customEnd, setCustomEnd] = useState(() => toInputValue(new Date()));

  const getDateRange = useCallback(() => {
    if (activePreset !== 'custom') {
      const r = getPresetRange(activePreset);
      return { startDate: r.start.toISOString(), endDate: r.end.toISOString() };
    }
    return {
      startDate: new Date(customStart + 'T00:00:00').toISOString(),
      endDate:   new Date(customEnd   + 'T23:59:59').toISOString(),
    };
  }, [activePreset, customStart, customEnd]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const [loggerRes, latestRes, readingsRes] = await Promise.all([
        dataLoggersAPI.getById(id),
        dataLoggersAPI.getLatest(id),
        dataLoggersAPI.getReadings(id, startDate, endDate, 1000),
      ]);
      setLogger(loggerRes.data.logger);
      setLatest(latestRes.data.reading);
      setReadings(readingsRes.data.readings || []);
    } catch (err) {
      console.error('Failed to load logger data:', err);
    } finally {
      setLoading(false);
    }
  }, [id, getDateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePreset = (p) => {
    setActivePreset(p);
    if (p !== 'custom') {
      const r = getPresetRange(p);
      if (r) { setCustomStart(toInputValue(r.start)); setCustomEnd(toInputValue(r.end)); }
    }
  };

  const handleExportExcel = () => {
    const rows = readings.map((r) => ({
      Timestamp: new Date(r.timestamp).toLocaleString(),
      'Temperature (°C)': r.temperature,
      'Humidity (%)': r.humidity,
      'Pressure (hPa)': r.atmospheric_pressure,
      'Wind Speed (m/s)': r.wind_speed,
      'Wind Direction (°)': r.wind_direction,
      'Wind Gust (m/s)': r.wind_gust,
      'Dew Point (°C)': r.dew_point,
      'Light (lux)': r.light_intensity,
      'Water Temp (°C)': r.water_temp,
      'Rainfall (mm)': r.rainfall,
      'Battery (V)': r.battery_voltage,
      'Serial Number': r.serial_number,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Weather Data');
    XLSX.writeFile(wb, `${logger?.name ?? 'logger'}_${activePreset}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const hasLocation = logger?.latitude && logger?.longitude;

  if (loading && !logger) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center pt-16 lg:pt-0">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8 pt-16 lg:pt-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/data-loggers"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <MdArrowBack size={18} />
          </Link>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              {logger?.name ?? 'Logger'}
            </h1>
            {logger?.serial_number && (
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{logger.serial_number}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
          >
            <MdRefresh size={17} /> Refresh
          </button>
          <button
            onClick={handleExportExcel}
            disabled={readings.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all"
          >
            <MdDownload size={17} /> Export Excel
          </button>
        </div>
      </div>

      {/* Status bar */}
      {latest && (
        <div className="flex items-center gap-3 mb-6 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-xl text-sm text-emerald-700 dark:text-emerald-400">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Last data received {formatRelativeTime(latest.timestamp)}
          {logger?.description && <span className="text-gray-400 dark:text-gray-500 ml-2">· {logger.description}</span>}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl w-fit mb-6 border border-gray-200 dark:border-slate-700/50">
        {[
          { id: 'overview', label: 'Overview', icon: MdBarChart },
          { id: 'table',    label: 'Data Table', icon: MdTableChart },
          ...(hasLocation ? [{ id: 'map', label: 'Map', icon: MdLocationOn }] : []),
        ].map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setActiveTab(tid)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
              ${activeTab === tid
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <MdFilterList size={16} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Date Range</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {PRESETS.map(({ id: pid, label }) => (
            <button
              key={pid}
              onClick={() => handlePreset(pid)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${activePreset === pid
                  ? 'bg-green-600 text-white shadow-md shadow-green-500/30'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {activePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <MdCalendarToday size={15} className="text-green-500" />
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">From</label>
                <input type="date" value={customStart} max={customEnd}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <span className="text-gray-400 mt-4">→</span>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">To</label>
                <input type="date" value={customEnd} min={customStart} max={toInputValue(new Date())}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <button onClick={loadData}
                className="mt-4 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all">
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div>
          {/* Latest stats */}
          {latest && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <StatCard label="Temperature" value={latest.temperature} unit="°C" color="text-orange-500" />
              <StatCard label="Humidity" value={latest.humidity} unit="%" color="text-blue-500" />
              <StatCard label="Pressure" value={latest.atmospheric_pressure} unit=" hPa" color="text-purple-500" />
              <StatCard label="Wind Speed" value={latest.wind_speed} unit=" m/s" color="text-cyan-500" />
              <StatCard label="Rainfall" value={latest.rainfall} unit=" mm" color="text-indigo-500" />
            </div>
          )}

          {/* Charts grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : readings.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <MdSensors size={40} className="mx-auto mb-3 opacity-40" />
              <p>No readings for this period</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {CHARTS.map(({ key, label, color, unit }) => (
                <MiniChart key={key} data={readings} dataKey={key} label={label} color={color} unit={unit} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DATA TABLE TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'table' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : readings.length === 0 ? (
            <div className="p-16 text-center text-gray-400 dark:text-gray-500">No data for this period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                    {TABLE_COLS.map(({ key, label }) => (
                      <th key={key} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {readings.slice(0, 300).map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {fmtShort(r.timestamp)}
                      </td>
                      {TABLE_COLS.slice(1).map(({ key }) => (
                        <td key={key} className="px-4 py-2.5 text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">
                          {r[key] !== null && r[key] !== undefined ? Number(r[key]).toFixed(2) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {readings.length > 300 && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700/30 border-t border-gray-100 dark:border-slate-700 text-center text-xs text-gray-400 dark:text-gray-500">
                  Showing 300 of {readings.length} records. Export Excel to get all data.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MAP TAB ───────────────────────────────────────────────────────────── */}
      {activeTab === 'map' && hasLocation && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700/50 flex items-center gap-2">
            <MdLocationOn size={18} className="text-green-500" />
            <span className="font-semibold text-gray-900 dark:text-white text-sm">Station Location</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono ml-2">
              {parseFloat(logger.latitude).toFixed(6)}, {parseFloat(logger.longitude).toFixed(6)}
            </span>
          </div>
          <MapContainer
            center={[parseFloat(logger.latitude), parseFloat(logger.longitude)]}
            zoom={13}
            style={{ height: '420px', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[parseFloat(logger.latitude), parseFloat(logger.longitude)]}>
              <Popup>
                <strong>{logger.name}</strong>
                {logger.serial_number && <><br /><code>{logger.serial_number}</code></>}
                {logger.description && <><br />{logger.description}</>}
                {latest && (
                  <>
                    <br /><br />
                    <b>Temperature:</b> {latest.temperature?.toFixed(1) ?? '—'}°C<br />
                    <b>Humidity:</b> {latest.humidity?.toFixed(1) ?? '—'}%<br />
                    <b>Last seen:</b> {formatRelativeTime(latest.timestamp)}
                  </>
                )}
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      )}
    </div>
  );
};
