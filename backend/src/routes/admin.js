import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db/connection.js';
import { sendInvitationEmail } from '../services/email.js';

// Middleware: only super_admin can proceed
const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

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

    // Send invitation email if the user has an email address
    if (email) {
      sendInvitationEmail({
        to: email,
        username,
        password,
        fullName: full_name,
      }).catch((err) => console.error('Failed to send invitation email:', err));
    }

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
    const isSuperAdmin = req.user?.role === 'super_admin';
    let result;
    if (isSuperAdmin) {
      result = await db.query(
        `SELECT dl.*, dr.status as deletion_status, dr.rejection_note, dr.id as deletion_request_id
         FROM data_loggers dl
         LEFT JOIN deletion_requests dr ON dr.resource_type = 'data_logger' AND dr.resource_id = dl.id AND dr.status = 'pending'
         ORDER BY dl.created_at DESC`
      );
    } else {
      result = await db.query(
        `SELECT dl.*, dr.status as deletion_status, dr.rejection_note, dr.id as deletion_request_id
         FROM data_loggers dl
         LEFT JOIN deletion_requests dr ON dr.resource_type = 'data_logger' AND dr.resource_id = dl.id AND dr.status != 'approved'
         WHERE (dr.status IS NULL OR dr.status = 'rejected')
         ORDER BY dl.created_at DESC`
      );
    }
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

// DELETE /admin/data-loggers/:id — super_admin only
router.delete('/data-loggers/:id', superAdminOnly, async (req, res) => {
  try {
    // Remove any pending deletion requests for this resource
    await db.query(
      "DELETE FROM deletion_requests WHERE resource_type = 'data_logger' AND resource_id = ?",
      [req.params.id]
    );
    await db.query('DELETE FROM data_loggers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Data logger deleted' });
  } catch (error) {
    console.error('Delete data logger error:', error);
    res.status(500).json({ error: 'Failed to delete data logger' });
  }
});

// POST /admin/data-loggers/:id/request-delete — admin requests deletion
router.post('/data-loggers/:id/request-delete', async (req, res) => {
  try {
    const { id } = req.params;
    const logger = await db.query('SELECT name FROM data_loggers WHERE id = ?', [id]);
    if (!logger.rows.length) return res.status(404).json({ error: 'Logger not found' });

    // Check no pending request already exists
    const existing = await db.query(
      "SELECT id FROM deletion_requests WHERE resource_type = 'data_logger' AND resource_id = ? AND status = 'pending'",
      [id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A deletion request for this logger is already pending' });
    }

    await db.query(
      "INSERT INTO deletion_requests (resource_type, resource_id, resource_name, requested_by) VALUES ('data_logger', ?, ?, ?)",
      [id, logger.rows[0].name, req.user.id]
    );

    // Broadcast so super_admin panel updates live
    req.app.get('wsManager')?.broadcast({ type: 'deletion_request_update' });

    res.json({ message: 'Deletion request submitted' });
  } catch (error) {
    console.error('Request delete logger error:', error);
    res.status(500).json({ error: 'Failed to submit deletion request' });
  }
});

// ── DELETION REQUESTS (super_admin) ──────────────────────────────────────────

// GET /admin/deletion-requests — list all pending requests
router.get('/deletion-requests', superAdminOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT dr.*, u.username as requested_by_username, u.full_name as requested_by_fullname
       FROM deletion_requests dr
       JOIN users u ON dr.requested_by = u.id
       WHERE dr.status = 'pending'
       ORDER BY dr.requested_at DESC`
    );
    res.json({ requests: result.rows });
  } catch (error) {
    console.error('List deletion requests error:', error);
    res.status(500).json({ error: 'Failed to fetch deletion requests' });
  }
});

// POST /admin/deletion-requests/:id/approve
router.post('/deletion-requests/:id/approve', superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const drResult = await db.query('SELECT * FROM deletion_requests WHERE id = ?', [id]);
    if (!drResult.rows.length) return res.status(404).json({ error: 'Request not found' });

    const dr = drResult.rows[0];
    if (dr.status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });

    // Delete the actual resource
    if (dr.resource_type === 'data_logger') {
      await db.query('DELETE FROM data_loggers WHERE id = ?', [dr.resource_id]);
    } else if (dr.resource_type === 'device') {
      await db.query('DELETE FROM devices WHERE id = ?', [dr.resource_id]);
    }

    await db.query(
      "UPDATE deletion_requests SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [req.user.id, id]
    );

    req.app.get('wsManager')?.broadcast({ type: 'deletion_request_update' });
    res.json({ message: 'Deletion approved' });
  } catch (error) {
    console.error('Approve deletion error:', error);
    res.status(500).json({ error: 'Failed to approve deletion' });
  }
});

// POST /admin/deletion-requests/:id/reject
router.post('/deletion-requests/:id/reject', superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const drResult = await db.query('SELECT * FROM deletion_requests WHERE id = ?', [id]);
    if (!drResult.rows.length) return res.status(404).json({ error: 'Request not found' });
    if (drResult.rows[0].status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });

    await db.query(
      "UPDATE deletion_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_note = ? WHERE id = ?",
      [req.user.id, note || null, id]
    );

    req.app.get('wsManager')?.broadcast({ type: 'deletion_request_update' });
    res.json({ message: 'Deletion rejected' });
  } catch (error) {
    console.error('Reject deletion error:', error);
    res.status(500).json({ error: 'Failed to reject deletion' });
  }
});

// ── SESSIONS (super_admin) ────────────────────────────────────────────────────

// GET /admin/sessions
router.get('/sessions', superAdminOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.id, s.user_id, s.created_at, s.expires_at,
              u.username, u.full_name, u.role
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.expires_at > CURRENT_TIMESTAMP
       ORDER BY s.created_at DESC`
    );
    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// DELETE /admin/sessions/:id — revoke a session
router.delete('/sessions/:id', superAdminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM sessions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Session revoked' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

export default router;
