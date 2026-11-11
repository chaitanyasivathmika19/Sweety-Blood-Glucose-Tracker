import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Download, FileText, Calendar, Filter } from 'lucide-react';

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            Reports & Clinical Exports
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Generate date-bounded glucose reports or download data as standard CSV format.
          </p>
        </div>

        <button className="btn-primary" onClick={handleExportCsv}>
          <Download size={16} /> Export CSV Report
        </button>
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
              <option value="daily">Daily report</option>
              <option value="month-to-date">Month-to-date</option>
              <option value="monthly">Previous full month</option>
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
      </div>

      {/* Summary Metrics */}
      {reportData && (
        <div className="grid grid-stats">
          <div className="card">
            <div className="stat-top">Highest reading</div>
            <div className="stat-number">
              {reportData.stats?.highest !== null ? `${reportData.stats.highest} mg/dL` : '—'}
            </div>
            <div className="stat-note">Selected date range</div>
          </div>

          <div className="card">
            <div className="stat-top">Lowest reading</div>
            <div className="stat-number">
              {reportData.stats?.lowest !== null ? `${reportData.stats.lowest} mg/dL` : '—'}
            </div>
            <div className="stat-note">Selected date range</div>
          </div>

          <div className="card">
            <div className="stat-top">Average reading</div>
            <div className="stat-number">
              {reportData.stats?.average !== null ? `${reportData.stats.average} mg/dL` : '—'}
            </div>
            <div className="stat-note">Rounded to 1 decimal place</div>
          </div>

          <div className="card">
            <div className="stat-top">Reading count</div>
            <div className="stat-number">
              {reportData.stats?.count || 0}
            </div>
            <div className="stat-note">Records found</div>
          </div>
        </div>
      )}

      {/* Preview Table */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3>{reportData?.reportTitle || 'Report Preview'}</h3>
            <p>{reportData?.readings?.length || 0} reading(s) retrieved from PostgreSQL</p>
          </div>
        </div>

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
              {reportData?.readings && reportData.readings.length > 0 ? (
                reportData.readings.map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.reading_date.split('T')[0]}</b></td>
                    <td>{r.slot_label}</td>
                    <td><b style={{ color: 'var(--teal)' }}>{r.glucose_value} mg/dL</b></td>
                    <td>{new Date(r.created_at).toLocaleString('en-IN')}</td>
                    <td>
                      <span className="badge badge-success">Verified</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                    No readings found for the selected reporting range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
