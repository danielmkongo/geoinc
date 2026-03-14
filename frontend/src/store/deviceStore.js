import { create } from 'zustand';
import { storageService } from '../services/storage';

export const useDeviceStore = create((set) => ({
  deviceId: storageService.getDevicePreference(),
  currentReading: {
    temperature: null,
    humidity: null,
    soil_temperature: null,
    pump_status: null,
    egg_rotation_motor_status: null,
    exhaust_fan_status: null,
    inlet_fan_status: null,
    radiator_fan_status: null,
    timestamp: null,
  },
  temperatureHistory: [],
  humidityHistory: [],
  soilTemperatureHistory: [],
  actuatorStates: {
    pump: false,
    egg_rotation_motor: false,
    exhaust_fan: false,
    inlet_fan: false,
    radiator_fan: false,
  },
  lastUpdate: null,
  isLoadingReadings: false,
  incubationStart: null,

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
    set((state) => ({
      temperatureHistory: [...state.temperatureHistory, { value, timestamp }].slice(-8),
    }));
  },

  addHumidityReading: (value, timestamp) => {
    set((state) => ({
      humidityHistory: [...state.humidityHistory, { value, timestamp }].slice(-8),
    }));
  },

  addSoilTemperatureReading: (value, timestamp) => {
    set((state) => ({
      soilTemperatureHistory: [...state.soilTemperatureHistory, { value, timestamp }].slice(-8),
    }));
  },

  setTemperatureHistory: (readings) => {
    set({ temperatureHistory: readings.slice(-8) });
  },

  setHumidityHistory: (readings) => {
    set({ humidityHistory: readings.slice(-8) });
  },

  setSoilTemperatureHistory: (readings) => {
    set({ soilTemperatureHistory: readings.slice(-8) });
  },

  updateActuatorState: (state) => {
    set({ actuatorStates: state });
  },

  setLoadingReadings: (isLoading) => {
    set({ isLoadingReadings: isLoading });
  },

  setIncubationStart: (date) => {
    set({ incubationStart: date });
  },
}));
