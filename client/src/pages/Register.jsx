import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register, showToast } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      const data = await register(name, email, password, role);
      navigate(data.user.role === 'doctor' ? '/doctor' : '/');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', padding: 18 }}>
      <div className="card" style={{ width: 'min(460px, 100%)', padding: 32 }}>
        {/* Prominent High-Contrast sweety. Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #22a89d, #6b77d9)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 24, boxShadow: '0 6px 14px rgba(23, 139, 131, 0.25)' }}>
              ♥
            </div>
            <span style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.8, color: 'var(--ink)' }}>
              sweety<span style={{ color: 'var(--teal)' }}>.</span>
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
            Blood Glucose Tracker & Doctor Consultation Platform
          </p>
        </div>

        {error && (
          <div className="notice notice-error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Role Selection Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 12, marginBottom: 18 }}>
            <button
              type="button"
              onClick={() => setRole('patient')}
              style={{
                border: 0,
                borderRadius: 8,
                padding: '8px 12px',
                background: role === 'patient' ? '#fff' : 'transparent',
                color: role === 'patient' ? 'var(--teal)' : '#64748b',
                fontWeight: 700,
                fontSize: 13,
                boxShadow: role === 'patient' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              I am a Patient
            </button>
            <button
              type="button"
              onClick={() => setRole('doctor')}
              style={{
                border: 0,
                borderRadius: 8,
                padding: '8px 12px',
                background: role === 'doctor' ? '#fff' : 'transparent',
                color: role === 'doctor' ? 'var(--purple)' : '#64748b',
                fontWeight: 700,
                fontSize: 13,
                boxShadow: role === 'doctor' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              I am a Doctor
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Full Name</label>
            <input
              type="text"
              placeholder={role === 'doctor' ? 'e.g. Dr. Jane Smith' : 'e.g. Chaitanya S.'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Email Address</label>
            <input
              type="email"
              placeholder="e.g. name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Password</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: 12, fontSize: 14 }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : `Register as ${role === 'doctor' ? 'Doctor' : 'Patient'}`}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 22, fontSize: 12.5, color: 'var(--muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 700 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
