import express from 'express';
import db from '../db/connection.js';

const router = express.Router();

// Get all devices
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, mqtt_topic_prefix, description, online, last_update, latitude, longitude, location_name, created_at FROM devices ORDER BY created_at DESC'
    );

    res.json({ devices: result.rows });
  } catch (error) {
    console.error('❌ Get devices error:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get device by ID
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const result = await db.query(
      `SELECT d.*, 
              (SELECT COUNT(*) FROM readings WHERE device_id = d.id) as total_readings,
              (SELECT COUNT(*) FROM alerts WHERE device_id = d.id AND acknowledged = 0) as unread_alerts
       FROM devices d
       WHERE d.id = ?`,
      [deviceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ device: result.rows[0] });
  } catch (error) {
    console.error('❌ Get device error:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// Get device status (actuator states)
router.get('/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const result = await db.query(
      'SELECT * FROM actuator_states WHERE device_id = ?',
      [deviceId]
    );

    if (result.rows.length === 0) {
      // Return default state if not found
      return res.json({
        deviceId,
        heater: false,
        humidifier: false,
        linear_actuator: false,
        lastCommandId: null,
        lastCommandTime: null
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Get device status error:', error);
    res.status(500).json({ error: 'Failed to fetch device status' });
  }
});

export default router;
