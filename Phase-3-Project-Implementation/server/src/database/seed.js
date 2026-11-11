const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed(poolOverride) {
  const query = poolOverride ? (t, p) => poolOverride.query(t, p) : db.query;

  console.log('Seeding database with demonstration data...');

  // 1. Seed Consultation Plans
  const plans = [
    { name: 'Essential Care', price: 250, frequency_days: 30, validity_months: 2, description: 'One consultation every 30 days. Full 2-calendar-month validity.' },
    { name: 'Regular Care', price: 400, frequency_days: 15, validity_months: 2, description: 'One consultation every 15 days. Full 2-calendar-month validity.' },
    { name: 'Frequent Care', price: 600, frequency_days: 7, validity_months: 2, description: 'One consultation every 7 days. Full 2-calendar-month validity.' }
  ];

  for (const p of plans) {
    const existing = await query('SELECT id FROM consultation_plans WHERE price = $1 AND frequency_days = $2', [p.price, p.frequency_days]);
    if (existing.rows.length === 0) {
      await query(
        'INSERT INTO consultation_plans (name, price, frequency_days, validity_months, description) VALUES ($1, $2, $3, $4, $5)',
        [p.name, p.price, p.frequency_days, p.validity_months, p.description]
      );
    }
  }

  // 2. Seed Users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Patient User
  let patientRes = await query('SELECT id FROM users WHERE email = $1', ['patient@sweety.com']);
  let patientId;
  if (patientRes.rows.length === 0) {
    const pInsert = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Chaitanya Sivathmika', 'patient@sweety.com', passwordHash, 'patient']
    );
    patientId = pInsert.rows[0].id;

    await query(
      'INSERT INTO patient_profiles (user_id, date_of_birth, gender, phone, city, emergency_contact) VALUES ($1, $2, $3, $4, $5, $6)',
      [patientId, '1998-05-12', 'Female', '+91 9876543210', 'Guntur', 'Family Contact: +91 9876543219']
    );
  } else {
    patientId = patientRes.rows[0].id;
  }

  // Doctor User 1 (Dr. Ananya Rao)
  let docRes = await query('SELECT id FROM users WHERE email = $1', ['doctor@sweety.com']);
  let docId;
  if (docRes.rows.length === 0) {
    const dInsert = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Dr. Ananya Rao', 'doctor@sweety.com', passwordHash, 'doctor']
    );
    docId = dInsert.rows[0].id;

    await query(
      'INSERT INTO doctor_profiles (user_id, specialization, experience_years, qualifications, bio, verified) VALUES ($1, $2, $3, $4, $5, $6)',
      [docId, 'Endocrinologist', 12, 'MBBS, MD (Endocrinology)', 'Specialist in diabetes care, insulin titration, and lifestyle modifications.', true]
    );
  } else {
    docId = docRes.rows[0].id;
  }

  // Doctor User 2 (Dr. Vikram Kumar)
  let doc2Res = await query('SELECT id FROM users WHERE email = $1', ['vikram@sweety.com']);
  if (doc2Res.rows.length === 0) {
    const d2Insert = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Dr. Vikram Kumar', 'vikram@sweety.com', passwordHash, 'doctor']
    );
    await query(
      'INSERT INTO doctor_profiles (user_id, specialization, experience_years, qualifications, bio, verified) VALUES ($1, $2, $3, $4, $5, $6)',
      [d2Insert.rows[0].id, 'Diabetologist', 9, 'MBBS, Diploma in Diabetology', 'Comprehensive diabetes management and preventive foot care.', true]
    );
  }

  // Doctor User 3 (Dr. Sana Mehta)
  let doc3Res = await query('SELECT id FROM users WHERE email = $1', ['sana@sweety.com']);
  if (doc3Res.rows.length === 0) {
    const d3Insert = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Dr. Sana Mehta', 'sana@sweety.com', passwordHash, 'doctor']
    );
    await query(
      'INSERT INTO doctor_profiles (user_id, specialization, experience_years, qualifications, bio, verified) VALUES ($1, $2, $3, $4, $5, $6)',
      [d3Insert.rows[0].id, 'General Physician', 7, 'MBBS, DNB (Internal Medicine)', 'Holistic metabolic health and chronic disease guidance.', true]
    );
  }

  // 3. Seed Glucose Readings for Patient
  // Get current date string in YYYY-MM-DD
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  // Today's readings (morning and breakfast recorded within 2 hours so they can be edited)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  await query(`
    INSERT INTO glucose_readings (patient_id, reading_date, time_slot, glucose_value, created_at, updated_at)
    VALUES 
      ($1, $2, 'morning', 108, $3, $3),
      ($1, $2, 'breakfast', 142, $4, $4)
    ON CONFLICT (patient_id, reading_date, time_slot) DO NOTHING
  `, [patientId, todayStr, twoHoursAgo, oneHourAgo]);

  // Seed previous days (last 30 days) to have rich daily, month-to-date and monthly reports
  for (let i = 1; i <= 35; i++) {
    const pastDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = `${pastDate.getFullYear()}-${pad(pastDate.getMonth() + 1)}-${pad(pastDate.getDate())}`;
    const createdAt = pastDate.toISOString();

    // Values fluctuating around realistic diabetic levels
    const baseVal = 100 + (i % 25);
    const mVal = baseVal + 5;
    const bVal = baseVal + 35;
    const lVal = baseVal + 25;
    const dVal = baseVal + 40;

    await query(`
      INSERT INTO glucose_readings (patient_id, reading_date, time_slot, glucose_value, created_at, updated_at)
      VALUES 
        ($1, $2, 'morning', $3, $4, $4),
        ($1, $2, 'breakfast', $5, $4, $4),
        ($1, $2, 'lunch', $6, $4, $4),
        ($1, $2, 'dinner', $7, $4, $4)
      ON CONFLICT (patient_id, reading_date, time_slot) DO NOTHING
    `, [patientId, dateStr, mVal, createdAt, bVal, lVal, dVal]);
  }

  // 4. Seed Active Subscription
  const plan1Res = await query('SELECT id FROM consultation_plans WHERE price = 250 LIMIT 1');
  if (plan1Res.rows.length > 0) {
    const planId = plan1Res.rows[0].id;
    const activationDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    // Expiry: 2 calendar months after activation
    const expiryDate = new Date(activationDate);
    expiryDate.setMonth(expiryDate.getMonth() + 2);

    let subRes = await query('SELECT id FROM subscriptions WHERE patient_id = $1 AND doctor_id = $2', [patientId, docId]);
    let subId;
    if (subRes.rows.length === 0) {
      const subInsert = await query(`
        INSERT INTO subscriptions (patient_id, doctor_id, plan_id, fee, status, activation_date, expiry_date)
        VALUES ($1, $2, $3, 250, 'active', $4, $5)
        RETURNING id
      `, [patientId, docId, planId, activationDate.toISOString(), expiryDate.toISOString()]);
      subId = subInsert.rows[0].id;

      // Seed verified payment
      await query(`
        INSERT INTO payment_submissions (subscription_id, patient_id, doctor_id, transaction_ref, status, reviewed_by, reviewed_at)
        VALUES ($1, $2, $3, 'TXN-58XQ21', 'approved', $3, $4)
        ON CONFLICT (transaction_ref) DO NOTHING
      `, [subId, patientId, docId, activationDate.toISOString()]);
    }
  }

  // 5. Seed Messages
  await query(`
    INSERT INTO messages (sender_id, receiver_id, content, created_at)
    VALUES 
      ($2, $1, 'Hi Chaitanya! I reviewed your latest glucose readings. How have you been feeling after breakfast?', $3),
      ($1, $2, 'Hello Dr. Ananya! I have been tracking regularly. Feeling energetic and keeping carbohydrates balanced.', $4),
      ($2, $1, 'Great! Keep up the daily tracking. Your morning fasting values look stable.', $5)
  `, [
    patientId, 
    docId, 
    new Date(now.getTime() - 3 * 3600 * 1000).toISOString(),
    new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
    new Date(now.getTime() - 1 * 3600 * 1000).toISOString()
  ]);

  // 6. Seed Notifications
  await query(`
    INSERT INTO notifications (user_id, title, message, category, is_read, link_url)
    VALUES 
      ($1, 'Reading saved', 'Your morning fasting reading (108 mg/dL) was saved successfully.', 'reading', true, '/tracking'),
      ($1, 'Subscription active', 'Your 2-month consultation plan with Dr. Ananya Rao is active.', 'consultation', false, '/subscriptions'),
      ($1, 'New message from Dr. Rao', 'Dr. Ananya Rao replied to your consultation message.', 'message', false, '/chat'),
      ($2, 'Payment verified', 'Subscription activated for Chaitanya Sivathmika (TXN-58XQ21).', 'payment', true, '/doctor-requests')
  `, [patientId, docId]);

  console.log('Database seeding complete.');
  console.log('Demo Patient: patient@sweety.com / Password123!');
  console.log('Demo Doctor: doctor@sweety.com / Password123!');
}

if (require.main === module) {
  (async () => {
    await db.initDatabase();
    await seed();
    process.exit(0);
  })().catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}

module.exports = { seed };
