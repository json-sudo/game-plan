import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FirstRunHint } from '.';

describe('FirstRunHint', () => {
  it('shows the title, the three steps and the example', () => {
    render(<FirstRunHint />);
    expect(
      screen.getByRole('complementary', { name: 'How to use the example' }),
    ).toBeInTheDocument();
    expect(screen.getByText('See where every role goes')).toBeInTheDocument();
    const steps = screen.getAllByRole('listitem');
    expect(steps.map((step) => step.textContent)).toEqual([
      'Tap a zone on the map.',
      'Press Play.',
      'Step through with Next, or tap a player to change its role.',
    ]);
    expect(screen.getByText('4-3-3 DM Wide v 4-2-3-1 DM Wide')).toBeInTheDocument();
  });

  it('takes a title and an example', () => {
    render(<FirstRunHint title="Try this" example="4-4-2 v 4-4-2" />);
    expect(screen.getByText('Try this')).toBeInTheDocument();
    expect(screen.getByText('4-4-2 v 4-4-2')).toBeInTheDocument();
  });

  it('dismisses with Got it', async () => {
    const onDismiss = vi.fn();
    render(<FirstRunHint onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
