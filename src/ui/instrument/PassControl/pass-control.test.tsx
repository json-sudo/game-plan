import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PassControl } from '.';

const TEAMMATES = [
  { id: 'mine-DR', label: 'D(R)', role: 'Wing Back' },
  { id: 'mine-ST', label: 'ST', role: 'Poacher' },
];

describe('PassControl', () => {
  it('lists the teammates with their roles, none chosen to start', () => {
    render(<PassControl teammates={TEAMMATES} />);
    const select = screen.getByRole('combobox', { name: 'Pass to' });
    expect(select).toHaveValue('');
    expect(screen.getByRole('option', { name: 'D(R) - Wing Back' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'ST - Poacher' })).toBeInTheDocument();
  });

  it('keeps Pass unavailable, with a reason, until a teammate is chosen', () => {
    render(<PassControl teammates={TEAMMATES} />);
    const pass = screen.getByRole('button', { name: 'Pass' });
    expect(pass).toHaveAttribute('aria-disabled', 'true');
    expect(pass).toHaveAccessibleDescription('Choose who to pass to first.');
  });

  it('passes to the chosen teammate', async () => {
    const user = userEvent.setup();
    const onPass = vi.fn<(id: string) => void>();
    render(<PassControl teammates={TEAMMATES} onPass={onPass} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Pass to' }), 'mine-ST');
    await user.click(screen.getByRole('button', { name: 'Pass' }));
    expect(onPass).toHaveBeenCalledExactlyOnceWith('mine-ST');
  });

  it('forgets a choice that is no longer a teammate', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PassControl teammates={TEAMMATES} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Pass to' }), 'mine-ST');
    rerender(<PassControl teammates={TEAMMATES.slice(0, 1)} />);
    expect(screen.getByRole('combobox', { name: 'Pass to' })).toHaveValue('');
  });

  it('is locked while a pass or dribble is under way', async () => {
    const user = userEvent.setup();
    const onPass = vi.fn<(id: string) => void>();
    render(<PassControl teammates={TEAMMATES} busy onPass={onPass} />);
    expect(screen.getByRole('combobox', { name: 'Pass to' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Pass' }));
    expect(onPass).not.toHaveBeenCalled();
  });

  it('has nothing to offer without a carrier to pass from', () => {
    render(<PassControl teammates={[]} />);
    expect(screen.getByRole('combobox', { name: 'Pass to' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pass' })).toHaveAccessibleDescription(
      'Pick who has the ball first.',
    );
  });
});
