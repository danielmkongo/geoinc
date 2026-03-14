import express from 'express';
import db from '../db/connection.js';
import { mqttService } from '../server.js';

const router = express.Router();

// Send actuator command
router.post('/send/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { pump, egg_rotation_motor, exhaust_fan, inlet_fan, radiator_fan } = req.body;

    // Validate input
    if (pump === undefined || egg_rotation_motor === undefined || exhaust_fan === undefined
        || inlet_fan === undefined || radiator_fan === undefined) {
      return res.status(400).json({ error: 'All actuator states required (pump, egg_rotation_motor, exhaust_fan, inlet_fan, radiator_fan)' });
    }

    const commandId = `cmd_${Date.now()}`;

    // Store command in database
    await db.query(
      `INSERT INTO command_logs (id, device_id, command_type, command_payload, status, sent_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        commandId,
        deviceId,
        'toggle_actuators',
        JSON.stringify({ pump, egg_rotation_motor, exhaust_fan, inlet_fan, radiator_fan }),
        'pending'
      ]
    );

    // Publish to MQTT (import from server)
    try {
      const { mqttService } = await import('../server.js');
      await mqttService.publishCommand(deviceId, {
        pump,
        egg_rotation_motor,
        exhaust_fan,
        inlet_fan,
        radiator_fan
      });

      res.json({
        status: 'pending',
        message: 'Command sent to device — waiting for confirmation',
        commandId,
        timestamp: new Date()
      });
    } catch (mqttError) {
      // Update command status to failed
      await db.query(
        'UPDATE command_logs SET status = ?, error_message = ?, acknowledged_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['failed', mqttError.message, commandId]
      );

      res.status(500).json({
        status: 'failed',
        error: 'Failed to publish command to MQTT',
        commandId
      });
    }
  } catch (error) {
    console.error('❌ Send command error:', error);
    res.status(500).json({ error: 'Failed to send command' });
  }
});

// Get command history
router.get('/history/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await db.query(
      `SELECT id, command_type, command_payload, status, sent_at, acknowledged_at
       FROM command_logs
       WHERE device_id = ?
       ORDER BY sent_at DESC
       LIMIT ? OFFSET ?`,
      [deviceId, parseInt(limit, 10), parseInt(offset, 10)]
    );

    res.json({ commands: result.rows });
  } catch (error) {
    console.error('❌ Get command history error:', error);
    res.status(500).json({ error: 'Failed to fetch command history' });
  }
});

export default router;
