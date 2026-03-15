import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firmwareDir = path.join(__dirname, '../../uploads/firmware');
if (!fs.existsSync(firmwareDir)) fs.mkdirSync(firmwareDir, { recursive: true });

const firmwareStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, firmwareDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `firmware_${Date.now()}${ext}`);
  },
});
const uploadFirmware = multer({ storage: firmwareStorage, limits: { fileSize: 4 * 1024 * 1024 } });

const router = express.Router();

// ── USERS ──────────────────────────────────────────────

// GET /admin/users - list all users
router.get('/users', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, username, email, full_name, role, is_active, created_at, last_login
       FROM users ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /admin/users - create user
router.post('/users', async (req, res) => {
  try {
    const { username, password, email, full_name, role = 'user' } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const existing = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (username, password_hash, email, full_name, role, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [username, password_hash, email || null, full_name || null, role]
    );

    const user = await db.query(
      'SELECT id, username, email, full_name, role, is_active, created_at FROM users WHERE rowid = ?',
      [result.rows[0].lastInsertRowid]
    );
    res.status(201).json({ user: user.rows[0] });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /admin/users/:id - update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, full_name, role, is_active } = req.body;

    // Check username uniqueness if changing
    if (username) {
      const existing = await db.query(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    await db.query(
      `UPDATE users SET
        username = COALESCE(?, username),
        email = COALESCE(?, email),
        full_name = COALESCE(?, full_name),
        role = COALESCE(?, role),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [username || null, email || null, full_name || null, role || null, is_active ?? null, id]
    );

    const user = await db.query(
      'SELECT id, username, email, full_name, role, is_active, created_at, last_login FROM users WHERE id = ?',
      [id]
    );
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /admin/users/:id - delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST /admin/users/:id/reset-password - admin resets a user's password
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const password_hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id]);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ── DEVICES ─────────────────────────────────────────────

// POST /admin/devices - create device
router.post('/devices', async (req, res) => {
  try {
    const { name, mqtt_topic_prefix, description, latitude, longitude, location_name } = req.body;
    if (!name || !mqtt_topic_prefix) {
      return res.status(400).json({ error: 'Name and MQTT topic prefix required' });
    }

    const existing = await db.query(
      'SELECT id FROM devices WHERE mqtt_topic_prefix = ?',
      [mqtt_topic_prefix]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'MQTT topic prefix already exists' });
    }

    const result = await db.query(
      `INSERT INTO devices (name, mqtt_topic_prefix, description, latitude, longitude, location_name, online)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [name, mqtt_topic_prefix, description || null, latitude || null, longitude || null, location_name || null]
    );

    const deviceId = result.rows[0].lastInsertRowid;

    // Initialize actuator states for new device
    await db.query(
      'INSERT OR IGNORE INTO actuator_states (device_id, pump, egg_rotation_motor, exhaust_fan, inlet_fan, radiator_fan) VALUES (?, 0, 0, 0, 0, 0)',
      [deviceId]
    );

    const device = await db.query('SELECT * FROM devices WHERE id = ?', [deviceId]);
    res.status(201).json({ device: device.rows[0] });
  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({ error: 'Failed to create device' });
  }
});

// PUT /admin/devices/:id - update device
router.put('/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, latitude, longitude, location_name } = req.body;

    await db.query(
      `UPDATE devices SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        latitude = ?,
        longitude = ?,
        location_name = COALESCE(?, location_name),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name || null, description || null, latitude ?? null, longitude ?? null, location_name || null, id]
    );

    const device = await db.query('SELECT * FROM devices WHERE id = ?', [id]);
    if (device.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    res.json({ device: device.rows[0] });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

// DELETE /admin/devices/:id - delete device
router.delete('/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM devices WHERE id = ?', [id]);
    res.json({ message: 'Device deleted' });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

// ── FIRMWARE / OTA ──────────────────────────────────────

// GET /admin/firmware - list all firmware entries
router.get('/firmware', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, version, download_url, file_size, is_active, created_at FROM firmware_updates ORDER BY created_at DESC'
    );
    res.json({ firmware: result.rows });
  } catch (error) {
    console.error('List firmware error:', error);
    res.status(500).json({ error: 'Failed to fetch firmware list' });
  }
});

// POST /admin/firmware - push a new OTA update (multipart: file + version field)
router.post('/firmware', uploadFirmware.single('file'), async (req, res) => {
  try {
    const { version } = req.body;
    if (!version) return res.status(400).json({ error: 'version is required' });
    if (!req.file)  return res.status(400).json({ error: 'firmware file is required' });

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const download_url = `${baseUrl}/firmware/${req.file.filename}`;
    const file_size = req.file.size;

    // Deactivate any currently active entry first
    await db.query('UPDATE firmware_updates SET is_active = 0');

    const result = await db.query(
      'INSERT INTO firmware_updates (version, download_url, file_size, is_active) VALUES (?, ?, ?, 1)',
      [version, download_url, file_size]
    );

    const entry = await db.query(
      'SELECT id, version, download_url, file_size, is_active, created_at FROM firmware_updates WHERE rowid = ?',
      [result.rows[0].lastInsertRowid]
    );
    res.status(201).json({ firmware: entry.rows[0] });
  } catch (error) {
    console.error('Create firmware error:', error);
    res.status(500).json({ error: 'Failed to create firmware entry' });
  }
});

// DELETE /admin/firmware/:id - remove a firmware entry (or deactivate active one)
router.delete('/firmware/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM firmware_updates WHERE id = ?', [id]);
    res.json({ message: 'Firmware entry deleted' });
  } catch (error) {
    console.error('Delete firmware error:', error);
    res.status(500).json({ error: 'Failed to delete firmware entry' });
  }
});

// POST /admin/firmware/:id/deactivate - cancel a pending OTA without deleting the record
router.post('/firmware/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE firmware_updates SET is_active = 0 WHERE id = ?', [id]);
    res.json({ message: 'Firmware update deactivated' });
  } catch (error) {
    console.error('Deactivate firmware error:', error);
    res.status(500).json({ error: 'Failed to deactivate firmware entry' });
  }
});

// ── DATA LOGGERS (admin) ─────────────────────────────────

// GET /admin/data-loggers
router.get('/data-loggers', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM data_loggers ORDER BY created_at DESC');
    res.json({ loggers: result.rows });
  } catch (error) {
    console.error('List data loggers error:', error);
    res.status(500).json({ error: 'Failed to fetch data loggers' });
  }
});

// POST /admin/data-loggers
router.post('/data-loggers', async (req, res) => {
  try {
    const { name, serial_number, latitude, longitude, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const api_key = crypto.randomBytes(24).toString('hex');
    const result = await db.query(
      'INSERT INTO data_loggers (name, serial_number, api_key, latitude, longitude, description) VALUES (?, ?, ?, ?, ?, ?)',
      [name, serial_number ?? null, api_key, latitude ?? null, longitude ?? null, description ?? null]
    );
    const logger = await db.query(
      'SELECT * FROM data_loggers WHERE rowid = ?',
      [result.rows[0].lastInsertRowid]
    );
    res.status(201).json({ logger: logger.rows[0] });
  } catch (error) {
    console.error('Create data logger error:', error);
    if (error.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Serial number already registered' });
    res.status(500).json({ error: 'Failed to create data logger' });
  }
});

// PUT /admin/data-loggers/:id
router.put('/data-loggers/:id', async (req, res) => {
  try {
    const { name, serial_number, latitude, longitude, description } = req.body;
    await db.query(
      `UPDATE data_loggers SET
        name = COALESCE(?, name),
        serial_number = COALESCE(?, serial_number),
        latitude = ?,
        longitude = ?,
        description = COALESCE(?, description)
       WHERE id = ?`,
      [name ?? null, serial_number ?? null, latitude ?? null, longitude ?? null, description ?? null, req.params.id]
    );
    const result = await db.query('SELECT * FROM data_loggers WHERE id = ?', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Logger not found' });
    res.json({ logger: result.rows[0] });
  } catch (error) {
    console.error('Update data logger error:', error);
    res.status(500).json({ error: 'Failed to update data logger' });
  }
});

// DELETE /admin/data-loggers/:id
router.delete('/data-loggers/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM data_loggers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Data logger deleted' });
  } catch (error) {
    console.error('Delete data logger error:', error);
    res.status(500).json({ error: 'Failed to delete data logger' });
  }
});

export default router;
