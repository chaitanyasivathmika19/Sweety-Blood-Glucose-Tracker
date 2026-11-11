import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, getMediaUrl } from '../api';
import { CreditCard, CheckCircle2, QrCode, ShieldCheck, AlertCircle } from 'lucide-react';

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
  const [doctorQrUrl, setDoctorQrUrl] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrImageError, setQrImageError] = useState(false);

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
      const fetchedDoctors = docsData.doctors || [];
      setDoctors(fetchedDoctors);
      setCurrentSub(subData.subscription || null);

      const savedDocId = localStorage.getItem('sweety_selected_doctor_id');
      let initialDoctorId = null;
      if (savedDocId && fetchedDoctors.some(d => d.id === parseInt(savedDocId, 10))) {
        initialDoctorId = parseInt(savedDocId, 10);
      } else if (fetchedDoctors.length > 0) {
        initialDoctorId = fetchedDoctors[0].id;
      }
      setSelectedDoctorId(initialDoctorId);

      // Load QR for initial doctor
      if (initialDoctorId) {
        const doc = fetchedDoctors.find(d => d.id === initialDoctorId);
        setDoctorQrUrl(doc?.payment_qr_url || null);
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

  // When selected doctor changes, update the QR from the already-fetched doctor list
  useEffect(() => {
    setQrImageError(false);
    if (!selectedDoctorId || doctors.length === 0) {
      setDoctorQrUrl(null);
      return;
    }
    setQrLoading(true);
    const doc = doctors.find(d => d.id === selectedDoctorId);
    setDoctorQrUrl(doc?.payment_qr_url || null);
    setQrLoading(false);
  }, [selectedDoctorId, doctors]);

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    const activePlan = plans[selectedPlanIndex];
    if (!selectedDoctorId || !activePlan) {
      showToast('Please select a doctor and consultation plan.');
      return;
    }
    if (!txnRef.trim() || txnRef.trim().length < 5) {
      showToast('Please enter a valid reference ID (minimum 5 characters).');
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

      {/* ── Doctor selection ── */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <h3>Select a Consulting Doctor</h3>
            <p>Choose the doctor you wish to consult with for your subscription.</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading doctors…</div>
        ) : doctors.length === 0 ? (
          <div className="notice notice-info">No doctors are currently available. Please check back later.</div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {doctors.map((doc, idx) => {
              const colorOptions = ['teal', 'purple', 'coral'];
              const colorClass = colorOptions[idx % 3];
              const initials = doc.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').substring(0, 2);
              const isSelected = doc.id === selectedDoctorId;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoctorId(doc.id)}
                  style={{
                    border: isSelected ? '2px solid var(--teal)' : '1px solid var(--line)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    background: isSelected ? '#f7fcfb' : '#fff',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <div className={`avatar ${colorClass}`} style={{ width: 46, height: 46, fontSize: 15, borderRadius: 13, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13.5 }}>{doc.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <CheckCircle2 size={12} /> {doc.specialization}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{doc.experience_years} yrs exp</div>
                  </div>
                  {isSelected && (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--teal)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={12} color="#fff" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Plan grid ── */}
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
                style={{ cursor: 'pointer' }}
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

        {/* Payment instructions & form */}
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)', gap: 24 }}>
          {/* Left: QR + instructions */}
          <div>
            <h3 style={{ fontSize: 14.5, margin: '0 0 8px' }}>Payment instructions</h3>
            {selectedDoc && (
              <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                Paying: {selectedDoc.name}
              </p>
            )}
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
              Scan the doctor's QR code to pay via UPI. Then enter your transaction reference and optionally upload a screenshot.
            </p>

            {/* Doctor's actual QR code */}
            <div style={{
              width: 170, height: 170, margin: '0 auto 12px',
              border: '1px solid var(--line)', borderRadius: 14,
              display: 'grid', placeItems: 'center',
              background: '#f8fafc', overflow: 'hidden'
            }}>
              {qrLoading ? (
                <div style={{ color: 'var(--muted)', fontSize: 11.5 }}>Loading…</div>
              ) : doctorQrUrl && !qrImageError ? (
                <img
                  src={getMediaUrl(doctorQrUrl)}
                  alt=""
                  onError={() => setQrImageError(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <AlertCircle size={36} color="#b0bbc6" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <b style={{ fontSize: 11.5, color: '#687583', display: 'block' }}>
                    {selectedDoc ? `${selectedDoc.name} has not uploaded a payment QR yet.` : 'Select a doctor to see their QR code.'}
                  </b>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>Contact the doctor for payment details.</div>
                </div>
              )}
            </div>

            {doctorQrUrl && (
              <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                Scan via any UPI app · Belongs to {selectedDoc?.name}
              </p>
            )}
          </div>

          {/* Right: Submit form */}
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
                <label>Consulting doctor</label>
                <input
                  type="text"
                  readOnly
                  value={selectedDoc ? `${selectedDoc.name} · ${selectedDoc.specialization}` : 'Select a doctor above'}
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

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%' }}
                disabled={submitting || !selectedDoctorId}
              >
                {submitting ? 'Submitting…' : 'Submit payment proof'}
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
            {currentSub?.status === 'active' ? 'Active Consultation' : 'Pending Verification'}
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
