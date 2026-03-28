import React, { useEffect, useState, useCallback } from 'react';
import { MdRefresh, MdDownload, MdCalendarToday, MdFilterList } from 'react-icons/md';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useDeviceStore } from '../store/deviceStore';
import { readingsAPI, exportAPI } from '../services/api';

const toInputValue = (date) => {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getPresetRange = (preset) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'today':
      return { start: today, end: now };
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: y, end: today };
    }
    case '7d': {
      const s = new Date(today);
      s.setDate(s.getDate() - 7);
      return { start: s, end: now };
    }
    case '30d': {
      const s = new Date(today);
      s.setDate(s.getDate() - 30);
      return { start: s, end: now };
    }
    default:
      return null;
  }
};

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom range' },
];

const StatusPill = ({ isOn, onColor, offLabel = 'OFF' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
    ${isOn ? onColor : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${isOn ? 'bg-current' : 'bg-gray-400 dark:bg-slate-500'}`} />
    {isOn ? 'ON' : offLabel}
  </span>
);

export const HistoryPage = () => {
  const deviceId = useDeviceStore((state) => state.deviceId);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState('7d');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toInputValue(d);
  });
  const [customEnd, setCustomEnd] = useState(() => toInputValue(new Date()));

  const getDateRange = useCallback(() => {
    if (activePreset !== 'custom') {
      const range = getPresetRange(activePreset);
      return { startDate: range.start.toISOString(), endDate: range.end.toISOString() };
    }
    return {
      startDate: new Date(customStart + 'T00:00:00').toISOString(),
      endDate: new Date(customEnd + 'T23:59:59').toISOString(),
    };
  }, [activePreset, customStart, customEnd]);

  const loadReadings = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const res = await readingsAPI.getHistorical(deviceId, startDate, endDate, 500);
      setReadings(res.data.readings || []);
    } catch (err) {
      console.error('Failed to load readings:', err);
    } finally {
      setLoading(false);
    }
  }, [deviceId, getDateRange]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  const handlePreset = (id) => {
    setActivePreset(id);
    if (id !== 'custom') {
      const range = getPresetRange(id);
      if (range) {
        setCustomStart(toInputValue(range.start));
        setCustomEnd(toInputValue(range.end));
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      const res = await exportAPI.getCSV(deviceId, startDate, endDate);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `incubator_${activePreset}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const formatTs = (ts) => {
    if (!ts) return '—';
    const d = typeof ts === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ts)
      ? new Date(ts.replace(' ', 'T') + 'Z')
      : new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Africa/Dar_es_Salaam',
    });
  };

  const avgTemp = readings.length
    ? (readings.reduce((s, r) => s + r.temperature, 0) / readings.length).toFixed(2)
    : '—';
  const avgHumid = readings.length
    ? (readings.reduce((s, r) => s + r.humidity, 0) / readings.length).toFixed(2)
    : '—';
  const soilReadings = readings.filter((r) => r.water_temperature != null);
  const avgSoil = soilReadings.length
    ? (soilReadings.reduce((s, r) => s + r.water_temperature, 0) / soilReadings.length).toFixed(2)
    : '—';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8 pt-16 lg:pt-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Data History</h1>
          <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm">View and export historical sensor readings</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadReadings}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            <MdRefresh size={18} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-emerald-500/30"
          >
            <MdDownload size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <MdFilterList size={18} className="text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Date Filter</h3>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handlePreset(id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all
                ${activePreset === id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom date pickers */}
        {activePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl">
            <MdCalendarToday size={16} className="text-blue-500" />
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">From</label>
                <input
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                />
              </div>
              <span className="text-gray-400 dark:text-gray-500 font-medium mt-4">→</span>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">To</label>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  max={toInputValue(new Date())}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                />
              </div>
              <button
                onClick={loadReadings}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      {!loading && readings.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{readings.length}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Total Readings</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-orange-100 dark:border-orange-900/30 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{avgTemp}°C</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Avg Temperature</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-100 dark:border-blue-900/30 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{avgHumid}%</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Avg Humidity</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-teal-100 dark:border-teal-900/30 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-teal-500">{avgSoil}{avgSoil !== '—' ? '°C' : ''}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Avg Fluid Temp</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : readings.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No data for this period</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try selecting a different date range</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Timestamp</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Temperature</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fluid Temp</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Humidity</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pump</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Egg Motor</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Exhaust</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Inlet</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Radiator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {readings.slice(0, 200).map((r, idx) => {
                  const tempOk = r.temperature >= 36 && r.temperature <= 39;
                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">
                        {formatTs(r.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold
                          ${tempOk
                            ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          }`}>
                          {r.temperature.toFixed(2)}°C
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {r.water_temperature != null ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400">
                            {r.water_temperature.toFixed(2)}°C
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                          {r.humidity.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill isOn={r.pump_status} onColor="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill isOn={r.egg_rotation_motor_status} onColor="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill isOn={r.exhaust_fan_status} onColor="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400" />
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill isOn={r.inlet_fan_status} onColor="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" />
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill isOn={r.radiator_fan_status} onColor="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {readings.length > 200 && (
              <div className="px-5 py-4 bg-gray-50 dark:bg-slate-700/30 border-t border-gray-100 dark:border-slate-700 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Showing 200 of <span className="font-semibold text-gray-600 dark:text-gray-300">{readings.length}</span> records.
                  Use Export CSV to download all data.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
