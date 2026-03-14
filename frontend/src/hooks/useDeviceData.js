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
  const setSoilTemperatureHistory = useDeviceStore((state) => state.setSoilTemperatureHistory);
  const updateActuatorState = useDeviceStore((state) => state.updateActuatorState);
  const setIncubationStart = useDeviceStore((state) => state.setIncubationStart);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [latestRes, tempRes, humRes, soilRes, statusRes, deviceRes] = await Promise.all([
          readingsAPI.getLatest(deviceId),
          readingsAPI.getLast8(deviceId, 'temperature'),
          readingsAPI.getLast8(deviceId, 'humidity'),
          readingsAPI.getLast8(deviceId, 'soil_temperature'),
          devicesAPI.getStatus(deviceId),
          devicesAPI.getById(deviceId),
        ]);

        updateReading(latestRes.data);
        setTemperatureHistory(tempRes.data.readings);
        setHumidityHistory(humRes.data.readings);
        setSoilTemperatureHistory(soilRes.data.readings);

        // Sync actuator toggle switches to last-known device state
        const s = statusRes.data;
        updateActuatorState({
          pump: !!s.pump,
          egg_rotation_motor: !!s.egg_rotation_motor,
          exhaust_fan: !!s.exhaust_fan,
          inlet_fan: !!s.inlet_fan,
          radiator_fan: !!s.radiator_fan,
        });

        if (deviceRes.data?.device?.incubation_start) {
          setIncubationStart(deviceRes.data.device.incubation_start);
        }

        setError(null);
      } catch (err) {
        console.error('❌ Error fetching device data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deviceId, updateReading, setTemperatureHistory, setHumidityHistory, setSoilTemperatureHistory, updateActuatorState, setIncubationStart]);

  return { loading, error, currentReading };
};
