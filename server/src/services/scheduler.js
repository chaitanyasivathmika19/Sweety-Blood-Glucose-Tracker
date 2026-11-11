const cron = require('node-cron');
const db = require('../database/db');

function startScheduler() {
  console.log('Sweety background scheduler initialized.');

  // Run every hour to check missing daily reading slots and subscription renewals
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      // 1. Check patient daily reading counts
      const patientsRes = await db.query("SELECT id, name FROM users WHERE role = 'patient'");
      for (const p of patientsRes.rows) {
        const readingsRes = await db.query(
          'SELECT time_slot FROM glucose_readings WHERE patient_id = $1 AND reading_date = $2',
          [p.id, todayStr]
        );

        const recordedSlots = readingsRes.rows.map(r => r.time_slot);
        if (recordedSlots.length < 4) {
          // Check if we already alerted today
          const existingAlert = await db.query(`
            SELECT id FROM notifications
            WHERE user_id = $1 AND category = 'reminder' AND created_at >= $2
          `, [p.id, `${todayStr}T00:00:00Z`]);

          if (existingAlert.rows.length === 0) {
            const missingCount = 4 - recordedSlots.length;
            await db.query(`
              INSERT INTO notifications (user_id, title, message, category, link_url)
              VALUES ($1, 'Daily Tracking Reminder', $2, 'reminder', '/tracking')
            `, [p.id, `You have ${missingCount} glucose reading slot(s) remaining for today. Keep your daily routine consistent!`]);
          }
        }
      }

      // 2. Check expired subscriptions
      await db.query(`
        UPDATE subscriptions
        SET status = 'expired'
        WHERE status = 'active' AND expiry_date < NOW()
      `);
    } catch (err) {
      console.error('Scheduler execution error:', err.message);
    }
  });
}

module.exports = { startScheduler };
