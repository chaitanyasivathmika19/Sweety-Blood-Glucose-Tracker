import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { User, Phone, MapPin, Calendar, Heart } from 'lucide-react';

export default function ProfileView() {
  const { user, showToast, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    date_of_birth: '',
    gender: 'Prefer not to say',
    emergency_contact: '',
    specialization: '',
    qualifications: '',
    bio: '',
    experience_years: 0
  });
  const [saving, setSaving] = useState(false);

  const isDoctor = user?.role === 'doctor';

  useEffect(() => {
    if (user) {
      const p = user.profile || {};
      setFormData({
        name: user.name || '',
        phone: p.phone || '',
        city: p.city || '',
        date_of_birth: p.date_of_birth ? p.date_of_birth.split('T')[0] : '',
        gender: p.gender || 'Prefer not to say',
        emergency_contact: p.emergency_contact || '',
        specialization: p.specialization || '',
        qualifications: p.qualifications || '',
        bio: p.bio || '',
        experience_years: p.experience_years || 0
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateProfile(formData);
      showToast('Profile updated successfully.');
      refreshUser();
    } catch (err) {
      showToast(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'U';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            {isDoctor ? 'Professional Profile Settings' : 'Personal Profile Settings'}
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Keep your clinical contact details and demographic records current.
          </p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 840 }}>
        {/* Profile Header */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 26, paddingBottom: 20, borderBottom: '1px solid var(--line)' }}>
          <div className={`avatar ${isDoctor ? 'coral' : 'teal'}`} style={{ width: 64, height: 64, fontSize: 22, borderRadius: 18 }}>
            {initials}
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 17 }}>{user?.name}</h3>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {user?.email} · <span style={{ textTransform: 'capitalize', fontWeight: 700, color: 'var(--teal)' }}>{user?.role}</span> account
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                style={{ background: '#f8fafc', color: 'var(--muted)' }}
              />
              <small>Account emails are immutable for security audit integrity.</small>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                name="phone"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>City / Location</label>
              <input
                type="text"
                name="city"
                placeholder="e.g. Guntur"
                value={formData.city}
                onChange={handleChange}
              />
            </div>

            {!isDoctor ? (
              <>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="Prefer not to say">Prefer not to say</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Emergency Contact</label>
                  <input
                    type="text"
                    name="emergency_contact"
                    placeholder="Name and contact number (e.g. Parent / Spouse: +91 9876543219)"
                    value={formData.emergency_contact}
                    onChange={handleChange}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Specialization</label>
                  <input
                    type="text"
                    name="specialization"
                    placeholder="e.g. Endocrinology"
                    value={formData.specialization}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Years of Clinical Experience</label>
                  <input
                    type="number"
                    name="experience_years"
                    min="0"
                    value={formData.experience_years}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Qualifications & Certifications</label>
                  <input
                    type="text"
                    name="qualifications"
                    placeholder="e.g. MBBS, MD (Endocrinology)"
                    value={formData.qualifications}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Professional Bio</label>
                  <textarea
                    name="bio"
                    rows="3"
                    placeholder="Describe your clinical focus..."
                    value={formData.bio}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
