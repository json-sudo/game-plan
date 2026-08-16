import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardProvider, useBoardDispatch } from '../../board/BoardContext';
import { DragProvider } from '../../board/DragContext';
import { NameEditorProvider } from '../NameEditor';
import { VisualizeProvider } from '../../board/VisualizeContext';
import { Pitch } from '../Pitch';
import { TopBar } from '.';

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  mockMatchMedia(false);
});

afterEach(() => {
  localStorage.clear();
  window.location.hash = '';
});

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

async function placeScenarioAndOpenVisualize() {
  renderApp();
  await userEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));
  await userEvent.click(screen.getByRole('button', { name: 'Visualize' }));
  return screen.getByRole('region', { name: 'Visualize' });
}

const clickPiece = (name: string) => {
  fireEvent.pointerDown(screen.getAllByLabelText(name)[0]);
};

describe('Dribble-direction floating panel', () => {
  it('does not show the direction panel when no action, or an action other than Dribble, is selected', async () => {
    const dialog = await placeScenarioAndOpenVisualize();
    clickPiece('my team CB');
    expect(screen.queryByRole('region', { name: /dribble/i })).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Pass' }));
    expect(screen.queryByRole('region', { name: /dribble/i })).not.toBeInTheDocument();
  });

  it('shows a second floating panel with 4 direction controls when Dribble is selected', async () => {
    const dialog = await placeScenarioAndOpenVisualize();
    clickPiece('my team CB');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dribble' }));

    const directionPanel = screen.getByRole('region', { name: /dribble/i });
    const directionGroup = within(directionPanel).getByRole('group', { name: /direction/i });
    const directions = within(directionGroup).getAllByRole('button');
    expect(directions).toHaveLength(4);
  });

  it('no longer shows direction buttons inline in the main Visualize panel', async () => {
    const dialog = await placeScenarioAndOpenVisualize();
    clickPiece('my team CB');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dribble' }));

    expect(within(dialog).queryByRole('group', { name: /direction/i })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /confirm|run/i })).toBeInTheDocument();
  });

  it('updates its descriptive text when a direction is picked', async () => {
    const dialog = await placeScenarioAndOpenVisualize();
    clickPiece('my team CB');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dribble' }));

    const directionPanel = screen.getByRole('region', { name: /dribble/i });

    await userEvent.click(within(directionPanel).getByRole('button', { name: 'Forward' }));
    expect(within(directionPanel).getByText(/forward/i)).toBeInTheDocument();
  });

  it('closes the direction panel when a different action is chosen', async () => {
    const dialog = await placeScenarioAndOpenVisualize();
    clickPiece('my team CB');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dribble' }));
    expect(screen.getByRole('region', { name: /dribble/i })).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Pass' }));
    expect(screen.queryByRole('region', { name: /dribble/i })).not.toBeInTheDocument();
  });
});
