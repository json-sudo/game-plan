import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TransportBar } from '.';

describe('TransportBar', () => {
  it('disables Back at Shape with its reason', () => {
    render(<TransportBar phase={0} />);
    const back = screen.getByRole('button', { name: 'Back' });
    expect(back).toHaveAttribute('aria-disabled', 'true');
    expect(back).toHaveAccessibleDescription('Already at Shape.');
    expect(screen.getByRole('button', { name: 'Next' })).not.toHaveAttribute('aria-disabled');
  });

  it('disables Next at Final with its reason', () => {
    render(<TransportBar phase={2} />);
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(next).toHaveAccessibleDescription(
      'Already at Final position. Press Play to start again.',
    );
  });

  it('jumps to a phase from its dot', async () => {
    const onPhase = vi.fn<(phase: number) => void>();
    render(<TransportBar phase={0} onPhase={onPhase} />);
    await userEvent.click(screen.getByRole('button', { name: 'Runs' }));
    await userEvent.click(screen.getByRole('button', { name: 'Final' }));
    expect(onPhase.mock.calls).toEqual([[1], [2]]);
  });

  it('steps with Back and Next', async () => {
    const onPhase = vi.fn<(phase: number) => void>();
    render(<TransportBar phase={1} onPhase={onPhase} />);
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPhase.mock.calls).toEqual([[0], [2]]);
  });

  it('marks the current dot and passed dots', () => {
    render(<TransportBar phase={1} />);
    expect(screen.getByRole('button', { name: 'Shape' })).toHaveAttribute('data-state', 'passed');
    expect(screen.getByRole('button', { name: 'Runs' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'Final' })).toHaveAttribute('data-state', 'upcoming');
  });

  it('toggles the play label and the status', async () => {
    const onTogglePlay = vi.fn<() => void>();
    const { rerender } = render(<TransportBar phase={0} onTogglePlay={onTogglePlay} />);
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(onTogglePlay).toHaveBeenCalledOnce();
    rerender(<TransportBar phase={0} playing onTogglePlay={onTogglePlay} />);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText('Playing')).toBeInTheDocument();
    expect(screen.queryByText('1 of 3')).not.toBeInTheDocument();
  });
});
