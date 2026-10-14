import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BenchChip } from '.';

describe('BenchChip', () => {
  it('is focusable and shows the default label', () => {
    render(<BenchChip label="Sub 14" team="mine" />);
    const chip = screen.getByRole('button');
    chip.focus();
    expect(chip).toHaveFocus();
    expect(chip).toHaveTextContent('Sub 14');
  });

  it('shows the custom name in place of the default label and keeps both in the accessible name', () => {
    render(<BenchChip label="Sub 14" team="opponent" name="Rodri" />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveTextContent('Rodri');
    expect(chip).not.toHaveTextContent('Sub 14');
    expect(chip).toHaveAccessibleName('Sub 14, Rodri, opponent');
  });

  it('draws my team as a circle and the opponent as a square', () => {
    const { rerender } = render(<BenchChip label="1" team="mine" />);
    expect(screen.getByRole('button').querySelector('[data-team="mine"]')).not.toBeNull();
    rerender(<BenchChip label="1" team="opponent" />);
    expect(screen.getByRole('button').querySelector('[data-team="opponent"]')).not.toBeNull();
  });
});
