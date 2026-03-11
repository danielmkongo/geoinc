import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useDeviceStore } from '../store/deviceStore';
import { formatTime } from '../utils/formatters';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl p-3 text-sm">
      <p className="text-gray-400 dark:text-gray-500 text-xs mb-2 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1 last:mb-0">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="font-bold text-gray-900 dark:text-white">
            {entry.value?.toFixed(2)}
            {entry.name === 'Temperature' ? '°C' : '%'}
          </span>
          <span className="text-gray-400 text-xs">{entry.name}</span>
        </div>
      ))}
    </div>
  );
};

export const LiveChart = () => {
  const temperatureHistory = useDeviceStore((state) => state.temperatureHistory);
  const humidityHistory = useDeviceStore((state) => state.humidityHistory);

  const chartData = temperatureHistory.map((t, i) => ({
    displayTime: formatTime(t.timestamp),
    Temperature: t.value,
    Humidity: humidityHistory[i]?.value ?? null,
  }));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Live Sensor Data</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Real-time temperature &amp; humidity</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-gray-600 dark:text-gray-400">Temperature</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">Humidity</span>
          </div>
        </div>
      </div>
      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
          <p className="text-sm">Waiting for live data...</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="humidGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis dataKey="displayTime" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="Temperature" stroke="#f97316" strokeWidth={2.5} fill="url(#tempGrad)" dot={false} activeDot={{ r: 5, fill: '#f97316', strokeWidth: 0 }} />
            <Area type="monotone" dataKey="Humidity" stroke="#3b82f6" strokeWidth={2.5} fill="url(#humidGrad)" dot={false} activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export const TemperatureChart = () => {
  const temperatureHistory = useDeviceStore((state) => state.temperatureHistory);
  const chartData = temperatureHistory.map((r) => ({
    displayTime: formatTime(r.timestamp),
    Temperature: r.value,
  }));
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Temperature Trend</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
          <defs>
            <linearGradient id="tGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="displayTime" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="Temperature" stroke="#f97316" strokeWidth={2.5} fill="url(#tGrad2)" dot={false} activeDot={{ r: 4, fill: '#f97316', strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const HumidityChart = () => {
  const humidityHistory = useDeviceStore((state) => state.humidityHistory);
  const chartData = humidityHistory.map((r) => ({
    displayTime: formatTime(r.timestamp),
    Humidity: r.value,
  }));
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Humidity Trend</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
          <defs>
            <linearGradient id="hGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="displayTime" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="Humidity" stroke="#3b82f6" strokeWidth={2.5} fill="url(#hGrad2)" dot={false} activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
