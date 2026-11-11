import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { CheckCircle2, Search, ArrowUpDown, Calendar } from 'lucide-react';

export default function DoctorsView() {
  const { showToast } = useAuth();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDoctors() {
      try {
        setLoading(true);
        const data = await api.getDoctors();
        setDoctors(data.doctors || []);
      } catch (err) {
        showToast('Failed to load doctor directory.');
      } finally {
        setLoading(false);
      }
    }
    loadDoctors();
  }, []);

  const filteredDoctors = doctors
    .filter(doc => {
      const term = searchTerm.toLowerCase();
      return (
        doc.name.toLowerCase().includes(term) ||
        doc.specialization.toLowerCase().includes(term) ||
        (doc.qualifications && doc.qualifications.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'experience') return b.experience_years - a.experience_years;
      return 0; // recommended
    });

  const handleBook = (doctor) => {
    localStorage.setItem('sweety_selected_doctor_id', doctor.id);
    navigate('/subscriptions');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            Find the Right Care for You
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Connect with verified endocrinologists and diabetologists for tailored 2-month consultation plans.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search doctor or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: '1px solid var(--line)',
                borderRadius: 10,
                padding: '10px 14px 10px 34px',
                background: '#fff',
                fontSize: 13,
                width: 240
              }}
            />
            <Search size={15} color="#8c96a2" style={{ position: 'absolute', left: 12, top: 13 }} />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: '10px 14px',
              background: '#fff',
              fontSize: 13,
              fontWeight: 600,
              color: '#495867'
            }}
          >
            <option value="recommended">Recommended</option>
            <option value="experience">Years of Experience</option>
          </select>
        </div>
      </div>

      {/* Doctor Grid */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {filteredDoctors.map((doc, idx) => {
          const colors = ['teal', 'purple', 'coral'];
          const colorClass = colors[idx % 3];
          const initials = doc.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').substring(0, 2);

          return (
            <div key={doc.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                <div className={`avatar ${colorClass}`} style={{ width: 54, height: 54, fontSize: 18, borderRadius: 16 }}>
                  {initials}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>{doc.name}</h3>
                  <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={13} /> {doc.specialization}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {doc.experience_years} years experience · {doc.qualifications}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 12.5, color: '#596878', lineHeight: 1.6, flex: 1, margin: '0 0 16px' }}>
                {doc.bio || 'Comprehensive diabetes care, blood glucose monitoring, insulin management, and lifestyle coaching.'}
              </p>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Starting from</div>
                  <b style={{ fontSize: 18, color: 'var(--ink)' }}>₹250</b>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}> / 2 months</span>
                </div>
                <button className="btn-primary" onClick={() => handleBook(doc)}>
                  Select & View Plans
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="notice notice-info" style={{ marginTop: 24 }}>
        <b>Notice:</b> Verified badge indicates credential review for demonstration. Plans provide continuous 2-calendar-month validity.
      </div>
    </div>
  );
}
