import React, { useEffect, useState } from 'react';
import { MdRefresh, MdHistory } from 'react-icons/md';
import { commandsAPI } from '../services/api';
import { formatRelativeTime } from '../utils/formatters';

const ACTUATOR_META = {
  heater:          { label: 'Heater',     icon: '🔥' },
  humidifier:      { label: 'Humidifier', icon: '💧' },
  linear_actuator: { label: 'Actuator',   icon: '⚙️' },
};

const formatPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return [];
  return Object.entries(payload)
    .filter(([k]) => ACTUATOR_META[k])
    .map(([k, v]) => ({
      key: k,
      icon: ACTUATOR_META[k].icon,
      label: ACTUATOR_META[k].label,
      isOn: Boolean(v),
    }));
};


export const CommandHistory = ({ deviceId = '1' }) => {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCommands = async () => {
    try {
      setLoading(true);
      const res = await commandsAPI.getHistory(deviceId);
      setCommands((res.data.commands || []).filter((c) => c.status === 'success'));
    } catch (err) {
      console.error('Failed to fetch command history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommands();
  }, [deviceId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <MdHistory size={18} className="text-gray-400 dark:text-gray-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {commands.length} command{commands.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <button
          onClick={fetchCommands}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-all disabled:opacity-50"
        >
          <MdRefresh size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && commands.length === 0 ? (
        <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">Loading...</div>
      ) : commands.length === 0 ? (
        <div className="py-14 flex flex-col items-center text-center">
          <div className="text-3xl mb-3">📭</div>
          <p className="font-medium text-gray-600 dark:text-gray-400 text-sm">No commands yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Commands will appear here once sent</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {commands.map((cmd) => {
            const items = formatPayload(cmd.command_payload);
            return (
              <div
                key={cmd.id}
                className="flex items-start justify-between gap-4 p-4 bg-gray-50 dark:bg-slate-700/40 border border-gray-100 dark:border-slate-600/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  {/* Actuator states */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {items.map(({ key, icon, label, isOn }) => (
                      <span
                        key={key}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border
                          ${isOn
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400'
                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400'
                          }`}
                      >
                        <span>{icon}</span>
                        {label}
                        <span className={`font-bold ${isOn ? 'text-blue-600 dark:text-blue-300' : 'text-gray-400 dark:text-gray-500'}`}>
                          {isOn ? 'ON' : 'OFF'}
                        </span>
                      </span>
                    ))}
                  </div>
                  {/* Timestamp */}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {formatRelativeTime(cmd.sent_at)}
                  </p>
                </div>
                <span className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50">
                  ✓ Sent
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
