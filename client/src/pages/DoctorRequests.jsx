import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { CreditCard, Check, X, ShieldAlert, AlertCircle } from 'lucide-react';

export default function DoctorRequests() {
  const { showToast } = useAuth();
  const [payments, setPayments] = useState([]);
  const [rejectionModal, setRejectionModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await api.getPendingPayments();
      setPayments(data.payments || []);
    } catch (err) {
      showToast('Failed to load pending payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleApprove = async (paymentId) => {
    try {
      await api.verifyPayment({
        payment_id: paymentId,
        action: 'approve'
      });
      showToast('Payment approved! Subscription activated for 2 calendar months.');
      fetchPayments();
    } catch (err) {
      showToast(err.message || 'Failed to approve payment.');
    }
  };

  const handleOpenReject = (payment) => {
    setRejectionModal(payment);
    setRejectReason('');
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      showToast('Please provide a rejection reason.');
      return;
    }
    try {
      await api.verifyPayment({
        payment_id: rejectionModal.id,
        action: 'reject',
        rejection_reason: rejectReason.trim()
      });
      showToast('Payment rejected and patient notified.');
      setRejectionModal(null);
      fetchPayments();
    } catch (err) {
      showToast(err.message || 'Failed to reject payment.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            Payment Verification & Consultation Requests
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Review external transaction references and evidence before authorizing 2-month subscription activation.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Pending Payment Submissions</h3>
            <p>Verification queue for consultation plan enrollments</p>
          </div>
          <span className="badge badge-pending">
            {payments.filter(p => p.status === 'pending').length} Pending Review
          </span>
        </div>

        <div className="table-wrap">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Selected Plan</th>
                <th>Transaction Ref ID</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Verification Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.length > 0 ? (
                payments.map(p => {
                  const isPending = p.status === 'pending';
                  return (
                    <tr key={p.id}>
                      <td>
                        <b>{p.patient_name}</b>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.patient_email}</div>
                      </td>
                      <td>
                        <b>{p.plan_name}</b>
                        <div style={{ fontSize: 11.5, color: 'var(--teal)' }}>
                          ₹{p.price} · Every {p.frequency_days}d
                        </div>
                      </td>
                      <td>
                        <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>
                          {p.transaction_ref}
                        </code>
                      </td>
                      <td style={{ fontSize: 11.5 }}>
                        {new Date(p.created_at).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'approved' ? 'badge-success' : p.status === 'rejected' ? 'badge-missed' : 'badge-pending'}`}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {isPending ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn-primary"
                              onClick={() => handleApprove(p.id)}
                              style={{ padding: '6px 12px', fontSize: 12 }}
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              className="btn-secondary"
                              onClick={() => handleOpenReject(p)}
                              style={{ padding: '6px 12px', fontSize: 12, color: '#b65e4c' }}
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                    No payment submissions in queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectionModal && (
        <div className="modal-overlay" onClick={() => setRejectionModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="card-head">
              <div>
                <h3>Reject Payment Submission</h3>
                <p>Provide explanation for reference {rejectionModal.transaction_ref}</p>
              </div>
              <button className="icon-btn" onClick={() => setRejectionModal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Rejection Reason *</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Transaction reference not found in bank statement, or incorrect fee transferred."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setRejectionModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#b65e4c' }}>
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
