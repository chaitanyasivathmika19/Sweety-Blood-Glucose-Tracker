import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Users, Search, Activity, X, FileText } from 'lucide-react';

export default function DoctorPatients() {
  const { showToast } = useAuth();
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientReadings, setPatientReadings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPatients() {
      try {
        setLoading(true);
        const data = await api.getAuthorizedPatients();
        setPatients(data.patients || []);
      } catch (err) {
        showToast('Failed to load authorized patient list.');
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, []);

  const handleInspectPatient = async (p) => {
    setSelectedPatient(p);
    try {
      const data = await api.getPatientReadings(p.id);
      setPatientReadings(data.readings || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch patient records.');
    }
  };

  const filtered = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            Authorized Patient Records
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Review authentic glucose histories only for patients who have granted valid consultation access.
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search authorized patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: '10px 14px 10px 34px',
              background: '#fff',
              fontSize: 13,
              width: 260
            }}
          />
          <Search size={15} color="#8c96a2" style={{ position: 'absolute', left: 12, top: 13 }} />
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>City / Contact</th>
                <th>Today's Progress</th>
                <th>Latest Value</th>
                <th>Access Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.name}</b>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.email}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5 }}>{p.city || 'Guntur'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.phone || '+91 9876543210'}</div>
                    </td>
                    <td>
                      <span className="badge badge-success">{p.today_progress} recorded</span>
                    </td>
                    <td>
                      {p.latest_reading ? (
                        <b style={{ color: 'var(--teal)' }}>
                          {p.latest_reading.glucose_value} mg/dL
                        </b>
                      ) : '—'}
                    </td>
                    <td>
                      <span className="badge badge-success">Active Subscription</span>
                    </td>
                    <td>
                      <button
                        className="btn-primary"
                        onClick={() => handleInspectPatient(p)}
                        style={{ padding: '6px 14px', fontSize: 12 }}
                      >
                        Inspect Log
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                    No authorized patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="modal-overlay" onClick={() => setSelectedPatient(null)}>
          <div className="modal-card" style={{ width: 'min(720px, 100%)' }} onClick={e => e.stopPropagation()}>
            <div className="card-head">
              <div>
                <h3>Clinical Glucose Log: {selectedPatient.name}</h3>
                <p>Read-only access to patient's recorded measurements</p>
              </div>
              <button className="icon-btn" onClick={() => setSelectedPatient(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="table-wrap" style={{ maxHeight: 380, overflowY: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time Slot</th>
                    <th>Value (mg/dL)</th>
                    <th>Recorded Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {patientReadings.length > 0 ? (
                    patientReadings.map(r => (
                      <tr key={r.id}>
                        <td><b>{r.reading_date.split('T')[0]}</b></td>
                        <td>{r.time_slot}</td>
                        <td><b style={{ color: 'var(--teal)' }}>{r.glucose_value} mg/dL</b></td>
                        <td style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(r.created_at).toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                        No readings recorded by this patient yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn-secondary" onClick={() => setSelectedPatient(null)}>
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
