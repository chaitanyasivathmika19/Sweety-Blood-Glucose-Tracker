const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const VALID_SLOTS = ['morning', 'breakfast', 'lunch', 'dinner'];
const SLOT_LABELS = {
  morning: 'Morning (fasting)',
  breakfast: 'After breakfast',
  lunch: 'After lunch',
  dinner: 'After dinner'
};

// Helper to get today's date in YYYY-MM-DD format in server/configured timezone
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// POST /api/readings - Create a new glucose reading
router.post('/', authenticateToken, async (req, res) => {
  try {
    const patientId = req.user.id;
    const { reading_date, time_slot, glucose_value } = req.body;
    const today = getTodayDateString();

    // 1. Value is required
    if (glucose_value === undefined || glucose_value === null || glucose_value === '') {
      return res.status(400).json({ error: 'Please enter a glucose value.' });
    }

    // 2. Value must be a whole number between 40 and 600
    const numValue = Number(glucose_value);
    if (!Number.isInteger(numValue) || numValue < 40 || numValue > 600) {
      return res.status(400).json({ error: 'Value must be between 40 and 600 mg/dl.' });
    }

    // Validate slot
    if (!time_slot || !VALID_SLOTS.includes(time_slot)) {
      return res.status(400).json({ error: 'Invalid time slot selected.' });
    }

    const slotLabel = SLOT_LABELS[time_slot];

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const targetDate = (reading_date || today).trim();
    if (!dateRegex.test(targetDate)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    // 3. Date cannot be in the future
    if (targetDate > today) {
      return res.status(400).json({ error: 'Date cannot be in the future.' });
    }

    // 4. Sweety product rule: New readings only for current date
    if (targetDate < today) {
      return res.status(400).json({ error: 'New readings can only be added for today’s date. Past dates are read-only.' });
    }

    // Check existing count for the day
    const dayCountRes = await db.query(
      'SELECT COUNT(*) as count FROM glucose_readings WHERE patient_id = $1 AND reading_date = $2',
      [patientId, targetDate]
    );
    const dayCount = parseInt(dayCountRes.rows[0].count, 10);

    // 5. Maximum 4 readings per day
    if (dayCount >= 4) {
      return res.status(400).json({ error: 'You can add only 4 readings per day.' });
    }

    // 6. Only one reading per slot per day
    const existingSlotRes = await db.query(
      'SELECT id FROM glucose_readings WHERE patient_id = $1 AND reading_date = $2 AND time_slot = $3',
      [patientId, targetDate, time_slot]
    );
    if (existingSlotRes.rows.length > 0) {
      return res.status(400).json({ error: `You already have an ${slotLabel} reading for this date.` });
    }

    // Insert reading
    const insertRes = await db.query(`
      INSERT INTO glucose_readings (patient_id, reading_date, time_slot, glucose_value)
      VALUES ($1, $2, $3, $4)
      RETURNING id, patient_id, reading_date, time_slot, glucose_value, created_at, updated_at
    `, [patientId, targetDate, time_slot, numValue]);

    const createdReading = insertRes.rows[0];

    // Notification creation
    await db.query(`
      INSERT INTO notifications (user_id, title, message, category, link_url)
      VALUES ($1, 'Reading saved', $2, 'reading', '/tracking')
    `, [patientId, `Your ${slotLabel} reading of ${numValue} mg/dL was saved successfully.`]);

    return res.status(201).json({
      message: 'Reading saved successfully.',
      reading: {
        ...createdReading,
        slot_label: slotLabel
      }
    });
  } catch (err) {
    console.error('Create reading error:', err);
    return res.status(500).json({ error: 'Failed to record glucose reading.' });
  }
});

// GET /api/readings - List readings with pagination and date filter
router.get('/', authenticateToken, async (req, res) => {
  try {
    const patientId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { date, start_date, end_date } = req.query;

    let queryText = 'SELECT * FROM glucose_readings WHERE patient_id = $1';
    const params = [patientId];

    if (date) {
      params.push(date);
      queryText += ` AND reading_date = $${params.length}`;
    } else if (start_date && end_date) {
      params.push(start_date, end_date);
      queryText += ` AND reading_date >= $${params.length - 1} AND reading_date <= $${params.length}`;
    }

    // Total count for pagination
    const countRes = await db.query(queryText.replace('SELECT *', 'SELECT COUNT(*) as total'), params);
    const total = parseInt(countRes.rows[0].total, 10);

    queryText += ` ORDER BY reading_date DESC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const readingsRes = await db.query(queryText, params);
    const enrichedReadings = readingsRes.rows.map(r => ({
      ...r,
      slot_label: SLOT_LABELS[r.time_slot] || r.time_slot,
      can_edit: Date.now() < new Date(r.created_at).getTime() + 4 * 60 * 60 * 1000
    }));

    return res.json({
      readings: enrichedReadings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Fetch readings error:', err);
    return res.status(500).json({ error: 'Failed to fetch readings.' });
  }
});

// PUT /api/readings/:id - Edit an existing reading (strictly within 4 hours)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const readingId = parseInt(req.params.id, 10);
    const patientId = req.user.id;
    const { glucose_value } = req.body;

    // Check reading exists and belongs to patient
    const readingRes = await db.query(
      'SELECT * FROM glucose_readings WHERE id = $1 AND patient_id = $2',
      [readingId, patientId]
    );

    if (readingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Reading not found or unauthorized.' });
    }

    const reading = readingRes.rows[0];

    // 4-hour editing deadline rule
    const createdAtTime = new Date(reading.created_at).getTime();
    const fourHoursMs = 4 * 60 * 60 * 1000;
    if (Date.now() >= createdAtTime + fourHoursMs) {
      return res.status(403).json({ error: 'Editing is available only within 4 hours of recording.' });
    }

    // Validate new value
    if (glucose_value === undefined || glucose_value === null || glucose_value === '') {
      return res.status(400).json({ error: 'Please enter a glucose value.' });
    }
    const numValue = Number(glucose_value);
    if (!Number.isInteger(numValue) || numValue < 40 || numValue > 600) {
      return res.status(400).json({ error: 'Value must be between 40 and 600 mg/dl.' });
    }

    // Update value without changing created_at
    const updateRes = await db.query(`
      UPDATE glucose_readings
      SET glucose_value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, patient_id, reading_date, time_slot, glucose_value, created_at, updated_at
    `, [numValue, readingId]);

    return res.json({
      message: 'Reading updated successfully.',
      reading: {
        ...updateRes.rows[0],
        slot_label: SLOT_LABELS[updateRes.rows[0].time_slot]
      }
    });
  } catch (err) {
    console.error('Update reading error:', err);
    return res.status(500).json({ error: 'Failed to update reading.' });
  }
});

// DELETE /api/readings/:id - Delete a reading
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const readingId = parseInt(req.params.id, 10);
    const patientId = req.user.id;

    const delRes = await db.query(
      'DELETE FROM glucose_readings WHERE id = $1 AND patient_id = $2 RETURNING id',
      [readingId, patientId]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'Reading not found or unauthorized.' });
    }

    return res.json({ message: 'Reading deleted successfully.' });
  } catch (err) {
    console.error('Delete reading error:', err);
    return res.status(500).json({ error: 'Failed to delete reading.' });
  }
});

// Helper for report calculations
function computeStats(readings) {
  if (!readings || readings.length === 0) {
    return {
      highest: null,
      lowest: null,
      average: null,
      count: 0
    };
  }

  const values = readings.map(r => r.glucose_value);
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const average = Number((sum / values.length).toFixed(1));

  return {
    highest,
    lowest,
    average,
    count: readings.length
  };
}

// GET /api/readings/reports - Reports for daily, month-to-date, and previous month
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const patientId = req.user.id;
    const { type = 'daily', date = getTodayDateString() } = req.query;

    const selected = new Date(`${date}T12:00:00`);
    const pad = n => String(n).padStart(2, '0');

    let startDate = date;
    let endDate = date;
    let reportTitle = `Daily Report (${date})`;

    if (type === 'daily') {
      startDate = date;
      endDate = date;
      reportTitle = `Daily Report - ${date}`;
    } else if (type === 'month-to-date') {
      // 1st of the month to the selected date
      startDate = `${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-01`;
      endDate = date;
      reportTitle = `Month-to-Date Report (${startDate} to ${endDate})`;
    } else if (type === 'monthly') {
      // The whole previous calendar month relative to selected date
      const prevMonth = new Date(selected.getFullYear(), selected.getMonth() - 1, 1);
      const lastDayPrevMonth = new Date(selected.getFullYear(), selected.getMonth(), 0).getDate();
      startDate = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}-01`;
      endDate = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}-${pad(lastDayPrevMonth)}`;
      reportTitle = `Monthly Report (${startDate} to ${endDate})`;
    } else if (type === 'custom') {
      startDate = req.query.start_date || date;
      endDate = req.query.end_date || date;
      reportTitle = `Custom Report (${startDate} to ${endDate})`;
    } else if (type === 'full') {
      startDate = '2000-01-01';
      endDate = '2099-12-31';
      reportTitle = 'Full History Report';
    }

    const readingsRes = await db.query(`
      SELECT id, patient_id, reading_date, time_slot, glucose_value, created_at, updated_at
      FROM glucose_readings
      WHERE patient_id = $1 AND reading_date >= $2 AND reading_date <= $3
      ORDER BY reading_date ASC, created_at ASC
    `, [patientId, startDate, endDate]);

    const enriched = readingsRes.rows.map(r => ({
      ...r,
      slot_label: SLOT_LABELS[r.time_slot] || r.time_slot,
      can_edit: Date.now() < new Date(r.created_at).getTime() + 4 * 60 * 60 * 1000
    }));

    const stats = computeStats(readingsRes.rows);

    return res.json({
      type,
      reportTitle,
      dateRange: {
        startDate,
        endDate,
        selectedDate: date
      },
      stats,
      readings: enriched
    });
  } catch (err) {
    console.error('Reports generation error:', err);
    return res.status(500).json({ error: 'Failed to generate glucose report.' });
  }
});

// GET /api/readings/export-csv - CSV export with exact requested column headers
router.get('/export-csv', authenticateToken, async (req, res) => {
  try {
    const patientId = req.user.id;
    const { start_date = '2000-01-01', end_date = '2099-12-31' } = req.query;

    const readingsRes = await db.query(`
      SELECT reading_date, time_slot, glucose_value, created_at, updated_at
      FROM glucose_readings
      WHERE patient_id = $1 AND reading_date >= $2 AND reading_date <= $3
      ORDER BY reading_date ASC, created_at ASC
    `, [patientId, start_date, end_date]);

    // Format exact requested headers: Date, Time Slot, Glucose Value (mg/dL), Created At, Updated At
    const csvRows = [
      ['Date', 'Time Slot', 'Glucose Value (mg/dL)', 'Created At', 'Updated At']
    ];

    for (const r of readingsRes.rows) {
      csvRows.push([
        r.reading_date instanceof Date ? r.reading_date.toISOString().split('T')[0] : String(r.reading_date),
        SLOT_LABELS[r.time_slot] || r.time_slot,
        r.glucose_value,
        new Date(r.created_at).toISOString(),
        new Date(r.updated_at).toISOString()
      ]);
    }

    const csvContent = csvRows
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sweety-readings-${start_date}-to-${end_date}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('CSV export error:', err);
    return res.status(500).json({ error: 'Failed to export CSV.' });
  }
});

module.exports = router;
