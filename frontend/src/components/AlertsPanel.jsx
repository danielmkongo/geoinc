import React, { useState } from 'react';
import { MdCheckCircle, MdWarning, MdThermostat, MdWaterDrop } from 'react-icons/md';
import { useAlertStore } from '../store/alertStore';
import { alertsAPI } from '../services/api';
import { formatRelativeTime } from '../utils/formatters';

const severityConfig = {
  critical: {
    border: 'border-red-200 dark:border-red-800/50',
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-500',
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    label: 'Critical',
  },
  warning: {
    border: 'border-amber-200 dark:border-amber-800/50',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'text-amber-500',
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    label: 'Warning',
  },
  info: {
    border: 'border-blue-200 dark:border-blue-800/50',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-500',
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    label: 'Info',
  },
};

const getAlertIcon = (type) => {
  if (type?.includes('TEMP')) return MdThermostat;
  if (type?.includes('HUMIDITY')) return MdWaterDrop;
  return MdWarning;
};

export const AlertsPanel = ({ deviceId = '1' }) => {
  const alerts = useAlertStore((state) => state.alerts);
  const acknowledgeAlert = useAlertStore((state) => state.acknowledgeAlert);
  const [loading, setLoading] = useState(false);

  const handleAcknowledge = async (alertId) => {
    try {
      setLoading(true);
      await alertsAPI.acknowledge(alertId);
      acknowledgeAlert(alertId);
    } catch (err) {
      console.error('Acknowledge error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-3">
          <MdCheckCircle size={24} className="text-emerald-500" />
        </div>
        <p className="font-medium text-gray-700 dark:text-gray-300 text-sm">No alerts</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">All systems operating normally</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
      {alerts.map((alert) => {
        const cfg = severityConfig[alert.severity] || severityConfig.info;
        const Icon = getAlertIcon(alert.type);
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${cfg.bg} ${cfg.border}
              ${!alert.acknowledged ? 'opacity-100' : 'opacity-60'}`}
          >
            <div className={`mt-0.5 flex-shrink-0 ${cfg.icon}`}>
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                {alert.acknowledged && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">Acknowledged</span>
                )}
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{alert.type}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Value: <span className="font-medium">{alert.value}</span>
                {alert.threshold && <> · Threshold: <span className="font-medium">{alert.threshold}</span></>}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatRelativeTime(alert.created_at)}</p>
            </div>
            {!alert.acknowledged && (
              <button
                onClick={() => handleAcknowledge(alert.id)}
                disabled={loading}
                className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all disabled:opacity-50"
                title="Mark as acknowledged"
              >
                <MdCheckCircle size={18} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
