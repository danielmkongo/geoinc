import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDeviceStore } from '../store/deviceStore';
import { readingsAPI } from '../services/api';

export const useDeviceData = (deviceId) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentReading = useDeviceStore((state) => state.currentReading);
  const updateReading = useDeviceStore((state) => state.updateReading);
  const setTemperatureHistory = useDeviceStore(
    (state) => state.setTemperatureHistory
  );
  const setHumidityHistory = useDeviceStore((state) => state.setHumidityHistory);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch latest reading
        const latestRes = await readingsAPI.getLatest(deviceId);
        updateReading(latestRes.data);

        // Fetch last 8 temperature readings
        const tempRes = await readingsAPI.getLast8(deviceId, 'temperature');
        setTemperatureHistory(tempRes.data.readings);

        // Fetch last 8 humidity readings
        const humRes = await readingsAPI.getLast8(deviceId, 'humidity');
        setHumidityHistory(humRes.data.readings);

        setError(null);
      } catch (err) {
        console.error('❌ Error fetching device data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deviceId, updateReading, setTemperatureHistory, setHumidityHistory]);

  return { loading, error, currentReading };
};
