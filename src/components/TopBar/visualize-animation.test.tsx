import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import {
  BoardProvider,
  FORMATION_ANIMATION_MS,
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

function renderApp() {
  return render(
    <BoardProvider>
      <DragProvider>
        <NameEditorProvider>
          <VisualizeProvider>
            <TopBar />
            <Pitch />
            <ScenarioButton mine={{ count: 6, y: 40 }} opponent={{ count: 2, y: 60 }} />
          </VisualizeProvider>
        </NameEditorProvider>
      </DragProvider>
    </BoardProvider>,
  );
}

const pitchSvg = () => screen.getByRole('img', { name: 'pitch' });

function confirmADribbleRun() {
  renderApp();
  fireEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));
  fireEvent.click(screen.getByRole('button', { name: 'Visualize' }));

  const panel = screen.getByRole('region', { name: 'Visualize' });
  fireEvent.pointerDown(screen.getAllByLabelText('my team CB')[0]);

  fireEvent.click(within(panel).getByRole('button', { name: 'Dribble' }));
  const directionGroup = screen.getByRole('group', { name: /direction/i });
  fireEvent.click(within(directionGroup).getAllByRole('button')[0]);

  const confirmButton = within(panel).getByRole('button', { name: /confirm|run/i });
  expect(confirmButton).toBeEnabled();
  fireEvent.click(confirmButton);
}

describe('Visualize confirm -> pre-animation delay -> animation timing', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    window.location.hash = '';
  });

  it('closes the panel immediately on Confirm but does not move pieces yet', () => {
    confirmADribbleRun();

    expect(screen.queryByRole('region', { name: 'Visualize' })).not.toBeInTheDocument();
    expect(pitchSvg()).not.toHaveClass('pitch--animating');
  });

  it('leaves the board still for the whole pre-animation delay, then animates at the 1200ms mark (main glide handoff)', () => {
    confirmADribbleRun();
    expect(screen.queryByRole('region', { name: 'Visualize' })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(VISUALIZE_PRE_ANIMATION_DELAY_MS - 1);
    });
    expect(pitchSvg()).not.toHaveClass('pitch--animating');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(pitchSvg()).toHaveClass('pitch--animating');
  });

  it('stops animating once the glide duration elapses after the pre-animation delay', () => {
    confirmADribbleRun();

    act(() => {
      vi.advanceTimersByTime(VISUALIZE_PRE_ANIMATION_DELAY_MS);
    });
    expect(pitchSvg()).toHaveClass('pitch--animating');

    act(() => {
      vi.advanceTimersByTime(VISUALIZE_ANIMATION_MS - 1);
    });
    expect(pitchSvg()).toHaveClass('pitch--animating');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(pitchSvg()).not.toHaveClass('pitch--animating');
  });

  it('exposes VISUALIZE_PRE_ANIMATION_DELAY_MS (1000-3000ms) and VISUALIZE_ANIMATION_MS, both distinct from FORMATION_ANIMATION_MS', () => {
    expect(VISUALIZE_PRE_ANIMATION_DELAY_MS).toBeGreaterThanOrEqual(1000);
    expect(VISUALIZE_PRE_ANIMATION_DELAY_MS).toBeLessThanOrEqual(3000);
    expect(VISUALIZE_PRE_ANIMATION_DELAY_MS).not.toBe(FORMATION_ANIMATION_MS);
    expect(VISUALIZE_ANIMATION_MS).not.toBe(FORMATION_ANIMATION_MS);
  });
});
