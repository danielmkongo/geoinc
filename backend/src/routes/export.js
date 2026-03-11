import express from 'express';
import db from '../db/connection.js';

const router = express.Router();

// Export readings as CSV
router.get('/csv/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `SELECT device_id, temperature, humidity, heater_status, humidifier_status, linear_actuator_status, timestamp
                 FROM readings
                 WHERE device_id = ?`;
    const params = [deviceId];

    if (startDate) {
      query += ` AND timestamp >= ?`;
      params.push(new Date(startDate).toISOString());
    }

    if (endDate) {
      query += ` AND timestamp <= ?`;
      params.push(new Date(endDate).toISOString());
    }

    query += ' ORDER BY timestamp ASC';

    const result = await db.query(query, params);

    // Generate CSV
    let csv = 'device_id,temperature,humidity,heater_status,humidifier_status,linear_actuator_status,timestamp\n';
    
    for (const row of result.rows) {
      csv += `${row.device_id},${row.temperature},${row.humidity},${row.heater_status},${row.humidifier_status},${row.linear_actuator_status},"${row.timestamp}"\n`;
    }

    const filename = `readings_${startDate || 'all'}_to_${endDate || 'now'}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('❌ CSV export error:', error);
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

    if (startDate) {
      query += ` AND timestamp >= ?`;
      params.push(new Date(startDate).toISOString());
    }

    if (endDate) {
      query += ` AND timestamp <= ?`;
      params.push(new Date(endDate).toISOString());
    }

    query += ' ORDER BY timestamp ASC';

    const result = await db.query(query, params);

    const filename = `readings_${startDate || 'all'}_to_${endDate || 'now'}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({ readings: result.rows });
  } catch (error) {
    console.error('❌ JSON export error:', error);
    res.status(500).json({ error: 'Failed to export JSON' });
  }
});

export default router;
