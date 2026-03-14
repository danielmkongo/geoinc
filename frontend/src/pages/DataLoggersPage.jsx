import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdSensors, MdLocationOn } from 'react-icons/md';
import { dataLoggersAPI } from '../services/api';
import { formatRelativeTime, isWithinMinutes } from '../utils/formatters';

const isOnline = (lastSeen) => isWithinMinutes(lastSeen, 20);

export const DataLoggersPage = () => {
  const [loggers, setLoggers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataLoggersAPI.getAll()
      .then((res) => setLoggers(res.data.loggers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8 pt-16 lg:pt-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Data Loggers</h1>
          <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm">
            Environmental monitoring stations
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : loggers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <MdSensors size={32} className="text-gray-400 dark:text-slate-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">No data loggers registered</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Ask an admin to register a data logger station
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {loggers.map((logger) => {
            const online = isOnline(logger.last_seen);
            return (
              <Link
                key={logger.id}
                to={`/data-loggers/${logger.id}`}
                className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-green-200 dark:hover:border-green-800/50 transition-all duration-200 p-5 flex flex-col gap-4"
              >
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-400/30 flex-shrink-0">
                    <MdSensors size={22} className="text-white" />
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
                    ${online
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400'
                      : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400'
                    }`}>
                    {online
                      ? <><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live</>
                      : <><div className="w-1.5 h-1.5 bg-gray-400 rounded-full" /> Offline</>
                    }
                  </div>
                </div>

                {/* Name + description */}
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    {logger.name}
                  </h3>
                  {logger.serial_number && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{logger.serial_number}</p>
                  )}
                  {logger.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{logger.description}</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700/50 mt-auto">
                  {logger.latitude && logger.longitude ? (
                    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <MdLocationOn size={14} className="text-green-500" />
                      {parseFloat(logger.latitude).toFixed(4)}, {parseFloat(logger.longitude).toFixed(4)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 dark:text-slate-600">No location set</span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {logger.last_seen ? formatRelativeTime(logger.last_seen) : 'No data yet'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
