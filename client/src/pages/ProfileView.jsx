import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { User, Phone, MapPin, Calendar, Heart, QrCode, Upload, Trash2 } from 'lucide-react';

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
  const [qrPreview, setQrPreview] = useState(null);
  const [qrFile, setQrFile] = useState(null);
  const [qrUploading, setQrUploading] = useState(false);

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

  const handleQrChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrFile(file);
      setQrPreview(URL.createObjectURL(file));
    } else {
      setQrFile(null);
      setQrPreview(null);
    }
  };

  const handleSaveQr = async () => {
    if (!qrFile) {
      showToast('Please select a QR code image.');
      return;
    }
    try {
      setQrUploading(true);
      const data = new FormData();
      data.append('qr', qrFile);
      await api.uploadDoctorQr(data);
      showToast('Payment QR code saved.');
      await refreshUser();
    } catch (err) {
      showToast(err.message || 'Failed to upload QR code.');
    } finally {
      setQrUploading(false);
      setQrFile(null);
      setQrPreview(null);
    }
  };

  const handleRemoveQr = async () => {
    try {
      await api.deleteDoctorQr();
      showToast('Payment QR code removed.');
      await refreshUser();
    } catch (err) {
      showToast(err.message || 'Failed to remove QR code.');
    }
  };

  return (
    <div className="animate-fade-in">
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
          {isDoctor && (
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--teal2)', display: 'grid', placeItems: 'center' }}>
                  <QrCode size={18} color="var(--teal)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Payment QR Code</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                    Patients scan this QR to make consultation payments via UPI.
                  </p>
                </div>
              </div>

              {/* Existing saved QR */}
              {user?.profile?.payment_qr_url && !qrPreview && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11.5, fontWeight: 700, color: '#687583', marginBottom: 8 }}>Currently saved QR code:</p>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={user.profile.payment_qr_url}
                      alt="Your payment QR code"
                      style={{ width: 180, height: 180, objectFit: 'contain', borderRadius: 14, border: '2px solid var(--line)', background: '#f8fafc', display: 'block' }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveQr}
                      style={{
                        position: 'absolute', top: -8, right: -8,
                        width: 28, height: 28, borderRadius: '50%',
                        background: '#ef8d77', border: '2px solid #fff',
                        display: 'grid', placeItems: 'center', cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                      }}
                      title="Remove QR code"
                    >
                      <Trash2 size={13} color="#fff" />
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Click the × to remove and upload a new one.</p>
                </div>
              )}

              {/* Upload control */}
              <div className="form-group" style={{ maxWidth: 420, marginBottom: 12 }}>
                <label htmlFor="qrImageInput">
                  <Upload size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Upload Payment QR Code
                </label>
                <input
                  id="qrImageInput"
                  type="file"
                  accept="image/*"
                  onChange={handleQrChange}
                  style={{ cursor: 'pointer' }}
                />
                <small>Image files only (PNG, JPG, WEBP). Max 2 MB. Associates with your doctor account.</small>
              </div>

              {/* Preview of newly selected file */}
              {qrPreview && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11.5, fontWeight: 700, color: '#687583', marginBottom: 8 }}>Preview (not saved yet):</p>
                  <img
                    src={qrPreview}
                    alt="QR preview"
                    style={{ width: 180, height: 180, objectFit: 'contain', borderRadius: 14, border: '2px dashed var(--teal)', background: '#f7fcfb', display: 'block' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveQr}
                  disabled={qrUploading || !qrFile}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <QrCode size={14} />
                  {qrUploading ? 'Saving...' : 'Save QR Code'}
                </button>
                {qrFile && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => { setQrFile(null); setQrPreview(null); }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
