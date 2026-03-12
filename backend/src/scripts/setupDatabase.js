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
    console.log('🗄️  Setting up SQLite database...');
    console.log(`📍 Database path: ${dbPath}`);
    
    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    
    console.log('✅ Database connected');
    
    // Run schema
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        db.exec(statement);
      }
    }
    console.log('✅ Schema created successfully');

    // Migrations for existing databases
    try {
      db.exec('ALTER TABLE readings ADD COLUMN soil_temperature REAL');
      console.log('✅ Migration: added soil_temperature column');
    } catch (_) {
      // Column already exists — safe to ignore
    }

    // Insert default device
    const deviceCheck = db.prepare('SELECT id FROM devices WHERE mqtt_topic_prefix = ?').get('incubator/device1');
    
    if (!deviceCheck) {
      db.prepare(
        'INSERT INTO devices (name, mqtt_topic_prefix, description) VALUES (?, ?, ?)'
      ).run('Incubator Device 1', 'incubator/device1', 'Primary incubator unit');
      console.log('✅ Default device created');
    }
    
    // Create default user
    const userCheck = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    
    if (!userCheck) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      db.prepare(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
      ).run('admin', hashedPassword, 'admin');
      console.log('✅ Default admin user created (username: admin, password: admin123)');
      console.log('⚠️  IMPORTANT: Change this password in production!');
    }
    
    db.close();
    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
