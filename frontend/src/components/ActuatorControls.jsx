import React, { useState, useEffect, useRef } from 'react';
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
          {loading ? 'Waiting for confirmation...' : isOn ? 'Active' : 'Inactive'}
        </p>
      </div>
    </div>
    <ToggleSwitch isOn={isOn} onChange={onToggle} disabled={loading} />
  </div>
);

export const ActuatorControls = ({ deviceId = '1' }) => {
  const actuatorStates = useDeviceStore((state) => state.actuatorStates);
  const [pending, setPending] = useState({});
  const [feedback, setFeedback] = useState(null);
  const prevStatesRef = useRef(actuatorStates);
  const timeoutsRef = useRef({});

  // When actuatorStates changes via WebSocket, treat it as confirmation for any pending actuator
  useEffect(() => {
    const prev = prevStatesRef.current;
    setPending((currentPending) => {
      const next = { ...currentPending };
      let changed = false;
      Object.keys(currentPending).forEach((key) => {
        if (currentPending[key] && actuatorStates[key] !== prev[key]) {
          next[key] = false;
          changed = true;
          clearTimeout(timeoutsRef.current[key]);
          setFeedback({ type: 'success', msg: key.replace(/_/g, ' ') + ' confirmed' });
          setTimeout(() => setFeedback(null), 2500);
        }
      });
      return changed ? next : currentPending;
    });
    prevStatesRef.current = actuatorStates;
  }, [actuatorStates]);

  useEffect(() => {
    return () => Object.values(timeoutsRef.current).forEach(clearTimeout);
  }, []);

  const handleToggle = async (key) => {
    if (pending[key]) return;
    try {
      setPending((p) => ({ ...p, [key]: true }));
      setFeedback(null);
      const newState = { ...actuatorStates, [key]: !actuatorStates[key] };
      await commandsAPI.send(deviceId, newState);
      // Don't update UI — wait for device to confirm via device/status MQTT message
      timeoutsRef.current[key] = setTimeout(() => {
        setPending((p) => {
          if (!p[key]) return p;
          setFeedback({ type: 'error', msg: 'No confirmation received from device' });
          return { ...p, [key]: false };
        });
      }, 5000);
    } catch (err) {
      setPending((p) => ({ ...p, [key]: false }));
      setFeedback({ type: 'error', msg: err.response?.data?.error || 'Command failed' });
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
        label="Pump"
        icon="💧"
        isOn={actuatorStates.pump}
        onToggle={() => handleToggle('pump')}
        loading={!!pending.pump}
        activeClass="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400"
      />
      <ActuatorRow
        label="Egg Rotation Motor"
        icon="🥚"
        isOn={actuatorStates.egg_rotation_motor}
        onToggle={() => handleToggle('egg_rotation_motor')}
        loading={!!pending.egg_rotation_motor}
        activeClass="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400"
      />
      <ActuatorRow
        label="Exhaust Fan"
        icon="💨"
        isOn={actuatorStates.exhaust_fan}
        onToggle={() => handleToggle('exhaust_fan')}
        loading={!!pending.exhaust_fan}
        activeClass="bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/50 text-cyan-600 dark:text-cyan-400"
      />
      <ActuatorRow
        label="Inlet Fan"
        icon="🌀"
        isOn={actuatorStates.inlet_fan}
        onToggle={() => handleToggle('inlet_fan')}
        loading={!!pending.inlet_fan}
        activeClass="bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800/50 text-sky-600 dark:text-sky-400"
      />
      <ActuatorRow
        label="Radiator Fan"
        icon="🌡️"
        isOn={actuatorStates.radiator_fan}
        onToggle={() => handleToggle('radiator_fan')}
        loading={!!pending.radiator_fan}
        activeClass="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50 text-orange-600 dark:text-orange-400"
      />
    </div>
  );
};
