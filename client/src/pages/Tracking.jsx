import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import ReadingModal from '../components/ReadingModal';
import { 
  Sun, 
  Coffee, 
  Utensils, 
  Moon, 
  Clock, 
  Info, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

const SLOTS = [
  { id: 'morning', name: 'Morning (fasting)', icon: Sun, desc: 'Before morning meal' },
  { id: 'breakfast', name: 'After breakfast', icon: Coffee, desc: '1-2 hours after morning meal' },
  { id: 'lunch', name: 'After lunch', icon: Utensils, desc: '1-2 hours after afternoon meal' },
  { id: 'dinner', name: 'After dinner', icon: Moon, desc: '1-2 hours after evening meal' }
];

export default function Tracking() {
  const { showToast } = useAuth();
  const [readings, setReadings] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReading, setSelectedReading] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('morning');
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchTodayReadings = async () => {
    try {
      setLoading(true);
      const res = await api.getReports({ type: 'daily', date: todayStr });
      setReadings(res.readings || []);
    } catch (err) {
      showToast('Failed to load readings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayReadings();
  }, []);

  const handleAdd = (slotId) => {
    setSelectedReading(null);
    setSelectedSlot(slotId);
    setModalOpen(true);
  };

  const handleEdit = (reading) => {
    if (!reading.can_edit) {
      showToast('Editing is available only within 4 hours of recording.');
      return;
    }
    setSelectedReading(reading);
    setSelectedSlot(reading.time_slot);
    setModalOpen(true);
  };

  const handleDelete = async (readingId) => {
    if (!window.confirm('Are you sure you want to delete this reading?')) return;
    try {
      await api.deleteReading(readingId);
      showToast('Reading deleted successfully.');
      fetchTodayReadings();
    } catch (err) {
      showToast(err.message || 'Failed to delete reading.');
    }
  };

  const handleSave = async (data, setError) => {
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
      fetchTodayReadings();
    } catch (err) {
      setError(err.message);
    }
  };

  const readingsBySlot = {};
  readings.forEach(r => {
    readingsBySlot[r.time_slot] = r;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            Daily Glucose Log
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Record readings for today’s four slots. Past dates are read-only to ensure authentic logging.
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 16px', fontSize: 12.5, color: '#596878', fontWeight: 600 }}>
          Today · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(300px, 1fr)', gap: 20 }}>
        {/* Slot Cards List */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Daily Reading Slots</h3>
              <p>{readings.length}/4 slots recorded for today</p>
            </div>
            <span className="badge badge-success">Current Date Only</span>
          </div>

          <div className="slots-list">
            {SLOTS.map((slot) => {
              const Icon = slot.icon;
              const r = readingsBySlot[slot.id];
              return (
                <div key={slot.id} className="slot-item" style={{ padding: 16 }}>
                  <div className="slot-icon-box" style={{ width: 46, height: 46 }}>
                    <Icon size={22} color="var(--teal)" />
                  </div>
                  <div className="slot-info">
                    <b style={{ fontSize: 14 }}>{slot.name}</b>
                    <span style={{ fontSize: 12 }}>
                      {r ? (
                        r.can_edit ? (
                          <span style={{ color: 'var(--teal)' }}>✓ Editable within 4-hour window</span>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>🔒 Editing window closed (4h passed)</span>
                        )
                      ) : (
                        slot.desc
                      )}
                    </span>
                  </div>

                  {r ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div className="slot-value">
                          {r.glucose_value} <span className="slot-unit">mg/dL</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        {r.can_edit && (
                          <button
                            className="btn-secondary"
                            onClick={() => handleEdit(r)}
                            title="Edit reading"
                            style={{ padding: 8 }}
                          >
                            <Edit3 size={15} />
                          </button>
                        )}
                        <button
                          className="btn-secondary"
                          onClick={() => handleDelete(r.id)}
                          title="Delete reading"
                          style={{ padding: 8, color: '#b65e4c' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn-primary"
                      onClick={() => handleAdd(slot.id)}
                      style={{ padding: '8px 16px', fontSize: 13 }}
                    >
                      + Record
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="notice notice-info" style={{ marginTop: 20 }}>
            <Info size={18} style={{ flexShrink: 0 }} />
            <div>
              <b>Sweety Clinical Logging Rules:</b>
              <br />
              • Permitted values: <b>40 to 600 mg/dL</b> (whole numbers only).
              <br />
              • Exactly <b>one reading per slot per day</b>, up to a maximum of 4 readings.
              <br />
              • Readings can only be added for the <b>current date</b>.
              <br />
              • A saved reading can be corrected strictly within <b>4 hours</b> of its original timestamp.
            </div>
          </div>
        </div>

        {/* Instructions and Guidelines Card */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-head">
              <div>
                <h3>How It Works</h3>
                <p>Tracking routine recommendations</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="avatar teal" style={{ width: 32, height: 32, fontSize: 13 }}>1</div>
                <div>
                  <b style={{ fontSize: 13 }}>Choose Your Slot</b>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    Record fasting reading upon waking up, and post-meal readings 1 to 2 hours after meals.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div className="avatar purple" style={{ width: 32, height: 32, fontSize: 13 }}>2</div>
                <div>
                  <b style={{ fontSize: 13 }}>Input Whole Numbers</b>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    Standard glucometers output integers in mg/dL. Values below 40 or above 600 require immediate medical attention.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div className="avatar coral" style={{ width: 32, height: 32, fontSize: 13 }}>3</div>
                <div>
                  <b style={{ fontSize: 13 }}>Review & Share with Doctor</b>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    Your assigned doctor automatically receives access to your trends for consultation reviews.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Need To Export Records?</h4>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--muted)' }}>
              Download your entire glucose tracking log with timestamps as a clinical CSV file.
            </p>
            <button className="btn-secondary" onClick={() => api.exportCsv()} style={{ width: '100%' }}>
              Download CSV Report ↓
            </button>
          </div>
        </div>
      </div>

      <ReadingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        reading={selectedReading}
        initialSlot={selectedSlot}
        targetDate={todayStr}
      />
    </div>
  );
}
