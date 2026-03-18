import React, { useEffect, useState } from 'react';
import {
  MdThermostat, MdWaterDrop, MdWarning, MdCheckCircle, MdBolt, MdGrass, MdEgg, MdMemory, MdClose,
} from 'react-icons/md';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LiveChart } from '../components/Charts';
import { ActuatorControls } from '../components/ActuatorControls';
import { AlertsPanel } from '../components/AlertsPanel';
import { useDeviceData } from '../hooks/useDeviceData';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDeviceStore } from '../store/deviceStore';
import { useAlertStore } from '../store/alertStore';
import { alertsAPI, devicesAPI } from '../services/api';
import { formatRelativeTime, isWithinMinutes } from '../utils/formatters';

const TZ = 'Africa/Dar_es_Salaam';

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
  const serverLastUpdate = useDeviceStore((state) => state.serverLastUpdate);
  const firmwareVersion = useDeviceStore((state) => state.firmwareVersion);
  const incubationStart = useDeviceStore((state) => state.incubationStart);
  const setIncubationStart = useDeviceStore((state) => state.setIncubationStart);
  const resetActuators = useDeviceStore((state) => state.resetActuators);
  const { loading, error } = useDeviceData(deviceId);
  const alerts = useAlertStore((state) => state.alerts);
  const setAlerts = useAlertStore((state) => state.setAlerts);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const [now, setNow] = useState(new Date());
  const [resetting, setResetting] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(null);

  // New Batch modal state
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [batchEggType, setBatchEggType] = useState('chicken');
  const [batchEggCount, setBatchEggCount] = useState('');

  // End Batch modal state
  const [showEndBatchModal, setShowEndBatchModal] = useState(false);
  const [endReason, setEndReason] = useState('');
  const [successfulHatches, setSuccessfulHatches] = useState('');
  const [ending, setEnding] = useState(false);

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

  // Reset all toggle switches when device goes offline
  useEffect(() => {
    if (serverLastUpdate && !isWithinMinutes(serverLastUpdate, 20)) {
      resetActuators();
    }
  }, [serverLastUpdate, resetActuators]);

  // Load current batch on mount
  useEffect(() => {
    if (!deviceId) return;
    devicesAPI.getCurrentBatch(deviceId)
      .then((res) => setCurrentBatch(res.data.batch))
      .catch(() => {});
  }, [deviceId]);

  const handleConfirmNewBatch = async () => {
    if (!batchEggCount || parseInt(batchEggCount) < 1) return;
    try {
      setResetting(true);
      const res = await devicesAPI.resetIncubationStart(deviceId, {
        egg_type: batchEggType,
        egg_count: parseInt(batchEggCount),
      });
      setIncubationStart(res.data.incubation_start);
      setCurrentBatch({ egg_type: batchEggType, egg_count: parseInt(batchEggCount), status: 'active' });
      setShowNewBatchModal(false);
      setBatchEggCount('');
    } catch (err) {
      console.error('Failed to start batch:', err);
      alert('Failed to start batch. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  const handleConfirmEndBatch = async () => {
    if (!endReason.trim()) return;
    try {
      setEnding(true);
      await devicesAPI.endBatch(deviceId, {
        end_reason: endReason.trim(),
        successful_hatches: successfulHatches !== '' ? parseInt(successfulHatches) : null,
      });
      setIncubationStart(null);
      setCurrentBatch(null);
      setShowEndBatchModal(false);
      setEndReason('');
      setSuccessfulHatches('');
    } catch (err) {
      console.error('Failed to end batch:', err);
      alert('Failed to end batch. Please try again.');
    } finally {
      setEnding(false);
    }
  };

  if (loading || !alertsLoaded) return <LoadingSpinner fullScreen />;

  // Use server-stamped last_update (UTC-safe) — falls back to WS timestamp if server value not yet loaded
  const isOnline = isWithinMinutes(serverLastUpdate, 20) ||
    (lastUpdate && (Date.now() - new Date(lastUpdate).getTime()) < 20 * 60 * 1000);

  const temperature = currentReading?.temperature ?? 0;
  const humidity = currentReading?.humidity ?? 0;
  const soilTemperature = currentReading?.water_temperature ?? null;
  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;
  const tempNormal = temperature >= 36 && temperature <= 39;
  const humidNormal = humidity >= 40 && humidity <= 70;

  // Incubation day calculation — compare calendar dates in Tanzania time so the
  // day increments at midnight EAT regardless of what time the batch was started.
  let incubationDay = null;
  if (incubationStart) {
    const startMs = typeof incubationStart === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(incubationStart)
      ? new Date(incubationStart.replace(' ', 'T') + 'Z').getTime()
      : new Date(incubationStart).getTime();
    const toEATDate = (ms) => {
      const d = new Date(new Date(ms).toLocaleDateString('en-CA', { timeZone: TZ }));
      return d;
    };
    const diffDays = Math.round((toEATDate(Date.now()) - toEATDate(startMs)) / (1000 * 60 * 60 * 24));
    incubationDay = Math.max(1, diffDays + 1);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8 pt-16 lg:pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm">
            {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: TZ })}
            {' · '}
            <span className="font-mono">{now.toLocaleTimeString('en-US', { timeZone: TZ })}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentBatch && (
            <button
              onClick={() => setShowEndBatchModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-red-700 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              End Batch
            </button>
          )}
          <button
            onClick={() => setShowNewBatchModal(true)}
            disabled={resetting}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50"
          >
            <MdEgg size={14} />
            New Batch
          </button>
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
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <MdWarning size={18} className="flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-5 mb-6">
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
          title="Fluid Temperature"
          value={soilTemperature !== null ? soilTemperature.toFixed(1) : '—'}
          unit={soilTemperature !== null ? '°C' : ''}
          icon={MdGrass}
          borderClass="border-teal-100 dark:border-teal-900/30"
          iconBg="bg-gradient-to-br from-teal-400 to-teal-600 shadow-teal-400/40"
          subtitle="Fluid / water temp"
        />
        <StatCard
          title="Incubation Day"
          value={incubationDay !== null ? `${incubationDay}` : '—'}
          unit={incubationDay !== null ? '/ 21' : ''}
          icon={MdEgg}
          borderClass={incubationDay !== null && incubationDay > 18 ? 'border-emerald-200 dark:border-emerald-900/40' : 'border-amber-100 dark:border-amber-900/30'}
          iconBg={incubationDay !== null && incubationDay > 18 ? 'bg-gradient-to-br from-emerald-400 to-green-500 shadow-emerald-400/40' : 'bg-gradient-to-br from-amber-400 to-yellow-500 shadow-amber-400/40'}
          trend={incubationDay !== null && incubationDay > 18 ? 'Hatching soon' : incubationDay !== null ? 'In progress' : 'Not set'}
          trendClass={incubationDay !== null && incubationDay > 18 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'}
          subtitle={
            incubationDay !== null
              ? `${Math.max(0, 21 - incubationDay)} days remaining${currentBatch ? ` · ${currentBatch.egg_count} ${currentBatch.egg_type} eggs` : ''}`
              : 'Click New Batch to start'
          }
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
          subtitle={serverLastUpdate ? 'Last seen: ' + formatRelativeTime(serverLastUpdate) : 'No data received'}
        />
        <StatCard
          title="Firmware"
          value={firmwareVersion ?? '—'}
          icon={MdMemory}
          borderClass="border-violet-100 dark:border-violet-900/30"
          iconBg="bg-gradient-to-br from-violet-400 to-violet-600 shadow-violet-400/40"
          trend="Device FW"
          trendClass="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
          subtitle={firmwareVersion ? 'Last reported version' : 'Waiting for device'}
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

      {/* New Batch Modal */}
      {showNewBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <MdEgg size={20} className="text-amber-500" />
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Start New Batch</h2>
              </div>
              <button onClick={() => setShowNewBatchModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Egg Type</label>
                <select
                  value={batchEggType}
                  onChange={(e) => setBatchEggType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="chicken">Chicken</option>
                  <option value="turkey">Turkey</option>
                  <option value="duck">Duck</option>
                  <option value="goose">Goose</option>
                  <option value="quail">Quail</option>
                  <option value="other">Other domestic bird</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Number of Eggs</label>
                <input
                  type="number"
                  min="1"
                  value={batchEggCount}
                  onChange={(e) => setBatchEggCount(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">This will reset the incubation timer to today and notify the device.</p>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setShowNewBatchModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNewBatch}
                disabled={resetting || !batchEggCount || parseInt(batchEggCount) < 1}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-lg text-sm font-semibold text-white transition-colors"
              >
                {resetting ? 'Starting...' : 'Start Batch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Batch Modal */}
      {showEndBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">End Current Batch</h2>
              <button onClick={() => setShowEndBatchModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reason for Ending <span className="text-red-400">*</span></label>
                <select
                  value={endReason}
                  onChange={(e) => setEndReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">Select a reason...</option>
                  <option value="completed">Completed — hatching done</option>
                  <option value="infertile">Eggs were infertile</option>
                  <option value="power_failure">Power failure / equipment issue</option>
                  <option value="disease">Disease / contamination</option>
                  <option value="cancelled">Cancelled manually</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Successful Hatches</label>
                <input
                  type="number"
                  min="0"
                  value={successfulHatches}
                  onChange={(e) => setSuccessfulHatches(e.target.value)}
                  placeholder="Number of eggs that hatched"
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                {currentBatch?.egg_count && successfulHatches !== '' && (
                  <p className="text-xs text-gray-400 mt-1">
                    Hatch rate: {Math.round((parseInt(successfulHatches) / currentBatch.egg_count) * 100)}% ({currentBatch.egg_count} eggs total)
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setShowEndBatchModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEndBatch}
                disabled={ending || !endReason}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg text-sm font-semibold text-white transition-colors"
              >
                {ending ? 'Ending...' : 'End Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { Dashboard };
