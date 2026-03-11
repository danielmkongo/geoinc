import express from 'express';
import db from '../db/connection.js';

const router = express.Router();

// Get alerts for device
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await db.query(
      `SELECT id, type, value, threshold, severity, acknowledged, acknowledged_at, created_at
       FROM alerts
       WHERE device_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [deviceId, limit, offset]
    );

    res.json({ alerts: result.rows });
  } catch (error) {
    console.error('❌ Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
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
    console.error('❌ Get unread alerts count error:', error);
    res.status(500).json({ error: 'Failed to fetch alert count' });
  }
});

// Acknowledge alert
router.post('/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;

    await db.query(
      `UPDATE alerts
       SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [alertId]
    );

    // Fetch the updated alert
    const result = await db.query(
      'SELECT * FROM alerts WHERE id = ?',
      [alertId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({
      status: 'success',
      alert: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Acknowledge alert error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Clear unread alerts
router.post('/:deviceId/clear-unread', async (req, res) => {
  try {
    const { deviceId } = req.params;

    await db.query(
      `UPDATE alerts
       SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP
       WHERE device_id = ? AND acknowledged = 0`,
      [deviceId]
    );

    res.json({ status: 'success', message: 'All alerts marked as read' });
  } catch (error) {
    console.error('❌ Clear unread alerts error:', error);
    res.status(500).json({ error: 'Failed to clear alerts' });
  }
});

export default router;
