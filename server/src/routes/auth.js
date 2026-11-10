const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'patient' } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = role === 'doctor' ? 'doctor' : 'patient';

    // Check duplicate email
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name.trim(), cleanEmail, passwordHash, cleanRole]
    );
    const user = userResult.rows[0];

    // Create appropriate profile
    if (cleanRole === 'patient') {
      await db.query('INSERT INTO patient_profiles (user_id) VALUES ($1)', [user.id]);
    } else {
      await db.query(
        'INSERT INTO doctor_profiles (user_id, specialization, experience_years) VALUES ($1, $2, $3)',
        [user.id, 'General Medicine', 0]
      );
    }

    const token = generateToken(user);
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userResult = await db.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [cleanEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    let profile = null;
    if (req.user.role === 'patient') {
      const pRes = await db.query(
        'SELECT date_of_birth, gender, phone, city, emergency_contact FROM patient_profiles WHERE user_id = $1',
        [req.user.id]
      );
      profile = pRes.rows[0] || {};
    } else {
      const dRes = await db.query(
        'SELECT specialization, experience_years, qualifications, bio, verified, payment_qr_url FROM doctor_profiles WHERE user_id = $1',
        [req.user.id]
      );
      profile = dRes.rows[0] || {};
    }

    return res.json({
      user: {
        ...req.user,
        profile
      }
    });
  } catch (err) {
    console.error('Fetch me error:', err);
    return res.status(500).json({ error: 'Internal server error fetching user profile.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, city, date_of_birth, gender, emergency_contact, specialization, qualifications, bio, experience_years } = req.body;

    if (name && name.trim()) {
      await db.query('UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [name.trim(), req.user.id]);
    }

    if (req.user.role === 'patient') {
      await db.query(`
        UPDATE patient_profiles 
        SET phone = COALESCE($1, phone),
            city = COALESCE($2, city),
            date_of_birth = COALESCE($3, date_of_birth),
            gender = COALESCE($4, gender),
            emergency_contact = COALESCE($5, emergency_contact),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6
      `, [phone, city, date_of_birth, gender, emergency_contact, req.user.id]);
    } else {
      await db.query(`
        UPDATE doctor_profiles 
        SET specialization = COALESCE($1, specialization),
            qualifications = COALESCE($2, qualifications),
            bio = COALESCE($3, bio),
            experience_years = COALESCE($4, experience_years),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $5
      `, [specialization, qualifications, bio, experience_years, req.user.id]);
    }

    return res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

module.exports = router;
