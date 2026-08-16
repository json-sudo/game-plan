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

async function placeScenarioAndOpenVisualize(
  mine: { count: number; y: number },
  opponent: { count: number; y: number },
) {
  renderApp(mine, opponent);
  await userEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));
  await userEvent.click(screen.getByRole('button', { name: 'Visualize' }));
  return screen.getByRole('region', { name: 'Visualize' });
}

const clickPiece = (name: string) => {
  fireEvent.pointerDown(screen.getAllByLabelText(name)[0]);
};

describe('Ball carrier selection', () => {
  it('shows no action controls until a carrier is chosen', async () => {
    const dialog = await placeScenarioAndOpenVisualize({ count: 6, y: 40 }, { count: 2, y: 60 });
    expect(within(dialog).getByText(/select.*carrier/i)).toBeInTheDocument();
    expect(within(dialog).queryByRole('group', { name: 'Action' })).not.toBeInTheDocument();
  });

  it('clicking a piece on the pitch designates it the carrier, revealing action selection, without starting a drag', async () => {
    const dialog = await placeScenarioAndOpenVisualize({ count: 6, y: 40 }, { count: 2, y: 60 });
    clickPiece('my team CB');
    expect(within(dialog).getByRole('group', { name: 'Action' })).toBeInTheDocument();
    expect(document.querySelector('.drag-ghost')).not.toBeInTheDocument();
  });
});

describe('Action selection', () => {
  it('offers Pass and Dribble once a carrier is chosen', async () => {
    const dialog = await placeScenarioAndOpenVisualize({ count: 6, y: 40 }, { count: 2, y: 60 });
    clickPiece('my team CB');
    const actionGroup = within(dialog).getByRole('group', { name: 'Action' });
    expect(within(actionGroup).getByRole('button', { name: 'Pass' })).toBeInTheDocument();
    expect(within(actionGroup).getByRole('button', { name: 'Dribble' })).toBeInTheDocument();
  });

  it('makes Pass unavailable when the attacking team has only 1 piece on the pitch', async () => {
    const dialog = await placeScenarioAndOpenVisualize({ count: 1, y: 40 }, { count: 6, y: 60 });
    clickPiece('my team CB');
    const actionGroup = within(dialog).getByRole('group', { name: 'Action' });
    const passButton = within(actionGroup).queryByRole('button', { name: 'Pass' });
    if (passButton) {
      expect(passButton).toBeDisabled();
    } else {
      expect(passButton).toBeNull();
    }
    expect(within(actionGroup).getByRole('button', { name: 'Dribble' })).toBeEnabled();
  });

  it('choosing Pass requires picking a teammate target before the run can proceed', async () => {
    const dialog = await placeScenarioAndOpenVisualize({ count: 6, y: 40 }, { count: 2, y: 60 });
    clickPiece('my team CB');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Pass' }));

    const targetGroup = within(dialog).getByRole('group', { name: /pass target/i });
    const targets = within(targetGroup).getAllByRole('button');
    expect(targets.length).toBeGreaterThan(0);

    const confirmButton = within(dialog).getByRole('button', { name: /confirm|run/i });
    expect(confirmButton).toBeDisabled();

    await userEvent.click(targets[0]);
    expect(confirmButton).toBeEnabled();
  });

  it('choosing Dribble requires picking a direction, with no distance control offered to the user', async () => {
    const dialog = await placeScenarioAndOpenVisualize({ count: 6, y: 40 }, { count: 2, y: 60 });
    clickPiece('my team CB');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dribble' }));

    const directionGroup = screen.getByRole('group', { name: /direction/i });
    const directions = within(directionGroup).getAllByRole('button');
    expect(directions.length).toBeGreaterThan(0);
    expect(dialog.querySelector('input[type="number"]')).toBeNull();
    expect(dialog.querySelector('input[type="range"]')).toBeNull();

    const confirmButton = within(dialog).getByRole('button', { name: /confirm|run/i });
    expect(confirmButton).toBeDisabled();

    await userEvent.click(directions[0]);
    expect(confirmButton).toBeEnabled();
  });
});

describe('Shoot/Clear contextual gating', () => {
  it('offers Shoot when the carrier is in the attacking third, and not otherwise', async () => {
    const dialog = await placeScenarioAndOpenVisualize({ count: 6, y: 20 }, { count: 2, y: 90 });
    clickPiece('my team CB');
    const actionGroup = within(dialog).getByRole('group', { name: 'Action' });
    expect(within(actionGroup).getByRole('button', { name: 'Shoot' })).toBeInTheDocument();
    expect(within(actionGroup).queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });

  it('offers neither Shoot nor Clear when the carrier is in the middle third', async () => {
    const dialog = await placeScenarioAndOpenVisualize({ count: 6, y: 45 }, { count: 2, y: 60 });
    clickPiece('my team CB');
    const actionGroup = within(dialog).getByRole('group', { name: 'Action' });
    expect(within(actionGroup).queryByRole('button', { name: 'Shoot' })).not.toBeInTheDocument();
    expect(within(actionGroup).queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });
});

describe('Attacker options gating', () => {
  it('leaves both options enabled when both teams are on the pitch', async () => {
    const dialog = await placeScenarioAndOpenVisualize({ count: 6, y: 40 }, { count: 2, y: 60 });
    const attackerGroup = within(dialog).getByRole('group', { name: 'Attacker' });
    expect(within(attackerGroup).getByRole('button', { name: /^mine$/i })).toBeEnabled();
    expect(within(attackerGroup).getByRole('button', { name: /^opponent$/i })).toBeEnabled();
  });
});
