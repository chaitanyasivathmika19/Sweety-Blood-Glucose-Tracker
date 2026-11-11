const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Ensure upload directory exists
const qrUploadDir = path.join(__dirname, '../../uploads/qr');
fs.mkdirSync(qrUploadDir, { recursive: true });

const qrUpload = multer({
  dest: qrUploadDir,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  }
});

// GET /api/doctors - List doctors available for consultation
router.get('/', async (req, res) => {
  try {
    const docsRes = await db.query(`
      SELECT u.id, u.name, u.email, u.avatar_url,
             d.specialization, d.experience_years, d.qualifications, d.bio, d.verified, d.payment_qr_url
      FROM users u
      JOIN doctor_profiles d ON u.id = d.user_id
      WHERE u.role = 'doctor'
      ORDER BY d.verified DESC, d.experience_years DESC
    `);
    return res.json({ doctors: docsRes.rows });
  } catch (err) {
    console.error('Fetch doctors error:', err);
    return res.status(500).json({ error: 'Failed to fetch doctor list.' });
  }
});

// POST /api/doctors/me/qr - Upload doctor's payment QR code
router.post('/me/qr', authenticateToken, requireRole('doctor'), qrUpload.single('qr'), async (req, res) => {
  try {
    const doctorId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ error: 'No QR image uploaded.' });
    }
    // Build filename preserving extension
    const ext = path.extname(req.file.originalname) || '.png';
    const fileName = req.file.filename + ext;
    const newPath = path.join(qrUploadDir, fileName);
    fs.renameSync(req.file.path, newPath);
    const qrUrl = `/uploads/qr/${fileName}`;

    // Remove old file if present
    const existing = await db.query('SELECT payment_qr_url FROM doctor_profiles WHERE user_id=$1', [doctorId]);
    const oldUrl = existing.rows[0]?.payment_qr_url;
    if (oldUrl) {
      const cleanRel = oldUrl.replace(/^\/+/, '');
      const oldPath = path.join(__dirname, '../../', cleanRel);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { /* ignore cleanup error */ }
      }
    }

    await db.query('UPDATE doctor_profiles SET payment_qr_url=$1 WHERE user_id=$2', [qrUrl, doctorId]);
    return res.json({ message: 'QR code uploaded.', qrUrl });
  } catch (err) {
    console.error('Upload doctor QR error:', err);
    return res.status(500).json({ error: 'Failed to upload QR code.' });
  }
});

// GET /api/doctors/me/qr - Fetch the authenticated doctor's QR URL
router.get('/me/qr', authenticateToken, requireRole('doctor'), async (req, res) => {
  try {
    const doctorId = req.user.id;
    const resDb = await db.query('SELECT payment_qr_url FROM doctor_profiles WHERE user_id=$1', [doctorId]);
    const qrUrl = resDb.rows[0]?.payment_qr_url || null;
    return res.json({ qrUrl });
  } catch (err) {
    console.error('Fetch doctor QR error:', err);
    return res.status(500).json({ error: 'Failed to fetch QR code.' });
  }
});

// DELETE /api/doctors/me/qr - Remove the authenticated doctor's QR code
router.delete('/me/qr', authenticateToken, requireRole('doctor'), async (req, res) => {
  try {
    const doctorId = req.user.id;
    const resDb = await db.query('SELECT payment_qr_url FROM doctor_profiles WHERE user_id=$1', [doctorId]);
    const qrUrl = resDb.rows[0]?.payment_qr_url;
    if (qrUrl) {
      const cleanRel = qrUrl.replace(/^\/+/, '');
      const filePath = path.join(__dirname, '../../', cleanRel);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore cleanup error */ }
      }
    }
    await db.query('UPDATE doctor_profiles SET payment_qr_url=NULL WHERE user_id=$1', [doctorId]);
    return res.json({ message: 'QR code removed.' });
  } catch (err) {
    console.error('Delete doctor QR error:', err);
    return res.status(500).json({ error: 'Failed to delete QR code.' });
  }
});

