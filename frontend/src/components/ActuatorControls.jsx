import React, { useState, useEffect, useRef } from 'react';
import { MdLockOpen, MdLock } from 'react-icons/md';
import { useDeviceStore } from '../store/deviceStore';
import { commandsAPI } from '../services/api';

const LED = ({ isOn, loading }) => (
  <span className="relative flex h-3 w-3 flex-shrink-0">
    {isOn && !loading && (
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
    )}
    <span className={`relative inline-flex rounded-full h-3 w-3 transition-colors duration-300
      ${loading ? 'bg-amber-400 animate-pulse' : isOn ? 'bg-emerald-500 shadow-[0_0_6px_2px_rgba(52,211,153,0.6)]' : 'bg-red-500 shadow-[0_0_4px_1px_rgba(239,68,68,0.4)]'}`}
    />
  </span>
);

const ToggleSwitch = ({ isOn, onChange, disabled }) => (
  <button
    role="switch"
    aria-checked={isOn}
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      ${isOn ? 'bg-emerald-500 focus:ring-emerald-500' : 'bg-red-400 dark:bg-red-500/70 focus:ring-red-400'}`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200
        ${isOn ? 'translate-x-6' : 'translate-x-1'}`}
    />
  </button>
);

const ActuatorRow = ({ label, icon, isOn, onToggle, loading, activeClass, overrideEnabled }) => (
  <div className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200
    ${isOn ? activeClass : 'bg-gray-50 dark:bg-slate-700/40 border-gray-200 dark:border-slate-600/50'}`}>
    <div className="flex items-center gap-3">
      <LED isOn={isOn} loading={loading} />
      <span className="text-xl">{icon}</span>
      <div>
        <p className="font-semibold text-gray-900 dark:text-white text-sm">{label}</p>
        <p className={`text-xs font-medium ${isOn ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
          {loading ? 'Sending...' : isOn ? 'ON — Active' : 'OFF — Inactive'}
        </p>
      </div>
    </div>
    <ToggleSwitch isOn={isOn} onChange={onToggle} disabled={loading || !overrideEnabled} />
  </div>
);

export const ActuatorControls = ({ deviceId = '1' }) => {
  const actuatorStates = useDeviceStore((state) => state.actuatorStates);
  const [pending, setPending] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
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

  const actuators = [
    { key: 'pump',              label: 'Pump',               icon: '💧', activeClass: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50' },
    { key: 'egg_rotation_motor',label: 'Egg Rotation Motor', icon: '🥚', activeClass: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50' },
    { key: 'exhaust_fan',       label: 'Exhaust Fan',        icon: '💨', activeClass: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50' },
    { key: 'inlet_fan',         label: 'Inlet Fan',          icon: '🌀', activeClass: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50' },
    { key: 'radiator_fan',      label: 'Radiator Fan',       icon: '🌡️', activeClass: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50' },
  ];

  return (
    <div className="space-y-4">
      {/* Override toggle */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all
        ${overrideEnabled
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700/60'
          : 'bg-gray-50 dark:bg-slate-700/40 border-gray-200 dark:border-slate-600/50'
        }`}>
        <div className="flex items-center gap-2.5">
          {overrideEnabled
            ? <MdLockOpen size={18} className="text-amber-500" />
            : <MdLock size={18} className="text-gray-400 dark:text-slate-400" />
          }
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Manual Override</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {overrideEnabled ? 'Enabled — toggles are active' : 'Disabled — device controls automatically'}
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={overrideEnabled}
            onChange={async (e) => {
              const enabling = e.target.checked;
              setOverrideEnabled(enabling);
              if (!enabling) {
                try {
                  await commandsAPI.disableOverride(deviceId);
                  setFeedback({ type: 'success', msg: 'Returned to automatic control' });
                  setTimeout(() => setFeedback(null), 3000);
                } catch {
                  setFeedback({ type: 'error', msg: 'Failed to disable override' });
                }
              }
            }}
          />
          <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-400 transition-colors duration-200
            ${overrideEnabled ? 'bg-amber-500' : 'bg-gray-200 dark:bg-slate-600'}
            after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform after:duration-200
            peer-checked:after:translate-x-5`}
          />
        </label>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2
          ${feedback.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'
          }`}>
          {feedback.type === 'success' ? '✓' : '✕'} {feedback.msg}
        </div>
      )}

      {/* Actuator rows */}
      {actuators.map(({ key, label, icon, activeClass }) => (
        <ActuatorRow
          key={key}
          label={label}
          icon={icon}
          isOn={!!actuatorStates[key]}
          onToggle={() => handleToggle(key)}
          loading={!!pending[key]}
          activeClass={activeClass}
          overrideEnabled={overrideEnabled}
        />
      ))}
    </div>
  );
};
