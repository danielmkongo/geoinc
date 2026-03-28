import React, { useEffect, useState } from 'react';
import { MdRefresh, MdHistory, MdWaterDrop, MdAutorenew, MdSettings, MdHeatPump } from 'react-icons/md';
import { commandsAPI } from '../services/api';
import { formatRelativeTime } from '../utils/formatters';

const ACTUATOR_META = {
  pump:                { label: 'Pump',         Icon: MdWaterDrop,  on: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300',   off: 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-500' },
  egg_rotation_motor:  { label: 'Egg Motor',    Icon: MdAutorenew,  on: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-300',  off: 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-500' },
  exhaust_fan:         { label: 'Exhaust Fan',  Icon: MdSettings,   on: 'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-900/20 dark:border-cyan-800/50 dark:text-cyan-300',    off: 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-500' },
  inlet_fan:           { label: 'Inlet Fan',    Icon: MdSettings,   on: 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-900/20 dark:border-sky-800/50 dark:text-sky-300',       off: 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-500' },
  radiator_fan:        { label: 'Radiator Fan', Icon: MdHeatPump,   on: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800/50 dark:text-orange-300', off: 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-500' },
};

const parsePayload = (payload) => {
  if (!payload || typeof payload !== 'object') return [];
  return Object.entries(ACTUATOR_META)
    .filter(([k]) => k in payload)
    .map(([k, meta]) => ({ key: k, ...meta, isOn: Boolean(payload[k]) }));
};

export const CommandHistory = ({ deviceId = '1' }) => {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading]   = useState(false);

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

  useEffect(() => { fetchCommands(); }, [deviceId]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <MdHistory size={16} />
          {commands.length} command{commands.length !== 1 ? 's' : ''} recorded
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

      {/* States */}
      {loading && commands.length === 0 ? (
        <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">Loading...</div>
      ) : commands.length === 0 ? (
        <div className="py-14 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-700/60 flex items-center justify-center mb-4">
            <MdHistory size={28} className="text-gray-300 dark:text-slate-500" />
          </div>
          <p className="font-semibold text-gray-600 dark:text-gray-400 text-sm">No commands yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Commands will appear here once sent</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {commands.map((cmd) => {
            const items = parsePayload(cmd.command_payload);
            const onCount = items.filter((i) => i.isOn).length;
            return (
              <div
                key={cmd.id}
                className="p-4 rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800/60 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors"
              >
                {/* Top row: timestamp + status */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                    {formatRelativeTime(cmd.sent_at)}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-400 dark:text-slate-500">
                      {onCount}/{items.length} ON
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400">
                      ✓ Confirmed
                    </span>
                  </div>
                </div>

                {/* Actuator tags */}
                {items.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {items.map(({ key, label, Icon, isOn, on, off }) => (
                      <span
                        key={key}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${isOn ? on : off}`}
                      >
                        <Icon size={12} />
                        {label}
                        <span className={`font-bold text-[10px] ${isOn ? 'opacity-100' : 'opacity-60'}`}>
                          {isOn ? 'ON' : 'OFF'}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-slate-500 italic">No actuator data</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
