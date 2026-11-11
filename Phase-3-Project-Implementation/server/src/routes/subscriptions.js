const express = require('express');
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/subscriptions/plans - List all plans
router.get('/plans', async (req, res) => {
  try {
    const plansRes = await db.query('SELECT * FROM consultation_plans ORDER BY price ASC');
    return res.json({ plans: plansRes.rows });
  } catch (err) {
    console.error('Fetch plans error:', err);
    return res.status(500).json({ error: 'Failed to load consultation plans.' });
  }
});

// GET /api/subscriptions/my - Patient's current subscription
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const patientId = req.user.id;
    const subRes = await db.query(`
      SELECT s.*, p.name as plan_name, p.frequency_days, u.name as doctor_name, d.specialization as doctor_specialization,
             ps.transaction_ref, ps.status as payment_status, ps.rejection_reason
      FROM subscriptions s
      JOIN consultation_plans p ON s.plan_id = p.id
      JOIN users u ON s.doctor_id = u.id
      JOIN doctor_profiles d ON u.id = d.user_id
      LEFT JOIN payment_submissions ps ON s.id = ps.subscription_id
      WHERE s.patient_id = $1
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [patientId]);

    return res.json({ subscription: subRes.rows[0] || null });
  } catch (err) {
    console.error('Fetch my subscription error:', err);
    return res.status(500).json({ error: 'Failed to fetch subscription status.' });
  }
});

// POST /api/subscriptions/submit-payment - Patient submits payment proof
router.post('/submit-payment', authenticateToken, async (req, res) => {
  try {
    const patientId = req.user.id;
    const { doctor_id, plan_id, transaction_ref, screenshot_url } = req.body;

    if (!doctor_id || !plan_id) {
      return res.status(400).json({ error: 'Please select both a doctor and a consultation plan.' });
    }
    if (!transaction_ref || !transaction_ref.trim()) {
      return res.status(400).json({ error: 'Please enter a valid payment reference or transaction ID.' });
    }

    const cleanRef = transaction_ref.trim();

    // Check duplicate reference ID
    const refCheck = await db.query('SELECT id FROM payment_submissions WHERE transaction_ref = $1', [cleanRef]);
    if (refCheck.rows.length > 0) {
      return res.status(400).json({ error: 'This transaction reference ID has already been submitted.' });
    }

    // Get plan details
    const planRes = await db.query('SELECT * FROM consultation_plans WHERE id = $1', [plan_id]);
    if (planRes.rows.length === 0) {
      return res.status(404).json({ error: 'Consultation plan not found.' });
    }
    const plan = planRes.rows[0];

    // Create subscription in pending state
    const subRes = await db.query(`
      INSERT INTO subscriptions (patient_id, doctor_id, plan_id, fee, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id
    `, [patientId, doctor_id, plan_id, plan.price]);

    const subId = subRes.rows[0].id;

    // Create payment submission
    await db.query(`
      INSERT INTO payment_submissions (subscription_id, patient_id, doctor_id, transaction_ref, screenshot_url, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
    `, [subId, patientId, doctor_id, cleanRef, screenshot_url || 'demo-qr-receipt.png']);

    // Send notification to doctor
    await db.query(`
      INSERT INTO notifications (user_id, title, message, category, link_url)
      VALUES ($1, 'Payment verification needed', $2, 'payment', '/doctor-requests')
    `, [doctor_id, `Patient ${req.user.name} submitted payment proof (${cleanRef}) for ₹${plan.price}.`]);

    // Send confirmation notification to patient
    await db.query(`
      INSERT INTO notifications (user_id, title, message, category, link_url)
      VALUES ($1, 'Payment submitted', $2, 'payment', '/subscriptions')
    `, [patientId, `Your payment reference (${cleanRef}) was submitted and is pending verification.`]);

    return res.status(201).json({
      message: 'Payment proof submitted successfully. Subscription is pending verification.',
      subscription_id: subId
    });
  } catch (err) {
    console.error('Submit payment error:', err);
    return res.status(500).json({ error: 'Failed to submit payment proof.' });
  }
});

// GET /api/subscriptions/pending-payments - Doctor / Admin view pending payments
router.get('/pending-payments', authenticateToken, requireRole('doctor'), async (req, res) => {
  try {
    const doctorId = req.user.id;
    const paymentsRes = await db.query(`
      SELECT ps.id, ps.subscription_id, ps.transaction_ref, ps.screenshot_url, ps.status, ps.created_at,
             u.id as patient_id, u.name as patient_name, u.email as patient_email,
             cp.name as plan_name, cp.price, cp.frequency_days
      FROM payment_submissions ps
      JOIN subscriptions s ON ps.subscription_id = s.id
      JOIN users u ON ps.patient_id = u.id
      JOIN consultation_plans cp ON s.plan_id = cp.id
      WHERE ps.doctor_id = $1
      ORDER BY ps.created_at DESC
    `, [doctorId]);

    return res.json({ payments: paymentsRes.rows });
  } catch (err) {
    console.error('Fetch pending payments error:', err);
    return res.status(500).json({ error: 'Failed to fetch payment submissions.' });
  }
});

// POST /api/subscriptions/verify-payment - Doctor / Admin approve or reject
router.post('/verify-payment', authenticateToken, requireRole('doctor'), async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { payment_id, action, rejection_reason } = req.body;

    if (!payment_id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Valid payment_id and action (approve/reject) are required.' });
    }

    if (action === 'reject' && (!rejection_reason || !rejection_reason.trim())) {
      return res.status(400).json({ error: 'A rejection reason is required when rejecting payment.' });
    }

    const payRes = await db.query('SELECT * FROM payment_submissions WHERE id = $1', [payment_id]);
    if (payRes.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    const payment = payRes.rows[0];
    const now = new Date();

    if (action === 'approve') {
      // Calculate 2 calendar months for expiry
      const expiry = new Date(now);
      expiry.setMonth(expiry.getMonth() + 2);

      // Update payment
      await db.query(`
        UPDATE payment_submissions
        SET status = 'approved', reviewed_by = $1, reviewed_at = $2
        WHERE id = $3
      `, [reviewerId, now.toISOString(), payment_id]);

      // Activate subscription
      await db.query(`
        UPDATE subscriptions
        SET status = 'active', activation_date = $1, expiry_date = $2
        WHERE id = $3
      `, [now.toISOString(), expiry.toISOString(), payment.subscription_id]);

      // Notify patient
      await db.query(`
        INSERT INTO notifications (user_id, title, message, category, link_url)
        VALUES ($1, 'Subscription Activated', 'Your consultation subscription has been approved and is now active for 2 months!', 'consultation', '/subscriptions')
      `, [payment.patient_id]);

      return res.json({ message: 'Payment approved and subscription activated successfully.' });
    } else {
      // Reject
      await db.query(`
        UPDATE payment_submissions
        SET status = 'rejected', rejection_reason = $1, reviewed_by = $2, reviewed_at = $3
        WHERE id = $4
      `, [rejection_reason.trim(), reviewerId, now.toISOString(), payment_id]);

      await db.query(`
        UPDATE subscriptions
        SET status = 'cancelled'
        WHERE id = $1
      `, [payment.subscription_id]);

      // Notify patient
      await db.query(`
        INSERT INTO notifications (user_id, title, message, category, link_url)
        VALUES ($1, 'Payment Rejected', $2, 'payment', '/subscriptions')
      `, [payment.patient_id, `Payment for reference ${payment.transaction_ref} was rejected: ${rejection_reason.trim()}`]);

      return res.json({ message: 'Payment rejected and patient notified.' });
    }
  } catch (err) {
    console.error('Verify payment error:', err);
    return res.status(500).json({ error: 'Failed to process payment verification.' });
  }
});

module.exports = router;
