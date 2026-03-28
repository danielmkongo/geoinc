import express from 'express';
import db from '../db/connection.js';

const router = express.Router();

// Export readings as CSV
router.get('/csv/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `SELECT device_id, temperature, humidity, water_temperature,
                        pump_status, egg_rotation_motor_status, exhaust_fan_status,
                        inlet_fan_status, radiator_fan_status, timestamp
                 FROM readings
                 WHERE device_id = ?`;
    const params = [deviceId];
    const toSQLiteStr = (iso) => new Date(iso).toISOString().replace('T', ' ').slice(0, 19);

    if (startDate) {
      query += ` AND created_at >= ?`;
      params.push(toSQLiteStr(startDate));
    }

    if (endDate) {
      query += ` AND created_at <= ?`;
      params.push(toSQLiteStr(endDate));
    }

    query += ' ORDER BY created_at ASC';

    const result = await db.query(query, params);

    // Generate CSV
    let csv = 'device_id,temperature,humidity,water_temperature,pump_status,egg_rotation_motor_status,exhaust_fan_status,inlet_fan_status,radiator_fan_status,timestamp\n';

    for (const row of result.rows) {
      csv += `${row.device_id},${row.temperature},${row.humidity},${row.water_temperature ?? ''},${row.pump_status ?? ''},${row.egg_rotation_motor_status ?? ''},${row.exhaust_fan_status ?? ''},${row.inlet_fan_status ?? ''},${row.radiator_fan_status ?? ''},"${row.timestamp}"\n`;
    }

    const filename = `readings_${startDate || 'all'}_to_${endDate || 'now'}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Export readings as JSON
router.get('/json/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `SELECT * FROM readings WHERE device_id = ?`;
    const params = [deviceId];
    const toSQLiteStr = (iso) => new Date(iso).toISOString().replace('T', ' ').slice(0, 19);

    if (startDate) {
      query += ` AND created_at >= ?`;
      params.push(toSQLiteStr(startDate));
    }

    if (endDate) {
      query += ` AND created_at <= ?`;
      params.push(toSQLiteStr(endDate));
    }

    query += ' ORDER BY created_at ASC';

    const result = await db.query(query, params);

    const filename = `readings_${startDate || 'all'}_to_${endDate || 'now'}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({ readings: result.rows });
  } catch (error) {
    console.error('JSON export error:', error);
    res.status(500).json({ error: 'Failed to export JSON' });
  }
});

export default router;
