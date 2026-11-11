import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, showToast } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const data = await login(email, password);
      // Route to selected role workspace
      if (role === 'doctor' || data.user.role === 'doctor') {
        navigate('/doctor');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (selectedRole) => {
    try {
      setLoading(true);
      setRole(selectedRole);
      if (selectedRole === 'doctor') {
        setEmail('doctor@sweety.com');
        setPassword('Password123!');
        const data = await login('doctor@sweety.com', 'Password123!');
        navigate('/doctor');
      } else {
        setEmail('patient@sweety.com');
        setPassword('Password123!');
        const data = await login('patient@sweety.com', 'Password123!');
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', padding: 18 }}>
      <div className="card" style={{ width: 'min(440px, 100%)', padding: 32 }}>
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

        {/* Prototype Demo Notice */}
        <div className="notice notice-info" style={{ fontSize: 11.5, margin: '0 0 16px', lineHeight: 1.5 }}>
          ✦ <b>Prototype Demonstration:</b> Local session authentication. Choose your role below to explore the matching patient or doctor workspace.
        </div>

        {/* Clear Role Selection Pill */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 12, marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => {
              setRole('patient');
              if (!email || email === 'doctor@sweety.com') setEmail('patient@sweety.com');
              if (!password) setPassword('Password123!');
            }}
            style={{
              border: 0,
              borderRadius: 8,
              padding: '9px 12px',
              background: role === 'patient' ? '#fff' : 'transparent',
              color: role === 'patient' ? 'var(--teal)' : '#64748b',
              fontWeight: 800,
              fontSize: 13,
              boxShadow: role === 'patient' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer'
            }}
          >
            Patient Account
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('doctor');
              if (!email || email === 'patient@sweety.com') setEmail('doctor@sweety.com');
              if (!password) setPassword('Password123!');
            }}
            style={{
              border: 0,
              borderRadius: 8,
              padding: '9px 12px',
              background: role === 'doctor' ? '#fff' : 'transparent',
              color: role === 'doctor' ? 'var(--purple)' : '#64748b',
              fontWeight: 800,
              fontSize: 13,
              boxShadow: role === 'doctor' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer'
            }}
          >
            Doctor Account
          </button>
        </div>

        {error && (
          <div className="notice notice-error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Email Address</label>
            <input
              type="email"
              placeholder={role === 'doctor' ? 'doctor@sweety.com' : 'patient@sweety.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
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
            {loading ? 'Signing in...' : `Sign In as ${role === 'doctor' ? 'Doctor' : 'Patient'}`}
          </button>
        </form>

        <div style={{ margin: '20px 0', textAlign: 'center', position: 'relative' }}>
          <div style={{ height: 1, background: 'var(--line)' }} />
          <span style={{ position: 'relative', top: -10, background: '#fff', padding: '0 12px', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            One-Click Demo Accounts
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleQuickDemo('patient')}
            disabled={loading}
            style={{ fontSize: 12, padding: 9, fontWeight: 700 }}
          >
            Demo Patient
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleQuickDemo('doctor')}
            disabled={loading}
            style={{ fontSize: 12, padding: 9, fontWeight: 700 }}
          >
            Demo Doctor
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 22, fontSize: 12.5, color: 'var(--muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--teal)', fontWeight: 700 }}>
            Sign up now
          </Link>
        </div>
      </div>
    </div>
  );
}
