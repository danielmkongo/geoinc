import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { schema } from '../db/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../incubator.db');

async function setupDatabase() {
  try {
    console.log('Setting up SQLite database...');
    console.log(`Database path: ${dbPath}`);
    
    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    
    console.log('Database connected');
    
    // Run schema
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        db.exec(statement);
      }
    }
    console.log('Schema created successfully');

    // Migrations for existing databases
    try {
      db.exec('ALTER TABLE readings ADD COLUMN soil_temperature REAL');
      console.log('Migration: added soil_temperature column');
    } catch (_) {}

    // Rename old actuator columns in readings
    try { db.exec('ALTER TABLE readings RENAME COLUMN heater_status TO pump_status'); } catch (_) {}
    try { db.exec('ALTER TABLE readings RENAME COLUMN linear_actuator_status TO egg_rotation_motor_status'); } catch (_) {}
    try { db.exec('ALTER TABLE readings ADD COLUMN exhaust_fan_status INTEGER'); } catch (_) {}
    try { db.exec('ALTER TABLE readings ADD COLUMN inlet_fan_status INTEGER'); } catch (_) {}
    try { db.exec('ALTER TABLE readings ADD COLUMN radiator_fan_status INTEGER'); } catch (_) {}

    // Rename old actuator columns in actuator_states
    try { db.exec('ALTER TABLE actuator_states RENAME COLUMN heater TO pump'); } catch (_) {}
    try { db.exec('ALTER TABLE actuator_states RENAME COLUMN linear_actuator TO egg_rotation_motor'); } catch (_) {}
    try { db.exec('ALTER TABLE actuator_states ADD COLUMN exhaust_fan INTEGER DEFAULT 0'); } catch (_) {}
    try { db.exec('ALTER TABLE actuator_states ADD COLUMN inlet_fan INTEGER DEFAULT 0'); } catch (_) {}
    try { db.exec('ALTER TABLE actuator_states ADD COLUMN radiator_fan INTEGER DEFAULT 0'); } catch (_) {}
    console.log('Migration: actuator columns updated');

    try {
      db.exec(`CREATE TABLE IF NOT EXISTS firmware_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL,
        download_url TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      console.log('Migration: firmware_updates table ready');
    } catch (_) {
      // Table already exists — safe to ignore
    }

    // Incubation start date column
    try {
      db.exec('ALTER TABLE devices ADD COLUMN incubation_start DATETIME');
      console.log('Migration: devices.incubation_start added');
    } catch (_) {}

    // Data loggers tables
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS data_loggers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        serial_number TEXT UNIQUE,
        api_key TEXT NOT NULL UNIQUE,
        latitude REAL,
        longitude REAL,
        description TEXT,
        last_seen DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      db.exec(`CREATE TABLE IF NOT EXISTS weather_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_logger_id INTEGER NOT NULL REFERENCES data_loggers(id) ON DELETE CASCADE,
        serial_number TEXT,
        atmospheric_pressure REAL,
        wind_speed REAL,
        wind_direction REAL,
        wind_gust REAL,
        dew_point REAL,
        humidity REAL,
        temperature REAL,
        light_intensity REAL,
        water_temp REAL,
        battery_voltage REAL,
        rainfall REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      console.log('Migration: data_loggers and weather_readings tables ready');
    } catch (_) {}

    // Insert default device
    const deviceCheck = db.prepare('SELECT id FROM devices WHERE mqtt_topic_prefix = ?').get('incubator/device1');
    
    if (!deviceCheck) {
      db.prepare(
        'INSERT INTO devices (name, mqtt_topic_prefix, description) VALUES (?, ?, ?)'
      ).run('Incubator Device 1', 'incubator/device1', 'Primary incubator unit');
      console.log('Default device created');
    }
    
    // Create default user
    const userCheck = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    
    if (!userCheck) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      db.prepare(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
      ).run('admin', hashedPassword, 'admin');
      console.log('Default admin user created (username: admin, password: admin123)');
      console.log('IMPORTANT: Change this password in production!');
    }
    
    db.close();
    console.log('Database setup complete!');
    
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
