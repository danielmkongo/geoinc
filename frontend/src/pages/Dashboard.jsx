import React, { useEffect, useState } from 'react';
import {
  MdThermostat, MdWaterDrop, MdWarning, MdCheckCircle, MdBolt, MdGrass,
} from 'react-icons/md';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LiveChart } from '../components/Charts';
import { ActuatorControls } from '../components/ActuatorControls';
import { AlertsPanel } from '../components/AlertsPanel';
import { useDeviceData } from '../hooks/useDeviceData';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDeviceStore } from '../store/deviceStore';
import { useAlertStore } from '../store/alertStore';
import { alertsAPI } from '../services/api';
import { formatRelativeTime } from '../utils/formatters';

const StatCard = ({ title, value, unit, icon: Icon, iconBg, borderClass, trend, trendClass, subtitle }) => (
  <div className={`relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 p-5 lg:p-6 ${borderClass}`}>
    <div className="flex items-start justify-between mb-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ${iconBg}`}>
        <Icon size={22} className="text-white" />
      </div>
      {trend && (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${trendClass}`}>{trend}</span>
      )}
    </div>
    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{title}</p>
    <div className="flex items-baseline gap-1">
      <span className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</span>
      {unit && <span className="text-base text-gray-400 dark:text-gray-500 font-medium">{unit}</span>}
    </div>
    {subtitle && <p className="text-xs mt-2 text-gray-400 dark:text-gray-500">{subtitle}</p>}
  </div>
);

const Dashboard = () => {
  const deviceId = useDeviceStore((state) => state.deviceId);
  const currentReading = useDeviceStore((state) => state.currentReading);
  const actuatorStates = useDeviceStore((state) => state.actuatorStates);
  const lastUpdate = useDeviceStore((state) => state.lastUpdate);
  const { loading, error } = useDeviceData(deviceId);
  const alerts = useAlertStore((state) => state.alerts);
  const setAlerts = useAlertStore((state) => state.setAlerts);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const [now, setNow] = useState(new Date());

  useWebSocket();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const res = await alertsAPI.getAll(deviceId);
        setAlerts(res.data.alerts);
      } catch (err) {
        console.error('Failed to load alerts:', err);
      } finally {
        setAlertsLoaded(true);
      }
    };
    loadAlerts();
  }, [deviceId, setAlerts]);

  if (loading || !alertsLoaded) return <LoadingSpinner fullScreen />;

  const temperature = currentReading?.temperature ?? 0;
  const humidity = currentReading?.humidity ?? 0;
  const soilTemperature = currentReading?.soil_temperature ?? null;
  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;
  const isOnline = lastUpdate && (Date.now() - new Date(lastUpdate).getTime()) < 60 * 60 * 1000;
  const tempNormal = temperature >= 36 && temperature <= 39;
  const humidNormal = humidity >= 40 && humidity <= 70;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8 pt-16 lg:pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm">
            {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}
            <span className="font-mono">{now.toLocaleTimeString()}</span>
          </p>
        </div>
        {isOnline ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Live
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-red-600 dark:text-red-400 text-xs font-semibold">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            Offline
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <MdWarning size={18} className="flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-5 mb-6">
        <StatCard
          title="Temperature"
          value={temperature.toFixed(1)}
          unit="°C"
          icon={MdThermostat}
          borderClass={tempNormal ? 'border-orange-100 dark:border-orange-900/30' : 'border-red-200 dark:border-red-900/40'}
          iconBg={tempNormal ? 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-400/40' : 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/40'}
          trend={tempNormal ? '✓ Normal' : '⚠ Alert'}
          trendClass={tempNormal ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}
          subtitle="Target: 36 – 39°C"
        />
        <StatCard
          title="Humidity"
          value={humidity.toFixed(1)}
          unit="%"
          icon={MdWaterDrop}
          borderClass={humidNormal ? 'border-blue-100 dark:border-blue-900/30' : 'border-red-200 dark:border-red-900/40'}
          iconBg={humidNormal ? 'bg-gradient-to-br from-blue-400 to-cyan-500 shadow-blue-400/40' : 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/40'}
          trend={humidNormal ? '✓ Normal' : '⚠ Alert'}
          trendClass={humidNormal ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}
          subtitle="Target: 40 – 70%"
        />
        <StatCard
          title="Soil Temperature"
          value={soilTemperature !== null ? soilTemperature.toFixed(1) : '—'}
          unit={soilTemperature !== null ? '°C' : ''}
          icon={MdGrass}
          borderClass="border-teal-100 dark:border-teal-900/30"
          iconBg="bg-gradient-to-br from-teal-400 to-teal-600 shadow-teal-400/40"
          subtitle="Soil / water temp"
        />
        <StatCard
          title="Alerts"
          value={unreadAlerts}
          icon={unreadAlerts > 0 ? MdWarning : MdCheckCircle}
          borderClass={unreadAlerts > 0 ? 'border-amber-200 dark:border-amber-900/40' : 'border-emerald-100 dark:border-emerald-900/30'}
          iconBg={unreadAlerts > 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-400/40' : 'bg-gradient-to-br from-emerald-400 to-green-500 shadow-emerald-400/40'}
          trend={unreadAlerts > 0 ? 'Needs review' : 'All clear'}
          trendClass={unreadAlerts > 0 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}
          subtitle="Unacknowledged"
        />
        <StatCard
          title="System"
          value={isOnline ? 'Online' : 'Offline'}
          icon={MdBolt}
          borderClass={isOnline ? 'border-emerald-100 dark:border-emerald-900/30' : 'border-red-200 dark:border-red-900/40'}
          iconBg={isOnline ? 'bg-gradient-to-br from-emerald-400 to-green-600 shadow-emerald-400/40' : 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/40'}
          trend={isOnline ? 'Connected' : 'Disconnected'}
          trendClass={isOnline ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}
          subtitle={isOnline && currentReading ? 'Updated ' + formatRelativeTime(currentReading.timestamp) : 'No recent data'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6 mb-6">
        <div className="xl:col-span-2">
          <LiveChart />
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-5 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              Actuator Status
            </h3>
            <div className="space-y-2.5">
              {[
                { key: 'pump', label: 'Pump', icon: '💧', on: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
                { key: 'egg_rotation_motor', label: 'Egg Rotation Motor', icon: '🥚', on: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
                { key: 'exhaust_fan', label: 'Exhaust Fan', icon: '💨', on: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/50', dot: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
                { key: 'inlet_fan', label: 'Inlet Fan', icon: '🌀', on: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800/50', dot: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400' },
                { key: 'radiator_fan', label: 'Radiator Fan', icon: '🌡️', on: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50', dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' },
              ].map(({ key, label, icon, on, dot, text }) => (
                <div key={key} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${actuatorStates[key] ? on : 'bg-gray-50 dark:bg-slate-700/40 border-gray-200 dark:border-slate-600/50'}`}>
                  <div className="flex items-center gap-2.5"><span>{icon}</span><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span></div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${actuatorStates[key] ? `${dot} animate-pulse` : 'bg-gray-300 dark:bg-slate-500'}`} />
                    <span className={`text-xs font-bold ${actuatorStates[key] ? text : 'text-gray-400'}`}>{actuatorStates[key] ? 'ON' : 'OFF'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Quick Controls</h3>
            <ActuatorControls />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-5 lg:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MdWarning size={18} className="text-amber-500" />
            Recent Alerts
          </h3>
          {unreadAlerts > 0 && (
            <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-full">
              {unreadAlerts} unread
            </span>
          )}
        </div>
        <AlertsPanel />
      </div>
    </div>
  );
};

export { Dashboard };
