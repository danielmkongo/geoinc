import express from 'express';
import db from '../db/connection.js';

const router = express.Router();

// Get latest reading
router.get('/latest/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const result = await db.query(
      `SELECT device_id, temperature, humidity, heater_status, humidifier_status, 
              linear_actuator_status, timestamp
       FROM readings
       WHERE device_id = ?
       ORDER BY timestamp DESC
       LIMIT 1`,
      [deviceId]
    );

    if (result.rows.length === 0) {
      return res.json({
        deviceId,
        temperature: null,
        humidity: null,
        heater_status: null,
        humidifier_status: null,
        linear_actuator_status: null,
        timestamp: null
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Get latest reading error:', error);
    res.status(500).json({ error: 'Failed to fetch latest reading' });
  }
});

// Get last 8 readings for a parameter
router.get('/last-8/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { parameter } = req.query; // 'temperature' or 'humidity'

    if (!parameter || !['temperature', 'humidity'].includes(parameter)) {
      return res.status(400).json({ error: 'Parameter must be temperature or humidity' });
    }

    const result = await db.query(
      `SELECT device_id, ${parameter} as value, timestamp
       FROM readings
       WHERE device_id = ? AND ${parameter} IS NOT NULL
       ORDER BY timestamp DESC
       LIMIT 8`,
      [deviceId]
    );

    const readings = result.rows.reverse();

    res.json({
      deviceId,
      parameter,
      readings
    });
  } catch (error) {
    console.error('❌ Get last 8 readings error:', error);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

// Get historical readings
router.get('/historical/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM readings WHERE device_id = ?';
    const params = [deviceId];

    if (startDate) {
      query += ` AND timestamp >= ?`;
      params.push(new Date(startDate).toISOString());
    }

    if (endDate) {
      query += ` AND timestamp <= ?`;
      params.push(new Date(endDate).toISOString());
    }

    query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10));
    params.push(parseInt(offset, 10));

    const result = await db.query(query, params);
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM readings WHERE device_id = ?',
      [deviceId]
    );

    res.json({
      count: parseInt(countResult.rows[0]?.total ?? 0, 10),
      readings: result.rows
    });
  } catch (error) {
    console.error('❌ Get historical readings error:', error);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

export default router;
