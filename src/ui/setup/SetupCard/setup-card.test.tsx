import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SetupCard } from '.';

describe('SetupCard', () => {
  it('shows the FM mode eyebrow, the title, the hint and a Start setup button', async () => {
    const onStart = vi.fn<() => void>();
    render(<SetupCard onStart={onStart} />);
    expect(screen.getByText('FM mode')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Set up your tactic' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Two steps: formations, then roles. Who attacks appears when you pick an opponent.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start setup' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
