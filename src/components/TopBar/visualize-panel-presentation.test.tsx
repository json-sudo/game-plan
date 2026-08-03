import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

function renderApp(mine: { count: number; y: number }, opponent: { count: number; y: number }) {
  return render(
    <BoardProvider>
      <DragProvider>
        <NameEditorProvider>
          <VisualizeProvider>
            <TopBar />
            <Pitch />
            <ScenarioButton mine={mine} opponent={opponent} />
          </VisualizeProvider>
        </NameEditorProvider>
      </DragProvider>
    </BoardProvider>,
  );
}

async function openVisualizeSettingsStep(
  mine: { count: number; y: number },
  opponent: { count: number; y: number },
) {
  renderApp(mine, opponent);
  await userEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));
  await userEvent.click(screen.getByRole('button', { name: 'Visualize' }));

  return screen.getByText(/select a ball carrier/i);
}

const clickPiece = (name: string) => {
  fireEvent.pointerDown(screen.getAllByLabelText(name)[0]);
};

describe('Settings-step presentation (non-blocking panel)', () => {
  it('does not nest the carrier/action panel inside a role="dialog" element', async () => {
    const panelContent = await openVisualizeSettingsStep({ count: 6, y: 40 }, { count: 2, y: 60 });

    const dialogs = screen.queryAllByRole('dialog');
    for (const dialog of dialogs) {
      expect(dialog.contains(panelContent)).toBe(false);
    }
  });

  it('renders no full-viewport backdrop element while the carrier/action panel is open', async () => {
    await openVisualizeSettingsStep({ count: 6, y: 40 }, { count: 2, y: 60 });

    expect(document.querySelector('[class*="backdrop" i]')).not.toBeInTheDocument();
  });

  it('still lets a same-team piece click on the pitch select the carrier once the panel is non-blocking', async () => {
    await openVisualizeSettingsStep({ count: 6, y: 40 }, { count: 2, y: 60 });

    clickPiece('my team CB');

    expect(screen.getByRole('group', { name: 'Action' })).toBeInTheDocument();
    expect(document.querySelector('.drag-ghost')).not.toBeInTheDocument();
  });

  it('dismissing the panel stops the visualize run and restores normal pitch drag/drop', async () => {
    await openVisualizeSettingsStep({ count: 6, y: 40 }, { count: 2, y: 60 });

    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    fireEvent.pointerDown(screen.getAllByLabelText(/my team/i)[0], { clientX: 10, clientY: 10 });
    expect(document.querySelector('.drag-ghost')).toBeInTheDocument();
  });
});
