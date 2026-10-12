import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirstRunHint } from '.';

beforeEach(() => {
  window.matchMedia = vi
    .fn<() => { matches: boolean }>()
    .mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
});

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
    expect(screen.getByText('4-3-3 DM Wide vs 4-2-3-1 DM Wide')).toBeInTheDocument();
  });

  it('uses the approved step 3 copy on phones', () => {
    window.matchMedia = vi
      .fn<() => { matches: boolean }>()
      .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    render(<FirstRunHint />);
    expect(
      screen.getByText('Step through with Next, or tap a player to see its role.'),
    ).toBeInTheDocument();
  });

  it('takes a title and an example', () => {
    render(<FirstRunHint title="Try this" example="4-4-2 vs 4-4-2" />);
    expect(screen.getByText('Try this')).toBeInTheDocument();
    expect(screen.getByText('4-4-2 vs 4-4-2')).toBeInTheDocument();
  });

  it('dismisses with Got it', async () => {
    const onDismiss = vi.fn<() => void>();
    render(<FirstRunHint onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
