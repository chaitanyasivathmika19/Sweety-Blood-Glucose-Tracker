const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// List only the authenticated user's actual patient-doctor relationships. A
// patient/doctor pair is the conversation key in the existing messages table.
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isDoctor = req.user.role === 'doctor';
    if (!isDoctor && req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients and doctors can access conversations.' });
    }

    const result = await db.query(`
      WITH relationships AS (
        SELECT ${isDoctor ? 's.patient_id AS partner_id' : 's.doctor_id AS partner_id'}
        FROM subscriptions s
        WHERE ${isDoctor ? 's.doctor_id' : 's.patient_id'} = $1
        UNION
        SELECT ${isDoctor ? 'f.patient_id AS partner_id' : 'f.doctor_id AS partner_id'}
        FROM followup_requests f
        WHERE ${isDoctor ? 'f.doctor_id' : 'f.patient_id'} = $1
      ), latest AS (
        SELECT DISTINCT ON (CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END)
          CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS partner_id,
          m.content AS latest_message, m.created_at AS latest_message_at
        FROM messages m
        WHERE m.sender_id = $1 OR m.receiver_id = $1
        ORDER BY CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END, m.created_at DESC, m.id DESC
      )
      SELECT u.id, u.name,
        COALESCE(dp.specialization, 'Clinical Conversation') AS specialization,
        l.latest_message, l.latest_message_at
      FROM relationships r
      JOIN users u ON u.id = r.partner_id
      LEFT JOIN doctor_profiles dp ON dp.user_id = u.id
      LEFT JOIN latest l ON l.partner_id = u.id
      WHERE u.role = $2
      ORDER BY l.latest_message_at DESC NULLS LAST, u.name ASC
    `, [userId, isDoctor ? 'patient' : 'doctor']);
    res.json({ conversations: result.rows });
  } catch (err) {
    console.error('Fetch conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

async function hasConversationRelationship(patientId, doctorId) {
  const result = await db.query(`
    SELECT 1 FROM subscriptions WHERE patient_id = $1 AND doctor_id = $2
    UNION ALL
    SELECT 1 FROM followup_requests WHERE patient_id = $1 AND doctor_id = $2
    LIMIT 1
  `, [patientId, doctorId]);
  return result.rows.length > 0;
}

// Helper to check if chat is unlocked between patient and doctor
async function checkChatAccess(patientId, doctorId) {
  const nowIso = new Date().toISOString();

  // 1. Check active subscription
  const subRes = await db.query(`
    SELECT id FROM subscriptions
    WHERE patient_id = $1 AND doctor_id = $2 AND status = 'active'
      AND (expiry_date IS NULL OR expiry_date >= $3)
  `, [patientId, doctorId, nowIso]);

  if (subRes.rows.length > 0) {
    return { unlocked: true, reason: 'Active Subscription' };
  }

  // 2. Check approved temporary follow-up access
  const followRes = await db.query(`
    SELECT id, access_until FROM followup_requests
    WHERE patient_id = $1 AND doctor_id = $2 AND status = 'approved'
      AND access_until >= $3
  `, [patientId, doctorId, nowIso]);

  if (followRes.rows.length > 0) {
    return { unlocked: true, reason: 'Approved Follow-up Access', access_until: followRes.rows[0].access_until };
  }

  return { unlocked: false, reason: 'Subscription expired or inactive' };
}

// GET /api/chat/messages/:partnerId - Get messages and unlock status
router.get('/messages/:partnerId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const partnerId = parseInt(req.params.partnerId, 10);

    const isPatient = req.user.role === 'patient';
    const patientId = isPatient ? userId : partnerId;
    const doctorId = isPatient ? partnerId : userId;

    if ((isPatient && req.user.role !== 'patient') || (!isPatient && req.user.role !== 'doctor') ||
        !await hasConversationRelationship(patientId, doctorId)) {
      return res.status(403).json({ error: 'You are not authorized to access this conversation.' });
    }

    const access = await checkChatAccess(patientId, doctorId);

    // Fetch messages
    const msgsRes = await db.query(`
      SELECT m.*, u.name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = $1 AND m.receiver_id = $2)
         OR (m.sender_id = $2 AND m.receiver_id = $1)
      ORDER BY m.created_at ASC
    `, [userId, partnerId]);

    // Mark unread messages as read
    await db.query(`
      UPDATE messages
      SET is_read = TRUE
      WHERE receiver_id = $1 AND sender_id = $2 AND is_read = FALSE
    `, [userId, partnerId]);

    return res.json({
      access,
      messages: msgsRes.rows
    });
  } catch (err) {
    console.error('Fetch messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// POST /api/chat/messages - Send message
router.post('/messages', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiver_id, content } = req.body;

    if (!receiver_id || !content || !content.trim()) {
      return res.status(400).json({ error: 'Message content and recipient are required.' });
    }

    const isPatient = req.user.role === 'patient';
    if (!['patient', 'doctor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only patients and doctors can send messages.' });
    }
    const patientId = isPatient ? senderId : receiver_id;
    const doctorId = isPatient ? receiver_id : senderId;

    if (!await hasConversationRelationship(patientId, doctorId)) {
      return res.status(403).json({ error: 'You are not authorized to message this user.' });
    }

    const access = await checkChatAccess(patientId, doctorId);
    if (!access.unlocked) {
      return res.status(403).json({ error: 'Chat access is locked. Please request a follow-up or renew your consultation plan.' });
    }

    const insertRes = await db.query(`
      INSERT INTO messages (sender_id, receiver_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [senderId, receiver_id, content.trim()]);

    const msg = insertRes.rows[0];

    // Notification to receiver
    await db.query(`
      INSERT INTO notifications (user_id, title, message, category, link_url)
      VALUES ($1, 'New message', $2, 'message', '/chat')
    `, [receiver_id, `You received a new message from ${req.user.name}.`]);

    return res.status(201).json({
      message: 'Message sent.',
      chat_message: {
        ...msg,
        sender_name: req.user.name
      }
    });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
});

// POST /api/chat/follow-up - Submit follow-up request when locked
router.post('/follow-up', authenticateToken, async (req, res) => {
  try {
    const patientId = req.user.id;
    const { doctor_id, question } = req.body;

    if (!doctor_id || !question || !question.trim()) {
      return res.status(400).json({ error: 'Doctor ID and question are required.' });
    }

    const insertRes = await db.query(`
      INSERT INTO followup_requests (patient_id, doctor_id, question, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING *
    `, [patientId, doctor_id, question.trim()]);

    // Notify doctor
    await db.query(`
      INSERT INTO notifications (user_id, title, message, category, link_url)
      VALUES ($1, 'Follow-up Request', $2, 'consultation', '/doctor-requests')
    `, [doctor_id, `Patient ${req.user.name} submitted a follow-up request.`]);

    return res.status(201).json({
      message: 'Follow-up request submitted for doctor review.',
      followup: insertRes.rows[0]
    });
  } catch (err) {
    console.error('Follow-up error:', err);
    return res.status(500).json({ error: 'Failed to submit follow-up request.' });
  }
});

// POST /api/chat/follow-up/review - Doctor approve or reject follow-up
router.post('/follow-up/review', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { request_id, action, rejection_reason, duration_hours = 48 } = req.body;

    if (!request_id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Valid request_id and action (approve/reject) required.' });
    }

    const reqRes = await db.query('SELECT * FROM followup_requests WHERE id = $1 AND doctor_id = $2', [request_id, doctorId]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Follow-up request not found.' });
    }

    const followReq = reqRes.rows[0];

    if (action === 'approve') {
      const accessUntil = new Date(Date.now() + duration_hours * 3600 * 1000).toISOString();
      await db.query(`
        UPDATE followup_requests
        SET status = 'approved', access_until = $1
        WHERE id = $2
      `, [accessUntil, request_id]);

      await db.query(`
        INSERT INTO notifications (user_id, title, message, category, link_url)
        VALUES ($1, 'Follow-up Approved', 'Your doctor approved your follow-up request. Chat is unlocked for 48 hours.', 'consultation', '/chat')
      `, [followReq.patient_id]);

      return res.json({ message: 'Follow-up approved. Chat unlocked for 48 hours.' });
    } else {
      await db.query(`
        UPDATE followup_requests
        SET status = 'rejected', rejection_reason = $1
        WHERE id = $2
      `, [rejection_reason || 'Doctor unavailable at this time.', request_id]);

      await db.query(`
        INSERT INTO notifications (user_id, title, message, category, link_url)
        VALUES ($1, 'Follow-up Rejected', $2, 'consultation', '/chat')
      `, [followReq.patient_id, `Follow-up request rejected: ${rejection_reason || 'Doctor unavailable'}`]);

      return res.json({ message: 'Follow-up request rejected.' });
    }
  } catch (err) {
    console.error('Review follow-up error:', err);
    return res.status(500).json({ error: 'Failed to process follow-up decision.' });
  }
});

module.exports = router;
