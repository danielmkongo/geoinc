import React, { useState } from 'react';
import {
  MdPowerSettingsNew, MdHistory, MdThermostat, MdWaterDrop,
  MdGrass, MdCircle, MdBolt, MdMemory, MdSensors, MdCheck,
} from 'react-icons/md';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CommandCenter } from '../components/CommandCenter';
import { CommandHistory } from '../components/CommandHistory';
import { useDeviceData } from '../hooks/useDeviceData';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDeviceStore } from '../store/deviceStore';
import { isWithinMinutes, formatRelativeTime } from '../utils/formatters';
import { commandsAPI } from '../services/api';

const tabs = [
  { id: 'control', label: 'Control Panel', icon: MdPowerSettingsNew },
  { id: 'history', label: 'Command History', icon: MdHistory },
];

export const ControlPage = () => {
  const deviceId         = useDeviceStore((s) => s.deviceId);
  const currentReading   = useDeviceStore((s) => s.currentReading);
  const serverLastUpdate = useDeviceStore((s) => s.serverLastUpdate);
  const lastUpdate       = useDeviceStore((s) => s.lastUpdate);
  const firmwareVersion  = useDeviceStore((s) => s.firmwareVersion);
  const sensorMode       = useDeviceStore((s) => s.sensorMode);
  const { loading }      = useDeviceData(deviceId);
  const [activeTab, setActiveTab] = useState('control');
  const [pendingMode, setPendingMode] = useState(null);
  const [modeStatus, setModeStatus] = useState(null); // 'sending' | 'sent' | 'error'

  useWebSocket();

  if (loading) return <LoadingSpinner fullScreen />;

  const temperature  = currentReading?.temperature  ?? null;
  const humidity     = currentReading?.humidity     ?? null;
  const waterTemp    = currentReading?.water_temperature ?? null;
  const tempNormal   = temperature != null && temperature >= 36 && temperature <= 39;
  const humidNormal  = humidity    != null && humidity    >= 40 && humidity    <= 70;
  const isOnline     = isWithinMinutes(serverLastUpdate, 20) ||
    (lastUpdate && (Date.now() - new Date(lastUpdate).getTime()) < 20 * 60 * 1000);

  const sendSensorMode = async (mode) => {
    if (!isOnline || modeStatus === 'sending') return;
    setPendingMode(mode);
    setModeStatus('sending');
    try {
      await commandsAPI.setSensorMode(deviceId, mode);
      setModeStatus('sent');
      setTimeout(() => setModeStatus(null), 3000);
    } catch {
      setModeStatus('error');
      setTimeout(() => setModeStatus(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8 pt-16 lg:pt-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">System Control</h1>
          <p className="text-gray-400 dark:text-gray-500 mt-0.5 text-sm">Manage and monitor incubator actuators</p>
        </div>

        {/* Condition pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            {
              icon: MdThermostat,
              value: temperature != null ? `${temperature.toFixed(1)}°C` : '—',
              ok: temperature != null ? tempNormal : null,
              okCls: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800/50 dark:text-orange-300',
              warnCls: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-300',
            },
            {
              icon: MdWaterDrop,
              value: humidity != null ? `${humidity.toFixed(1)}%` : '—',
              ok: humidity != null ? humidNormal : null,
              okCls: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300',
              warnCls: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-300',
            },
            {
              icon: MdGrass,
              value: waterTemp != null ? `${waterTemp.toFixed(1)}°C` : '—',
              ok: null,
              okCls: 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300',
              warnCls: '',
            },
          ].map(({ icon: Icon, value, ok, okCls, warnCls }, i) => (
            <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold
              ${ok == null ? 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300' : ok ? okCls : warnCls}`}>
              <Icon size={14} />
              <span>{value}</span>
            </div>
          ))}

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold
            ${isOnline
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-300'
              : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-300'
            }`}>
            <MdCircle size={8} className={isOnline ? 'text-emerald-500 animate-pulse' : 'text-red-500'} />
            {isOnline ? 'Live' : 'Offline'}
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl w-fit mb-6 border border-gray-200 dark:border-slate-700/50">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
              ${activeTab === id
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Control Panel ───────────────────────────────────────────────── */}
      {activeTab === 'control' && (
        <div className="space-y-5">
          {/* Hero control surface */}
          <CommandCenter deviceId={deviceId} />

          {/* Below: history feed + device info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Recent commands feed — takes 2 cols */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                  <MdHistory size={16} className="text-gray-400 dark:text-slate-500" />
                  Recent Activity
                </h3>
              </div>
              <CommandHistory deviceId={deviceId} compact />
            </div>

            {/* Device info panel */}
            <div className="space-y-3">
              {/* Connection card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-5">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Connection</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MdBolt size={15} />
                      Status
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full
                      ${isOnline
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                      {isOnline ? '● Online' : '○ Offline'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Last seen</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {serverLastUpdate ? formatRelativeTime(serverLastUpdate) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MdMemory size={15} />
                      Firmware
                    </div>
                    <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                      {firmwareVersion ?? '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Device ID</span>
                    <span className="text-xs font-mono text-gray-500 dark:text-slate-500">{deviceId}</span>
                  </div>
                </div>
              </div>

              {/* Live readings card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-5">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Live Readings</p>
                <div className="space-y-3">
                  {[
                    { label: 'Amb Temp', value: temperature != null ? `${temperature.toFixed(1)} °C` : '—', ok: temperature != null ? tempNormal : null },
                    { label: 'Humidity', value: humidity != null ? `${humidity.toFixed(1)} %`  : '—', ok: humidity != null ? humidNormal : null },
                    { label: 'Spring Temp', value: waterTemp != null ? `${waterTemp.toFixed(1)} °C` : '—', ok: null },
                  ].map(({ label, value, ok }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                      <span className={`text-sm font-semibold
                        ${ok === true ? 'text-emerald-600 dark:text-emerald-400' :
                          ok === false ? 'text-red-600 dark:text-red-400' :
                          'text-gray-700 dark:text-gray-300'
                        }`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sensor mode card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MdSensors size={14} className="text-gray-400 dark:text-slate-500" />
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sensor Mode</p>
                </div>

                {/* Active mode badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Active</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50 uppercase">
                    {sensorMode ?? '—'}
                  </span>
                </div>

                {/* Mode selector buttons */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'sht45', label: 'SHT45', desc: 'Primary' },
                    { id: 'dht22', label: 'DHT22', desc: 'Backup' },
                    { id: 'both',  label: 'Both',  desc: 'Dual' },
                  ].map(({ id, label, desc }) => {
                    const isActive  = sensorMode === id;
                    const isSending = modeStatus === 'sending' && pendingMode === id;
                    const isConfirmed = modeStatus === 'sent' && pendingMode === id;
                    return (
                      <button
                        key={id}
                        onClick={() => sendSensorMode(id)}
                        disabled={!isOnline || modeStatus === 'sending'}
                        className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-2.5 px-1 text-xs font-semibold border transition-all duration-200
                          ${isActive
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300'
                          }
                          disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {isConfirmed
                          ? <MdCheck size={14} className="text-emerald-400" />
                          : <span className={isSending ? 'opacity-50' : ''}>{label}</span>
                        }
                        <span className={`text-[9px] font-normal ${isActive ? 'text-indigo-200' : 'text-gray-400 dark:text-slate-500'}`}>{desc}</span>
                        {isSending && (
                          <span className="absolute inset-0 rounded-xl border-2 border-indigo-400 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Status feedback */}
                {modeStatus === 'error' && (
                  <p className="mt-2 text-xs text-red-500 dark:text-red-400 text-center">Failed to send — device may be offline</p>
                )}
                {!isOnline && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500 text-center">Device offline — cannot change mode</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Command History ─────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <MdHistory size={18} className="text-gray-400 dark:text-slate-500" />
            Command History
          </h2>
          <CommandHistory deviceId={deviceId} />
        </div>
      )}
    </div>
  );
};
