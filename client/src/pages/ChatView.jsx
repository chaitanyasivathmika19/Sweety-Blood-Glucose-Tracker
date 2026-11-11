import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Send, Lock, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ChatView() {
  const { user, showToast } = useAuth();
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [access, setAccess] = useState({ unlocked: true });
  const [inputText, setInputText] = useState('');
  const [followupText, setFollowupText] = useState('');
  const [sending, setSending] = useState(false);
  const [submittingFollowup, setSubmittingFollowup] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);

  const isDoctor = user?.role === 'doctor';

  const loadPartnerAndChat = async () => {
    try {
      setLoading(true);
      let targetPartnerId = null;

      if (isDoctor) {
        const patData = await api.getAuthorizedPatients();
        if (patData.patients?.length > 0) {
          setPartner(patData.patients[0]);
          targetPartnerId = patData.patients[0].id;
        }
      } else {
        const subData = await api.getMySubscription();
        if (subData.subscription) {
          setPartner({
            id: subData.subscription.doctor_id,
            name: subData.subscription.doctor_name,
            specialization: subData.subscription.doctor_specialization || 'Endocrinologist'
          });
          targetPartnerId = subData.subscription.doctor_id;
        } else {
          const docsData = await api.getDoctors();
          if (docsData.doctors?.length > 0) {
            setPartner(docsData.doctors[0]);
            targetPartnerId = docsData.doctors[0].id;
          }
        }
      }

      if (targetPartnerId) {
        const chatData = await api.getMessages(targetPartnerId);
        setMessages(chatData.messages || []);
        setAccess(chatData.access || { unlocked: false });
      }
    } catch (err) {
      showToast('Failed to load consultation messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartnerAndChat();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !partner) return;

    try {
      setSending(true);
      const res = await api.sendMessage({
        receiver_id: partner.id,
        content: inputText.trim()
      });
      setMessages(prev => [...prev, res.chat_message]);
      setInputText('');
    } catch (err) {
      showToast(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleFollowupSubmit = async (e) => {
    e.preventDefault();
    if (!followupText.trim() || !partner) return;

    try {
      setSubmittingFollowup(true);
      await api.submitFollowup({
        doctor_id: partner.id,
        question: followupText.trim()
      });
      showToast('Follow-up request submitted for doctor review.');
      setFollowupText('');
    } catch (err) {
      showToast(err.message || 'Failed to submit follow-up.');
    } finally {
      setSubmittingFollowup(false);
    }
  };

  const isLocked = !access.unlocked;

  return (
    <div className="animate-fade-in">
      <div className="welcome-banner">
        <div>
          <h2>Care conversations</h2>
          <p>Secure communication with your authorized care team.</p>
        </div>

        <span className={`badge ${isLocked ? 'badge-locked' : 'badge-success'}`} style={{ padding: '8px 16px', fontSize: 12 }}>
          {isLocked ? 'Chat locked' : 'Access active (demo)'}
        </span>
      </div>

      <section className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 480, display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)' }}>
        {/* Left: Conversations list */}
        <div style={{ borderRight: '1px solid var(--line)', padding: 18, background: '#fafbfc' }}>
          <div className="card-head" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 14 }}>Conversations</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'var(--teal2)',
                cursor: 'pointer'
              }}
            >
              <div className="avatar coral" style={{ width: 36, height: 36, fontSize: 13 }}>
                {isDoctor ? 'CS' : 'AR'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <b style={{ fontSize: 12.5, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {partner?.name || (isDoctor ? 'Chaitanya Sivathmika' : 'Dr. Ananya Rao')}
                </b>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {isDoctor ? 'Patient account' : 'Endocrinologist'}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                cursor: 'pointer',
                opacity: 0.75
              }}
            >
              <div className="avatar teal" style={{ width: 36, height: 36, fontSize: 13 }}>
                ST
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <b style={{ fontSize: 12.5, display: 'block' }}>Sweety Team</b>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>System messages</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Chat window */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 460 }}>
          {/* Header */}
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="avatar coral" style={{ width: 38, height: 38, fontSize: 14 }}>
              {isDoctor ? 'CS' : 'AR'}
            </div>
            <div>
              <b style={{ fontSize: 13.5, display: 'block' }}>
                {partner?.name || 'Care Consultation'}
              </b>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {partner?.specialization || 'Clinical Conversation'} · Demo
              </div>
            </div>
            <span className={`badge ${isLocked ? 'badge-locked' : 'badge-success'}`} style={{ marginLeft: 'auto' }}>
              {isLocked ? 'Locked' : 'Authorized'}
            </span>
          </div>

          {/* Messages Feed */}
          <div style={{ flex: 1, padding: 22, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: '#fdfefe' }}>
            {messages.map((m) => {
              const isMine = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  style={{
                    maxWidth: '75%',
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    background: isMine ? '#e1f4f0' : '#f0f3f7',
                    color: 'var(--ink)',
                    borderRadius: 14,
                    padding: '11px 15px',
                    fontSize: 12.5,
                    lineHeight: 1.6
                  }}
                >
                  <div>{m.content}</div>
                  <div style={{ fontSize: 9.5, color: '#7b8793', textAlign: 'right', marginTop: 4 }}>
                    {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Compose / Locked Box */}
          {isLocked ? (
            <div style={{ padding: 18, borderTop: '1px solid var(--line)', background: '#fff' }}>
              <div className="notice notice-warning" style={{ margin: '0 0 12px', fontSize: 11.5 }}>
                Your consultation access is locked. You can request a follow-up; the doctor must approve a defined access period.
              </div>
              <form onSubmit={handleFollowupSubmit}>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label>Follow-up question</label>
                  <textarea
                    rows="2"
                    placeholder="Describe what you need help with..."
                    value={followupText}
                    onChange={(e) => setFollowupText(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn-primary" disabled={submittingFollowup}>
                    Request follow-up
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 10, padding: 16, borderTop: '1px solid var(--line)', background: '#fff' }}>
              <input
                type="text"
                placeholder="Write a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{
                  flex: 1,
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: '11px 14px',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
              <button type="submit" className="btn-primary" disabled={sending || !inputText.trim()} style={{ padding: '0 18px' }}>
                Send ↗
              </button>
            </form>
          )}
        </div>
      </section>

      <div className="notice notice-info" style={{ marginTop: 18 }}>
        Messages and access controls are server-enforced in PostgreSQL. Normal chat locks automatically when a 2-month subscription expires.
      </div>
    </div>
  );
}
