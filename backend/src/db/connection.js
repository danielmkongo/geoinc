import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../incubator.db');

const db = new Database(dbPath);

// Enable WAL mode for better read/write concurrency
db.pragma('journal_mode = WAL');
// Enable foreign keys
db.pragma('foreign_keys = ON');

// Migrations — add columns that may not exist in older DB files
const migrations = [
  'ALTER TABLE devices ADD COLUMN firmware_version TEXT',
  'ALTER TABLE devices ADD COLUMN incubation_start DATETIME',
  'ALTER TABLE devices ADD COLUMN latitude REAL',
  'ALTER TABLE devices ADD COLUMN longitude REAL',
  'ALTER TABLE devices ADD COLUMN location_name TEXT',
  'ALTER TABLE readings RENAME COLUMN soil_temperature TO water_temperature',
  'ALTER TABLE users ADD COLUMN email TEXT',
  'ALTER TABLE users ADD COLUMN full_name TEXT',
  'ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1',
  // Sessions table
  `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, expires_at DATETIME NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  // Deletion requests
  `CREATE TABLE IF NOT EXISTS deletion_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, resource_type TEXT NOT NULL, resource_id INTEGER NOT NULL, resource_name TEXT NOT NULL, requested_by INTEGER NOT NULL REFERENCES users(id), requested_at DATETIME DEFAULT CURRENT_TIMESTAMP, status TEXT DEFAULT 'pending', reviewed_by INTEGER REFERENCES users(id), reviewed_at DATETIME, rejection_note TEXT)`,
  // Incubation batches
  `CREATE TABLE IF NOT EXISTS batches (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE, egg_type TEXT NOT NULL, egg_count INTEGER NOT NULL, started_at DATETIME DEFAULT CURRENT_TIMESTAMP, ended_at DATETIME, end_reason TEXT, successful_hatches INTEGER, status TEXT DEFAULT 'active')`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (_) { /* column already exists — skip */ }
}

// Create query wrapper for async compatibility
export const query = (sql, params = []) => {
  try {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = db.prepare(sql);
      return Promise.resolve({ rows: stmt.all(...params) });
    } else {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return Promise.resolve({ rows: [result] });
    }
  } catch (error) {
    return Promise.reject(error);
  }
};

export default { query };

