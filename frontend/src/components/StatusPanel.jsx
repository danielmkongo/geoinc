import React from 'react';
import {
  MdCheckCircle,
  MdCancel,
} from 'react-icons/md';
import { useDeviceStore } from '../store/deviceStore';
import { formatRelativeTime, roundToTwo } from '../utils/formatters';

export const StatusPanel = () => {
  const currentReading = useDeviceStore((state) => state.currentReading);
  const actuatorStates = useDeviceStore((state) => state.actuatorStates);
  const lastUpdate = useDeviceStore((state) => state.lastUpdate);

  const StatusItem = ({ emoji, label, value, unit = '', color = 'blue' }) => (
    <div className="flex items-center gap-3 p-4 bg-dark-700 rounded-lg">
      <span className="text-3xl">{emoji}</span>
      <div>
        <p className="text-dark-300 text-sm">{label}</p>
        <p className="text-2xl font-bold">
          {value === null ? 'N/A' : `${roundToTwo(value)}${unit}`}
        </p>
      </div>
    </div>
  );

  const ActuatorStatus = ({ label, isActive }) => (
    <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
      <span className="text-dark-100">{label}</span>
      {isActive ? (
        <div className="flex items-center gap-2 text-green-400">
          <MdCheckCircle className="text-xl" />
          <span>ON</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-dark-400">
          <MdCancel className="text-xl" />
          <span>OFF</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-xl font-bold text-dark-100">Current Status</h2>

      {/* Temperature & Humidity */}
      <div className="grid grid-cols-2 gap-4">
        <StatusItem
          emoji="🌡️"
          label="Temperature"
          value={currentReading.temperature}
          unit="°C"
          color="red"
        />
        <StatusItem
          emoji="💧"
          label="Humidity"
          value={currentReading.humidity}
          unit="%"
          color="blue"
        />
      </div>

      {/* Actuator Status */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-dark-200 uppercase">
          Actuators
        </h3>
        <ActuatorStatus label="🔥 Heater" isActive={actuatorStates.heater} />
        <ActuatorStatus
          label="💧 Humidifier"
          isActive={actuatorStates.humidifier}
        />
        <ActuatorStatus
          label="📊 Linear Actuator"
          isActive={actuatorStates.linear_actuator}
        />
      </div>

      {/* Last Update */}
      <div className="pt-4 border-t border-dark-700">
        <p className="text-sm text-dark-400">
          Last updated: {formatRelativeTime(lastUpdate)}
        </p>
      </div>
    </div>
  );
};
