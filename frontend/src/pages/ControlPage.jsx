import React, { useEffect, useState } from 'react';
import { MdPowerSettingsNew, MdHistory, MdThermostat, MdWaterDrop } from 'react-icons/md';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ActuatorControls } from '../components/ActuatorControls';
import { CommandHistory } from '../components/CommandHistory';
import { useDeviceData } from '../hooks/useDeviceData';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDeviceStore } from '../store/deviceStore';

const tabs = [
  { id: 'control', label: 'Control Panel', icon: MdPowerSettingsNew },
  { id: 'history', label: 'Command History', icon: MdHistory },
];

export const ControlPage = () => {
  const deviceId = useDeviceStore((state) => state.deviceId);
  const currentReading = useDeviceStore((state) => state.currentReading);
  const actuatorStates = useDeviceStore((state) => state.actuatorStates);
  const { loading } = useDeviceData(deviceId);
  const [activeTab, setActiveTab] = useState('control');

  useWebSocket();

  if (loading) return <LoadingSpinner fullScreen />;

  const temperature = currentReading?.temperature ?? 0;
  const humidity = currentReading?.humidity ?? 0;
  const tempNormal = temperature >= 36 && temperature <= 39;
  const humidNormal = humidity >= 40 && humidity <= 70;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8 pt-16 lg:pt-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">System Control</h1>
        <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm">Manage and monitor your incubator actuators</p>
      </div>

      {/* Tabs */}
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
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'control' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main control card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current readings */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Current Conditions
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${tempNormal ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <MdThermostat size={18} className={tempNormal ? 'text-orange-500' : 'text-red-500'} />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Temperature</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{temperature.toFixed(1)}°C</p>
                  <p className={`text-xs mt-1 font-medium ${tempNormal ? 'text-orange-500' : 'text-red-500'}`}>
                    {tempNormal ? 'Within range' : 'Out of range!'}
                  </p>
                </div>
                <div className={`p-4 rounded-xl border ${humidNormal ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <MdWaterDrop size={18} className={humidNormal ? 'text-blue-500' : 'text-red-500'} />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Humidity</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{humidity.toFixed(1)}%</p>
                  <p className={`text-xs mt-1 font-medium ${humidNormal ? 'text-blue-500' : 'text-red-500'}`}>
                    {humidNormal ? 'Within range' : 'Out of range!'}
                  </p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Actuator Controls</h2>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Toggle devices on or off. Changes take effect immediately.</p>
              <ActuatorControls />
            </div>
          </div>

          {/* Status sidebar */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-5 sticky top-8">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">System Status</h3>
              <div className="space-y-3">
                {[
                  { key: 'pump', label: 'Pump', icon: '💧', active: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', msg: 'ACTIVE' },
                  { key: 'egg_rotation_motor', label: 'Egg Rotation Motor', icon: '🥚', active: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', msg: 'ROTATING' },
                  { key: 'exhaust_fan', label: 'Exhaust Fan', icon: '💨', active: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/50', dot: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', msg: 'RUNNING' },
                  { key: 'inlet_fan', label: 'Inlet Fan', icon: '🌀', active: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800/50', dot: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', msg: 'RUNNING' },
                  { key: 'radiator_fan', label: 'Radiator Fan', icon: '🌡️', active: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50', dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', msg: 'RUNNING' },
                ].map(({ key, label, icon, active, dot, text, msg }) => (
                  <div key={key} className={`p-3 rounded-xl border transition-all ${actuatorStates[key] ? active : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600/50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"><span>{icon}</span> {label}</span>
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${actuatorStates[key] ? `${dot} animate-pulse` : 'bg-gray-300 dark:bg-slate-500'}`} />
                    </div>
                    <p className={`text-xs font-bold ${actuatorStates[key] ? text : 'text-gray-400 dark:text-gray-500'}`}>
                      {actuatorStates[key] ? msg : 'STANDBY'}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  ⚠️ Changes take effect immediately. Monitor system closely after toggling.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-6">Command History</h2>
          <CommandHistory deviceId={deviceId} />
        </div>
      )}
    </div>
  );
};
