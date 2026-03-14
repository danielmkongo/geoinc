import { useEffect, useState } from 'react';
import { WebSocketClient } from '../services/websocket';
import { useAuthStore } from '../store/authStore';
import { useDeviceStore } from '../store/deviceStore';
import { useAlertStore } from '../store/alertStore';
import { useUIStore } from '../store/uiStore';

export const useWebSocket = () => {
  const [ws, setWs] = useState(null);
  const token = useAuthStore((state) => state.token);
  const setWSConnected = useUIStore((state) => state.setWSConnected);
  const setConnectionError = useUIStore((state) => state.setConnectionError);
  const updateReading = useDeviceStore((state) => state.updateReading);
  const addTemperatureReading = useDeviceStore((state) => state.addTemperatureReading);
  const addHumidityReading = useDeviceStore((state) => state.addHumidityReading);
  const addWaterTemperatureReading = useDeviceStore((state) => state.addWaterTemperatureReading);
  const updateActuatorState = useDeviceStore((state) => state.updateActuatorState);
  const setServerLastUpdate = useDeviceStore((state) => state.setServerLastUpdate);
  const setFirmwareVersion = useDeviceStore((state) => state.setFirmwareVersion);
  const addAlert = useAlertStore((state) => state.addAlert);

  useEffect(() => {
    if (!token) return;

    const handleMessage = (message) => {
      const { type, data, alert } = message;

      switch (type) {
        case 'sensor_update':
          setServerLastUpdate(new Date().toISOString());
          if (data.temperature !== null) {
            addTemperatureReading(data.temperature, new Date());
          }
          if (data.humidity !== null) {
            addHumidityReading(data.humidity, new Date());
          }
          if (data.water_temperature != null) {
            addWaterTemperatureReading(data.water_temperature, new Date());
          }
          updateReading({
            ...data,
            timestamp: new Date(),
          });
          break;

        case 'actuator_update':
          updateActuatorState(data);
          break;

        case 'device_version':
          setFirmwareVersion(message.version);
          break;

        case 'alert':
          addAlert({
            id: `alert_${Date.now()}`,
            type: alert.type,
            value: alert.value,
            threshold: alert.threshold,
            severity: 'critical',
            acknowledged: false,
            created_at: new Date(),
          });
          break;

        case 'connected':
          console.log('✅ WebSocket connected');
          setWSConnected(true);
          break;

        default:
          break;
      }
    };

    const handleError = (error) => {
      console.error('❌ WebSocket error:', error);
      setConnectionError(error.message);
    };

    const handleClose = () => {
      console.log('🔌 WebSocket closed');
      setWSConnected(false);
    };

    const wsClient = new WebSocketClient(handleMessage, handleError, handleClose);

    wsClient
      .connect(token)
      .then(() => {
        setWs(wsClient);
        setWSConnected(true);
      })
      .catch((error) => {
        console.error('❌ Failed to connect WebSocket:', error);
        setConnectionError(error.message);
      });

    return () => {
      if (wsClient) {
        wsClient.disconnect();
      }
    };
  }, [
    token,
    updateReading,
    addTemperatureReading,
    addHumidityReading,
    addWaterTemperatureReading,
    updateActuatorState,
    setServerLastUpdate,
    setFirmwareVersion,
    addAlert,
    setWSConnected,
    setConnectionError,
  ]);

  return ws;
};
