import { useEffect, useState } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { readingsAPI, devicesAPI } from '../services/api';

export const useDeviceData = (deviceId) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentReading = useDeviceStore((state) => state.currentReading);
  const updateReading = useDeviceStore((state) => state.updateReading);
  const setTemperatureHistory = useDeviceStore((state) => state.setTemperatureHistory);
  const setHumidityHistory = useDeviceStore((state) => state.setHumidityHistory);
  const setWaterTemperatureHistory = useDeviceStore((state) => state.setWaterTemperatureHistory);
  const updateActuatorState = useDeviceStore((state) => state.updateActuatorState);
  const setIncubationStart = useDeviceStore((state) => state.setIncubationStart);
  const setServerLastUpdate = useDeviceStore((state) => state.setServerLastUpdate);
  const setFirmwareVersion = useDeviceStore((state) => state.setFirmwareVersion);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [latestRes, tempRes, humRes, soilRes, statusRes, deviceRes] = await Promise.all([
          readingsAPI.getLatest(deviceId),
          readingsAPI.getLast8(deviceId, 'temperature'),
          readingsAPI.getLast8(deviceId, 'humidity'),
          readingsAPI.getLast8(deviceId, 'water_temperature'),
          devicesAPI.getStatus(deviceId),
          devicesAPI.getById(deviceId),
        ]);

        updateReading(latestRes.data);
        setTemperatureHistory(tempRes.data.readings);
        setHumidityHistory(humRes.data.readings);
        setWaterTemperatureHistory(soilRes.data.readings);

        // Sync actuator toggle switches to last-known device state
        const s = statusRes.data;
        updateActuatorState({
          pump: !!s.pump,
          egg_rotation_motor: !!s.egg_rotation_motor,
          exhaust_fan: !!s.exhaust_fan,
          inlet_fan: !!s.inlet_fan,
          radiator_fan: !!s.radiator_fan,
        });

        const dev = deviceRes.data?.device;
        if (dev?.incubation_start) setIncubationStart(dev.incubation_start);
        if (dev?.last_update) setServerLastUpdate(dev.last_update);
        if (dev?.firmware_version) setFirmwareVersion(dev.firmware_version);

        setError(null);
      } catch (err) {
        console.error('❌ Error fetching device data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deviceId, updateReading, setTemperatureHistory, setHumidityHistory, setWaterTemperatureHistory, updateActuatorState, setIncubationStart, setServerLastUpdate, setFirmwareVersion]);

  return { loading, error, currentReading };
};
