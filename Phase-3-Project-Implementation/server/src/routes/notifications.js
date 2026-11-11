const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notifsRes = await db.query(`
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]);

    const unreadCountRes = await db.query(`
      SELECT COUNT(*) as unread
      FROM notifications
      WHERE user_id = $1 AND is_read = FALSE
    `, [userId]);

    return res.json({
      notifications: notifsRes.rows,
      unreadCount: parseInt(unreadCountRes.rows[0].unread, 10)
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    await db.query(`
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
    `, [notifId, userId]);

    return res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// PUT /api/notifications/mark-all-read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query(`
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1
    `, [userId]);

    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    return res.status(500).json({ error: 'Failed to mark notifications.' });
  }
});

module.exports = router;
