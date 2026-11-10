import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import db from '../src/database/db';

describe('Glucose Readings & Reports API Tests', () => {
  let token;
  let userBToken;
  const today = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    process.env.FORCE_MEMORY_DB = 'true';
    await db.initDatabase();

    // Register User A
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Patient A',
        email: `patientA_${Date.now()}@example.com`,
        password: 'Password123!'
      });
    token = regRes.body.token;

    // Register User B
    const regBRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Patient B',
        email: `patientB_${Date.now()}@example.com`,
        password: 'Password123!'
      });
    userBToken = regBRes.body.token;
  });

  it('rejects missing glucose value with exact error message', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reading_date: today,
        time_slot: 'morning'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please enter a glucose value.');
  });

  it('rejects value below 40 with exact error message', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reading_date: today,
        time_slot: 'morning',
        glucose_value: 39
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it('rejects value above 600 with exact error message', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reading_date: today,
        time_slot: 'morning',
        glucose_value: 601
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it('rejects decimal values', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reading_date: today,
        time_slot: 'morning',
        glucose_value: 120.5
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it('rejects future dates with exact error message', async () => {
    const futureDate = '2099-01-01';
    const res = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reading_date: futureDate,
        time_slot: 'morning',
        glucose_value: 110
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Date cannot be in the future.');
  });

  it('accepts boundary value 40', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reading_date: today,
        time_slot: 'morning',
        glucose_value: 40
      });

    expect(res.status).toBe(201);
    expect(res.body.reading.glucose_value).toBe(40);
  });

  it('rejects duplicate reading for the same slot on the same date with exact message', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reading_date: today,
        time_slot: 'morning',
        glucose_value: 95
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('You already have an Morning (fasting) reading for this date.');
  });

  it('allows adding remaining slots for the day', async () => {
    const resBreakfast = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ reading_date: today, time_slot: 'breakfast', glucose_value: 140 });
    expect(resBreakfast.status).toBe(201);

    const resLunch = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ reading_date: today, time_slot: 'lunch', glucose_value: 130 });
    expect(resLunch.status).toBe(201);

    const resDinner = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ reading_date: today, time_slot: 'dinner', glucose_value: 600 });
    expect(resDinner.status).toBe(201);
    expect(resDinner.body.reading.glucose_value).toBe(600); // tests boundary 600
  });

  it('rejects 5th reading on the same day with exact message', async () => {
    // Attempting to add when 4 already exist
    const res = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reading_date: today,
        time_slot: 'lunch',
        glucose_value: 150
      });

    expect(res.status).toBe(400);
    // Should hit either duplicate slot or max 4 limit
    expect([
      'You can add only 4 readings per day.',
      'You already have an After lunch reading for this date.'
    ]).toContain(res.body.error);
  });

  it('allows User B to record readings independently without cross-user interference', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        reading_date: today,
        time_slot: 'morning',
        glucose_value: 105
      });

    expect(res.status).toBe(201);
    expect(res.body.reading.glucose_value).toBe(105);

    // Verify User B cannot see User A readings
    const listRes = await request(app)
      .get('/api/readings')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(listRes.body.readings.length).toBe(1);
    expect(listRes.body.readings[0].glucose_value).toBe(105);
  });

  it('calculates daily report statistics correctly', async () => {
    const res = await request(app)
      .get(`/api/readings/reports?type=daily&date=${today}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.count).toBe(4);
    expect(res.body.stats.lowest).toBe(40);
    expect(res.body.stats.highest).toBe(600);
    // Average of 40, 140, 130, 600 = 910 / 4 = 227.5
    expect(res.body.stats.average).toBe(227.5);
    expect(res.body.readings.length).toBe(4);
  });

  it('exports CSV with the exact requested headers and content', async () => {
    const res = await request(app)
      .get('/api/readings/export-csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const firstLine = res.text.split('\r\n')[0];
    expect(firstLine).toBe('"Date","Time Slot","Glucose Value (mg/dL)","Created At","Updated At"');
  });

  it('enforces 4-hour editing deadline', async () => {
    // Fetch User B reading
    const listRes = await request(app)
      .get('/api/readings')
      .set('Authorization', `Bearer ${userBToken}`);
    const reading = listRes.body.readings[0];

    // Edit within 4 hours succeeds
    const editRes = await request(app)
      .put(`/api/readings/${reading.id}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ glucose_value: 115 });

    expect(editRes.status).toBe(200);
    expect(editRes.body.reading.glucose_value).toBe(115);

    // Manually alter created_at in database to be 5 hours ago
    const fiveHoursAgo = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
    await db.query('UPDATE glucose_readings SET created_at = $1 WHERE id = $2', [fiveHoursAgo, reading.id]);

    // Now edit should fail with exact message
    const expiredRes = await request(app)
      .put(`/api/readings/${reading.id}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ glucose_value: 125 });

    expect(expiredRes.status).toBe(403);
    expect(expiredRes.body.error).toBe('Editing is available only within 4 hours of recording.');
  });
});
