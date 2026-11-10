import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import ReadingModal from '../components/ReadingModal';
import { 
  CheckCircle2, 
  Activity, 
  CreditCard, 
  Clock, 
  Sun, 
  Coffee, 
  Utensils, 
  Moon, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

const SLOTS_META = [
  { id: 'morning', name: 'Morning (fasting)', icon: Sun, desc: 'Before breakfast' },
  { id: 'breakfast', name: 'After breakfast', icon: Coffee, desc: 'After your morning meal' },
  { id: 'lunch', name: 'After lunch', icon: Utensils, desc: 'After your afternoon meal' },
  { id: 'dinner', name: 'After dinner', icon: Moon, desc: 'After your evening meal' }
];

export default function Dashboard() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const [todayReadings, setTodayReadings] = useState([]);
  const [stats, setStats] = useState({ count: 0, average: null, highest: null, lowest: null });
  const [trendData, setTrendData] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeReading, setActiveReading] = useState(null);
  const [activeSlot, setActiveSlot] = useState('morning');
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch today's report
      const rep = await api.getReports({ type: 'daily', date: todayStr });
      setTodayReadings(rep.readings || []);
      setStats(rep.stats || { count: 0, average: null });

      // Fetch month-to-date or full history for trend chart
      const historyRep = await api.getReports({ type: 'month-to-date', date: todayStr });
      const chartPoints = (historyRep.readings || []).map(r => ({
        date: r.reading_date.split('T')[0],
        slot: r.slot_label,
        value: r.glucose_value
      }));
      setTrendData(chartPoints);

      // Fetch subscription
      const subData = await api.getMySubscription();
      setSubscription(subData.subscription);
    } catch (err) {
      showToast('Failed to refresh dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = (slotId) => {
    setActiveReading(null);
    setActiveSlot(slotId);
    setModalOpen(true);
  };

  const handleOpenEdit = (reading) => {
    setActiveReading(reading);
    setActiveSlot(reading.time_slot);
    setModalOpen(true);
  };

  const handleSaveReading = async (data, setError) => {
    try {
      if (data.id) {
        await api.updateReading(data.id, { glucose_value: data.glucose_value });
        showToast('Reading updated successfully.');
      } else {
        await api.addReading({
          reading_date: todayStr,
          time_slot: data.time_slot,
          glucose_value: data.glucose_value
        });
        showToast('Glucose reading saved.');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const readingsMap = {};
  todayReadings.forEach(r => {
    readingsMap[r.time_slot] = r;
  });

  const completedCount = todayReadings.length;

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            Welcome back, {user?.name?.split(' ')[0] || 'Friend'} ✦
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Small consistent habits build lasting health. Here is today’s glucose tracking summary.
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
            <span>Today's progress</span>
            <span className="stat-icon"><CheckCircle2 size={18} /></span>
          </div>
          <div className="stat-number">
            {completedCount} <span style={{ fontSize: 16, color: '#9aa3ad' }}>/ 4</span>
          </div>
          <div className={`stat-note ${completedCount === 4 ? 'green' : ''}`}>
            {completedCount === 4 ? 'All 4 readings completed!' : `${4 - completedCount} slot(s) remaining`}
          </div>
        </div>

        <div className="card">
          <div className="stat-top">
            <span>Today's average</span>
            <span className="stat-icon purple"><Activity size={18} /></span>
          </div>
          <div className="stat-number">
            {stats.average !== null ? stats.average : '—'} <span style={{ fontSize: 13, color: '#9aa3ad' }}>mg/dL</span>
          </div>
          <div className="stat-note">
            {stats.count > 0 ? `Based on ${stats.count} recorded readings` : 'No readings recorded today'}
          </div>
        </div>

        <div className="card">
          <div className="stat-top">
            <span>Current plan</span>
            <span className="stat-icon coral"><CreditCard size={18} /></span>
          </div>
          <div className="stat-number" style={{ fontSize: 22 }}>
            {subscription?.status === 'active' ? 'Active' : subscription?.status === 'pending' ? 'Pending' : 'No Plan'}
          </div>
          <div className="stat-note">
            {subscription?.doctor_name ? `${subscription.doctor_name} · ${subscription.plan_name}` : 'Consult a doctor'}
          </div>
        </div>

        <div className="card">
          <div className="stat-top">
            <span>Consultation status</span>
            <span className="stat-icon gold"><Clock size={18} /></span>
          </div>
          <div className="stat-number" style={{ fontSize: 20 }}>
            {subscription?.frequency_days ? `Every ${subscription.frequency_days}d` : 'Ready'}
          </div>
          <div className="stat-note">
            {subscription?.status === 'active' ? '2-month valid care' : 'Browse verified doctors'}
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 1fr)', marginBottom: 20 }}>
        {/* Trend Chart */}
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Glucose trends</h3>
              <p>Recent recorded values across daily time slots</p>
            </div>
            <button className="btn-text" onClick={() => navigate('/analytics')}>
              Explore analytics →
            </button>
          </div>

          <div style={{ height: 240, width: '100%' }}>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edf0f3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9aa3ad' }} />
                  <YAxis domain={[40, 300]} tick={{ fontSize: 11, fill: '#9aa3ad' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 10, border: '1px solid #dfe5eb', fontSize: 12 }}
                    formatter={(val) => [`${val} mg/dL`, 'Glucose']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#178b83" 
                    strokeWidth={2.5} 
                    dot={{ r: 4, fill: '#178b83' }} 
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No readings recorded yet. Add your first reading below!
              </div>
            )}
          </div>
        </section>

        {/* Today's 4 Slots */}
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Today's readings</h3>
              <p>Four slots, one simple daily routine</p>
            </div>
            <button className="btn-text" onClick={() => navigate('/tracking')}>
              View tracking →
            </button>
          </div>

          <div className="slots-list">
            {SLOTS_META.map(slot => {
              const Icon = slot.icon;
              const r = readingsMap[slot.id];
              return (
                <div key={slot.id} className="slot-item">
                  <div className="slot-icon-box">
                    <Icon size={20} color="var(--teal)" />
                  </div>
                  <div className="slot-info">
                    <b>{slot.name}</b>
                    <span>{r ? (r.can_edit ? 'Can be edited' : 'Editing window closed') : slot.desc}</span>
                  </div>
                  {r ? (
                    <div style={{ textAlign: 'right' }}>
                      <div className="slot-value">
                        {r.glucose_value} <span className="slot-unit">mg/dL</span>
                      </div>
                      <span className="badge badge-success" style={{ marginTop: 3 }}>Recorded</span>
                      {r.can_edit && (
                        <div>
                          <button className="btn-text" onClick={() => handleOpenEdit(r)} style={{ fontSize: 11.5 }}>
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button className="btn-secondary" onClick={() => handleOpenAdd(slot.id)} style={{ padding: '6px 12px', fontSize: 12 }}>
                      + Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Consultation Info Banner */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="avatar coral" style={{ width: 48, height: 48, fontSize: 16 }}>AR</div>
          <div>
            <b style={{ fontSize: 14 }}>Connected Care with Verified Doctors</b>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Consult endocrinologists and diabetologists on flexible 2-month plans with continuous chat support.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={() => navigate('/doctors')}>
            Find a doctor
          </button>
          <button className="btn-primary" onClick={() => navigate('/chat')}>
            Open consultation chat
          </button>
        </div>
      </div>

      {/* Reading Modal */}
      <ReadingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveReading}
        reading={activeReading}
        initialSlot={activeSlot}
        targetDate={todayStr}
      />
    </div>
  );
}
