import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { ArrowUp, ArrowDown, Activity, Layers, Download } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from 'recharts';

export default function Analytics() {
  const { showToast } = useAuth();
  const [filterType, setFilterType] = useState('month-to-date');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState({ highest: null, lowest: null, average: null, count: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = { type: filterType, date: todayStr };
      if (filterType === 'custom') {
        params.start_date = startDate || todayStr;
        params.end_date = endDate || todayStr;
      }
      const data = await api.getReports(params);
      setStats(data.stats || {});
      
      const formatted = (data.readings || []).map(r => ({
        date: r.reading_date.split('T')[0],
        time: new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        slot: r.slot_label,
        value: r.glucose_value
      }));
      setChartData(formatted);
    } catch (err) {
      showToast('Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [filterType, startDate, endDate]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            Health Analytics & Trends
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Understand your metabolic patterns through database-derived statistics and visualizations.
          </p>
        </div>

        {/* Filter Selection */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: '10px 14px',
              background: '#fff',
              fontSize: 13,
              fontWeight: 600,
              color: '#495867'
            }}
          >
            <option value="daily">Daily</option>
            <option value="month-to-date">Month-to-date</option>
            <option value="monthly">Previous full month</option>
            <option value="custom">Custom date range</option>
            <option value="full">Full history</option>
          </select>

          {filterType === 'custom' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="date"
                value={startDate}
                max={todayStr}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 12 }}
              />
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>to</span>
              <input
                type="date"
                value={endDate}
                max={todayStr}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 12 }}
              />
            </div>
          )}

          <button className="btn-secondary" onClick={() => api.exportCsv({ start_date: startDate, end_date: endDate })}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-stats">
        <div className="card">
          <div className="stat-top">
            <span>Highest reading</span>
            <span className="stat-icon coral"><ArrowUp size={18} /></span>
          </div>
          <div className="stat-number">
            {stats.highest !== null ? stats.highest : '—'} <span style={{ fontSize: 13, color: '#9aa3ad' }}>mg/dL</span>
          </div>
          <div className="stat-note">Peak value in selected range</div>
        </div>

        <div className="card">
          <div className="stat-top">
            <span>Lowest reading</span>
            <span className="stat-icon"><ArrowDown size={18} /></span>
          </div>
          <div className="stat-number">
            {stats.lowest !== null ? stats.lowest : '—'} <span style={{ fontSize: 13, color: '#9aa3ad' }}>mg/dL</span>
          </div>
          <div className="stat-note">Minimum value in selected range</div>
        </div>

        <div className="card">
          <div className="stat-top">
            <span>Average glucose</span>
            <span className="stat-icon purple"><Activity size={18} /></span>
          </div>
          <div className="stat-number">
            {stats.average !== null ? stats.average : '—'} <span style={{ fontSize: 13, color: '#9aa3ad' }}>mg/dL</span>
          </div>
          <div className="stat-note">Rounded to 1 decimal place</div>
        </div>

        <div className="card">
          <div className="stat-top">
            <span>Total readings</span>
            <span className="stat-icon gold"><Layers size={18} /></span>
          </div>
          <div className="stat-number">
            {stats.count}
          </div>
          <div className="stat-note">Database recorded entries</div>
        </div>
      </div>

      {/* Primary Visualization: Line Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <h3>Glucose Trend Chart</h3>
            <p>Chronological blood glucose readings (mg/dL)</p>
          </div>
          <span className="badge badge-success">Recharts Active</span>
        </div>

        <div style={{ height: 340, width: '100%', marginTop: 10 }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf0f3" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9aa3ad' }} />
                <YAxis domain={[40, 320]} tick={{ fontSize: 11, fill: '#9aa3ad' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div style={{ background: '#fff', border: '1px solid #dfe5eb', padding: '10px 14px', borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}>
                          <b style={{ fontSize: 13, display: 'block' }}>{label}</b>
                          <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700, margin: '4px 0' }}>
                            {item.value} mg/dL
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {item.slot} · {item.time}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line
                  name="Glucose reading (mg/dL)"
                  type="monotone"
                  dataKey="value"
                  stroke="#178b83"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#178b83' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No glucose readings found for this date range.
            </div>
          )}
        </div>
      </div>

      <div className="notice notice-info">
        <b>Clinical Disclaimer:</b>
        <br />
        This platform and trend visualizations are designed for personal tracking and clinical consultation. They do not constitute a medical diagnosis or treatment recommendation.
      </div>
    </div>
  );
}
