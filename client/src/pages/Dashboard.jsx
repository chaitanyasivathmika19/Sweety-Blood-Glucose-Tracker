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
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Area,
  AreaChart
} from 'recharts';

const SLOTS_META = [
  { id: 'morning', name: 'Morning (fasting)', icon: '☀', time: 'Before breakfast' },
  { id: 'breakfast', name: 'After breakfast', icon: '☕', time: 'After your morning meal' },
  { id: 'lunch', name: 'After lunch', icon: '🍽', time: 'After your afternoon meal' },
  { id: 'dinner', name: 'After dinner', icon: '🌙', time: 'After your evening meal' }
];

export default function Dashboard() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const [todayReadings, setTodayReadings] = useState([]);
  const [stats, setStats] = useState({ count: 0, average: null, highest: null, lowest: null });
  const [trendData, setTrendData] = useState([]);
  const [chartRange, setChartRange] = useState('Last 14 days');
  const [subscription, setSubscription] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeReading, setActiveReading] = useState(null);
  const [activeSlot, setActiveSlot] = useState('morning');
  const [loading, setLoading] = useState(true);

  // Mini calendar state
  const [calMonth, setCalMonth] = useState(new Date());
  const [monthData, setMonthData] = useState({});

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

      // Fetch calendar month readings
      const year = calMonth.getFullYear();
      const month = calMonth.getMonth();
      const pad = n => String(n).padStart(2, '0');
      const start = `${year}-${pad(month + 1)}-01`;
      const end = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;
      const calRes = await api.getReadings({ start_date: start, end_date: end, limit: 120 }).catch(() => ({ readings: [] }));
      const map = {};
      (calRes.readings || []).forEach(r => {
        const d = r.reading_date.split('T')[0];
        if (!map[d]) map[d] = [];
        map[d].push(r);
      });
      setMonthData(map);

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
  }, [calMonth]);

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
  const progressPercent = Math.min(100, completedCount * 25);

  // Mini calendar cells
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const pad = n => String(n).padStart(2, '0');

  const calCells = [];
  for (let i = 0; i < firstDay; i++) {
    calCells.push(<div key={`empty-${i}`} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
    const count = (monthData[iso] || []).length;
    const isToday = iso === todayStr;
    const isFuture = iso > todayStr;
    const cls = isToday ? 'today' : count === 4 ? 'complete' : count > 0 ? 'partial' : '';

    calCells.push(
      <button
        key={iso}
        className={`cal-day-cell ${cls}`}
        disabled={isFuture}
        onClick={() => navigate('/calendar')}
        title={`${count}/4 readings`}
        style={{ minHeight: 34, fontSize: 11 }}
      >
        <span>{d}</span>
        {count > 0 && !isToday && <span className="indicator-dot" />}
      </button>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Welcome Banner matching prototype */}
      <div className="welcome-banner">
        <div>
          <h2>Good evening, {user?.name?.split(' ')[0] || 'Friend'} ✦</h2>
          <p>Small steps every day make a healthier you. Here's your tracking summary.</p>
        </div>
        <div className="date-pill">
          <span>▦</span> {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* 4 Stats Cards matching prototype */}
      <div className="grid grid-stats">
        <div className="card">
          <div className="stat-top">
            <span>Today's progress</span>
            <span className="stat-icon">✓</span>
          </div>
          <div className="stat-number">
            {completedCount} <span style={{ fontSize: 15, color: '#9aa3ad' }}>/ 4</span>
          </div>
          <div className={`stat-note ${completedCount === 4 ? 'green' : ''}`}>
            {completedCount === 4 ? 'All readings complete' : `${4 - completedCount} readings remaining`}
          </div>
        </div>

        <div className="card">
          <div className="stat-top">
            <span>Today's average</span>
            <span className="stat-icon purple">⌁</span>
          </div>
          <div className="stat-number">
            {stats.average !== null ? stats.average : '—'} <span style={{ fontSize: 12, color: '#9aa3ad' }}>mg/dL</span>
          </div>
          <div className="stat-note">
            {stats.count > 0 ? `Based on ${stats.count} recorded readings` : 'No readings recorded today'}
          </div>
        </div>

        <div className="card">
          <div className="stat-top">
            <span>Current subscription</span>
            <span className="stat-icon coral">◇</span>
          </div>
          <div className="stat-number" style={{ fontSize: 23 }}>
            {subscription?.status === 'active' ? 'Active' : subscription?.status === 'pending' ? 'Pending' : 'Ready'}
          </div>
          <div className="stat-note">
            {subscription?.doctor_name ? `${subscription.doctor_name} · Plan` : 'Dr. Ananya Rao · Demo plan'}
          </div>
        </div>

        <div className="card">
          <div className="stat-top">
            <span>Next consultation</span>
            <span className="stat-icon gold">◷</span>
          </div>
          <div className="stat-number" style={{ fontSize: 22 }}>
            Nov 12
          </div>
          <div className="stat-note">10:30 AM · Sample appointment</div>
        </div>
      </div>

      {/* 2-Column Grid: Trends & Today's Slots */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.45fr) minmax(310px, 1fr)', marginBottom: 20 }}>
        {/* Glucose Trends Chart Card */}
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Glucose trends</h3>
              <p>Your recent readings at a glance</p>
            </div>
            <select
              value={chartRange}
              onChange={(e) => setChartRange(e.target.value)}
              style={{
                border: '1px solid var(--line)',
                borderRadius: 9,
                background: '#fff',
                padding: '6px 10px',
                fontSize: 11,
                color: '#687583',
                outline: 'none'
              }}
            >
              <option>Last 14 days</option>
              <option>This month</option>
              <option>Full history</option>
            </select>
          </div>

          <div style={{ height: 215, width: '100%', position: 'relative' }}>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#178b83" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#178b83" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 4" stroke="#edf0f3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9aa3ad' }} />
                  <YAxis domain={[60, 260]} tick={{ fontSize: 10, fill: '#9aa3ad' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #dfe5eb', fontSize: 11.5 }}
                    formatter={(val) => [`${val} mg/dL`, 'Glucose']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#178b83"
                    strokeWidth={2.8}
                    fillOpacity={1}
                    fill="url(#tealGrad)"
                    dot={{ r: 3.5, fill: '#178b83', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#178b83' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 12 }}>
                No readings recorded yet. Record your first reading today!
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap', marginTop: 14, fontSize: 11, color: '#6f7b88' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)' }} /> Glucose readings
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--purple)' }} /> Trend comparison
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--coral)' }} /> Verified data
            </span>
          </div>
        </section>

        {/* Today's 4 Slots Card */}
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Today's readings</h3>
              <p>Four slots, one simple routine</p>
            </div>
            <button className="btn-text" onClick={() => navigate('/tracking')}>
              View all →
            </button>
          </div>

          <div className="progress-row">
            <span>Daily completion</span>
            <b>{completedCount}/4</b>
          </div>
          <div className="progress-bar-bg" style={{ marginBottom: 16 }}>
            <span className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="slots-list">
            {SLOTS_META.map(slot => {
              const r = readingsMap[slot.id];
              return (
                <div key={slot.id} className="slot-item">
                  <div className="slot-icon-box">{slot.icon}</div>
                  <div className="slot-info">
                    <b>{slot.name}</b>
                    <span>{r ? (r.can_edit ? 'Within 4-hour edit window' : 'Editing window closed') : slot.time}</span>
                  </div>
                  {r ? (
                    <div style={{ textAlign: 'right' }}>
                      <div className="slot-value">
                        {r.glucose_value}<span className="slot-unit"> mg/dL</span>
                      </div>
                      <span className="badge badge-success">Recorded</span>
                      {r.can_edit && (
                        <div>
                          <button className="btn-text" onClick={() => handleOpenEdit(r)} style={{ fontSize: 11, padding: 0 }}>
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button className="btn-secondary" onClick={() => handleOpenAdd(slot.id)} style={{ padding: '6px 12px', fontSize: 11.5 }}>
                      + Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Next Row: Mini Calendar & Consultation Card */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.45fr) minmax(310px, 1fr)' }}>
        {/* Tracking Calendar */}
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Tracking calendar</h3>
              <p>Stay consistent with your daily routine</p>
            </div>
            <button className="btn-text" onClick={() => navigate('/calendar')}>
              Open calendar →
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button className="btn-secondary" onClick={() => setCalMonth(new Date(year, month - 1, 1))} style={{ padding: '4px 10px', fontSize: 12 }}>
              ‹
            </button>
            <b style={{ fontSize: 13.5 }}>
              {calMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </b>
            <button className="btn-secondary" onClick={() => setCalMonth(new Date(year, month + 1, 1))} style={{ padding: '4px 10px', fontSize: 12 }}>
              ›
            </button>
          </div>

          <div className="calendar-grid">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((name, i) => (
              <div key={i} className="calendar-header-day">{name}</div>
            ))}
            {calCells}
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <i style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)' }} /> Today
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#21a18e' }} /> Complete (4/4)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#dca94a' }} /> Partial (1–3/4)
            </span>
          </div>
        </section>

        {/* Upcoming Consultation */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-head">
            <div>
              <h3>Upcoming consultation</h3>
              <p>Your care, connected</p>
            </div>
            <span className="badge badge-success">Active</span>
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
            <div className="avatar coral" style={{ width: 54, height: 54, fontSize: 19 }}>
              AR
            </div>
            <div>
              <b style={{ fontSize: 14 }}>Dr. Ananya Rao</b>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', margin: '3px 0' }}>
                Endocrinologist · <span style={{ color: 'var(--teal)', fontWeight: 700 }}>✓ Verified demo</span>
              </div>
              <span style={{ fontSize: 11, color: '#687583' }}>Nov 12, 2026 · 10:30 AM</span>
            </div>
          </div>

          <div className="notice notice-info" style={{ margin: '0 0 16px', fontSize: 11.5 }}>
            Your consultation access is active. Communicate with your endocrinologist during active subscription periods.
          </div>

          <button className="btn-primary" onClick={() => navigate('/chat')} style={{ marginTop: 'auto', width: '100%' }}>
            Open consultation chat
          </button>
        </section>
      </div>

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
