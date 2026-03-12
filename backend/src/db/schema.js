export const schema = `
-- Devices Table
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mqtt_topic_prefix TEXT NOT NULL UNIQUE,
  description TEXT,
  online INTEGER DEFAULT 0,
  last_update DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sensor Readings Table (Time-Series)
CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  temperature REAL,
  humidity REAL,
  soil_temperature REAL,
  heater_status INTEGER,
  humidifier_status INTEGER,
  linear_actuator_status INTEGER,
  timestamp DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(device_id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_readings_device_timestamp ON readings(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp DESC);

-- Actuator States Table
CREATE TABLE IF NOT EXISTS actuator_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,
  heater INTEGER DEFAULT 0,
  humidifier INTEGER DEFAULT 0,
  linear_actuator INTEGER DEFAULT 0,
  last_command_id TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value REAL NOT NULL,
  threshold REAL NOT NULL,
  severity TEXT NOT NULL,
  acknowledged INTEGER DEFAULT 0,
  acknowledged_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_device_created ON alerts(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged, created_at DESC);

-- Command Logs Table
CREATE TABLE IF NOT EXISTS command_logs (
  id TEXT PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL,
  command_payload TEXT NOT NULL,
  status TEXT NOT NULL,
  sent_at DATETIME NOT NULL,
  acknowledged_at DATETIME,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_command_logs_device ON command_logs(device_id, created_at DESC);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Device Access Table
CREATE TABLE IF NOT EXISTS user_device_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  UNIQUE(user_id, device_id)
);
`;
