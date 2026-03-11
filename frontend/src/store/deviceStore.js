import { create } from 'zustand';
import { storageService } from '../services/storage';

export const useDeviceStore = create((set) => ({
  deviceId: storageService.getDevicePreference(),
  currentReading: {
    temperature: null,
    humidity: null,
    heater_status: null,
    humidifier_status: null,
    linear_actuator_status: null,
    timestamp: null,
  },
  temperatureHistory: [],
  humidityHistory: [],
  actuatorStates: {
    heater: false,
    humidifier: false,
    linear_actuator: false,
  },
  lastUpdate: null,
  isLoadingReadings: false,

  setDeviceId: (deviceId) => {
    storageService.setDevicePreference(deviceId);
    set({ deviceId });
  },

  updateReading: (reading) => {
    set(() => ({
      currentReading: reading,
      lastUpdate: reading?.timestamp ? new Date(reading.timestamp) : null,
    }));
  },

  addTemperatureReading: (value, timestamp) => {
    set((state) => {
      const newHistory = [
        ...state.temperatureHistory,
        { value, timestamp },
      ].slice(-8);
      return { temperatureHistory: newHistory };
    });
  },

  addHumidityReading: (value, timestamp) => {
    set((state) => {
      const newHistory = [
        ...state.humidityHistory,
        { value, timestamp },
      ].slice(-8);
      return { humidityHistory: newHistory };
    });
  },

  setTemperatureHistory: (readings) => {
    set({ temperatureHistory: readings.slice(-8) });
  },

  setHumidityHistory: (readings) => {
    set({ humidityHistory: readings.slice(-8) });
  },

  updateActuatorState: (state) => {
    set({ actuatorStates: state });
  },

  setLoadingReadings: (isLoading) => {
    set({ isLoadingReadings: isLoading });
  },
}));
