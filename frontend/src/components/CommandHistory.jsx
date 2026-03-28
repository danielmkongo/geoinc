import React, { useEffect, useState } from 'react';
import { MdRefresh, MdHistory, MdWaterDrop, MdAutorenew, MdSettings, MdHeatPump } from 'react-icons/md';
import { commandsAPI } from '../services/api';
import { formatRelativeTime } from '../utils/formatters';

const ACTUATOR_META = {
  pump:               { label: 'Pump',         Icon: MdWaterDrop },
  egg_rotation_motor: { label: 'Egg Motor',    Icon: MdAutorenew },
  exhaust_fan:        { label: 'Exhaust Fan',  Icon: MdSettings  },
  inlet_fan:          { label: 'Inlet Fan',    Icon: MdSettings  },
  radiator_fan:       { label: 'Radiator Fan', Icon: MdHeatPump  },
};

const parsePayload = (raw) => {
  if (!raw) return [];
  const payload = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
  if (!payload || typeof payload !== 'object') return [];
  return Object.entries(ACTUATOR_META)
    .filter(([k]) => k in payload)
    .map(([k, meta]) => ({ key: k, ...meta, isOn: Boolean(payload[k]) }));
};

const statusBadge = (status) => {
  if (status === 'sent')    return { label: 'Sent',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40' };
  if (status === 'pending') return { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40' };
  if (status === 'failed')  return { label: 'Failed',  cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40' };
  return { label: status, cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600' };
};

export const CommandHistory = ({ deviceId = '1', compact = false }) => {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading]   = useState(false);

  const fetchCommands = async () => {
    try {
      setLoading(true);
      const res = await commandsAPI.getHistory(deviceId, compact ? 8 : 50);
      const all = (res.data.commands || []).filter((c) => c.command_type === 'toggle_actuators');
      setCommands(compact ? all.slice(0, 8) : all);
    } catch (err) {
      console.error('Failed to fetch command history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCommands(); }, [deviceId]);

  if (loading && commands.length === 0) {
    return <div className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">Loading...</div>;
  }

  if (commands.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'}`}>
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-700/60 flex items-center justify-center mb-3">
          <MdHistory size={24} className="text-gray-300 dark:text-slate-500" />
        </div>
        <p className="font-semibold text-gray-600 dark:text-gray-400 text-sm">No commands sent yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Commands will appear here once you control the actuators</p>
      </div>
    );
  }

  return (
    <div>
      {!compact && (
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {commands.length} command{commands.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={fetchCommands}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-all disabled:opacity-50"
          >
            <MdRefresh size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        {!compact && (
          <div className="absolute left-[19px] top-4 bottom-4 w-px bg-gray-100 dark:bg-slate-700/60" />
        )}

        <div className="space-y-1">
          {commands.map((cmd, idx) => {
            const items   = parsePayload(cmd.command_payload);
            const onItems = items.filter((i) => i.isOn);
            const badge   = statusBadge(cmd.status);

            return (
              <div key={cmd.id} className={`relative flex gap-4 group ${compact ? '' : 'pl-2'}`}>
                {/* Timeline dot */}
                {!compact && (
                  <div className="flex-shrink-0 w-10 flex flex-col items-center pt-3.5">
                    <div className={`w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 z-10 ${
                      cmd.status === 'sent' ? 'bg-emerald-400' :
                      cmd.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'
                    }`} />
                  </div>
                )}

                {/* Card */}
                <div className={`flex-1 rounded-xl border transition-colors mb-1
                  bg-white dark:bg-slate-800/50 border-gray-100 dark:border-slate-700/40
                  hover:border-gray-200 dark:hover:border-slate-600/60
                  ${compact ? 'p-3' : 'p-3.5'}
                `}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-mono text-gray-400 dark:text-slate-500">
                      {formatRelativeTime(cmd.sent_at)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Actuator state grid */}
                  {items.length > 0 ? (
                    <div className="grid grid-cols-5 gap-1">
                      {items.map(({ key, label, Icon, isOn }) => (
                        <div
                          key={key}
                          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
                            isOn
                              ? 'bg-slate-900 dark:bg-slate-700'
                              : 'bg-gray-50 dark:bg-slate-800/80'
                          }`}
                        >
                          <Icon size={14} className={isOn ? 'text-white' : 'text-gray-300 dark:text-slate-600'} />
                          <span className={`text-[9px] font-bold leading-none ${
                            isOn ? 'text-white' : 'text-gray-300 dark:text-slate-600'
                          }`}>
                            {isOn ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-slate-600 italic">No actuator data</p>
                  )}

                  {/* Summary line */}
                  {items.length > 0 && (
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 font-mono">
                      {onItems.length === 0
                        ? 'All actuators off'
                        : onItems.length === items.length
                          ? 'All actuators on'
                          : `${onItems.map((i) => i.label).join(', ')} on`
                      }
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {compact && (
        <button
          onClick={fetchCommands}
          disabled={loading}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
        >
          <MdRefresh size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      )}
    </div>
  );
};
