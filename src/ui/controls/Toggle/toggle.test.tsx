import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Toggle } from '.';

describe('Toggle', () => {
  it('is a switch named by its label', () => {
    render(<Toggle label="Keeper" checked />);
    expect(screen.getByRole('switch', { name: 'Keeper' })).toBeChecked();
  });

  it('defaults to off', () => {
    render(<Toggle label="Keeper" />);
    expect(screen.getByRole('switch', { name: 'Keeper' })).not.toBeChecked();
  });

  it('asks for the opposite state on click and on Space', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<() => void>();
    const { rerender } = render(<Toggle label="Keeper" checked onChange={onChange} />);
    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenLastCalledWith(false);
    rerender(<Toggle label="Keeper" checked={false} onChange={onChange} />);
    screen.getByRole('switch').focus();
    await user.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith(true);
  });
});
