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

describe('On-pitch visual feedback', () => {
  it('shows no highlight ring before a carrier is selected', async () => {
    await placeScenarioAndOpenVisualize();
    expect(document.querySelectorAll('.pitch__visualize-ring')).toHaveLength(0);
  });

  it('shows a highlight ring on the carrier once selected, for any action', async () => {
    const dialog = await placeScenarioAndOpenVisualize();
    clickPiece('my team CB');
    expect(document.querySelectorAll('.pitch__visualize-ring')).toHaveLength(1);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Dribble' }));
    expect(document.querySelectorAll('.pitch__visualize-ring')).toHaveLength(1);
  });

  it('adds a target ring and a dashed connecting line once a Pass target is chosen', async () => {
    const dialog = await placeScenarioAndOpenVisualize();
    clickPiece('my team CB');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Pass' }));
    expect(document.querySelectorAll('.pitch__visualize-ring')).toHaveLength(1);
    expect(document.querySelector('.pitch__visualize-line')).not.toBeInTheDocument();

    const targetGroup = within(dialog).getByRole('group', { name: /pass target/i });
    await userEvent.click(within(targetGroup).getAllByRole('button')[0]);

    expect(document.querySelectorAll('.pitch__visualize-ring')).toHaveLength(2);
    expect(document.querySelector('.pitch__visualize-line')).toBeInTheDocument();
  });

  it('removes the target ring and line (keeping the carrier ring) when switching away from Pass', async () => {
    const dialog = await placeScenarioAndOpenVisualize();
    clickPiece('my team CB');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Pass' }));
    const targetGroup = within(dialog).getByRole('group', { name: /pass target/i });
    await userEvent.click(within(targetGroup).getAllByRole('button')[0]);
    expect(document.querySelectorAll('.pitch__visualize-ring')).toHaveLength(2);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Dribble' }));
    expect(document.querySelectorAll('.pitch__visualize-ring')).toHaveLength(1);
    expect(document.querySelector('.pitch__visualize-line')).not.toBeInTheDocument();
  });

  it('clears all highlights when the panel is dismissed', async () => {
    const dialog = await placeScenarioAndOpenVisualize();
    clickPiece('my team CB');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Pass' }));
    const targetGroup = within(dialog).getByRole('group', { name: /pass target/i });
    await userEvent.click(within(targetGroup).getAllByRole('button')[0]);
    expect(document.querySelectorAll('.pitch__visualize-ring')).toHaveLength(2);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(document.querySelectorAll('.pitch__visualize-ring')).toHaveLength(0);
    expect(document.querySelector('.pitch__visualize-line')).not.toBeInTheDocument();
  });
});
