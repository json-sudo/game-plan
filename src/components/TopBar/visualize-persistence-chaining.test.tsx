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
}: {
  mine: { count: number; y: number };
  opponent: { count: number; y: number };
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

function renderApp() {
  return render(
    <BoardProvider>
      <DragProvider>
        <NameEditorProvider>
          <VisualizeProvider>
            <TopBar />
            <Pitch />
            <PositionProbe />
            <ScenarioButton mine={{ count: 6, y: 40 }} opponent={{ count: 2, y: 60 }} />
          </VisualizeProvider>
        </NameEditorProvider>
      </DragProvider>
    </BoardProvider>,
  );
}

function confirmADribbleRun() {
  fireEvent.click(screen.getByRole('button', { name: 'Visualize' }));

  const panel = screen.getByRole('region', { name: 'Visualize' });
  const carrier = screen.getAllByLabelText('my team CB')[0];
  fireEvent.pointerDown(carrier);

  fireEvent.click(within(panel).getByRole('button', { name: 'Dribble' }));
  const directionGroup = screen.getByRole('group', { name: /direction/i });
  fireEvent.click(within(directionGroup).getAllByRole('button')[0]);

  const confirmButton = within(panel).getByRole('button', { name: /confirm|run/i });
  expect(confirmButton).toBeEnabled();
  fireEvent.click(confirmButton);
  return carrier;
}

function runFullVisualizeAnimation() {
  const carrier = confirmADribbleRun();
  act(() => {
    vi.advanceTimersByTime(VISUALIZE_PRE_ANIMATION_DELAY_MS);
  });
  act(() => {
    vi.advanceTimersByTime(VISUALIZE_ANIMATION_MS);
  });
  return carrier;
}

describe('Visualize persistence', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    window.location.hash = '';
  });

  it('once the animation completes, the moved pieces land at their new positions in the real BoardState', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));

    const carrierId = 'mine-1';
    const beforePos = screen.getByTestId(`pos-${carrierId}`).textContent;

    runFullVisualizeAnimation();

    const afterPos = screen.getByTestId(`pos-${carrierId}`).textContent;
    expect(afterPos).not.toBe(beforePos);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId(`pos-${carrierId}`).textContent).toBe(afterPos);
  });
});

describe('Visualize chaining', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    window.location.hash = '';
  });

  it('lets the user trigger Visualize again immediately after a run completes, without re-applying a Matchup', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));

    runFullVisualizeAnimation();

    expect(screen.getByRole('button', { name: 'Visualize' })).toBeEnabled();

    const carrierId = 'mine-1';
    const afterFirstRun = screen.getByTestId(`pos-${carrierId}`).textContent;

    confirmADribbleRun();
    act(() => {
      vi.advanceTimersByTime(VISUALIZE_PRE_ANIMATION_DELAY_MS);
    });
    act(() => {
      vi.advanceTimersByTime(VISUALIZE_ANIMATION_MS);
    });

    const afterSecondRun = screen.getByTestId(`pos-${carrierId}`).textContent;
    expect(afterSecondRun).not.toBe(afterFirstRun);
  });
});
