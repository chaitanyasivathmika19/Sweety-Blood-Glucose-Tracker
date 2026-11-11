import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';

const SLOTS_META = [
  { id: 'morning', name: 'Morning (fasting)' },
  { id: 'breakfast', name: 'After breakfast' },
  { id: 'lunch', name: 'After lunch' },
  { id: 'dinner', name: 'After dinner' }
];

export default function CalendarView() {
  const { showToast } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [monthReadings, setMonthReadings] = useState({});
  const [selectedDayReadings, setSelectedDayReadings] = useState([]);
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchMonthData = async (dateObj) => {
    try {
      setLoading(true);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const pad = n => String(n).padStart(2, '0');
      const start = `${year}-${pad(month + 1)}-01`;
      const end = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;

      const res = await api.getReadings({ start_date: start, end_date: end, limit: 150 });
      const map = {};
      (res.readings || []).forEach(r => {
        const d = r.reading_date.split('T')[0];
        if (!map[d]) map[d] = [];
        map[d].push(r);
      });
      setMonthReadings(map);
    } catch (err) {
      showToast('Failed to load calendar readings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedDay = async (dateStr) => {
    try {
      const res = await api.getReports({ type: 'daily', date: dateStr });
      setSelectedDayReadings(res.readings || []);
    } catch (err) {
      showToast('Failed to load readings for date.');
    }
  };

  useEffect(() => {
    fetchMonthData(currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    fetchSelectedDay(selectedDate);
  }, [selectedDate]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const now = new Date();
    // Don't navigate to future months beyond current month
    if (next > new Date(now.getFullYear(), now.getMonth(), 1)) {
      showToast('Future months have no glucose records.');
      return;
    }
    setCurrentMonth(next);
  };

  const handleGoToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(todayStr);
  };

  // Render calendar days
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday start
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const pad = n => String(n).padStart(2, '0');

  const cells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isoDate = `${year}-${pad(month + 1)}-${pad(d)}`;
    const dayReadings = monthReadings[isoDate] || [];
    const count = dayReadings.length;
    const isToday = isoDate === todayStr;
    const isSelected = isoDate === selectedDate;
    const isFuture = isoDate > todayStr;

    let statusCls = '';
    if (count === 4) statusCls = 'complete';
    else if (count > 0) statusCls = 'partial';

    cells.push(
      <button
        key={isoDate}
        className={`cal-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${statusCls}`}
        disabled={isFuture}
        onClick={() => setSelectedDate(isoDate)}
        title={`${count}/4 readings on ${isoDate}`}
      >
        <span>{d}</span>
        {count > 0 && !isToday && <span className="indicator-dot" />}
      </button>
    );
  }

  const selectedDayMap = {};
  selectedDayReadings.forEach(r => {
    selectedDayMap[r.time_slot] = r;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            Tracking Calendar
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Review your daily completion history and consistency across calendar months.
          </p>
        </div>
        <button className="btn-secondary" onClick={handleGoToday}>
          Go to Today
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)', gap: 20 }}>
        {/* Calendar Card */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 14 }}>
            <button className="btn-secondary" onClick={handlePrevMonth} style={{ padding: '6px 12px' }}>
              <ChevronLeft size={16} />
            </button>
            <b style={{ fontSize: 16 }}>
              {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </b>
            <button className="btn-secondary" onClick={handleNextMonth} style={{ padding: '6px 12px' }}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="calendar-grid">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(name => (
              <div key={name} className="calendar-header-day">{name}</div>
            ))}
            {cells}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--teal)' }} /> Today
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#21a18e' }} /> 4/4 Complete
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dca94a' }} /> 1–3/4 Partial
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dfe5eb' }} /> 0/4 Empty
            </span>
          </div>
        </div>

        {/* Selected Date Details */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Selected Date Records</h3>
              <p>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <span className={`badge ${selectedDate === todayStr ? 'badge-success' : 'badge-locked'}`}>
              {selectedDate === todayStr ? 'Today' : 'Past Date (View-only)'}
            </span>
          </div>

          <div className="slots-list">
            {SLOTS_META.map(slot => {
              const r = selectedDayMap[slot.id];
              return (
                <div key={slot.id} className="slot-item" style={{ padding: 12 }}>
                  <div className="slot-info">
                    <b>{slot.name}</b>
                    <span style={{ fontSize: 11.5 }}>
                      {r ? `Recorded at ${new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Not recorded'}
                    </span>
                  </div>
                  {r ? (
                    <div className="slot-value" style={{ fontSize: 16 }}>
                      {r.glucose_value} <span className="slot-unit">mg/dL</span>
                    </div>
                  ) : (
                    <span className="badge badge-missed">Missed</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="notice notice-info" style={{ marginTop: 18 }}>
            <Info size={16} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 11.5 }}>
              Past records are authentic historical data. Backdated insertions cannot be made for past dates.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
