import React, { useState, useEffect } from 'react';
import { MdCheckCircle, MdWarning, MdThermostat, MdWaterDrop, MdInfo, MdHistory, MdRefresh } from 'react-icons/md';
import { useAlertStore } from '../store/alertStore';
import { alertsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { formatRelativeTime } from '../utils/formatters';

const SEVERITY = {
  critical: {
    accent: 'bg-red-500',
    badge:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    label:  'Critical',
    dot:    'bg-red-500',
    Icon:   MdWarning,
    iconCls:'text-red-500',
    pulse:  true,
  },
  warning: {
    accent: 'bg-amber-400',
    badge:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    label:  'Warning',
    dot:    'bg-amber-400',
    Icon:   MdWarning,
    iconCls:'text-amber-500',
    pulse:  false,
  },
  info: {
    accent: 'bg-blue-400',
    badge:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    label:  'Info',
    dot:    'bg-blue-400',
    Icon:   MdInfo,
    iconCls:'text-blue-500',
    pulse:  false,
  },
};

const getTypeIcon = (type) => {
  if (type?.includes('TEMP')) return MdThermostat;
  if (type?.includes('HUMIDITY')) return MdWaterDrop;
  return null;
};

// ── Active alert row ──────────────────────────────────────────────────────────
const ActiveAlertRow = ({ alert, onAck, isAcking }) => {
  const cfg  = SEVERITY[alert.severity] || SEVERITY.info;
  const Icon = getTypeIcon(alert.type) || cfg.Icon;
  const count = alert.occurrence_count || 1;

  return (
    <div className={`relative flex items-start gap-3 pl-4 pr-4 py-3.5 rounded-xl border
      bg-white dark:bg-slate-800/60
      ${alert.severity === 'critical'
        ? 'border-red-200 dark:border-red-900/50'
        : alert.severity === 'warning'
          ? 'border-amber-200 dark:border-amber-900/40'
          : 'border-blue-200 dark:border-blue-900/40'
      }`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${cfg.accent}`} />

      {/* Icon */}
      <div className={`flex-shrink-0 mt-0.5 ${cfg.iconCls}`}>
        <Icon size={17} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
          {cfg.pulse && (
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot} animate-pulse`} />
          )}
          {/* Occurrence emphasis */}
          {count > 1 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600">
              ×{count} occurrences
            </span>
          )}
        </div>

        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
          {alert.type?.replace(/_/g, ' ')}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Value: <span className="font-semibold text-gray-700 dark:text-gray-300">{alert.value}</span>
          </span>
          {alert.threshold && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Threshold: <span className="font-medium">{alert.threshold}</span>
            </span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
            {alert.last_seen_at
              ? `Last seen ${formatRelativeTime(alert.last_seen_at)}`
              : formatRelativeTime(alert.created_at)
            }
          </span>
        </div>
      </div>

      {/* Acknowledge button */}
      <button
        onClick={() => onAck(alert.id)}
        disabled={isAcking}
        title="Acknowledge"
        className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold
          text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-600
          hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700
          dark:hover:bg-emerald-900/20 dark:hover:border-emerald-700 dark:hover:text-emerald-400
          transition-all disabled:opacity-50 whitespace-nowrap self-start mt-0.5"
      >
        <MdCheckCircle size={14} className={isAcking ? 'animate-pulse' : ''} />
        <span className="hidden sm:inline">{isAcking ? 'Saving…' : 'Ack'}</span>
      </button>
    </div>
  );
};

// ── History row ───────────────────────────────────────────────────────────────
const HistoryRow = ({ alert }) => {
  const cfg  = SEVERITY[alert.severity] || SEVERITY.info;
  const Icon = getTypeIcon(alert.type) || cfg.Icon;
  const count = alert.occurrence_count || 1;

  return (
    <div className="relative flex items-start gap-3 pl-4 pr-4 py-3 rounded-xl border
      bg-white dark:bg-slate-800/40 border-gray-100 dark:border-slate-700/40 opacity-75">
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${cfg.accent} opacity-40`} />
      <div className={`flex-shrink-0 mt-0.5 ${cfg.iconCls} opacity-60`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 leading-snug">
            {alert.type?.replace(/_/g, ' ')}
          </p>
          {count > 1 && (
            <span className="text-[10px] text-gray-400 dark:text-slate-500">×{count}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Value: <span className="font-medium text-gray-500 dark:text-gray-400">{alert.value}</span>
          </span>
          {alert.acknowledged_by && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Acked by <span className="font-medium text-gray-500 dark:text-gray-400">{alert.acknowledged_by}</span>
            </span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
            {formatRelativeTime(alert.acknowledged_at)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────
export const AlertsPanel = ({ showHistoryTab = false, deviceId = '1' }) => {
  const { user }          = useAuth();
  const alerts            = useAlertStore((s) => s.alerts);
  const acknowledgeAlert  = useAlertStore((s) => s.acknowledgeAlert);

  const [acking, setAcking]         = useState(null);
  const [tab, setTab]               = useState('active');
  const [history, setHistory]       = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histLoaded, setHistLoaded] = useState(false);

  const acknowledgedBy = user?.full_name || user?.username || null;

  const loadHistory = async () => {
    try {
      setHistLoading(true);
      const res = await alertsAPI.getHistory(deviceId);
      setHistory(res.data.alerts || []);
      setHistLoaded(true);
    } catch (err) {
      console.error('Alert history error:', err);
    } finally {
      setHistLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'history' && !histLoaded) loadHistory();
  }, [tab, deviceId]);

  const handleAck = async (alertId) => {
    try {
      setAcking(alertId);
      await alertsAPI.acknowledge(alertId, acknowledgedBy);
      acknowledgeAlert(alertId);
    } catch (err) {
      console.error('Acknowledge error:', err);
    } finally {
      setAcking(null);
    }
  };

  return (
    <div>
      {/* Tab bar — only show when history tab is enabled */}
      {showHistoryTab && (
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-700/50 rounded-xl w-fit mb-4 border border-gray-200 dark:border-slate-700/50">
          {[
            { id: 'active',  label: `Active${alerts.length > 0 ? ` (${alerts.length})` : ''}` },
            { id: 'history', label: 'History' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${tab === id
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Active alerts */}
      {tab === 'active' && (
        <>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                <MdCheckCircle size={28} className="text-emerald-500" />
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">All clear</p>
              <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">No active alerts — all systems normal</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {[...alerts]
                .sort((a, b) => {
                  const order = { critical: 0, warning: 1, info: 2 };
                  return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
                })
                .map((alert) => (
                  <ActiveAlertRow
                    key={alert.id}
                    alert={alert}
                    onAck={handleAck}
                    isAcking={acking === alert.id}
                  />
                ))
              }
            </div>
          )}
        </>
      )}

      {/* History */}
      {tab === 'history' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {history.length} acknowledged alert{history.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={loadHistory}
              disabled={histLoading}
              className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
            >
              <MdRefresh size={13} className={histLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {histLoading && history.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">Loading…</div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-700/60 flex items-center justify-center mb-3">
                <MdHistory size={24} className="text-gray-300 dark:text-slate-500" />
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No history yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Acknowledged alerts will appear here</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {history.map((alert) => (
                <HistoryRow key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
