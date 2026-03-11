import React, { useState } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { commandsAPI } from '../services/api';

const ToggleSwitch = ({ isOn, onChange, disabled }) => (
  <button
    role="switch"
    aria-checked={isOn}
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      ${isOn ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'}`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200
        ${isOn ? 'translate-x-6' : 'translate-x-1'}`}
    />
  </button>
);

const ActuatorRow = ({ label, icon, isOn, onToggle, loading, activeClass }) => (
  <div className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200
    ${isOn ? activeClass : 'bg-gray-50 dark:bg-slate-700/40 border-gray-200 dark:border-slate-600/50'}`}>
    <div className="flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold text-gray-900 dark:text-white text-sm">{label}</p>
        <p className={`text-xs font-medium ${isOn ? 'text-current opacity-70' : 'text-gray-400 dark:text-gray-500'}`}>
          {isOn ? 'Active' : 'Inactive'}
        </p>
      </div>
    </div>
    <ToggleSwitch isOn={isOn} onChange={onToggle} disabled={loading} />
  </div>
);

export const ActuatorControls = ({ deviceId = '1' }) => {
  const actuatorStates = useDeviceStore((state) => state.actuatorStates);
  const updateActuatorState = useDeviceStore((state) => state.updateActuatorState);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleToggle = async (key) => {
    try {
      setLoading(true);
      setFeedback(null);
      const newState = { ...actuatorStates, [key]: !actuatorStates[key] };
      updateActuatorState(newState);
      await commandsAPI.send(deviceId, newState);
      setFeedback({ type: 'success', msg: key.replace(/_/g, ' ') + ' toggled' });
      setTimeout(() => setFeedback(null), 2500);
    } catch (err) {
      console.error('Command error:', err);
      updateActuatorState(actuatorStates);
      setFeedback({ type: 'error', msg: err.response?.data?.error || 'Command failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {feedback && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 animate-slideIn
          ${feedback.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'
          }`}>
          {feedback.type === 'success' ? '✓' : '✕'} {feedback.msg}
        </div>
      )}
      <ActuatorRow
        label="Heater"
        icon="🔥"
        isOn={actuatorStates.heater}
        onToggle={() => handleToggle('heater')}
        loading={loading}
        activeClass="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400"
      />
      <ActuatorRow
        label="Humidifier"
        icon="💧"
        isOn={actuatorStates.humidifier}
        onToggle={() => handleToggle('humidifier')}
        loading={loading}
        activeClass="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400"
      />
      <ActuatorRow
        label="Linear Actuator"
        icon="⚙️"
        isOn={actuatorStates.linear_actuator}
        onToggle={() => handleToggle('linear_actuator')}
        loading={loading}
        activeClass="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50 text-purple-600 dark:text-purple-400"
      />
    </div>
  );
};