// GET /api/doctors/portal/patients - List authorized patients for logged-in doctor
router.get('/portal/patients', authenticateToken, requireRole('doctor'), async (req, res) => {
  try {
    const doctorId = req.user.id;

    const patientsRes = await db.query(`
      SELECT DISTINCT u.id, u.name, u.email, s.status as subscription_status, s.activation_date, s.expiry_date,
             p.date_of_birth, p.gender, p.phone, p.city
      FROM subscriptions s
      JOIN users u ON s.patient_id = u.id
      LEFT JOIN patient_profiles p ON u.id = p.user_id
      WHERE s.doctor_id = $1 AND s.status = 'active'
      ORDER BY u.name ASC
    `, [doctorId]);

    const patients = [];
    for (const p of patientsRes.rows) {
      const latestReadingRes = await db.query(`
        SELECT glucose_value, reading_date, time_slot, created_at
        FROM glucose_readings
        WHERE patient_id = $1
        ORDER BY reading_date DESC, created_at DESC
        LIMIT 1
      `, [p.id]);

      const countRes = await db.query(`
        SELECT COUNT(*) as today_count
        FROM glucose_readings
        WHERE patient_id = $1 AND reading_date = CURRENT_DATE
      `, [p.id]);

      patients.push({
        ...p,
        latest_reading: latestReadingRes.rows[0] || null,
        today_progress: `${countRes.rows[0]?.today_count || 0}/4`
      });
    }

    return res.json({ patients });
  } catch (err) {
    console.error('Fetch authorized patients error:', err);
    return res.status(500).json({ error: 'Failed to fetch authorized patient list.' });
  }
});

// GET /api/doctors/portal/patients/:patientId/readings - Authorized patient readings
router.get('/portal/patients/:patientId/readings', authenticateToken, requireRole('doctor'), async (req, res) => {
  try {
    const doctorId = req.user.id;
    const patientId = parseInt(req.params.patientId, 10);

    const authCheck = await db.query(`
      SELECT id FROM subscriptions
      WHERE doctor_id = $1 AND patient_id = $2 AND status = 'active'
    `, [doctorId, patientId]);

    if (authCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied: you are not authorized to view this patient\'s records.' });
    }

    const readingsRes = await db.query(`
      SELECT id, reading_date, time_slot, glucose_value, created_at, updated_at
      FROM glucose_readings
      WHERE patient_id = $1
      ORDER BY reading_date DESC, created_at DESC
    `, [patientId]);

    const patientInfoRes = await db.query(`
      SELECT u.id, u.name, u.email, p.date_of_birth, p.gender, p.city, p.phone
      FROM users u
      LEFT JOIN patient_profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `, [patientId]);

    return res.json({
      patient: patientInfoRes.rows[0],
      readings: readingsRes.rows
    });
  } catch (err) {
    console.error('Fetch patient readings for doctor error:', err);
    return res.status(500).json({ error: 'Failed to fetch patient records.' });
  }
});

// GET /api/doctors/:id - Single doctor profile (must be AFTER /me/qr and /portal routes)
router.get('/:id', async (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid doctor ID.' });
    }
    const docRes = await db.query(`
      SELECT u.id, u.name, u.email, u.avatar_url,
             d.specialization, d.experience_years, d.qualifications, d.bio, d.verified, d.payment_qr_url
      FROM users u
      JOIN doctor_profiles d ON u.id = d.user_id
      WHERE u.id = $1 AND u.role = 'doctor'
    `, [docId]);

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const plansRes = await db.query('SELECT * FROM consultation_plans ORDER BY price ASC');

    return res.json({
      doctor: docRes.rows[0],
      plans: plansRes.rows
    });
  } catch (err) {
    console.error('Fetch doctor details error:', err);
    return res.status(500).json({ error: 'Failed to fetch doctor details.' });
  }
});

module.exports = router;
