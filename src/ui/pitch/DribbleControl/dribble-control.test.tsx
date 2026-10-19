import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DribbleControl, type DribbleDirection } from '.';

function renderControl() {
  const onDribble = vi.fn<(direction: DribbleDirection) => void>();
  render(
    <svg>
      <DribbleControl x={38} y={50} onDribble={onDribble}>
        <circle tabIndex={0} data-testid="carrier" />
      </DribbleControl>
    </svg>,
  );
  return onDribble;
}

describe('DribbleControl', () => {
  it('calls onDribble with the direction of each button', async () => {
    const onDribble = renderControl();
    await userEvent.click(screen.getByRole('button', { name: 'Dribble forward' }));
    await userEvent.click(screen.getByRole('button', { name: 'Dribble right' }));
    await userEvent.click(screen.getByRole('button', { name: 'Dribble back' }));
    await userEvent.click(screen.getByRole('button', { name: 'Dribble left' }));
    expect(onDribble.mock.calls).toEqual([['up'], ['right'], ['down'], ['left']]);
  });

  it('places the buttons 5.4 units around the carrier', () => {
    renderControl();
    expect(screen.getByRole('button', { name: 'Dribble forward' })).toHaveAttribute(
      'transform',
      'translate(38 44.6)',
    );
    expect(screen.getByRole('button', { name: 'Dribble left' })).toHaveAttribute(
      'transform',
      'translate(32.6 50)',
    );
  });

  it('dribbles with arrow keys on the focused carrier', async () => {
    const onDribble = renderControl();
    screen.getByTestId('carrier').focus();
    await userEvent.keyboard('{ArrowUp}{ArrowRight}{ArrowDown}{ArrowLeft}');
    expect(onDribble.mock.calls).toEqual([['up'], ['right'], ['down'], ['left']]);
  });

  it('takes the names of its buttons from the caller, for a team attacking the other way', () => {
    render(
      <svg>
        <DribbleControl
          x={38}
          y={50}
          labels={{
            up: 'Dribble back',
            right: 'Dribble left',
            down: 'Dribble forward',
            left: 'Dribble right',
          }}
        />
      </svg>,
    );
    expect(screen.getByRole('button', { name: 'Dribble forward' })).toHaveAttribute(
      'transform',
      'translate(38 55.4)',
    );
  });
});
