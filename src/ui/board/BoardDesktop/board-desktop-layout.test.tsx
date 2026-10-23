import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExampleDocument } from '../../../state/example';
import { createInitialDocument } from '../../../state/document';
import { createPitchStore } from '../../../state/store';
import { BoardDesktop } from '.';

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  window.matchMedia = vi.fn<(query: string) => MediaQueryList>().mockImplementation((query) => {
    const max = Number(/max-width: (\d+)px/.exec(query)?.[1]);
    return {
      matches: width <= max,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as MediaQueryList;
  });
}

beforeEach(() => setViewport(1366, 680));
afterEach(() => setViewport(1024, 768));

describe('BoardDesktop sizing', () => {
  it('sets the pitch size variables and layout tier from the viewport', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    const { container } = render(<BoardDesktop store={store} />);
    const board = container.firstElementChild as HTMLElement;
    expect(board).toHaveAttribute('data-layout', 'three');
    expect(board).toHaveAttribute('data-labels', 'compact');
    expect(board.style.getPropertyValue('--gp-pitch-w')).toBe('454px');
    expect(board.style.getPropertyValue('--gp-pitch-h')).toBe('596px');
  });

  it('marks the top bar as compact below 1440px', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    const { container } = render(<BoardDesktop store={store} />);
    expect(container.querySelector('header')).toHaveAttribute('data-compact', 'true');
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });
});

describe('BoardDesktop Open pitch', () => {
  it('shows the Matchup step, the ball card and the bench, with no zone map or transport', () => {
    const store = createPitchStore({ doc: createInitialDocument(), ui: { mode: 'openPitch' } });
    render(<BoardDesktop store={store} />);
    expect(screen.getByRole('region', { name: 'Matchup' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Ball' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bench' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ball zone' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument();
  });

  it('shows the zone map in FM mode instead', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardDesktop store={store} />);
    expect(screen.getByRole('heading', { name: 'Ball zone' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Matchup' })).not.toBeInTheDocument();
  });

  it('moves the ball with the arrow keys and back to the centre spot from the ball card', () => {
    const store = createPitchStore({ doc: createInitialDocument(), ui: { mode: 'openPitch' } });
    render(<BoardDesktop store={store} />);
    const start = store.getState().doc.ball;
    const ball = screen.getByRole('button', { name: 'Ball' });
    fireEvent.keyDown(ball, { key: 'ArrowRight' });
    expect(store.getState().doc.ball.x).toBeCloseTo(start.x + 1);
    fireEvent.keyDown(ball, { key: 'ArrowDown', shiftKey: true });
    expect(store.getState().doc.ball.y).toBeCloseTo(start.y + 5);
    const card = screen.getByRole('region', { name: 'Ball' });
    fireEvent.click(within(card).getByRole('button', { name: 'Ball to the centre spot' }));
    expect(store.getState().doc.ball).toEqual(start);
  });
});
