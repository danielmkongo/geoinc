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
    console.error('Get devices error:', error);
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
    console.error('Get device error:', error);
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
      return res.json({
        device_id: deviceId,
        pump: false,
        egg_rotation_motor: false,
        exhaust_fan: false,
        inlet_fan: false,
        radiator_fan: false,
        last_command_id: null,
        updated_at: null
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get device status error:', error);
    res.status(500).json({ error: 'Failed to fetch device status' });
  }
});

// Reset incubation start date (sets today as day 1 and notifies device)
router.put('/:deviceId/incubation-start', async (req, res) => {
  try {
    const { deviceId } = req.params;

    await db.query(
      'UPDATE devices SET incubation_start = CURRENT_TIMESTAMP WHERE id = ?',
      [deviceId]
    );

    const result = await db.query(
      'SELECT incubation_start FROM devices WHERE id = ?',
      [deviceId]
    );

    const incubationStart = result.rows[0]?.incubation_start;
    // Convert stored datetime string to Unix epoch seconds for the device
    const startTs = incubationStart
      ? Math.floor(new Date(incubationStart.replace(' ', 'T') + 'Z').getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    // Send start timestamp to device so it can write it to LittleFS
    try {
      const { mqttService } = await import('../server.js');
      await mqttService.publishIncubationReset(startTs);
    } catch (mqttError) {
      console.error('MQTT incubation reset failed (non-fatal):', mqttError.message);
    }

    res.json({ incubation_start: incubationStart });
  } catch (error) {
    console.error('Reset incubation start error:', error);
    res.status(500).json({ error: 'Failed to reset incubation start' });
  }
});

export default router;
