import express from 'express';
import db from '../db/connection.js';

const router = express.Router();

// Get active (unacknowledged) alerts for a device
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50 } = req.query;

    const result = await db.query(
      `SELECT id, type, value, threshold, severity, acknowledged,
              occurrence_count, last_seen_at, created_at
       FROM alerts
       WHERE device_id = ? AND acknowledged = 0
       ORDER BY created_at DESC
       LIMIT ?`,
      [deviceId, parseInt(limit, 10)]
    );

    res.json({ alerts: result.rows });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get acknowledged alerts history for a device
router.get('/:deviceId/history', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 30, offset = 0 } = req.query;

    const result = await db.query(
      `SELECT id, type, value, threshold, severity,
              occurrence_count, last_seen_at, created_at,
              acknowledged_at, acknowledged_by
       FROM alerts
       WHERE device_id = ? AND acknowledged = 1
       ORDER BY acknowledged_at DESC
       LIMIT ? OFFSET ?`,
      [deviceId, parseInt(limit, 10), parseInt(offset, 10)]
    );

    res.json({ alerts: result.rows });
  } catch (error) {
    console.error('Get alert history error:', error);
    res.status(500).json({ error: 'Failed to fetch alert history' });
  }
});

// Get unread alerts count
router.get('/count/unread/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const result = await db.query(
      'SELECT COUNT(*) as count FROM alerts WHERE device_id = ? AND acknowledged = 0',
      [deviceId]
    );

    res.json({ unreadCount: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Get unread alerts count error:', error);
    res.status(500).json({ error: 'Failed to fetch alert count' });
  }
});

// Acknowledge a single alert
router.post('/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { acknowledged_by } = req.body;

    await db.query(
      `UPDATE alerts
       SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP, acknowledged_by = ?
       WHERE id = ?`,
      [acknowledged_by || null, alertId]
    );

    const result = await db.query('SELECT * FROM alerts WHERE id = ?', [alertId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ status: 'success', alert: result.rows[0] });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Acknowledge all alerts for a device
router.post('/:deviceId/clear-unread', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { acknowledged_by } = req.body;

    await db.query(
      `UPDATE alerts
       SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP, acknowledged_by = ?
       WHERE device_id = ? AND acknowledged = 0`,
      [acknowledged_by || null, deviceId]
    );

    res.json({ status: 'success', message: 'All alerts acknowledged' });
  } catch (error) {
    console.error('Clear unread alerts error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alerts' });
  }
});

export default router;
