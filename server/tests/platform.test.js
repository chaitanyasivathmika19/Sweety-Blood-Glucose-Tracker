import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import db from '../src/database/db';

describe('Sweety Platform Consultations, Payments, Chat & Notifications Tests', () => {
  let patientToken;
  let patientId;
  let doctorToken;
  let doctorId;
  let planId;
  let paymentId;
  let subscriptionId;

  beforeAll(async () => {
    process.env.FORCE_MEMORY_DB = 'true';
    await db.initDatabase();

    // Register Doctor
    const docRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Dr. Test Specialist',
        email: `doctor_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'doctor'
      });
    doctorToken = docRes.body.token;
    doctorId = docRes.body.user.id;

    // Register Patient
    const patRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Patient Platform',
        email: `patient_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'patient'
      });
    patientToken = patRes.body.token;
    patientId = patRes.body.user.id;

    // Seed Consultation Plans
    const plans = [
      { name: 'Essential Care', price: 250, frequency_days: 30, validity_months: 2 },
      { name: 'Regular Care', price: 400, frequency_days: 15, validity_months: 2 },
      { name: 'Frequent Care', price: 600, frequency_days: 7, validity_months: 2 }
    ];
    for (const p of plans) {
      await db.query(
        'INSERT INTO consultation_plans (name, price, frequency_days, validity_months) VALUES ($1, $2, $3, $4)',
        [p.name, p.price, p.frequency_days, p.validity_months]
      );
    }
  });

  it('fetches consultation plans correctly with ₹250, ₹400, ₹600 prices', async () => {
    const res = await request(app).get('/api/subscriptions/plans');
    expect(res.status).toBe(200);
    expect(res.body.plans.length).toBeGreaterThanOrEqual(3);
    const prices = res.body.plans.map(p => p.price);
    expect(prices).toContain(250);
    expect(prices).toContain(400);
    expect(prices).toContain(600);
    planId = res.body.plans[0].id;
  });

  it('allows patient to submit payment proof for a consultation plan', async () => {
    const ref = `TXN_TEST_${Date.now()}`;
    const res = await request(app)
      .post('/api/subscriptions/submit-payment')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctor_id: doctorId,
        plan_id: planId,
        transaction_ref: ref,
        screenshot_url: 'receipt.png'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('subscription_id');
    subscriptionId = res.body.subscription_id;

    // Check duplicate payment reference rejection
    const dupRes = await request(app)
      .post('/api/subscriptions/submit-payment')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctor_id: doctorId,
        plan_id: planId,
        transaction_ref: ref
      });
    expect(dupRes.status).toBe(400);
    expect(dupRes.body.error).toBe('This transaction reference ID has already been submitted.');
  });

  it('allows doctor to view pending payments', async () => {
    const res = await request(app)
      .get('/api/subscriptions/pending-payments')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.payments.length).toBeGreaterThan(0);
    paymentId = res.body.payments[0].id;
  });

  it('blocks chat message sending while subscription is pending or inactive', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        receiver_id: doctorId,
        content: 'Hello doctor'
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Chat access is locked');
  });

  it('allows doctor to verify and approve payment, activating 2-month subscription', async () => {
    const res = await request(app)
      .post('/api/subscriptions/verify-payment')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        payment_id: paymentId,
        action: 'approve'
      });

    expect(res.status).toBe(200);

    // Verify subscription status is now active
    const subRes = await db.query('SELECT status, activation_date, expiry_date FROM subscriptions WHERE id = $1', [subscriptionId]);
    expect(subRes.rows[0].status).toBe('active');
    expect(subRes.rows[0].activation_date).toBeTruthy();
    expect(subRes.rows[0].expiry_date).toBeTruthy();
  });

  it('allows chat message sending once subscription is active', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        receiver_id: doctorId,
        content: 'Hello doctor, my subscription is now active!'
      });

    expect(res.status).toBe(201);
    expect(res.body.chat_message.content).toBe('Hello doctor, my subscription is now active!');

    // Fetch messages
    const getRes = await request(app)
      .get(`/api/chat/messages/${doctorId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.access.unlocked).toBe(true);
    expect(getRes.body.messages.length).toBe(1);
  });

  it('manages patient notifications and mark as read', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.notifications.length).toBeGreaterThan(0);

    // Mark all as read
    const markRes = await request(app)
      .put('/api/notifications/mark-all-read')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(markRes.status).toBe(200);

    const checkRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(checkRes.body.unreadCount).toBe(0);
  });

  it('allows doctor to view authorized patient records and prevents unauthorized doctors', async () => {
    // Authorized doctor
    const res = await request(app)
      .get(`/api/doctors/portal/patients/${patientId}/readings`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.patient.id).toBe(patientId);

    // Register Doctor 2 who has no relationship with Patient
    const doc2Res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Dr. Unrelated',
        email: `unrelated_doc_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'doctor'
      });

    const unauthorizedRes = await request(app)
      .get(`/api/doctors/portal/patients/${patientId}/readings`)
      .set('Authorization', `Bearer ${doc2Res.body.token}`);

    expect(unauthorizedRes.status).toBe(403);
    expect(unauthorizedRes.body.error).toContain('Access denied');
  });

  it('allows doctor to upload payment QR code and serves static image', async () => {
    // 1x1 transparent PNG buffer
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

    const uploadRes = await request(app)
      .post('/api/doctors/me/qr')
      .set('Authorization', `Bearer ${doctorToken}`)
      .attach('qr', pngBuffer, 'test_qr.png');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body).toHaveProperty('qrUrl');
    const qrUrl = uploadRes.body.qrUrl;
    expect(qrUrl).toMatch(/^\/uploads\/qr\//);

    // Verify static serving at /uploads
    const staticRes = await request(app).get(qrUrl);
    expect(staticRes.status).toBe(200);
    expect(staticRes.headers['content-type']).toContain('image');

    // Verify static serving at /api/uploads
    const apiStaticRes = await request(app).get(`/api${qrUrl}`);
    expect(apiStaticRes.status).toBe(200);
    expect(apiStaticRes.headers['content-type']).toContain('image');

    // Verify GET /api/auth/me returns payment_qr_url
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.profile.payment_qr_url).toBe(qrUrl);

    // Verify doctor list includes payment_qr_url for this doctor
    const docsRes = await request(app).get('/api/doctors');
    expect(docsRes.status).toBe(200);
    const docEntry = docsRes.body.doctors.find(d => d.id === doctorId);
    expect(docEntry.payment_qr_url).toBe(qrUrl);

    // Verify delete QR removes the file and clears database record
    const deleteRes = await request(app)
      .delete('/api/doctors/me/qr')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(deleteRes.status).toBe(200);

    const meAfterDelete = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(meAfterDelete.body.user.profile.payment_qr_url).toBeNull();
  });
});
