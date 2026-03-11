import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../incubator.db');
const db = new Database(dbPath);

function addColumnIfNotExists(table, column, definition) {
  try {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    console.log(`✅ Added ${table}.${column}`);
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log(`⏭️  ${table}.${column} already exists`);
    } else {
      throw e;
    }
  }
}

// Users table additions
addColumnIfNotExists('users', 'email', 'TEXT');
addColumnIfNotExists('users', 'full_name', 'TEXT');
addColumnIfNotExists('users', 'is_active', 'INTEGER DEFAULT 1');

// Devices table additions
addColumnIfNotExists('devices', 'latitude', 'REAL');
addColumnIfNotExists('devices', 'longitude', 'REAL');
addColumnIfNotExists('devices', 'location_name', 'TEXT');

// user_device_access table
db.prepare(`
  CREATE TABLE IF NOT EXISTS user_device_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    UNIQUE(user_id, device_id)
  )
`).run();

console.log('✅ Migration complete');
db.close();
