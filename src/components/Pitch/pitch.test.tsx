import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BoardProvider, FORMATION_ANIMATION_MS, useBoardDispatch } from '../../board/BoardContext';
import { DragProvider } from '../../board/DragContext';
import { Pitch } from '.';

function DispatchProbe() {
  const dispatch = useBoardDispatch();
  return (
    <div>
      <button onClick={() => dispatch({ type: 'APPLY_FORMATION', team: 'mine', name: '4-3-3' })}>
        apply-formation
      </button>
      <button
        onClick={() =>
          dispatch({
            type: 'APPLY_MATCHUP',
            attacker: 'mine',
            formations: { mine: '4-3-3', opponent: '4-4-2' },
          })
        }
      >
        apply-matchup
      </button>
      <button
        onClick={() => dispatch({ type: 'PLACE_PIECE', id: 'mine-1', position: { x: 10, y: 20 } })}
      >
        place-piece
      </button>
      <button
        onClick={() => dispatch({ type: 'PLACE_PIECE', id: 'ball', position: { x: 30, y: 40 } })}
      >
        place-ball
      </button>
    </div>
  );
}

function renderPitch() {
  return render(
    <BoardProvider>
      <DragProvider>
        <Pitch />
        <DispatchProbe />
      </DragProvider>
    </BoardProvider>,
  );
}

const pitchSvg = () => screen.getByRole('img', { name: 'pitch' });

afterEach(() => {
  vi.useRealTimers();
});

describe('formation apply animation', () => {
  it('turns on the animating class after a preset apply', () => {
    renderPitch();
    expect(pitchSvg()).not.toHaveClass('pitch--animating');
    fireEvent.click(screen.getByRole('button', { name: 'apply-formation' }));
    expect(pitchSvg()).toHaveClass('pitch--animating');
  });

  it('turns on the animating class after a matchup apply', () => {
    renderPitch();
    fireEvent.click(screen.getByRole('button', { name: 'apply-matchup' }));
    expect(pitchSvg()).toHaveClass('pitch--animating');
  });

  it('does not animate a plain PLACE_PIECE', () => {
    renderPitch();
    fireEvent.click(screen.getByRole('button', { name: 'place-piece' }));
    expect(pitchSvg()).not.toHaveClass('pitch--animating');
  });

  it('switches the animate state off after the transition duration', () => {
    vi.useFakeTimers();
    renderPitch();
    fireEvent.click(screen.getByRole('button', { name: 'apply-formation' }));
    expect(pitchSvg()).toHaveClass('pitch--animating');
    act(() => {
      vi.advanceTimersByTime(FORMATION_ANIMATION_MS - 1);
    });
    expect(pitchSvg()).toHaveClass('pitch--animating');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(pitchSvg()).not.toHaveClass('pitch--animating');
  });

  it('exposes the duration as a CSS variable on the pitch', () => {
    renderPitch();
    expect(pitchSvg().style.getPropertyValue('--formation-anim-duration')).toBe(
      `${FORMATION_ANIMATION_MS}ms`,
    );
  });
});

describe('piece rendering via <g transform>', () => {
  it('positions a player piece with translate and draws children at the origin', () => {
    renderPitch();
    fireEvent.click(screen.getByRole('button', { name: 'place-piece' }));
    const piece = screen.getByLabelText('my team CB');
    expect(piece).toHaveAttribute('transform', 'translate(10 20)');
    const circle = piece.querySelector('circle');
    expect(circle).toHaveAttribute('r', '2.2');
    expect(circle).not.toHaveAttribute('cx');
    const label = piece.querySelector('text');
    expect(label).toHaveTextContent('CB');
    expect(label).not.toHaveAttribute('x');
  });

  it('positions the ball image offset from the origin', () => {
    renderPitch();
    fireEvent.click(screen.getByRole('button', { name: 'place-ball' }));
    const ball = screen.getByLabelText('ball');
    expect(ball).toHaveAttribute('transform', 'translate(30 40)');
    const image = ball.querySelector('image');
    expect(image).toHaveAttribute('x', '-1.2');
    expect(image).toHaveAttribute('y', '-1.2');
    expect(image).toHaveAttribute('width', '2.4');
  });
});
