import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/connection.js';

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
    console.error('❌ List users error:', error);
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
    console.error('❌ Create user error:', error);
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
    console.error('❌ Update user error:', error);
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
    console.error('❌ Delete user error:', error);
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
    console.error('❌ Reset password error:', error);
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
      'INSERT OR IGNORE INTO actuator_states (device_id, heater, humidifier, linear_actuator) VALUES (?, 0, 0, 0)',
      [deviceId]
    );

    const device = await db.query('SELECT * FROM devices WHERE id = ?', [deviceId]);
    res.status(201).json({ device: device.rows[0] });
  } catch (error) {
    console.error('❌ Create device error:', error);
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
    console.error('❌ Update device error:', error);
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
    console.error('❌ Delete device error:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

export default router;
