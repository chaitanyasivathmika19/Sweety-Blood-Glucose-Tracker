import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Lock, Mail } from 'lucide-react';

export default function Login() {
  const { login, showToast } = useAuth();
  const navigate = useNavigate();

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
      navigate(data.user.role === 'doctor' ? '/doctor' : '/');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role) => {
    try {
      setLoading(true);
      if (role === 'doctor') {
        const data = await login('doctor@sweety.com', 'Password123!');
        navigate('/doctor');
      } else {
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
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #22a89d, #6b77d9)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 22, margin: '0 auto 12px', boxShadow: '0 8px 18px rgba(23, 139, 131, 0.25)' }}>
            ♥
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800 }}>Welcome to Sweety</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Blood Glucose Tracker & Doctor Consultation Platform
          </p>
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
              placeholder="e.g. patient@sweety.com"
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ margin: '20px 0', textAlign: 'center', position: 'relative' }}>
          <div style={{ height: 1, background: 'var(--line)' }} />
          <span style={{ position: 'relative', top: -10, background: '#fff', padding: '0 12px', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Quick Demo Login
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleQuickDemo('patient')}
            disabled={loading}
            style={{ fontSize: 12, padding: 8 }}
          >
            Demo Patient
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleQuickDemo('doctor')}
            disabled={loading}
            style={{ fontSize: 12, padding: 8 }}
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
