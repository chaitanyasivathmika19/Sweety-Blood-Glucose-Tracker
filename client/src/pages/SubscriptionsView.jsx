import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { CreditCard, CheckCircle2, Clock, AlertTriangle, QrCode, ShieldCheck } from 'lucide-react';

export default function SubscriptionsView() {
  const { showToast } = useAuth();
  const [plans, setPlans] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [txnRef, setTxnRef] = useState('');
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

      setPlans(plansData.plans || []);
      setDoctors(docsData.doctors || []);
      setCurrentSub(subData.subscription || null);

      const savedDocId = localStorage.getItem('sweety_selected_doctor_id');
      if (savedDocId && docsData.doctors?.some(d => d.id === parseInt(savedDocId, 10))) {
        setSelectedDoctorId(parseInt(savedDocId, 10));
      } else if (docsData.doctors?.length > 0) {
        setSelectedDoctorId(docsData.doctors[0].id);
      }

      if (plansData.plans?.length > 0) {
        setSelectedPlanId(plansData.plans[0].id);
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
    if (!selectedDoctorId || !selectedPlanId) {
      showToast('Please select a doctor and consultation plan.');
      return;
    }
    if (!txnRef.trim() || txnRef.trim().length < 5) {
      showToast('Please enter a valid transaction reference ID.');
      return;
    }

    try {
      setSubmitting(true);
      await api.submitPayment({
        doctor_id: selectedDoctorId,
        plan_id: selectedPlanId,
        transaction_ref: txnRef.trim(),
        screenshot_url: 'receipt_demo.png'
      });

      showToast('Payment submitted successfully! Awaiting doctor review.');
      setTxnRef('');
      loadData();
    } catch (err) {
      showToast(err.message || 'Payment submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const selectedDoc = doctors.find(d => d.id === selectedDoctorId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            Consultation Plans & Subscriptions
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Each fee covers the full two-calendar-month subscription, not each individual consultation.
          </p>
        </div>

        {currentSub && (
          <span className={`badge ${currentSub.status === 'active' ? 'badge-success' : 'badge-pending'}`} style={{ padding: '8px 16px', fontSize: 13 }}>
            Status: {currentSub.status.toUpperCase()}
          </span>
        )}
      </div>

      {/* Current Subscription Status Banner if active */}
      {currentSub && currentSub.status === 'active' && (
        <div className="card" style={{ background: '#f5fcfb', border: '1.5px solid var(--teal)', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--teal)', fontWeight: 800, fontSize: 15 }}>
                <ShieldCheck size={20} /> Active Subscription
              </div>
              <h3 style={{ margin: '6px 0 2px', fontSize: 18 }}>
                {currentSub.plan_name} with {currentSub.doctor_name}
              </h3>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.5 }}>
                Interval: A consultation every {currentSub.frequency_days} days · Two calendar months validity
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Expires On</div>
              <b style={{ fontSize: 16 }}>{new Date(currentSub.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</b>
            </div>
          </div>
        </div>
      )}

      {/* Plan Selection Cards */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head">
          <div>
            <h3>1. Choose a Consultation Plan</h3>
            <p>Consultation frequency determines review schedules during your 2-month subscription</p>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {plans.map(p => {
            const isSelected = p.id === selectedPlanId;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlanId(p.id)}
                style={{
                  border: isSelected ? '2px solid var(--teal)' : '1px solid var(--line)',
                  borderRadius: 16,
                  padding: 20,
                  background: isSelected ? '#f7fcfb' : '#fff',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
              >
                <h4 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>{p.name}</h4>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', letterSpacing: -0.8 }}>
                  ₹{p.price}
                </div>
                <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700, margin: '6px 0 10px' }}>
                  Every {p.frequency_days} days
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                  <b>Two calendar months validity.</b> {p.description || 'Full medical guidance and chat access.'}
                </p>
                <button
                  type="button"
                  className={isSelected ? 'btn-primary' : 'btn-secondary'}
                  style={{ width: '100%', marginTop: 16 }}
                >
                  {isSelected ? 'Selected Plan' : 'Select Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Doctor & Payment Proof Section */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 1fr)', gap: 20 }}>
        {/* Doctor & Payment Details */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>2. Select Doctor & Payment Method</h3>
              <p>Consultation plan recipient</p>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 18 }}>
            <label>Select Consulting Doctor</label>
            <select
              value={selectedDoctorId || ''}
              onChange={(e) => setSelectedDoctorId(parseInt(e.target.value, 10))}
            >
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialization}) — {d.experience_years} yrs exp
                </option>
              ))}
            </select>
          </div>

          <div style={{ border: '1px dashed var(--line)', borderRadius: 14, padding: 20, textAlign: 'center', background: '#fafbfc' }}>
            <QrCode size={64} color="var(--teal)" style={{ margin: '0 auto 10px' }} />
            <b style={{ fontSize: 14, display: 'block' }}>Doctor's Payment UPI / QR Code</b>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Scan with GPay, PhonePe, or Paytm to pay <b>₹{selectedPlan?.price || 250}</b> to {selectedDoc?.name || 'Doctor'}
            </div>
          </div>

          <div className="notice notice-info" style={{ marginTop: 18 }}>
            <b>Integrity Rule:</b> A screenshot or transaction ID alone does not activate the subscription. Subscriptions activate immediately upon authorized review.
          </div>
        </div>

        {/* Submit Payment Proof Form */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>3. Submit Payment Evidence</h3>
              <p>Verify your subscription</p>
            </div>
          </div>

          <form onSubmit={handleSubmitPayment}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Selected Plan</label>
              <input
                type="text"
                readOnly
                value={`₹${selectedPlan?.price || 250} · Every ${selectedPlan?.frequency_days || 30} days · 2-month validity`}
                style={{ background: '#f8fafc' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label htmlFor="txnInput">Transaction / UTR Reference ID *</label>
              <input
                id="txnInput"
                type="text"
                placeholder="e.g. TXN-948271038"
                value={txnRef}
                onChange={(e) => setTxnRef(e.target.value)}
                required
              />
              <small>Unique reference code from your payment confirmation.</small>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Payment Receipt / Screenshot</label>
              <input type="file" accept="image/*" />
              <small>Upload receipt screenshot for demonstration records.</small>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%' }}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Payment for Verification'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
