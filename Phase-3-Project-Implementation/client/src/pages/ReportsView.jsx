import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Download, FileText, Calendar, Filter, Sparkles, Inbox } from 'lucide-react';

export default function ReportsView() {
  const { showToast } = useAuth();
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const generateReport = async () => {
    try {
      setLoading(true);
      const params = { type: reportType, date: selectedDate };
      if (reportType === 'custom') {
        params.start_date = startDate || selectedDate;
        params.end_date = endDate || selectedDate;
      }
      const data = await api.getReports(params);
      setReportData(data);
    } catch (err) {
      showToast('Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, [reportType, selectedDate, startDate, endDate]);

  const handleExportCsv = async () => {
    try {
      const params = {};
      if (reportType === 'custom') {
        params.start_date = startDate;
        params.end_date = endDate;
      } else if (reportData?.dateRange) {
        params.start_date = reportData.dateRange.startDate;
        params.end_date = reportData.dateRange.endDate;
      }
      await api.exportCsv(params);
      showToast('CSV export downloaded successfully.');
    } catch (err) {
      showToast('Failed to download CSV.');
    }
  };

  // Helper to format date ranges
  const getDateRangeLabel = () => {
    if (!selectedDate) return '';
    const sel = new Date(selectedDate + 'T12:00:00');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (reportType === 'daily') {
      return `${sel.getDate()} ${monthNames[sel.getMonth()]} ${sel.getFullYear()}`;
    }
    if (reportType === 'month-to-date') {
      return `1 ${monthNames[sel.getMonth()]} – ${sel.getDate()} ${monthNames[sel.getMonth()]} ${sel.getFullYear()}`;
    }
    if (reportType === 'monthly') {
      const prev = new Date(sel.getFullYear(), sel.getMonth() - 1, 1);
      const lastDay = new Date(sel.getFullYear(), sel.getMonth(), 0).getDate();
      return `1 ${monthNames[prev.getMonth()]} – ${lastDay} ${monthNames[prev.getMonth()]} ${prev.getFullYear()}`;
    }
    if (reportType === 'custom') {
      return `${startDate || selectedDate} to ${endDate || selectedDate}`;
    }
    return 'Full Available History';
  };

  const hasReadings = reportData?.readings && reportData.readings.length > 0;
  const stats = reportData?.stats;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            Reports & Clinical Analytics
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Generate date-bounded glucose reports or download data as standard CSV format.
          </p>
        </div>

        <button className="btn-primary" onClick={handleExportCsv}>
          <Download size={16} /> Export CSV Report
        </button>
      </div>

      {/* Prototype Notice */}
      <div className="notice notice-info" style={{ fontSize: 11.5, margin: '0 0 18px', lineHeight: 1.5 }}>
        ✦ <b>Reporting Engine:</b> Daily, Month-to-date, and Previous-month calculations are computed dynamically. Statistics display formatted dashes when no readings exist for the selected date range.
      </div>

      {/* Report Controls Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <h3>Configure Report Scope</h3>
            <p>Select period parameters</p>
          </div>
          <span className="badge badge-success">CSV Formatted</span>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="daily">Daily report (selected date)</option>
              <option value="month-to-date">Month-to-date (1st of month to selected date)</option>
              <option value="monthly">Monthly report (entire previous month)</option>
              <option value="custom">Custom date range</option>
              <option value="full">Full history</option>
            </select>
          </div>

          <div className="form-group">
            <label>Reference Date</label>
            <input
              type="date"
              max={todayStr}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {reportType === 'custom' && (
            <>
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  max={todayStr}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  max={todayStr}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 12.5, color: '#334155' }}>
            <b>Active Date Range:</b> <span style={{ color: 'var(--teal)', fontWeight: 700 }}>{getDateRangeLabel()}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {reportData?.readings?.length || 0} reading(s) found
          </div>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-stats" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="stat-top">Highest reading</div>
          <div className="stat-number">
            {hasReadings && stats?.highest !== null && stats?.highest !== undefined ? (
              <>{stats.highest} <span style={{ fontSize: 13, color: 'var(--muted)' }}>mg/dL</span></>
            ) : (
              '—'
            )}
          </div>
          <div className="stat-note">Selected date range</div>
        </div>

        <div className="card">
          <div className="stat-top">Lowest reading</div>
          <div className="stat-number">
            {hasReadings && stats?.lowest !== null && stats?.lowest !== undefined ? (
              <>{stats.lowest} <span style={{ fontSize: 13, color: 'var(--muted)' }}>mg/dL</span></>
            ) : (
              '—'
            )}
          </div>
          <div className="stat-note">Selected date range</div>
        </div>

        <div className="card">
          <div className="stat-top">Average reading</div>
          <div className="stat-number">
            {hasReadings && stats?.average !== null && stats?.average !== undefined ? (
              <>{Number(stats.average).toFixed(1)} <span style={{ fontSize: 13, color: 'var(--muted)' }}>mg/dL</span></>
            ) : (
              '—'
            )}
          </div>
          <div className="stat-note">Rounded to 1 decimal place</div>
        </div>

        <div className="card">
          <div className="stat-top">Number of readings</div>
          <div className="stat-number">
            {stats?.count ?? 0}
          </div>
          <div className="stat-note">Total recorded entries</div>
        </div>
      </div>

      {/* Daily Report Slot Breakdown (when daily report is selected) */}
      {reportType === 'daily' && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-head">
            <div>
              <h3>Daily Slot Breakdown</h3>
              <p>{getDateRangeLabel()} · Listing each reading with clinical time slot</p>
            </div>
            <span className="badge badge-teal">Daily Routine</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 10 }}>
            {[
              { id: 'morning_fasting', label: 'Morning (fasting)', icon: '☀' },
              { id: 'after_breakfast', label: 'After breakfast', icon: '☕' },
              { id: 'after_lunch', label: 'After lunch', icon: '🍽' },
              { id: 'after_dinner', label: 'After dinner', icon: '🌙' }
            ].map(slot => {
              const match = reportData?.readings?.find(r => r.time_slot === slot.id);
              return (
                <div key={slot.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: match ? '#f0fdf4' : '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{slot.icon}</span>
                    {match ? (
                      <span className="badge badge-success" style={{ fontSize: 10 }}>Recorded</span>
                    ) : (
                      <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: 10 }}>Empty</span>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{slot.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: match ? 'var(--teal)' : 'var(--muted)', marginTop: 4 }}>
                    {match ? `${match.glucose_value} mg/dL` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview Table or Friendly Empty State */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3>{reportData?.reportTitle || 'Report Preview'}</h3>
            <p>Date range: {getDateRangeLabel()}</p>
          </div>
        </div>

        {hasReadings ? (
          <div className="table-wrap">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Glucose Value</th>
                  <th>Recorded At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.readings.map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.reading_date.split('T')[0]}</b></td>
                    <td>{r.slot_label}</td>
                    <td><b style={{ color: 'var(--teal)' }}>{r.glucose_value} mg/dL</b></td>
                    <td>{new Date(r.created_at).toLocaleString('en-IN')}</td>
                    <td>
                      <span className="badge badge-success">Recorded</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f1f5f9', display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: '#94a3b8' }}>
              <Inbox size={28} />
            </div>
            <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              No readings found for this date range
            </h4>
            <p style={{ margin: '0 auto', maxWidth: 420, fontSize: 12.5, lineHeight: 1.6 }}>
              There are no glucose readings logged for <b>{getDateRangeLabel()}</b>. Record new readings on the tracking page to populate reports and trends.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
