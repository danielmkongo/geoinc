import React, { useState } from 'react';
import { MdCheckCircle, MdWarning, MdThermostat, MdWaterDrop, MdInfo } from 'react-icons/md';
import { useAlertStore } from '../store/alertStore';
import { alertsAPI } from '../services/api';
import { formatRelativeTime } from '../utils/formatters';

const SEVERITY = {
  critical: {
    accent:  'bg-red-500',
    badge:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    label:   'Critical',
    dot:     'bg-red-500',
    Icon:    MdWarning,
    iconCls: 'text-red-500',
  },
  warning: {
    accent:  'bg-amber-400',
    badge:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    label:   'Warning',
    dot:     'bg-amber-400',
    Icon:    MdWarning,
    iconCls: 'text-amber-500',
  },
  info: {
    accent:  'bg-blue-400',
    badge:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    label:   'Info',
    dot:     'bg-blue-400',
    Icon:    MdInfo,
    iconCls: 'text-blue-500',
  },
};

const SEV_ORDER = { critical: 0, warning: 1, info: 2 };

const getTypeIcon = (type) => {
  if (type?.includes('TEMP')) return MdThermostat;
  if (type?.includes('HUMIDITY')) return MdWaterDrop;
  return null;
};

export const AlertsPanel = () => {
  const alerts            = useAlertStore((s) => s.alerts);
  const acknowledgeAlert  = useAlertStore((s) => s.acknowledgeAlert);
  const [acking, setAcking] = useState(null);

  const handleAcknowledge = async (alertId) => {
    try {
      setAcking(alertId);
      await alertsAPI.acknowledge(alertId);
      acknowledgeAlert(alertId);
    } catch (err) {
      console.error('Acknowledge error:', err);
    } finally {
      setAcking(null);
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
          <MdCheckCircle size={28} className="text-emerald-500" />
        </div>
        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">All clear</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">No alerts — all systems operating normally</p>
      </div>
    );
  }

  // Sort: unacknowledged first, then by severity
  const sorted = [...alerts].sort((a, b) => {
    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
    return (SEV_ORDER[a.severity] ?? 2) - (SEV_ORDER[b.severity] ?? 2);
  });

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
      {sorted.map((alert) => {
        const cfg      = SEVERITY[alert.severity] || SEVERITY.info;
        const TypeIcon = getTypeIcon(alert.type);
        const Icon     = TypeIcon || cfg.Icon;
        const isAcking = acking === alert.id;
        const dimmed   = alert.acknowledged;

        return (
          <div
            key={alert.id}
            className={`relative flex items-start gap-3 pl-4 pr-4 py-3.5 rounded-xl border transition-all
              bg-white dark:bg-slate-800/60
              ${dimmed
                ? 'border-gray-100 dark:border-slate-700/40 opacity-50'
                : alert.severity === 'critical'
                  ? 'border-red-200 dark:border-red-900/50'
                  : alert.severity === 'warning'
                    ? 'border-amber-200 dark:border-amber-900/40'
                    : 'border-blue-200 dark:border-blue-900/40'
              }`}
          >
            {/* Left accent bar */}
            <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${cfg.accent} ${dimmed ? 'opacity-40' : ''}`} />

            {/* Icon */}
            <div className={`flex-shrink-0 mt-0.5 ${cfg.iconCls}`}>
              <Icon size={17} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                  {cfg.label}
                </span>
                {!dimmed && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`}
                    style={{ animation: alert.severity === 'critical' ? 'pulse 1s ease-in-out infinite' : 'none' }}
                  />
                )}
                {dimmed && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Acknowledged</span>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                {alert.type?.replace(/_/g, ' ')}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Value: <span className="font-semibold text-gray-700 dark:text-gray-300">{alert.value}</span>
                </span>
                {alert.threshold && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Threshold: <span className="font-medium">{alert.threshold}</span>
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                  {formatRelativeTime(alert.created_at)}
                </span>
              </div>
            </div>

            {/* Acknowledge button */}
            {!dimmed && (
              <button
                onClick={() => handleAcknowledge(alert.id)}
                disabled={isAcking}
                title="Acknowledge"
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                  text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-600
                  hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700
                  dark:hover:bg-emerald-900/20 dark:hover:border-emerald-700 dark:hover:text-emerald-400
                  transition-all disabled:opacity-50 whitespace-nowrap"
              >
                <MdCheckCircle size={14} className={isAcking ? 'animate-pulse' : ''} />
                <span className="hidden sm:inline">{isAcking ? 'Saving…' : 'Ack'}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
