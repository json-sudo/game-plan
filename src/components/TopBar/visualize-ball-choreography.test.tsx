import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import {
  BoardProvider,
  useBoard,
  useBoardDispatch,
  VISUALIZE_PRE_ANIMATION_DELAY_MS,
  VISUALIZE_ANIMATION_MS,
} from '../../board/BoardContext';
import { DragProvider } from '../../board/DragContext';
import { NameEditorProvider } from '../NameEditor';
import { VisualizeProvider } from '../../board/VisualizeContext';
import { Pitch } from '../Pitch';
import { TopBar } from '.';

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
}

function ScenarioButton({
  mine,
  opponent,
  ball,
}: {
  mine: { count: number; y: number };
  opponent: { count: number; y: number };
  ball?: { x: number; y: number };
}) {
  const dispatch = useBoardDispatch();
  const place = () => {
    for (let i = 1; i <= mine.count; i++) {
      dispatch({ type: 'PLACE_PIECE', id: `mine-${i}`, position: { x: 5 + i * 3, y: mine.y } });
    }
    for (let i = 1; i <= opponent.count; i++) {
      dispatch({
        type: 'PLACE_PIECE',
        id: `opponent-${i}`,
        position: { x: 5 + i * 3, y: opponent.y },
      });
    }
    if (ball) {
      dispatch({ type: 'PLACE_PIECE', id: 'ball', position: ball });
    }
  };
  return (
    <button type="button" onClick={place}>
      apply-scenario
    </button>
  );
}

function PositionProbe() {
  const board = useBoard();
  return (
    <ul>
      {board.pieces
        .filter((p) => p.position !== undefined)
        .map((p) => (
          <li key={p.id} data-testid={`pos-${p.id}`}>
            {p.position!.x},{p.position!.y}
          </li>
        ))}
    </ul>
  );
}

function renderApp(ball?: { x: number; y: number }) {
  return render(
    <BoardProvider>
      <DragProvider>
        <NameEditorProvider>
          <VisualizeProvider>
            <TopBar />
            <Pitch />
            <PositionProbe />
            <ScenarioButton mine={{ count: 6, y: 40 }} opponent={{ count: 2, y: 60 }} ball={ball} />
          </VisualizeProvider>
        </NameEditorProvider>
      </DragProvider>
    </BoardProvider>,
  );
}

function openVisualizeAndPickCarrier() {
  fireEvent.click(screen.getByRole('button', { name: 'Visualize' }));
  fireEvent.pointerDown(screen.getAllByLabelText('my team CB')[0]);
}

function finishDribbleConfirm() {
  const panel = screen.getByRole('region', { name: 'Visualize' });

  fireEvent.click(within(panel).getByRole('button', { name: 'Dribble' }));
  const directionGroup = screen.getByRole('group', { name: /direction/i });
  fireEvent.click(within(directionGroup).getAllByRole('button')[0]);

  const confirmButton = within(panel).getByRole('button', { name: /confirm|run/i });
  expect(confirmButton).toBeEnabled();
  fireEvent.click(confirmButton);
}

describe('VISUALIZE_ANIMATION_MS / VISUALIZE_PRE_ANIMATION_DELAY_MS (revised 2026-08-02)', () => {
  it('VISUALIZE_ANIMATION_MS is a flat 4000ms', () => {
    expect(VISUALIZE_ANIMATION_MS).toBe(4000);
  });

  it('VISUALIZE_PRE_ANIMATION_DELAY_MS stays 1200ms', () => {
    expect(VISUALIZE_PRE_ANIMATION_DELAY_MS).toBe(1200);
  });
});

describe('Ball choreography: two-phase move (ball already positioned elsewhere)', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    window.location.hash = '';
  });

  it('moves the ball to the carrier as soon as the carrier is picked, holds it there through the pause, then commits its outcome position at the start of the run', () => {
    renderApp({ x: 70, y: 95 });
    fireEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));

    const oldBallPos = screen.getByTestId('pos-ball').textContent;
    const carrierPreRunPos = screen.getByTestId('pos-mine-1').textContent;
    expect(oldBallPos).toBe('70,95');

    openVisualizeAndPickCarrier();
    expect(screen.getByTestId('pos-ball').textContent).toBe(carrierPreRunPos);

    finishDribbleConfirm();

    act(() => {
      vi.advanceTimersByTime(VISUALIZE_PRE_ANIMATION_DELAY_MS - 1);
    });
    expect(screen.getByTestId('pos-ball').textContent).toBe(carrierPreRunPos);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    const finalBallPos = screen.getByTestId('pos-ball').textContent;
    expect(screen.getByLabelText('pitch')).toHaveClass('pitch--animating');

    act(() => {
      vi.advanceTimersByTime(VISUALIZE_ANIMATION_MS);
    });
    expect(screen.getByTestId('pos-ball').textContent).toBe(finalBallPos);
    expect(finalBallPos).not.toBe(carrierPreRunPos);
    expect(finalBallPos).not.toBe(oldBallPos);
  });
});

describe('Ball choreography: two-phase move (ball never previously placed)', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    window.location.hash = '';
  });

  it('places the ball at the carrier as soon as the carrier is picked, then transitions normally to its outcome position', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));

    expect(screen.queryByTestId('pos-ball')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ball')).not.toBeInTheDocument();

    const carrierPreRunPos = screen.getByTestId('pos-mine-1').textContent;

    openVisualizeAndPickCarrier();
    expect(screen.getByTestId('pos-ball').textContent).toBe(carrierPreRunPos);

    finishDribbleConfirm();

    act(() => {
      vi.advanceTimersByTime(VISUALIZE_PRE_ANIMATION_DELAY_MS - 1);
    });
    expect(screen.getByTestId('pos-ball').textContent).toBe(carrierPreRunPos);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    const finalBallPos = screen.getByTestId('pos-ball').textContent;
    expect(finalBallPos).not.toBe(carrierPreRunPos);
    expect(screen.getByLabelText('pitch')).toHaveClass('pitch--animating');

    act(() => {
      vi.advanceTimersByTime(VISUALIZE_ANIMATION_MS);
    });
    expect(screen.getByTestId('pos-ball').textContent).toBe(finalBallPos);
  });
});
