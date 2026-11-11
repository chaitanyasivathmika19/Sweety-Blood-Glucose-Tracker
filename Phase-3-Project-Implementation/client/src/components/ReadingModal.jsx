import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const SLOT_NAMES = {
  morning: 'Morning (fasting)',
  breakfast: 'After breakfast',
  lunch: 'After lunch',
  dinner: 'After dinner'
};

export default function ReadingModal({ isOpen, onClose, onSave, reading, initialSlot, targetDate }) {
  const [value, setValue] = useState('');
  const [slot, setSlot] = useState('morning');
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  const isEdit = Boolean(reading);

  useEffect(() => {
    if (reading) {
      setValue(reading.glucose_value);
      setSlot(reading.time_slot);
      setError('');

      // Calculate 4-hour remaining window
      const checkTimer = () => {
        const createdAt = new Date(reading.created_at).getTime();
        const deadline = createdAt + 4 * 60 * 60 * 1000;
        const diff = deadline - Date.now();
        if (diff <= 0) {
          setTimeLeft('Editing window closed');
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeLeft(`${hours}h ${mins}m left to edit`);
        }
      };
      checkTimer();
      const interval = setInterval(checkTimer, 30000);
      return () => clearInterval(interval);
    } else {
      setValue('');
      setSlot(initialSlot || 'morning');
      setError('');
      setTimeLeft('');
    }
  }, [reading, initialSlot, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const raw = String(value).trim();
    if (!raw) {
      setError('Please enter a glucose value.');
      return;
    }

    const num = Number(raw);
    if (!Number.isInteger(num) || num < 40 || num > 600) {
      setError('Value must be between 40 and 600 mg/dl.');
      return;
    }

    if (isEdit && timeLeft === 'Editing window closed') {
      setError('Editing is available only within 4 hours of recording.');
      return;
    }

    onSave({
      id: reading?.id,
      glucose_value: num,
      time_slot: slot,
      reading_date: targetDate
    }, setError);
  };

  const slotTitle = SLOT_NAMES[slot] || slot;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <div>
            <h3>{isEdit ? `Edit ${slotTitle} reading` : `Add ${slotTitle} reading`}</h3>
            <p>{targetDate ? `Date: ${targetDate} · Current date only` : 'Today’s reading'}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {isEdit && timeLeft && (
          <div className="notice notice-info" style={{ marginTop: 0 }}>
            ⏱ <b>Editing Window:</b> {timeLeft}. Editing will not reset the original 4-hour window.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {!isEdit && (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label htmlFor="slotSelect">Time Slot</label>
              <select
                id="slotSelect"
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
              >
                <option value="morning">Morning (fasting)</option>
                <option value="breakfast">After breakfast</option>
                <option value="lunch">After lunch</option>
                <option value="dinner">After dinner</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="glucoseInput">Glucose Value (mg/dL)</label>
            <input
              id="glucoseInput"
              type="text"
              placeholder="Enter a whole number (e.g. 110)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
            <small>Permitted range: 40 to 600 mg/dL (whole numbers only).</small>
          </div>

          {error && (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isEdit && timeLeft === 'Editing window closed'}
            >
              {isEdit ? 'Update reading' : 'Save reading'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
