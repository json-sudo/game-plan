import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BenchChip } from '.';

describe('BenchChip', () => {
  it('is focusable and shows the default label', () => {
    render(<BenchChip label="CB" team="mine" />);
    const chip = screen.getByRole('button');
    chip.focus();
    expect(chip).toHaveFocus();
    expect(chip).toHaveTextContent('CB');
  });

  it('shows the custom name in place of the default label and keeps both in the accessible name', () => {
    render(<BenchChip label="CB" team="opponent" name="Rodri" />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveTextContent('Rodri');
    expect(chip).not.toHaveTextContent('CB');
    expect(chip).toHaveAccessibleName('CB, Rodri, opponent');
  });

  it('draws my team as a circle and the opponent as a square', () => {
    const { rerender } = render(<BenchChip label="1" team="mine" />);
    expect(screen.getByRole('button').querySelector('[data-team="mine"]')).not.toBeNull();
    rerender(<BenchChip label="1" team="opponent" />);
    expect(screen.getByRole('button').querySelector('[data-team="opponent"]')).not.toBeNull();
  });

  it('places the piece on the pitch from the keyboard or a click', async () => {
    const user = userEvent.setup();
    const onPlace = vi.fn<() => void>();
    render(<BenchChip label="Sub 14" team="mine" onPlace={onPlace} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveAccessibleDescription('Drag onto the pitch, or press Enter to place.');
    await user.tab();
    await user.keyboard('{Enter}');
    expect(onPlace).toHaveBeenCalledOnce();
    await user.click(chip);
    expect(onPlace).toHaveBeenCalledTimes(2);
  });
});
