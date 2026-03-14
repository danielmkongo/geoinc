import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../incubator.db');

const db = new Database(dbPath);

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

