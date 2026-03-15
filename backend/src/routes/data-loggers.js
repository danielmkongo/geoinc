import express from 'express';
import crypto from 'crypto';
import db from '../db/connection.js';

const router = express.Router();

// ── PUBLIC: ingest weather data ──────────────────────────────────────────────
// POST /api/data-loggers/ingest
// Body: { api_key, serialNumber, atmosphericPressure, windSpeed, ... }
router.post('/ingest', async (req, res) => {
  try {
    const { api_key, ...payload } = req.body;
    if (!api_key) return res.status(401).json({ error: 'api_key required' });

    const logger = await db.query(
      'SELECT id FROM data_loggers WHERE api_key = ?',
      [api_key]
    );
    if (!logger.rows.length) return res.status(401).json({ error: 'Invalid api_key' });

    const loggerId = logger.rows[0].id;

    const {
      serialNumber, atmosphericPressure, windSpeed, windDirection, windGust,
      dewPoint, humidity, temperature, lightIntensity, waterTemp,
      batteryVoltage, rainfall,
    } = payload;

    await db.query(
      `INSERT INTO weather_readings
        (data_logger_id, serial_number, atmospheric_pressure, wind_speed, wind_direction,
         wind_gust, dew_point, humidity, temperature, light_intensity,
         water_temp, battery_voltage, rainfall)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loggerId, serialNumber ?? null,
        atmosphericPressure ?? null, windSpeed ?? null, windDirection ?? null,
        windGust ?? null, dewPoint ?? null, humidity ?? null, temperature ?? null,
        lightIntensity ?? null, waterTemp ?? null, batteryVoltage ?? null, rainfall ?? null,
      ]
    );

    await db.query(
      'UPDATE data_loggers SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
      [loggerId]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Ingest error:', error);
    res.status(500).json({ error: 'Failed to store reading' });
  }
});

// ── PROTECTED (auth required) ────────────────────────────────────────────────
// These are mounted under authMiddleware in server.js

// GET /api/data-loggers — list all loggers
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, serial_number, latitude, longitude, description, last_seen, created_at FROM data_loggers ORDER BY created_at DESC'
    );
    res.json({ loggers: result.rows });
  } catch (error) {
    console.error('List loggers error:', error);
    res.status(500).json({ error: 'Failed to fetch loggers' });
  }
});

// GET /api/data-loggers/:id — single logger info
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, serial_number, latitude, longitude, description, last_seen, created_at FROM data_loggers WHERE id = ?',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Logger not found' });
    res.json({ logger: result.rows[0] });
  } catch (error) {
    console.error('Get logger error:', error);
    res.status(500).json({ error: 'Failed to fetch logger' });
  }
});

// GET /api/data-loggers/:id/latest — most recent reading
router.get('/:id/latest', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM weather_readings WHERE data_logger_id = ? ORDER BY timestamp DESC LIMIT 1',
      [req.params.id]
    );
    res.json({ reading: result.rows[0] ?? null });
  } catch (error) {
    console.error('Latest reading error:', error);
    res.status(500).json({ error: 'Failed to fetch latest reading' });
  }
});

// GET /api/data-loggers/:id/readings?startDate=&endDate=&limit=500
router.get('/:id/readings', async (req, res) => {
  try {
    const { startDate, endDate, limit = 500 } = req.query;
    let sql = 'SELECT * FROM weather_readings WHERE data_logger_id = ?';
    const params = [req.params.id];
    if (startDate) { sql += ' AND timestamp >= ?'; params.push(startDate); }
    if (endDate)   { sql += ' AND timestamp <= ?'; params.push(endDate); }
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const result = await db.query(sql, params);
    res.json({ readings: result.rows });
  } catch (error) {
    console.error('Readings error:', error);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

// ── ADMIN CRUD ────────────────────────────────────────────────────────────────
// These are mounted under adminMiddleware in server.js

// POST /api/admin/data-loggers — register new logger
router.post('/admin/create', async (req, res) => {
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
    console.error('Create logger error:', error);
    if (error.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Serial number already registered' });
    res.status(500).json({ error: 'Failed to create logger' });
  }
});

// PUT /api/admin/data-loggers/:id
router.put('/admin/:id', async (req, res) => {
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
    console.error('Update logger error:', error);
    res.status(500).json({ error: 'Failed to update logger' });
  }
});

// DELETE /api/admin/data-loggers/:id
router.delete('/admin/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM data_loggers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Logger deleted' });
  } catch (error) {
    console.error('Delete logger error:', error);
    res.status(500).json({ error: 'Failed to delete logger' });
  }
});

// GET /api/admin/data-loggers — list with api_key visible
router.get('/admin/list', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM data_loggers ORDER BY created_at DESC'
    );
    res.json({ loggers: result.rows });
  } catch (error) {
    console.error('Admin list loggers error:', error);
    res.status(500).json({ error: 'Failed to fetch loggers' });
  }
});

export default router;
