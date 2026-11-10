import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReadingModal from '../components/ReadingModal';

describe('ReadingModal Frontend Component Tests', () => {
  it('renders correctly when open', () => {
    render(
      <ReadingModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        reading={null}
        initialSlot="morning"
        targetDate="2026-11-10"
      />
    );

    expect(screen.getByText(/Add Morning \(fasting\) reading/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Glucose Value/i)).toBeInTheDocument();
  });

  it('displays exact error when glucose value is empty', () => {
    const handleSave = vi.fn();
    render(
      <ReadingModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={handleSave}
        reading={null}
        initialSlot="morning"
        targetDate="2026-11-10"
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Save reading/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText('Please enter a glucose value.')).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('displays exact error when glucose value is below 40', () => {
    const handleSave = vi.fn();
    render(
      <ReadingModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={handleSave}
        reading={null}
        initialSlot="morning"
        targetDate="2026-11-10"
      />
    );

    const input = screen.getByLabelText(/Glucose Value/i);
    fireEvent.change(input, { target: { value: '35' } });

    const saveBtn = screen.getByRole('button', { name: /Save reading/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('displays exact error when glucose value is above 600', () => {
    const handleSave = vi.fn();
    render(
      <ReadingModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={handleSave}
        reading={null}
        initialSlot="morning"
        targetDate="2026-11-10"
      />
    );

    const input = screen.getByLabelText(/Glucose Value/i);
    fireEvent.change(input, { target: { value: '650' } });

    const saveBtn = screen.getByRole('button', { name: /Save reading/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('calls onSave when a valid integer in range 40-600 is submitted', () => {
    const handleSave = vi.fn();
    render(
      <ReadingModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={handleSave}
        reading={null}
        initialSlot="morning"
        targetDate="2026-11-10"
      />
    );

    const input = screen.getByLabelText(/Glucose Value/i);
    fireEvent.change(input, { target: { value: '115' } });

    const saveBtn = screen.getByRole('button', { name: /Save reading/i });
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        glucose_value: 115,
        time_slot: 'morning',
        reading_date: '2026-11-10'
      }),
      expect.any(Function)
    );
  });
});
