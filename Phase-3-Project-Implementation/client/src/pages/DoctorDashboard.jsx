import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Users, Clock, CreditCard, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';

export default function DoctorDashboard() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDoctorData() {
      try {
        setLoading(true);
        const [patData, payData] = await Promise.all([
          api.getAuthorizedPatients().catch(() => ({ patients: [] })),
          api.getPendingPayments().catch(() => ({ payments: [] }))
        ]);
        setPatients(patData.patients || []);
        setPendingPayments(payData.payments?.filter(p => p.status === 'pending') || []);
      } catch (err) {
        showToast('Failed to load doctor dashboard.');
      } finally {
        setLoading(false);
      }
    }
    loadDoctorData();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            Good day, {user?.name || 'Doctor'} ✦
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Clinical consultation overview and authorized patient care activity.
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 16px', fontSize: 12.5, color: '#596878', fontWeight: 600 }}>
          Today · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-stats">
        <div className="card">
          <div className="stat-top">
            <span>Authorized patients</span>
            <span className="stat-icon"><Users size={18} /></span>
          </div>
          <div className="stat-number">{patients.length}</div>
          <div className="stat-note green">Active 2-month care plans</div>
        </div>

        <div className="card">
          <div className="stat-top">
            <span>Payments to review</span>
            <span className="stat-icon coral"><CreditCard size={18} /></span>
          </div>
          <div className="stat-number">{pendingPayments.length}</div>
          <div className="stat-note">Pending transaction verifications</div>
        </div>

        <div className="card">
          <div className="stat-top">
            <span>Consultation reviews</span>
            <span className="stat-icon purple"><Clock size={18} /></span>
          </div>
          <div className="stat-number">{patients.length}</div>
          <div className="stat-note">Scheduled interval reviews</div>
        </div>

        <div className="card">
          <div className="stat-top">
            <span>Specialization status</span>
            <span className="stat-icon gold"><ShieldCheck size={18} /></span>
          </div>
          <div className="stat-number" style={{ fontSize: 20 }}>Verified</div>
          <div className="stat-note">Demonstration credentials verified</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)', gap: 20 }}>
        {/* Authorized Patients Overview */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Recent Authorized Patients</h3>
              <p>Patients with active subscriptions</p>
            </div>
            <button className="btn-text" onClick={() => navigate('/doctor/patients')}>
              View all patients →
            </button>
          </div>

          <div className="table-wrap">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Today's Progress</th>
                  <th>Latest Reading</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.length > 0 ? (
                  patients.slice(0, 4).map(p => (
                    <tr key={p.id}>
                      <td>
                        <b>{p.name}</b>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.email}</div>
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
                        <button
                          className="btn-secondary"
                          onClick={() => navigate('/doctor/patients')}
                          style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                          View Log
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                      No authorized patients yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Action Required</h3>
              <p>Pending administrative decisions</p>
            </div>
            <span className="badge badge-pending">
              {pendingPayments.length} pending
            </span>
          </div>

          <div className="slots-list">
            <div className="slot-item">
              <div className="slot-icon-box" style={{ background: 'var(--coral-light)', color: '#b65e4c' }}>
                <CreditCard size={20} />
              </div>
              <div className="slot-info">
                <b>Payment Verification</b>
                <span>{pendingPayments.length} submissions awaiting review</span>
              </div>
              <button
                className="btn-secondary"
                onClick={() => navigate('/doctor/requests')}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                Review
              </button>
            </div>

            <div className="slot-item">
              <div className="slot-icon-box" style={{ background: 'var(--purple-light)', color: 'var(--purple)' }}>
                <Clock size={20} />
              </div>
              <div className="slot-info">
                <b>Care Messages</b>
                <span>Consultation inquiries</span>
              </div>
              <button
                className="btn-secondary"
                onClick={() => navigate('/chat')}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                Open Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
