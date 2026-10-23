import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SequenceControls } from '.';

describe('SequenceControls', () => {
  it('shows where the visualization starts and both buttons', () => {
    render(<SequenceControls starter="AM(R) · Winger" total={2} />);
    expect(screen.getByText('Starts with AM(R) · Winger')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Show another visualization' })).toBeEnabled();
  });

  it('calls back on Restart and Show another visualization', async () => {
    const onRestart = vi.fn<() => void>();
    const onAnother = vi.fn<() => void>();
    render(<SequenceControls starter="GK" total={2} onRestart={onRestart} onAnother={onAnother} />);
    await userEvent.click(screen.getByRole('button', { name: 'Restart' }));
    await userEvent.click(screen.getByRole('button', { name: 'Show another visualization' }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onAnother).toHaveBeenCalledTimes(1);
  });

  it('disables Show another visualization with its reason when there is only one', () => {
    render(<SequenceControls starter="GK" total={1} />);
    const another = screen.getByRole('button', { name: 'Show another visualization' });
    expect(another).toHaveAttribute('aria-disabled', 'true');
    expect(another).toHaveAccessibleDescription('This zone has one visualization.');
    expect(screen.getByRole('button', { name: 'Restart' })).toBeEnabled();
  });

  it('disables both buttons with the reason and hides the line when disabled', () => {
    render(<SequenceControls disabled reason="Pick a zone first." />);
    expect(screen.queryByText(/Starts with/)).toBeNull();
    for (const name of ['Restart', 'Show another visualization']) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAccessibleDescription('Pick a zone first.');
    }
  });
});
