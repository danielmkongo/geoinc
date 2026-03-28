import React, { useState, useEffect, useRef } from 'react';
import {
  MdLockOpen, MdLock,
  MdWaterDrop, MdAutorenew, MdSettings, MdHeatPump,
} from 'react-icons/md';
import { useDeviceStore } from '../store/deviceStore';
import { commandsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

// ── actuator definitions ──────────────────────────────────────────────────────

const ACTUATORS = [
  {
    key:   'pump',
    label: 'Pump',
    sub:   'Water Circuit',
    Icon:  MdWaterDrop,
    anim:  'pulse',
    accent: {
      border:   'border-blue-500/50 dark:border-blue-500/50',
      bg:       'bg-blue-50 dark:bg-blue-950/40',
      glow:     'rgba(59,130,246,0.25)',
      iconOn:   '#2563eb',
      iconOnDk: '#60a5fa',
      dot:      'bg-blue-500 dark:bg-blue-400',
      ring:     'rgba(59,130,246,0.5)',
      badge:    'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
      btn:      'bg-blue-600 hover:bg-blue-500 shadow-blue-500/40',
    },
  },
  {
    key:   'egg_rotation_motor',
    label: 'Egg Motor',
    sub:   'Turner',
    Icon:  MdAutorenew,
    anim:  'spin-slow',
    accent: {
      border:   'border-amber-500/50 dark:border-amber-500/50',
      bg:       'bg-amber-50 dark:bg-amber-950/40',
      glow:     'rgba(245,158,11,0.25)',
      iconOn:   '#d97706',
      iconOnDk: '#fbbf24',
      dot:      'bg-amber-500 dark:bg-amber-400',
      ring:     'rgba(245,158,11,0.5)',
      badge:    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
      btn:      'bg-amber-600 hover:bg-amber-500 shadow-amber-500/40',
    },
  },
  {
    key:   'exhaust_fan',
    label: 'Exhaust Fan',
    sub:   'Air Extraction',
    Icon:  MdSettings,
    anim:  'spin-fast',
    accent: {
      border:   'border-cyan-500/50 dark:border-cyan-500/50',
      bg:       'bg-cyan-50 dark:bg-cyan-950/40',
      glow:     'rgba(6,182,212,0.25)',
      iconOn:   '#0891b2',
      iconOnDk: '#22d3ee',
      dot:      'bg-cyan-500 dark:bg-cyan-400',
      ring:     'rgba(6,182,212,0.5)',
      badge:    'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30',
      btn:      'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/40',
    },
  },
  {
    key:   'inlet_fan',
    label: 'Inlet Fan',
    sub:   'Air Intake',
    Icon:  MdSettings,
    anim:  'spin-reverse',
    accent: {
      border:   'border-sky-500/50 dark:border-sky-500/50',
      bg:       'bg-sky-50 dark:bg-sky-950/40',
      glow:     'rgba(14,165,233,0.25)',
      iconOn:   '#0284c7',
      iconOnDk: '#38bdf8',
      dot:      'bg-sky-500 dark:bg-sky-400',
      ring:     'rgba(14,165,233,0.5)',
      badge:    'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30',
      btn:      'bg-sky-600 hover:bg-sky-500 shadow-sky-500/40',
    },
  },
  {
    key:   'radiator_fan',
    label: 'Radiator Fan',
    sub:   'Heat Exchange',
    Icon:  MdHeatPump,
    anim:  'spin-medium',
    accent: {
      border:   'border-orange-500/50 dark:border-orange-500/50',
      bg:       'bg-orange-50 dark:bg-orange-950/40',
      glow:     'rgba(249,115,22,0.25)',
      iconOn:   '#ea580c',
      iconOnDk: '#fb923c',
      dot:      'bg-orange-500 dark:bg-orange-400',
      ring:     'rgba(249,115,22,0.5)',
      badge:    'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30',
      btn:      'bg-orange-600 hover:bg-orange-500 shadow-orange-500/40',
    },
  },
];

// ── animation helpers ─────────────────────────────────────────────────────────

const iconStyle = (anim, isOn) => {
  if (!isOn) return {};
  const base = { display: 'block' };
  if (anim === 'spin-fast')    return { ...base, animation: 'spin 0.65s linear infinite' };
  if (anim === 'spin-medium')  return { ...base, animation: 'spin 1.1s linear infinite' };
  if (anim === 'spin-slow')    return { ...base, animation: 'spin 2s linear infinite' };
  if (anim === 'spin-reverse') return { ...base, animation: 'spin 0.75s linear infinite reverse' };
  return base;
};

// Detect dark mode for inline color values
const useDark = () => {
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
};

// ── sub-components ────────────────────────────────────────────────────────────

const ActuatorCard = ({ actuator, isOn, isLoading, canToggle, onToggle, dark }) => {
  const { label, sub, Icon, anim, accent } = actuator;
  const iconColor = isLoading
    ? '#f59e0b'
    : isOn
      ? (dark ? accent.iconOnDk : accent.iconOn)
      : (dark ? '#475569' : '#94a3b8');

  return (
    <button
      onClick={onToggle}
      disabled={!canToggle}
      className={`
        relative flex flex-col items-center gap-4 p-5 rounded-2xl border
        transition-all duration-300 outline-none
        ${isOn
          ? `${accent.bg} ${accent.border}`
          : 'bg-gray-50 border-gray-200 dark:bg-slate-800/50 dark:border-slate-700/40 hover:dark:border-slate-600/60 hover:border-gray-300'
        }
        ${canToggle ? 'cursor-pointer hover:scale-[1.03] active:scale-[0.97]' : 'cursor-not-allowed'}
      `}
      style={isOn ? { boxShadow: `0 0 24px 3px ${accent.glow}, inset 0 1px 0 rgba(255,255,255,0.06)` } : {}}
    >
      {/* Active corner dot */}
      {isOn && (
        <span
          className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${accent.dot}`}
          style={{ boxShadow: `0 0 6px 2px ${accent.ring}`, animation: 'pulse 1.5s ease-in-out infinite' }}
        />
      )}

      {/* Icon ring */}
      <div className="relative flex items-center justify-center w-[72px] h-[72px]">
        {isOn && (
          <span
            className="absolute inset-0 rounded-full border-2 opacity-40"
            style={{ borderColor: iconColor, animation: 'ping 1.8s cubic-bezier(0,0,0.2,1) infinite' }}
          />
        )}
        <span
          className="absolute inset-0 rounded-full border transition-colors duration-300"
          style={{ borderColor: isOn ? iconColor + '55' : (dark ? 'rgba(100,116,139,0.2)' : 'rgba(203,213,225,0.6)') }}
        />
        <Icon
          size={38}
          style={{
            color: iconColor,
            filter: isOn && !isLoading ? `drop-shadow(0 0 8px ${iconColor}bb)` : 'none',
            transition: 'color 0.3s, filter 0.3s',
            ...(isLoading
              ? { animation: 'pulse 0.8s ease-in-out infinite' }
              : iconStyle(anim, isOn)),
          }}
        />
      </div>

      {/* Label */}
      <div className="text-center leading-tight">
        <p className={`font-bold text-sm transition-colors duration-300 ${
          isOn ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-500'
        }`}>
          {label}
        </p>
        <p className={`text-[10px] font-mono mt-0.5 transition-colors duration-300 ${
          isOn ? 'text-gray-500 dark:text-slate-400' : 'text-gray-400 dark:text-slate-600'
        }`}>
          {sub}
        </p>
      </div>

      {/* Status badge */}
      <span className={`
        flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono
        tracking-widest uppercase border transition-all duration-300
        ${isLoading
          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
          : isOn
            ? accent.badge
            : 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-slate-700/50 dark:text-slate-500 dark:border-slate-600/30'
        }
      `}>
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            backgroundColor: iconColor,
            animation: (isLoading || isOn) ? 'pulse 1.2s ease-in-out infinite' : 'none',
          }}
        />
        {isLoading ? 'WAIT' : isOn ? 'ACTIVE' : 'IDLE'}
      </span>
    </button>
  );
};

// ── main component ────────────────────────────────────────────────────────────

export const CommandCenter = ({ deviceId = '1' }) => {
  const { user } = useAuth();
  const canControl = user?.role === 'admin' || user?.role === 'operator';
  const actuatorStates = useDeviceStore((s) => s.actuatorStates);
  const dark = useDark();

  const [pending, setPending]          = useState({});
  const [feedback, setFeedback]        = useState(null);
  const [overrideEnabled, setOverride] = useState(false);
  const prevRef        = useRef(actuatorStates);
  const feedbackTimer  = useRef(null);

  // Confirm pending state when WebSocket update arrives
  useEffect(() => {
    const prev = prevRef.current;
    setPending((cur) => {
      const next = { ...cur };
      let changed = false;
      Object.keys(cur).forEach((k) => {
        if (cur[k] && actuatorStates[k] !== prev[k]) {
          next[k] = false;
          changed = true;
          clearTimeout(feedbackTimer.current);
          setFeedback({ ok: true, msg: k.replace(/_/g, ' ') + ' confirmed' });
          feedbackTimer.current = setTimeout(() => setFeedback(null), 2500);
        }
      });
      return changed ? next : cur;
    });
    prevRef.current = actuatorStates;
  }, [actuatorStates]);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const handleToggle = async (key) => {
    if (pending[key] || !overrideEnabled || !canControl) return;
    try {
      setPending((p) => ({ ...p, [key]: true }));
      setFeedback({ ok: true, msg: 'Command sent — waiting for device...' });
      await commandsAPI.send(deviceId, { ...actuatorStates, [key]: !actuatorStates[key] });
      // Pending stays until WebSocket confirms the state change — no timeout
    } catch (err) {
      setPending((p) => ({ ...p, [key]: false }));
      setFeedback({ ok: false, msg: err.response?.data?.error || 'Command failed' });
    }
  };

  const handleOverrideChange = async (enabling) => {
    setOverride(enabling);
    if (!enabling) {
      try {
        await commandsAPI.disableOverride(deviceId);
        setFeedback({ ok: true, msg: 'Returned to automatic control' });
        setTimeout(() => setFeedback(null), 3000);
      } catch {
        setFeedback({ ok: false, msg: 'Failed to disable override' });
      }
    }
  };

  const activeCount = ACTUATORS.filter(({ key }) => actuatorStates[key]).length;
  const anyActive = activeCount > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm dark:shadow-2xl">
      {/* Subtle dot-grid background (dark mode only) */}
      <div
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Top edge accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-700"
        style={{
          background: anyActive
            ? 'linear-gradient(90deg, transparent 0%, #22d3ee 30%, #f97316 60%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.3) 50%, transparent 100%)',
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor: anyActive ? '#34d399' : (dark ? '#64748b' : '#cbd5e1'),
              boxShadow: anyActive ? '0 0 8px 2px rgba(52,211,153,0.6)' : 'none',
              animation: anyActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }}
          />
          <span className="font-mono text-[11px] tracking-[0.2em] text-gray-500 dark:text-slate-400 uppercase select-none">
            System Controls
          </span>
          <span className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/50 rounded text-[10px] font-mono font-semibold text-gray-600 dark:text-slate-400 tracking-wider">
            {activeCount} / {ACTUATORS.length} ACTIVE
          </span>
        </div>

        {/* Override toggle */}
        {canControl ? (
          <label
            className={`
              flex items-center gap-2.5 px-4 py-2 rounded-xl border cursor-pointer
              transition-all duration-200 select-none
              ${overrideEnabled
                ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/40 dark:text-amber-300'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-slate-800/80 dark:border-slate-700/50 dark:text-slate-400 dark:hover:border-slate-600'
              }
            `}
          >
            {overrideEnabled
              ? <MdLockOpen size={15} className="flex-shrink-0" />
              : <MdLock size={15} className="flex-shrink-0" />
            }
            <span className="text-[11px] font-mono font-semibold tracking-wider whitespace-nowrap">
              {overrideEnabled ? 'OVERRIDE ON' : 'AUTO MODE'}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={overrideEnabled}
              onChange={(e) => handleOverrideChange(e.target.checked)}
            />
            <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${overrideEnabled ? 'bg-amber-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${overrideEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </label>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/50 rounded-xl text-gray-400 dark:text-slate-500">
            <MdLock size={14} />
            <span className="text-[11px] font-mono tracking-wider">VIEW ONLY</span>
          </div>
        )}
      </div>

      {/* ── Feedback bar ──────────────────────────────────────────────────── */}
      {feedback && (
        <div className={`
          relative mx-5 mt-4 px-4 py-2.5 rounded-xl border text-[11px] font-mono
          tracking-wider flex items-center gap-2
          ${feedback.ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400'
            : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400'
          }
        `}>
          <span>{feedback.ok ? '▶' : '✕'}</span>
          <span className="uppercase">{feedback.msg}</span>
        </div>
      )}

      {/* ── Actuator cards ────────────────────────────────────────────────── */}
      <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-5">
        {ACTUATORS.map((actuator) => (
          <ActuatorCard
            key={actuator.key}
            actuator={actuator}
            isOn={!!actuatorStates[actuator.key]}
            isLoading={!!pending[actuator.key]}
            canToggle={canControl && overrideEnabled && !pending[actuator.key]}
            onToggle={() => handleToggle(actuator.key)}
            dark={dark}
          />
        ))}
      </div>

      {/* ── Footer hint ───────────────────────────────────────────────────── */}
      <div className="relative px-5 pb-4 flex items-center justify-between">
        <p className="text-[10px] font-mono text-gray-400 dark:text-slate-500 tracking-wide">
          {canControl
            ? overrideEnabled
              ? '⚡ Manual override active — tap cards to toggle'
              : '🔒 Enable override to take manual control'
            : '👁 Read-only access'
          }
        </p>
        <p className="text-[10px] font-mono text-gray-300 dark:text-slate-700 tracking-wider hidden sm:block">
          INCUBATOR CTRL v2
        </p>
      </div>
    </div>
  );
};
