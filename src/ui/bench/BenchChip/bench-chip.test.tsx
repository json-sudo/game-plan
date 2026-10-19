import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});
