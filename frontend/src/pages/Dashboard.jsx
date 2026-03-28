import React, { useEffect, useState } from 'react';
import {
  MdThermostat, MdWaterDrop, MdWarning, MdCheckCircle, MdBolt,
  MdGrass, MdEgg, MdMemory, MdClose, MdTrendingUp, MdCircle,
} from 'react-icons/md';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LiveChart } from '../components/Charts';
import { AlertsPanel } from '../components/AlertsPanel';
import { CommandCenter } from '../components/CommandCenter';
import { useAuth } from '../hooks/useAuth';
import { useDeviceData } from '../hooks/useDeviceData';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDeviceStore } from '../store/deviceStore';
import { useAlertStore } from '../store/alertStore';
import { alertsAPI, devicesAPI } from '../services/api';
import { formatRelativeTime, isWithinMinutes } from '../utils/formatters';

const TZ = 'Africa/Dar_es_Salaam';

// ── Range bar: shows a target zone and the current value position ─────────────
const RangeBar = ({ value, min, max, targetMin, targetMax, colorClass }) => {
  if (value == null) return null;
  const pct        = (v) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  const valPct     = pct(value);
  const tStartPct  = pct(targetMin);
  const tWidthPct  = pct(targetMax) - tStartPct;
  const inRange    = value >= targetMin && value <= targetMax;
  return (
    <div className="relative h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full mt-3 overflow-visible">
      {/* Target zone */}
      <div
        className="absolute top-0 h-full rounded-full bg-emerald-200 dark:bg-emerald-800/50"
        style={{ left: `${tStartPct}%`, width: `${tWidthPct}%` }}
      />
      {/* Current value cursor */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 shadow-md -translate-x-1/2 transition-all duration-500 ${inRange ? colorClass : 'bg-red-500'}`}
        style={{ left: `${valPct}%` }}
      />
    </div>
  );
};

// ── Metric card ───────────────────────────────────────────────────────────────
const MetricCard = ({
  title, value, unit, icon: Icon, iconBg,
  borderClass, trendLabel, trendClass,
  subtitle, children,
}) => (
  <div className={`relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border shadow-sm hover:shadow-md transition-shadow duration-200 p-5 ${borderClass}`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ${iconBg}`}>
        <Icon size={20} className="text-white" />
      </div>
      {trendLabel && (
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${trendClass}`}>{trendLabel}</span>
      )}
    </div>
    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{title}</p>
    <div className="flex items-baseline gap-1">
      <span className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</span>
      {unit && <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">{unit}</span>}
    </div>
    {children}
    {subtitle && <p className="text-[11px] mt-2.5 text-gray-400 dark:text-gray-500">{subtitle}</p>}
  </div>
);

// ── Mini stat (compact, for less critical metrics) ────────────────────────────
const MiniStat = ({ title, value, unit, icon: Icon, iconCls, accent, subtitle }) => (
  <div className={`flex items-center gap-4 bg-white dark:bg-slate-800 rounded-2xl border shadow-sm p-4 ${accent}`}>
    <div className="flex-shrink-0">
      <Icon size={22} className={iconCls} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{title}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white truncate">
        {value}{unit && <span className="text-sm font-medium text-gray-400 dark:text-gray-500 ml-0.5">{unit}</span>}
      </p>
      {subtitle && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{subtitle}</p>}
    </div>
  </div>
);

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user }         = useAuth();
  const deviceId         = useDeviceStore((s) => s.deviceId);
  const currentReading   = useDeviceStore((s) => s.currentReading);
  const lastUpdate       = useDeviceStore((s) => s.lastUpdate);
  const serverLastUpdate = useDeviceStore((s) => s.serverLastUpdate);
  const firmwareVersion  = useDeviceStore((s) => s.firmwareVersion);
  const incubationStart  = useDeviceStore((s) => s.incubationStart);
  const setIncubationStart = useDeviceStore((s) => s.setIncubationStart);
  const resetActuators   = useDeviceStore((s) => s.resetActuators);
  const { loading, error } = useDeviceData(deviceId);
  const alerts           = useAlertStore((s) => s.alerts);
  const setAlerts        = useAlertStore((s) => s.setAlerts);
  const acknowledgeAlert = useAlertStore((s) => s.acknowledgeAlert);

  const [alertsLoaded, setAlertsLoaded]     = useState(false);
  const [now, setNow]                       = useState(new Date());
  const [resetting, setResetting]           = useState(false);
  const [currentBatch, setCurrentBatch]     = useState(null);
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [batchEggType, setBatchEggType]     = useState('chicken');
  const [batchEggCount, setBatchEggCount]   = useState('');
  const [showEndBatchModal, setShowEndBatchModal] = useState(false);
  const [endReason, setEndReason]           = useState('');
  const [successfulHatches, setSuccessfulHatches] = useState('');
  const [ending, setEnding]                 = useState(false);
  const [ackingAll, setAckingAll]           = useState(false);

  useWebSocket();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await alertsAPI.getAll(deviceId);
        setAlerts(res.data.alerts);
      } catch (err) {
        console.error('Failed to load alerts:', err);
      } finally {
        setAlertsLoaded(true);
      }
    };
    load();
  }, [deviceId, setAlerts]);

  useEffect(() => {
    if (serverLastUpdate && !isWithinMinutes(serverLastUpdate, 20)) resetActuators();
  }, [serverLastUpdate, resetActuators]);

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
        egg_type: batchEggType, egg_count: parseInt(batchEggCount),
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

  const handleAcknowledgeAll = async () => {
    if (!alerts.length) return;
    const acknowledgedBy = user?.full_name || user?.username || null;
    try {
      setAckingAll(true);
      await alertsAPI.clearUnread(deviceId, acknowledgedBy);
      alerts.forEach((a) => acknowledgeAlert(a.id));
    } catch (err) {
      console.error('Acknowledge all error:', err);
    } finally {
      setAckingAll(false);
    }
  };

  if (loading || !alertsLoaded) return <LoadingSpinner fullScreen />;

  const isOnline = isWithinMinutes(serverLastUpdate, 20) ||
    (lastUpdate && (Date.now() - new Date(lastUpdate).getTime()) < 20 * 60 * 1000);

  const temperature   = currentReading?.temperature ?? null;
  const humidity      = currentReading?.humidity ?? null;
  const waterTemp     = currentReading?.water_temperature ?? null;
  const tempNormal    = temperature != null && temperature >= 36 && temperature <= 39;
  const humidNormal   = humidity    != null && humidity    >= 40 && humidity    <= 70;
  const unreadAlerts  = alerts.length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;

  // Incubation day
  let incubationDay = null;
  if (incubationStart) {
    const startMs = typeof incubationStart === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(incubationStart)
      ? new Date(incubationStart.replace(' ', 'T') + 'Z').getTime()
      : new Date(incubationStart).getTime();
    const toEATDate = (ms) => new Date(new Date(ms).toLocaleDateString('en-CA', { timeZone: TZ }));
    incubationDay = Math.max(1, Math.round((toEATDate(Date.now()) - toEATDate(startMs)) / (1000 * 60 * 60 * 24)) + 1);
  }
  const batchProgress = incubationDay != null ? Math.min(100, Math.round((incubationDay / 21) * 100)) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8 pt-16 lg:pt-8 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-400 dark:text-gray-500 mt-0.5 text-sm font-mono">
            {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: TZ })}
            {' · '}
            {now.toLocaleTimeString('en-US', { timeZone: TZ })}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {currentBatch && (
            <button
              onClick={() => setShowEndBatchModal(true)}
              className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-red-700 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              End Batch
            </button>
          )}
          <button
            onClick={() => setShowNewBatchModal(true)}
            disabled={resetting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg text-blue-700 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
          >
            <MdEgg size={13} /> New Batch
          </button>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold
            ${isOnline
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400'
            }`}>
            <MdCircle size={8} className={isOnline ? 'animate-pulse text-emerald-500' : 'text-red-500'} />
            {isOnline ? 'Live' : 'Offline'}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <MdWarning size={18} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── Active batch banner ──────────────────────────────────────────── */}
      {incubationDay != null && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-800/40 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MdEgg size={22} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Active Batch</p>
                <p className="font-bold text-gray-900 dark:text-white text-sm">
                  {currentBatch ? `${currentBatch.egg_count} ${currentBatch.egg_type.charAt(0).toUpperCase() + currentBatch.egg_type.slice(1)} Eggs` : 'Incubation in progress'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{incubationDay}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">of 21 days</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.max(0, 21 - incubationDay)}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">days left</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{batchProgress}%</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">complete</p>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="relative h-2 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${incubationDay > 18 ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${batchProgress}%` }}
            />
          </div>
          {incubationDay > 18 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2 flex items-center gap-1">
              <MdTrendingUp size={13} /> Hatching window approaching
            </p>
          )}
        </div>
      )}

      {/* ── Primary stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Temperature */}
        <MetricCard
          title="Amb Temperature"
          value={temperature != null ? temperature.toFixed(1) : '—'}
          unit={temperature != null ? '°C' : ''}
          icon={MdThermostat}
          iconBg={tempNormal ? 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-300/50' : 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-400/50'}
          borderClass={tempNormal ? 'border-orange-100 dark:border-orange-900/30' : 'border-red-200 dark:border-red-900/40'}
          trendLabel={temperature != null ? (tempNormal ? '✓ Normal' : '⚠ Alert') : '—'}
          trendClass={tempNormal ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}
          subtitle="Target: 36 – 39 °C"
        >
          <RangeBar value={temperature} min={30} max={45} targetMin={36} targetMax={39} colorClass="bg-orange-500" />
        </MetricCard>

        {/* Humidity */}
        <MetricCard
          title="Humidity"
          value={humidity != null ? humidity.toFixed(1) : '—'}
          unit={humidity != null ? '%' : ''}
          icon={MdWaterDrop}
          iconBg={humidNormal ? 'bg-gradient-to-br from-blue-400 to-cyan-500 shadow-blue-300/50' : 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-400/50'}
          borderClass={humidNormal ? 'border-blue-100 dark:border-blue-900/30' : 'border-red-200 dark:border-red-900/40'}
          trendLabel={humidity != null ? (humidNormal ? '✓ Normal' : '⚠ Alert') : '—'}
          trendClass={humidNormal ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}
          subtitle="Target: 40 – 70 %"
        >
          <RangeBar value={humidity} min={20} max={100} targetMin={40} targetMax={70} colorClass="bg-blue-500" />
        </MetricCard>

        {/* Spring / fluid temp */}
        <MetricCard
          title="Spring Temp"
          value={waterTemp != null ? waterTemp.toFixed(1) : '—'}
          unit={waterTemp != null ? '°C' : ''}
          icon={MdGrass}
          iconBg="bg-gradient-to-br from-teal-400 to-teal-600 shadow-teal-300/50"
          borderClass="border-teal-100 dark:border-teal-900/30"
          subtitle="Fluid / water temperature"
        />

        {/* Alerts */}
        <MetricCard
          title="Alerts"
          value={unreadAlerts}
          icon={unreadAlerts > 0 ? MdWarning : MdCheckCircle}
          iconBg={criticalCount > 0
            ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-400/50'
            : unreadAlerts > 0
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-300/50'
              : 'bg-gradient-to-br from-emerald-400 to-green-500 shadow-emerald-300/50'}
          borderClass={criticalCount > 0
            ? 'border-red-200 dark:border-red-900/40'
            : unreadAlerts > 0
              ? 'border-amber-200 dark:border-amber-900/30'
              : 'border-emerald-100 dark:border-emerald-900/30'}
          trendLabel={criticalCount > 0 ? `${criticalCount} critical` : unreadAlerts > 0 ? 'Needs review' : 'All clear'}
          trendClass={criticalCount > 0
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            : unreadAlerts > 0
              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
              : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}
          subtitle="Unacknowledged"
        />
      </div>

      {/* ── Secondary stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MiniStat
          title="System"
          value={isOnline ? 'Online' : 'Offline'}
          icon={MdBolt}
          iconCls={isOnline ? 'text-emerald-500' : 'text-red-500'}
          accent={isOnline ? 'border-emerald-100 dark:border-emerald-900/30' : 'border-red-200 dark:border-red-900/30'}
          subtitle={serverLastUpdate ? 'Last seen: ' + formatRelativeTime(serverLastUpdate) : 'No data received'}
        />
        <MiniStat
          title="Firmware"
          value={firmwareVersion ?? '—'}
          icon={MdMemory}
          iconCls="text-violet-500"
          accent="border-violet-100 dark:border-violet-900/30"
          subtitle={firmwareVersion ? 'Last reported version' : 'Waiting for device'}
        />
        <MiniStat
          title="Incubation Day"
          value={incubationDay != null ? `Day ${incubationDay}` : 'No batch'}
          icon={MdEgg}
          iconCls={incubationDay != null && incubationDay > 18 ? 'text-emerald-500' : 'text-amber-500'}
          accent={incubationDay != null && incubationDay > 18 ? 'border-emerald-100 dark:border-emerald-900/30' : 'border-amber-100 dark:border-amber-900/30'}
          subtitle={incubationDay != null ? `${Math.max(0, 21 - incubationDay)} days remaining` : 'Click New Batch to start'}
        />
      </div>

      {/* ── Live chart ───────────────────────────────────────────────────── */}
      <LiveChart />

      {/* ── Command center ───────────────────────────────────────────────── */}
      <CommandCenter deviceId={deviceId} />

      {/* ── Alerts panel ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-5 lg:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MdWarning size={18} className={criticalCount > 0 ? 'text-red-500' : 'text-amber-500'} />
              Alerts
            </h3>
            {unreadAlerts > 0 && (
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold
                ${criticalCount > 0
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                }`}>
                {unreadAlerts} active
              </span>
            )}
          </div>
          {unreadAlerts > 0 && (
            <button
              onClick={handleAcknowledgeAll}
              disabled={ackingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold
                text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-600
                hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700
                dark:hover:bg-emerald-900/20 dark:hover:border-emerald-700 dark:hover:text-emerald-400
                transition-all disabled:opacity-50"
            >
              <MdCheckCircle size={14} className={ackingAll ? 'animate-pulse' : ''} />
              {ackingAll ? 'Acknowledging…' : 'Acknowledge All'}
            </button>
          )}
        </div>
        <AlertsPanel showHistoryTab />
      </div>

      {/* ── New Batch Modal ───────────────────────────────────────────────── */}
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
              <button onClick={() => setShowNewBatchModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
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

      {/* ── End Batch Modal ───────────────────────────────────────────────── */}
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
              <button onClick={() => setShowEndBatchModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
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
