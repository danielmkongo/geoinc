import React, { useEffect, useState } from 'react';
import {
  MdPowerSettingsNew, MdHistory, MdThermostat, MdWaterDrop,
  MdGrass, MdCircle,
} from 'react-icons/md';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CommandCenter } from '../components/CommandCenter';
import { CommandHistory } from '../components/CommandHistory';
import { useDeviceData } from '../hooks/useDeviceData';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDeviceStore } from '../store/deviceStore';
import { isWithinMinutes } from '../utils/formatters';

const tabs = [
  { id: 'control', label: 'Control Panel', icon: MdPowerSettingsNew },
  { id: 'history', label: 'Command History', icon: MdHistory },
];

const ConditionPill = ({ icon: Icon, label, value, unit, ok, okColor, warnColor }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-colors
    ${ok == null
      ? 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
      : ok
        ? `${okColor}`
        : `${warnColor}`
    }`}>
    <Icon size={15} className="flex-shrink-0" />
    <span className="hidden sm:inline text-xs font-medium opacity-75">{label}</span>
    <span>{value}{unit}</span>
  </div>
);

export const ControlPage = () => {
  const deviceId        = useDeviceStore((s) => s.deviceId);
  const currentReading  = useDeviceStore((s) => s.currentReading);
  const serverLastUpdate = useDeviceStore((s) => s.serverLastUpdate);
  const lastUpdate      = useDeviceStore((s) => s.lastUpdate);
  const { loading }     = useDeviceData(deviceId);
  const [activeTab, setActiveTab] = useState('control');

  useWebSocket();

  if (loading) return <LoadingSpinner fullScreen />;

  const temperature     = currentReading?.temperature ?? null;
  const humidity        = currentReading?.humidity ?? null;
  const waterTemp       = currentReading?.water_temperature ?? null;
  const tempNormal      = temperature != null && temperature >= 36 && temperature <= 39;
  const humidNormal     = humidity    != null && humidity    >= 40 && humidity    <= 70;
  const isOnline        = isWithinMinutes(serverLastUpdate, 20) ||
    (lastUpdate && (Date.now() - new Date(lastUpdate).getTime()) < 20 * 60 * 1000);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8 pt-16 lg:pt-8">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            System Control
          </h1>
          <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm">
            Manage and monitor your incubator actuators
          </p>
        </div>

        {/* Live condition pills */}
        <div className="flex flex-wrap items-center gap-2">
          <ConditionPill
            icon={MdThermostat}
            label="Amb"
            value={temperature != null ? temperature.toFixed(1) : '—'}
            unit={temperature != null ? '°C' : ''}
            ok={temperature != null ? tempNormal : null}
            okColor="bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800/50 dark:text-orange-300"
            warnColor="bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-300"
          />
          <ConditionPill
            icon={MdWaterDrop}
            label="Humidity"
            value={humidity != null ? humidity.toFixed(1) : '—'}
            unit={humidity != null ? '%' : ''}
            ok={humidity != null ? humidNormal : null}
            okColor="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300"
            warnColor="bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-300"
          />
          <ConditionPill
            icon={MdGrass}
            label="Spring"
            value={waterTemp != null ? waterTemp.toFixed(1) : '—'}
            unit={waterTemp != null ? '°C' : ''}
            ok={null}
            okColor=""
            warnColor=""
          />
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
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl w-fit mb-8 border border-gray-200 dark:border-slate-700/50">
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
          {/* The main control surface */}
          <CommandCenter deviceId={deviceId} />

          {/* Info row below */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10">
              <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Safety Notice</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                  Commands take effect immediately on the device. Enable override only when you intend to make manual adjustments.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-800/40 dark:bg-blue-900/10">
              <span className="text-blue-500 text-lg flex-shrink-0 mt-0.5">ℹ️</span>
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">How it works</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5 leading-relaxed">
                  Commands are queued on the server. If the device is offline it will pick them up on reconnect. Cards stay in WAIT until the device confirms.
                </p>
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
