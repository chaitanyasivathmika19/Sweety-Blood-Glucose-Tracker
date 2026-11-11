import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Send, Lock, MessageSquare, AlertCircle, CheckCircle2, Mail } from 'lucide-react';

// Format a UTC ISO timestamp (from the DB) to the user's local time HH:MM
function formatMsgTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Sweety Team system conversation (no real partnerId – purely a UI conversation)
const SWEETY_TEAM_ID = 'sweety-team';

export default function ChatView() {
  const { user, showToast } = useAuth();
  const [activeConversation, setActiveConversation] = useState('partner'); // 'partner' | 'sweety-team'
  const [partner, setPartner] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [access, setAccess] = useState({ unlocked: true });
  const [inputText, setInputText] = useState('');
  const [followupText, setFollowupText] = useState('');
  const [sending, setSending] = useState(false);
  const [submittingFollowup, setSubmittingFollowup] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const selectedPartnerId = useRef(null);

  const isDoctor = user?.role === 'doctor';
  const isSweetyTeam = activeConversation === 'sweety-team';

  const loadPartnerAndChat = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.getConversations();
      const nextConversations = data.conversations || [];
      setConversations(nextConversations);
      const nextPartner = nextConversations.find((c) => c.id === selectedPartnerId.current) || nextConversations[0] || null;
      if (nextPartner) {
        selectedPartnerId.current = nextPartner.id;
        setPartner(nextPartner);
        const chatData = await api.getMessages(nextPartner.id);
        setMessages(chatData.messages || []);
        setAccess(chatData.access || { unlocked: false });
      } else {
        selectedPartnerId.current = null;
        setPartner(null);
        setMessages([]);
        setAccess({ unlocked: false });
      }
    } catch (err) {
      if (!silent) showToast('Failed to load consultation messages.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadPartnerAndChat();
    const interval = window.setInterval(() => loadPartnerAndChat(true), 3000);
    return () => window.clearInterval(interval);
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversation]);

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
  const partnerInitials = partner?.name
    ? partner.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : (isDoctor ? 'CS' : 'AR');

  return (
    <div className="animate-fade-in">
      <div className="welcome-banner">
        <div>
          <h2>Care conversations</h2>
          <p>Secure communication with your authorized care team.</p>
        </div>

        <span className={`badge ${isLocked && !isSweetyTeam ? 'badge-locked' : 'badge-success'}`} style={{ padding: '8px 16px', fontSize: 12 }}>
          {isSweetyTeam ? 'Read only' : (isLocked ? 'Chat locked' : 'Access active')}
        </span>
      </div>

      <section className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 480, display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)' }}>
        {/* Left: Conversations list */}
        <div style={{ borderRight: '1px solid var(--line)', padding: 18, background: '#fafbfc' }}>
          <div className="card-head" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 14 }}>Conversations</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {conversations.map((conversation) => (
              <div key={conversation.id} onClick={() => {
                selectedPartnerId.current = conversation.id;
                setPartner(conversation);
                setActiveConversation('partner');
                setLoading(true);
                api.getMessages(conversation.id).then((chatData) => {
                  setMessages(chatData.messages || []);
                  setAccess(chatData.access || { unlocked: false });
                }).catch(() => showToast('Failed to load consultation messages.')).finally(() => setLoading(false));
              }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', background: activeConversation === 'partner' && partner?.id === conversation.id ? 'var(--teal2)' : 'transparent' }}>
                <div className="avatar coral" style={{ width: 36, height: 36, fontSize: 13 }}>{conversation.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b style={{ fontSize: 12.5, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{conversation.name}</b>
                  <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversation.latest_message || (isDoctor ? 'Patient account' : conversation.specialization)}</div>
                </div>
                {conversation.latest_message_at && <time style={{ fontSize: 9, color: 'var(--muted)' }}>{formatMsgTime(conversation.latest_message_at)}</time>}
              </div>
            ))}

            {/* Sweety Team conversation */}
            <div
              onClick={() => setActiveConversation('sweety-team')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                background: activeConversation === 'sweety-team' ? 'var(--teal2)' : 'transparent',
                transition: 'background 0.15s ease'
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
          {isSweetyTeam ? (
            /* ── Sweety Team: read-only ── */
            <>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar teal" style={{ width: 38, height: 38, fontSize: 14 }}>ST</div>
                <div>
                  <b style={{ fontSize: 13.5, display: 'block' }}>Sweety Team</b>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>System messages · Read only</div>
                </div>
                <span className="badge badge-pending" style={{ marginLeft: 'auto' }}>Read only</span>
              </div>

              <div style={{ flex: 1, padding: 22, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: '#fdfefe' }}>
                {/* Default contact message – always shown, never duplicated */}
                <div style={{
                  maxWidth: '78%', alignSelf: 'flex-start',
                  background: '#f0f3f7', borderRadius: 14,
                  padding: '14px 16px', fontSize: 12.5, lineHeight: 1.7
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontWeight: 800, fontSize: 12, color: 'var(--teal)' }}>
                    <Mail size={13} /> Sweety Team
                  </div>
                  <div>
                    Contact{' '}
                    <a href="mailto:bloodtracker@sweetyteam.in" style={{ color: 'var(--teal)', fontWeight: 700, textDecoration: 'underline' }}>
                      bloodtracker@sweetyteam.in
                    </a>{' '}
                    for any queries.
                  </div>
                  <div style={{ fontSize: 9.5, color: '#7b8793', textAlign: 'right', marginTop: 6 }}>
                    System message
                  </div>
                </div>
              </div>

              {/* Input disabled for Sweety Team */}
              <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', background: '#f8fafc' }}>
                <div className="notice notice-info" style={{ margin: 0, fontSize: 11.5 }}>
                  🔒 This is a read-only system conversation. For support, email{' '}
                  <a href="mailto:bloodtracker@sweetyteam.in" style={{ color: 'var(--teal)', fontWeight: 700 }}>
                    bloodtracker@sweetyteam.in
                  </a>.
                </div>
              </div>
            </>
          ) : (
            /* ── Partner conversation ── */
            <>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar coral" style={{ width: 38, height: 38, fontSize: 14 }}>
                  {partnerInitials}
                </div>
                <div>
                  <b style={{ fontSize: 13.5, display: 'block' }}>
                    {partner?.name || 'Care Consultation'}
                  </b>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {partner?.specialization || 'Clinical Conversation'}
                  </div>
                </div>
                <span className={`badge ${isLocked ? 'badge-locked' : 'badge-success'}`} style={{ marginLeft: 'auto' }}>
                  {isLocked ? 'Locked' : 'Authorized'}
                </span>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, padding: 22, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: '#fdfefe' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, paddingTop: 40 }}>Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, paddingTop: 40 }}>
                    No messages yet. Start the conversation.
                  </div>
                ) : (
                  messages.map((m) => {
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
                          lineHeight: 1.6,
                          animation: 'fadeIn 0.2s ease'
                        }}
                      >
                        <div>{m.content}</div>
                        <div style={{ fontSize: 9.5, color: '#7b8793', textAlign: 'right', marginTop: 4 }}>
                          {formatMsgTime(m.created_at)}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Compose or locked */}
              {!partner ? (
                <div style={{ padding: 22, color: 'var(--muted)', textAlign: 'center' }}>No authorized care conversations are available yet.</div>
              ) : isLocked ? (
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
                      flex: 1, border: '1px solid var(--line)', borderRadius: 10,
                      padding: '11px 14px', fontSize: 13, outline: 'none'
                    }}
                  />
                  <button type="submit" className="btn-primary" disabled={sending || !inputText.trim()} style={{ padding: '0 18px' }}>
                    Send ↗
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </section>

      <div className="notice notice-info" style={{ marginTop: 18 }}>
        Messages and access controls are server-enforced in PostgreSQL. Normal chat locks automatically when a 2-month subscription expires.
      </div>
    </div>
  );
}
