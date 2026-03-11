export const API_BASE_URL = '/api';
export const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

export const ALERT_THRESHOLDS = {
  temperature: {
    high: 39.0,
    low: 36.0,
  },
  humidity: {
    high: 70,
    low: 40,
  },
};

export const COLORS = {
  dark: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export const CHART_COLORS = {
  temperature: '#ef4444',
  humidity: '#3b82f6',
};

export const MQTT_TOPICS = {
  telemetry: 'incubator/device1/telemetry/data',
  status: 'incubator/device1/device/status',
  commands: 'incubator/device1/actuator/commands',
  alerts: 'incubator/device1/system/alerts',
};
