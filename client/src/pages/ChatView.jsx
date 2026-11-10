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
        // As doctor, find first authorized patient
        const patData = await api.getAuthorizedPatients();
        if (patData.patients?.length > 0) {
          setPartner(patData.patients[0]);
          targetPartnerId = patData.patients[0].id;
        }
      } else {
        // As patient, find subscribed doctor
        const subData = await api.getMySubscription();
        if (subData.subscription) {
          setPartner({
            id: subData.subscription.doctor_id,
            name: subData.subscription.doctor_name,
            specialization: subData.subscription.doctor_specialization || 'Consulting Physician'
          });
          targetPartnerId = subData.subscription.doctor_id;
        } else {
          // fallback to first doctor in list
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            Care Conversations
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Authenticated consultation messaging between patients and assigned clinical providers.
          </p>
        </div>

        <span className={`badge ${isLocked ? 'badge-locked' : 'badge-success'}`} style={{ padding: '8px 16px', fontSize: 13 }}>
          {isLocked ? 'Chat Locked' : 'Access Active'}
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 520, display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="avatar coral" style={{ width: 44, height: 44, fontSize: 16 }}>
            {partner?.name ? partner.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'DR'}
          </div>
          <div>
            <b style={{ fontSize: 15, display: 'block' }}>{partner?.name || 'Care Team'}</b>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {partner?.specialization || (isDoctor ? 'Authorized Patient' : 'Consulting Doctor')} · {access.reason || 'Consultation channel'}
            </div>
          </div>
        </div>

        {/* Messages Body */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, background: '#fafbfc' }}>
          {messages.map((m) => {
            const isMine = m.sender_id === user?.id;
            return (
              <div
                key={m.id}
                style={{
                  maxWidth: '75%',
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  background: isMine ? '#e4f5f2' : '#ffffff',
                  color: 'var(--ink)',
                  border: isMine ? '1px solid #c2ece5' : '1px solid var(--line)',
                  borderRadius: 14,
                  padding: '12px 16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>{m.content}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', textAlign: 'right', marginTop: 4 }}>
                  {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Locked State vs Active Compose */}
        {isLocked ? (
          <div style={{ padding: 20, background: '#fff', borderTop: '1px solid var(--line)' }}>
            <div className="notice notice-warning" style={{ margin: '0 0 14px' }}>
              <Lock size={18} style={{ flexShrink: 0 }} />
              <div>
                <b>Consultation Chat Locked:</b> Normal consultation chat is reserved for active 2-month subscriptions.
                You may submit a follow-up inquiry below for doctor review.
              </div>
            </div>

            <form onSubmit={handleFollowupSubmit} style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="Ask your follow-up clinical question..."
                value={followupText}
                onChange={(e) => setFollowupText(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  fontSize: 13
                }}
                required
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={submittingFollowup}
              >
                Request Follow-up
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} style={{ padding: 18, background: '#fff', borderTop: '1px solid var(--line)', display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Type your message here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 10,
                border: '1px solid #dfe5eb',
                fontSize: 13.5
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={sending || !inputText.trim()}
              style={{ padding: '0 22px' }}
            >
              <Send size={16} /> Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
