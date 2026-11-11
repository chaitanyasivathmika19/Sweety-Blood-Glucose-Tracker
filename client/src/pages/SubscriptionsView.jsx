import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { CreditCard, CheckCircle2, Clock, AlertTriangle, QrCode, ShieldCheck } from 'lucide-react';

export default function SubscriptionsView() {
  const { showToast } = useAuth();
  const [plans, setPlans] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [txnRef, setTxnRef] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [currentSub, setCurrentSub] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, docsData, subData] = await Promise.all([
        api.getPlans(),
        api.getDoctors(),
        api.getMySubscription()
      ]);

      const fetchedPlans = plansData.plans || [];
      setPlans(fetchedPlans);
      setDoctors(docsData.doctors || []);
      setCurrentSub(subData.subscription || null);

      const savedDocId = localStorage.getItem('sweety_selected_doctor_id');
      if (savedDocId && docsData.doctors?.some(d => d.id === parseInt(savedDocId, 10))) {
        setSelectedDoctorId(parseInt(savedDocId, 10));
      } else if (docsData.doctors?.length > 0) {
        setSelectedDoctorId(docsData.doctors[0].id);
      }
    } catch (err) {
      showToast('Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    const activePlan = plans[selectedPlanIndex];
    if (!selectedDoctorId || !activePlan) {
      showToast('Please select a doctor and consultation plan.');
      return;
    }
    if (!txnRef.trim() || txnRef.trim().length < 5) {
      showToast('Please enter a valid reference ID.');
      return;
    }

    try {
      setSubmitting(true);
      await api.submitPayment({
        doctor_id: selectedDoctorId,
        plan_id: activePlan.id,
        transaction_ref: txnRef.trim(),
        screenshot_url: 'receipt_demo.png'
      });

      showToast('Payment proof submitted. Subscription remains pending verification.');
      setTxnRef('');
      setPreviewUrl(null);
      loadData();
    } catch (err) {
      showToast(err.message || 'Payment submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPlan = plans[selectedPlanIndex];
  const selectedDoc = doctors.find(d => d.id === selectedDoctorId);

  const planTitles = ['Essential Care', 'Regular Care', 'Frequent Care'];

  return (
    <div className="animate-fade-in">
      <div className="welcome-banner">
        <div>
          <h2>Consultation Plan</h2>
          <p>Each fee covers the full two-calendar-month subscription, not each individual consultation.</p>
        </div>

        <span className={`badge ${currentSub?.status === 'active' ? 'badge-success' : 'badge-pending'}`} style={{ padding: '8px 16px', fontSize: 12 }}>
          {currentSub?.status ? currentSub.status.toUpperCase() : 'NO ACTIVE PLAN'}
        </span>
      </div>

      {/* Plan Grid matching prototype */}
      <section className="card" style={{ marginBottom: 22 }}>
        <div className="card-head">
          <div>
            <h3>Choose a plan</h3>
            <p>Consultation interval determines the schedule during your subscription</p>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
          {plans.map((p, idx) => {
            const isSelected = idx === selectedPlanIndex;
            return (
              <div
                key={p.id}
                className={`plan-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedPlanIndex(idx)}
                style={{
                  border: isSelected ? '2px solid var(--teal)' : '1px solid var(--line)',
                  background: isSelected ? '#f7fcfb' : '#fff',
                  cursor: 'pointer'
                }}
              >
                <h3 style={{ fontSize: 13.5, margin: '0 0 10px', fontWeight: 800 }}>
                  {planTitles[idx] || p.name}
                </h3>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8, color: 'var(--ink)' }}>
                  ₹{p.price}
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, margin: '8px 0 14px' }}>
                  <b>Every {p.frequency_days} days</b><br />
                  Two-calendar-month validity<br />
                  A consultation every {p.frequency_days} days
                </p>
                <button
                  type="button"
                  className={isSelected ? 'btn-primary' : 'btn-secondary'}
                  style={{ width: '100%', marginTop: 'auto' }}
                >
                  {isSelected ? 'Selected' : 'Choose plan'}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ height: 1, background: 'var(--line)', margin: '22px 0' }} />

        {/* Payment Instructions & Submit Form 2-Column Grid */}
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: 14.5, margin: '0 0 8px' }}>Payment instructions</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
              Pay the selected fee using the doctor's payment method. Then submit the transaction reference and screenshot for review. A screenshot alone does not confirm payment.
            </p>

            <div style={{
              width: 170,
              height: 170,
              margin: '12px auto',
              border: '1px dashed #bdc8d2',
              borderRadius: 14,
              display: 'grid',
              placeItems: 'center',
              background: 'repeating-conic-gradient(#fff 0% 25%, #f4f6f8 0% 50%) 50% / 18px 18px',
              color: '#687583',
              fontSize: 11.5,
              textAlign: 'center',
              padding: 16
            }}>
              <div>
                <QrCode size={52} color="var(--teal)" style={{ margin: '0 auto 8px' }} />
                <b>DEMO PAYMENT QR</b>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>Scan via UPI</div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 14 }}>
              <label>Select Consulting Doctor</label>
              <select
                value={selectedDoctorId || ''}
                onChange={(e) => setSelectedDoctorId(parseInt(e.target.value, 10))}
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialization}) — {d.experience_years} yrs
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 14.5, margin: '0 0 8px' }}>Submit payment proof</h3>
            <form onSubmit={handleSubmitPayment}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Selected plan</label>
                <input
                  type="text"
                  readOnly
                  value={selectedPlan ? `₹${selectedPlan.price} · Every ${selectedPlan.frequency_days} days` : 'Choose a plan above'}
                  style={{ background: '#f8fafc' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label htmlFor="txnInput">Transaction / reference ID *</label>
                <input
                  id="txnInput"
                  type="text"
                  placeholder="Enter payment reference (e.g. TXN-58XQ21)"
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label htmlFor="paymentImage">Upload image</label>
                <input
                  id="paymentImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPreviewUrl(URL.createObjectURL(file));
                    } else {
                      setPreviewUrl(null);
                    }
                  }}
                />
                <small style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginTop: 4 }}>
                  Allowed formats: PNG, JPG, JPEG, WEBP. Restricted to image files only.
                </small>
                {previewUrl && (
                  <div style={{ marginTop: 10 }}>
                    <img
                      src={previewUrl}
                      alt="Payment proof preview"
                      style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 10, border: '1.5px solid var(--border)', objectFit: 'contain' }}
                    />
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Preview (not uploaded to any server)</p>
                  </div>
                )}
              </div>

              <div className="notice notice-warning" style={{ fontSize: 11.5, margin: '0 0 16px', lineHeight: 1.5 }}>
                🔒 <b>Prototype Demo Mode:</b> Status remains pending until reviewed. Payments, transactions, and image uploads are simulated locally for demonstration and are not processed by a real financial gateway or uploaded to an external server.
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%' }}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit payment proof'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Subscription Status Card */}
      <section className="card">
        <div className="card-head">
          <div>
            <h3>Subscription status</h3>
            <p>Current consultation access</p>
          </div>
          <span className={`badge ${currentSub?.status === 'active' ? 'badge-success' : 'badge-pending'}`}>
            {currentSub?.status === 'active' ? 'Active Consultation' : 'Pending Verification Demo'}
          </span>
        </div>

        <div className="progress-row">
          <span>Plan validity</span>
          <b>Two calendar months after activation</b>
        </div>

        <div className="notice notice-info" style={{ margin: '14px 0 0', fontSize: 11.5 }}>
          Subscription activation and expiry are server-controlled. Chat locks when an active subscription or approved follow-up period expires.
        </div>
      </section>
    </div>
  );
}
