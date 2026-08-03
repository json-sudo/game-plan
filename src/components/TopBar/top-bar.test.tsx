import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardProvider, useBoard, useBoardDispatch } from '../../board/BoardContext';
import { boardReducer, createInitialBoard } from '../../board/boardReducer';
import { buildShareHash } from '../../board/shareCodec';
import { NameEditorProvider } from '../NameEditor';
import { TopBar } from '.';

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  mockMatchMedia(false);
});

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  window.location.hash = '';
});

function PlacedProbe() {
  const board = useBoard();
  const placed = (team: 'mine' | 'opponent') =>
    board.pieces.filter((p) => p.team === team && p.type === 'player' && p.position !== undefined)
      .length;
  return (
    <div>
      <span data-testid="placed-mine">{placed('mine')}</span>
      <span data-testid="placed-opponent">{placed('opponent')}</span>
      <span data-testid="formation-mine">{board.formation?.mine ?? 'none'}</span>
      <span data-testid="formation-opponent">{board.formation?.opponent ?? 'none'}</span>
      <span data-testid="labels-mine">
        {board.pieces
          .filter((p) => p.team === 'mine' && p.type === 'player' && p.position !== undefined)
          .map((p) => p.label)
          .join(',')}
      </span>
    </div>
  );
}

function renderTopBar() {
  return render(
    <BoardProvider>
      <NameEditorProvider>
        <TopBar />
        <PlacedProbe />
      </NameEditorProvider>
    </BoardProvider>,
  );
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

function renderTopBarWithScenario(
  mine: { count: number; y: number },
  opponent: { count: number; y: number },
) {
  return render(
    <BoardProvider>
      <NameEditorProvider>
        <TopBar />
        <PlacedProbe />
        <ScenarioButton mine={mine} opponent={opponent} />
      </NameEditorProvider>
    </BoardProvider>,
  );
}

const openModal = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Formation' }));
  return screen.getByRole('dialog', { name: 'Formation preset' });
};

describe('Formation Preset modal', () => {
  it('opens from the top bar and lists the five formations', async () => {
    renderTopBar();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await openModal();
    for (const name of ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /My Team/ })).toHaveClass('is-active');
  });

  it('closes via X and Escape without changing the board', async () => {
    renderTopBar();
    await openModal();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await openModal();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('0');
    expect(screen.getByTestId('formation-mine')).toHaveTextContent('none');
  });

  it('applies a formation to my team and closes', async () => {
    renderTopBar();
    await openModal();
    await userEvent.click(screen.getByRole('button', { name: '4-3-3' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');
    expect(screen.getByTestId('placed-opponent')).toHaveTextContent('0');
    expect(screen.getByTestId('formation-mine')).toHaveTextContent('4-3-3');
  });

  it('applies to the opponent when toggled', async () => {
    renderTopBar();
    await openModal();
    await userEvent.click(screen.getByRole('button', { name: /Opponent/ }));
    await userEvent.click(screen.getByRole('button', { name: '4-4-2' }));
    expect(screen.getByTestId('placed-opponent')).toHaveTextContent('10');
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('0');
  });
});

describe('Matchup mode', () => {
  const enterMatchup = async () => {
    await openModal();
    await userEvent.click(screen.getByRole('button', { name: 'Matchup' }));
  };
  const picker = (team: 'My Team' | 'Opponent') =>
    within(screen.getByRole('group', { name: `${team} formation` }));

  it('reveals attacker toggle and per-team pickers with defaults, without applying', async () => {
    renderTopBar();
    await enterMatchup();
    expect(screen.getByRole('button', { name: 'My Team attacks' })).toHaveClass('is-active');
    expect(picker('My Team').getByRole('button', { name: '4-3-3' })).toHaveClass('is-active');
    expect(picker('Opponent').getByRole('button', { name: '4-3-3' })).toHaveClass('is-active');

    await userEvent.click(picker('My Team').getByRole('button', { name: '4-4-2' }));
    expect(picker('My Team').getByRole('button', { name: '4-4-2' })).toHaveClass('is-active');
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('0');
    expect(screen.getByTestId('placed-opponent')).toHaveTextContent('0');
  });

  it('applies both teams on Apply and closes', async () => {
    renderTopBar();
    await enterMatchup();
    await userEvent.click(picker('My Team').getByRole('button', { name: '4-4-2' }));
    await userEvent.click(picker('Opponent').getByRole('button', { name: '3-5-2' }));
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');
    expect(screen.getByTestId('placed-opponent')).toHaveTextContent('10');
    expect(screen.getByTestId('formation-mine')).toHaveTextContent('4-4-2');
    expect(screen.getByTestId('formation-opponent')).toHaveTextContent('3-5-2');
  });

  it("defaults pickers to each team's recorded formation", async () => {
    renderTopBar();
    await openModal();
    await userEvent.click(screen.getByRole('button', { name: '4-2-3-1' }));
    await enterMatchup();
    expect(picker('My Team').getByRole('button', { name: '4-2-3-1' })).toHaveClass('is-active');
    expect(picker('Opponent').getByRole('button', { name: '4-3-3' })).toHaveClass('is-active');
  });

  it('switching back to a single team restores click-to-apply', async () => {
    renderTopBar();
    await enterMatchup();
    await userEvent.click(screen.getByRole('button', { name: /^My Team$/ }));
    await userEvent.click(screen.getByRole('button', { name: '4-3-3' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');
    expect(screen.getByTestId('placed-opponent')).toHaveTextContent('0');
  });
});

describe('Matchup mode Visualize toggle', () => {
  const enterMatchup = async () => {
    await openModal();
    await userEvent.click(screen.getByRole('button', { name: 'Matchup' }));
  };

  it('shows a Visualize toggle alongside the attacker toggle and formation pickers, off by default', async () => {
    renderTopBar();
    await enterMatchup();
    expect(screen.getByRole('button', { name: 'My Team attacks' })).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'My Team formation' }),
    ).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Visualize' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('is not gated by piece count — the toggle is available even on an empty pitch', async () => {
    renderTopBar();
    await enterMatchup();
    expect(screen.getByRole('button', { name: 'Visualize' })).toBeEnabled();
  });

  it('with the toggle off, Apply behaves exactly as today: places both teams and closes (regression)', async () => {
    renderTopBar();
    await enterMatchup();
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');
    expect(screen.getByTestId('placed-opponent')).toHaveTextContent('10');
  });

  it('with the toggle on, Apply places the matchup but proceeds into the visualization-settings step instead of closing', async () => {
    renderTopBar();
    await enterMatchup();
    await userEvent.click(screen.getByRole('button', { name: 'Visualize' }));
    expect(screen.getByRole('button', { name: 'Visualize' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));

    // The matchup is applied even though the flow continues.
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');
    expect(screen.getByTestId('placed-opponent')).toHaveTextContent('10');

    // The flow moves into a new step rather than closing: the matchup-picking UI
    // (Apply button, per-team formation pickers) is gone, but a dialog remains open.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'My Team formation' }),
    ).not.toBeInTheDocument();
  });
});

describe('Header Visualize button — gating', () => {
  it('is disabled with zero pieces placed', () => {
    renderTopBar();
    expect(screen.getByRole('button', { name: 'Visualize' })).toBeDisabled();
  });

  it('stays disabled below 7 pieces total, even split evenly across both teams', async () => {
    renderTopBarWithScenario({ count: 3, y: 60 }, { count: 3, y: 40 });
    await userEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('3');
    expect(screen.getByTestId('placed-opponent')).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: 'Visualize' })).toBeDisabled();
  });

  it('stays disabled at >= 7 total when the defending side (opponent, since My Team is attacking from the top half) has fewer than 2 pieces', async () => {
    renderTopBarWithScenario({ count: 6, y: 40 }, { count: 1, y: 60 });
    await userEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('6');
    expect(screen.getByTestId('placed-opponent')).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: 'Visualize' })).toBeDisabled();
  });

  it('stays disabled at >= 7 total when the defending side (My Team, in its own bottom half) has fewer than 2 pieces', async () => {
    renderTopBarWithScenario({ count: 1, y: 90 }, { count: 6, y: 10 });
    await userEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('1');
    expect(screen.getByTestId('placed-opponent')).toHaveTextContent('6');
    expect(screen.getByRole('button', { name: 'Visualize' })).toBeDisabled();
  });

  it('is enabled once total >= 7 pieces and the defending side has >= 2 pieces', async () => {
    renderTopBarWithScenario({ count: 6, y: 40 }, { count: 2, y: 60 });
    await userEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));
    expect(screen.getByRole('button', { name: 'Visualize' })).toBeEnabled();
  });
});

describe('Header Visualize button — entry point', () => {
  it('starts the visualization-settings step directly against the current board, without re-applying any formation', async () => {
    renderTopBarWithScenario({ count: 6, y: 40 }, { count: 2, y: 60 });
    await userEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));

    await userEvent.click(screen.getByRole('button', { name: 'Visualize' }));

    // Board placement is untouched — no formation/matchup got applied on click.
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('6');
    expect(screen.getByTestId('placed-opponent')).toHaveTextContent('2');
    expect(screen.getByTestId('formation-mine')).toHaveTextContent('none');
    expect(screen.getByTestId('formation-opponent')).toHaveTextContent('none');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('defaults to My Team attacking when My Team is placed in the top half', async () => {
    renderTopBarWithScenario({ count: 6, y: 40 }, { count: 2, y: 60 });
    await userEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));

    await userEvent.click(screen.getByRole('button', { name: 'Visualize' }));

    expect(screen.getByRole('button', { name: 'My Team attacks' })).toHaveClass('is-active');
  });

  it('defaults to My Team defending when My Team is placed in the bottom half', async () => {
    renderTopBarWithScenario({ count: 6, y: 60 }, { count: 2, y: 40 });
    await userEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));

    await userEvent.click(screen.getByRole('button', { name: 'Visualize' }));

    expect(screen.getByRole('button', { name: 'Opponent attacks' })).toHaveClass('is-active');
  });

  it('lets the user override the inferred attacker default via the attacker toggle', async () => {
    renderTopBarWithScenario({ count: 6, y: 40 }, { count: 2, y: 60 });
    await userEvent.click(screen.getByRole('button', { name: 'apply-scenario' }));

    await userEvent.click(screen.getByRole('button', { name: 'Visualize' }));
    expect(screen.getByRole('button', { name: 'My Team attacks' })).toHaveClass('is-active');

    await userEvent.click(screen.getByRole('button', { name: 'Opponent attacks' }));
    expect(screen.getByRole('button', { name: 'Opponent attacks' })).toHaveClass('is-active');
  });
});

describe('Clear and Reset buttons', () => {
  it('render next to Formation with an icon whose strokes inherit currentColor', () => {
    renderTopBar();
    for (const name of ['Clear pitch', 'Reset']) {
      const button = screen.getByRole('button', { name });
      const svg = button.querySelector('svg');
      expect(svg).not.toBeNull();
      for (const path of svg!.querySelectorAll('path')) {
        expect(path).toHaveAttribute('stroke', 'currentColor');
      }
    }
    expect(screen.getByRole('button', { name: 'Formation' })).toBeInTheDocument();
  });
});

describe('Rename toggle (desktop)', () => {
  it('is off by default and toggles the pressed state on click', async () => {
    renderTopBar();
    const button = screen.getByRole('button', { name: 'Rename pieces' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('Clear button', () => {
  it('clears placed pieces on one click with no dialog', async () => {
    renderTopBar();
    await openModal();
    await userEvent.click(screen.getByRole('button', { name: '4-3-3' }));
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');

    await userEvent.click(screen.getByRole('button', { name: 'Clear pitch' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('0');
    expect(screen.getByTestId('formation-mine')).toHaveTextContent('4-3-3');
  });

  it('applying a formation after Clear re-places the same starters with their kept labels', async () => {
    renderTopBar();
    await openModal();
    await userEvent.click(screen.getByRole('button', { name: '4-3-3' }));
    const placedLabels = screen.getByTestId('labels-mine').textContent;

    await userEvent.click(screen.getByRole('button', { name: 'Clear pitch' }));
    expect(screen.getByTestId('labels-mine')).toHaveTextContent('');
    await openModal();
    await userEvent.click(screen.getByRole('button', { name: '4-3-3' }));
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');
    expect(screen.getByTestId('labels-mine').textContent).toBe(placedLabels);
  });
});

describe('Reset button', () => {
  const openResetDialog = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    return screen.getByRole('dialog', { name: 'Reset board' });
  };

  it('shows the confirm dialog and confirming resets the board', async () => {
    renderTopBar();
    await openModal();
    await userEvent.click(screen.getByRole('button', { name: '4-3-3' }));
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');

    const dialog = await openResetDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reset' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('0');
    expect(screen.getByTestId('formation-mine')).toHaveTextContent('none');
  });

  it('cancel and Escape close the dialog without changing the board', async () => {
    renderTopBar();
    await openModal();
    await userEvent.click(screen.getByRole('button', { name: '4-3-3' }));

    const dialog = await openResetDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');

    await openResetDialog();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');

    const dialog2 = await openResetDialog();
    await userEvent.click(within(dialog2).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');

    const dialog3 = await openResetDialog();
    await userEvent.click(dialog3.parentElement!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');
    expect(screen.getByTestId('formation-mine')).toHaveTextContent('4-3-3');
  });
});

describe('Theme toggle button', () => {
  it('renders last in the actions cluster with currentColor icon strokes', () => {
    renderTopBar();
    const button = screen.getByRole('button', { name: 'Switch to dark mode' });
    const actions = button.closest('.top-bar__actions')!;
    expect(actions.lastElementChild).toBe(button);
    expect(actions.children[actions.children.length - 2]).toBe(
      screen.getByRole('button', { name: 'Share your current edits' }),
    );
    for (const path of button.querySelectorAll('path')) {
      expect(path).toHaveAttribute('stroke', 'currentColor');
    }
  });

  it('shows the theme you would switch to and swaps icon and label on click', async () => {
    mockMatchMedia(true);
    renderTopBar();
    const button = screen.getByRole('button', { name: 'Switch to light mode' });
    expect(button.querySelectorAll('path').length).toBeGreaterThan(1);

    await userEvent.click(button);
    expect(button).toHaveAccessibleName('Switch to dark mode');
    expect(button.querySelectorAll('path')).toHaveLength(1);
  });

  it('clicking sets data-theme on the document element and persists the choice', async () => {
    renderTopBar();
    expect(document.documentElement.dataset.theme).toBeUndefined();

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('game-plan:theme')).toBe('dark');

    await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('game-plan:theme')).toBe('light');
  });
});

async function placeNinePlusPieces() {
  await openModal();
  await userEvent.click(screen.getByRole('button', { name: '4-3-3' }));
}

describe('Save / Load', () => {
  it('Save is disabled below 9 combined placed pieces and enabled at/above it; Load is absent with zero slots', async () => {
    renderTopBar();
    expect(screen.getByRole('button', { name: /Save/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Load/ })).not.toBeInTheDocument();

    await placeNinePlusPieces();
    expect(screen.getByRole('button', { name: /Save/ })).toBeEnabled();
  });

  it('Save panel prefills the name when overwriting and starts empty for a new slot, then Load appears once saved', async () => {
    renderTopBar();
    await placeNinePlusPieces();

    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    const saveDialog = await screen.findByRole('dialog', { name: 'Save board' });
    expect(within(saveDialog).getByLabelText('Name')).toHaveValue('');

    await userEvent.type(within(saveDialog).getByLabelText('Name'), 'My first board');
    await userEvent.click(within(saveDialog).getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Board saved')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Load/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    const saveAgainDialog = await screen.findByRole('dialog', { name: 'Save board' });
    expect(within(saveAgainDialog).getByRole('button', { name: /My first board/ })).toHaveClass(
      'is-active',
    );
    expect(within(saveAgainDialog).getByLabelText('Name')).toHaveValue('My first board');
  });

  it('Load panel lists each slot by name and timestamp, and selecting one replaces the rendered board', async () => {
    renderTopBar();
    await placeNinePlusPieces();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');

    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    const saveDialog = await screen.findByRole('dialog', { name: 'Save board' });
    await userEvent.type(within(saveDialog).getByLabelText('Name'), 'Alpha');
    await userEvent.click(within(saveDialog).getByRole('button', { name: 'Save' }));

    await userEvent.click(screen.getByRole('button', { name: 'Clear pitch' }));
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('0');

    await userEvent.click(screen.getByRole('button', { name: /Load/ }));
    const loadDialog = await screen.findByRole('dialog', { name: 'Load board' });
    expect(within(loadDialog).getByText('Alpha')).toBeInTheDocument();

    await userEvent.click(within(loadDialog).getByRole('button', { name: /Alpha/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');
  });

  it('disables Save and Load with an explanatory label when localStorage is unavailable', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    renderTopBar();
    await placeNinePlusPieces();

    const saveButton = screen.getByRole('button', { name: /Save/ });
    expect(saveButton).toBeDisabled();
    expect(saveButton.getAttribute('title')).toMatch(/unavailable/i);

    const loadButton = screen.getByRole('button', { name: /Load/ });
    expect(loadButton).toBeDisabled();
    expect(loadButton.getAttribute('title')).toMatch(/unavailable/i);

    setItemSpy.mockRestore();
  });

  it('shows an inline error and preserves prior slots when the save write throws (quota exceeded)', async () => {
    renderTopBar();
    await placeNinePlusPieces();

    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Save board' });
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Overflow');

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText(/storage is full/i)).toBeInTheDocument();
    setItemSpy.mockRestore();

    expect(localStorage.getItem('gameplan:boards:v1')).toBeNull();
  });

  it('once both slots are full, the Save panel only offers the two existing slots with account-creation copy', async () => {
    localStorage.setItem(
      'gameplan:boards:v1',
      JSON.stringify({
        version: 1,
        slots: [
          { id: 'a', name: 'Alpha', savedAt: 100, board: createInitialBoard() },
          { id: 'b', name: 'Bravo', savedAt: 200, board: createInitialBoard() },
        ],
      }),
    );

    renderTopBar();
    await placeNinePlusPieces();
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Save board' });

    expect(within(dialog).getByText('Alpha')).toBeInTheDocument();
    expect(within(dialog).getByText('Bravo')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /New slot/ })).not.toBeInTheDocument();
    expect(within(dialog).getByText(/create an account/i)).toBeInTheDocument();
  });

  it('explicit Load surfaces an inline error when the saved data has become corrupt', async () => {
    localStorage.setItem(
      'gameplan:boards:v1',
      JSON.stringify({
        version: 1,
        slots: [{ id: 'a', name: 'Alpha', savedAt: 100, board: createInitialBoard() }],
      }),
    );

    renderTopBar();
    await userEvent.click(screen.getByRole('button', { name: /Load/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Load board' });

    localStorage.setItem('gameplan:boards:v1', '{not valid json');
    await userEvent.click(within(dialog).getByRole('button', { name: /Alpha/ }));
    expect(await within(dialog).findByText(/corrupted/i)).toBeInTheDocument();
  });
});

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.assign(navigator, { clipboard: { writeText } });
}

describe('Share', () => {
  it('mirrors Save’s disabled/enabled state and, once enabled, shows a link and copy confirmation on click', async () => {
    mockClipboard(() => Promise.resolve());
    renderTopBar();

    const shareButton = screen.getByRole('button', { name: 'Share your current edits' });
    const saveButton = screen.getByRole('button', { name: /Save/ });
    expect(shareButton).toBeDisabled();
    expect(saveButton).toBeDisabled();

    await placeNinePlusPieces();
    expect(shareButton).toBeEnabled();
    expect(saveButton).toBeEnabled();

    await userEvent.click(shareButton);
    const dialog = await screen.findByRole('dialog', { name: 'Share board' });
    const linkInput = within(dialog).getByLabelText('Link') as HTMLInputElement;
    expect(linkInput.value).toContain('#s=v1.');
    expect(await within(dialog).findByText(/copied to clipboard/i)).toBeInTheDocument();
  });

  it('still shows the link, selectable, when the clipboard write fails or is denied', async () => {
    mockClipboard(() => Promise.reject(new Error('denied')));
    renderTopBar();
    await placeNinePlusPieces();

    await userEvent.click(screen.getByRole('button', { name: 'Share your current edits' }));
    const dialog = await screen.findByRole('dialog', { name: 'Share board' });
    const linkInput = within(dialog).getByLabelText('Link') as HTMLInputElement;
    expect(linkInput.value).toContain('#s=v1.');
    expect(linkInput).not.toBeDisabled();
    expect(await within(dialog).findByText(/copy this link/i)).toBeInTheDocument();
  });

  it('updates the address bar hash only when Share is clicked, not on ordinary edits', async () => {
    renderTopBar();
    await placeNinePlusPieces();
    expect(window.location.hash).toBe('');

    mockClipboard(() => Promise.resolve());
    await userEvent.click(screen.getByRole('button', { name: 'Share your current edits' }));
    await screen.findByRole('dialog', { name: 'Share board' });
    expect(window.location.hash).toMatch(/^#s=v1\./);
  });
});

describe('Mobile hamburger menu (<825px)', () => {
  beforeEach(() => {
    mockMatchMedia(true);
  });

  it('shows only the wordmark, Formation, theme toggle, and the hamburger button in the bar', () => {
    renderTopBar();
    expect(screen.getByText('Game Plan')).toBeInTheDocument();
    const bar = within(document.querySelector('.top-bar__actions')!);
    expect(bar.getByRole('button', { name: 'Formation' })).toBeInTheDocument();
    expect(bar.getByRole('button', { name: /Switch to (dark|light) mode/ })).toBeInTheDocument();
    expect(bar.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(bar.getAllByRole('button')).toHaveLength(3);

    expect(bar.queryByRole('button', { name: 'Clear pitch' })).not.toBeInTheDocument();
    expect(bar.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    expect(bar.queryByRole('button', { name: /^Save/ })).not.toBeInTheDocument();
    expect(bar.queryByRole('button', { name: 'Share your current edits' })).not.toBeInTheDocument();
  });

  const openMenu = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    return within(screen.getByRole('navigation', { name: 'Menu' }));
  };

  it('opens the panel listing Rename, Clear, Reset, Save and Share (Load absent with zero slots)', async () => {
    renderTopBar();
    const menu = await openMenu();
    expect(menu.getByRole('button', { name: /Rename pieces/ })).toBeInTheDocument();
    expect(menu.getByRole('button', { name: /Clear pitch/ })).toBeInTheDocument();
    expect(menu.getByRole('button', { name: /Reset/ })).toBeInTheDocument();
    expect(menu.getByRole('button', { name: /Save/ })).toBeInTheDocument();
    expect(menu.getByRole('button', { name: /Share/ })).toBeInTheDocument();
    expect(menu.queryByRole('button', { name: /Load/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('selecting Rename pieces toggles rename mode and closes the menu', async () => {
    renderTopBar();
    let menu = await openMenu();
    await userEvent.click(menu.getByRole('button', { name: /Rename pieces/ }));
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');

    menu = await openMenu();
    expect(menu.getByRole('button', { name: /Rename pieces/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('selecting Clear pitch closes the menu and clears the board, same as the desktop action', async () => {
    renderTopBar();
    await userEvent.click(screen.getByRole('button', { name: 'Formation' }));
    await userEvent.click(screen.getByRole('button', { name: '4-3-3' }));
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');

    const menu = await openMenu();
    await userEvent.click(menu.getByRole('button', { name: /Clear pitch/ }));
    expect(screen.queryByRole('navigation', { name: 'Menu' })).toHaveClass('top-bar__menu-list');
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('0');
  });

  it('selecting Reset closes the menu and opens the same confirm dialog as the desktop button', async () => {
    renderTopBar();
    const menu = await openMenu();
    await userEvent.click(menu.getByRole('button', { name: /Reset/ }));
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('dialog', { name: 'Reset board' })).toBeInTheDocument();
  });

  it('Save/Share menu items are disabled below the 9-piece gate and enabled at/above it', async () => {
    renderTopBar();
    let menu = await openMenu();
    expect(menu.getByRole('button', { name: /Save/ })).toBeDisabled();
    expect(menu.getByRole('button', { name: /Share/ })).toBeDisabled();
    await userEvent.keyboard('{Escape}');

    await userEvent.click(screen.getByRole('button', { name: 'Formation' }));
    await userEvent.click(screen.getByRole('button', { name: '4-3-3' }));

    menu = await openMenu();
    expect(menu.getByRole('button', { name: /Save/ })).toBeEnabled();
    expect(menu.getByRole('button', { name: /Share/ })).toBeEnabled();
  });

  it('selecting Save closes the menu and opens the same Save panel as the desktop button, and Load then appears', async () => {
    renderTopBar();
    await userEvent.click(screen.getByRole('button', { name: 'Formation' }));
    await userEvent.click(screen.getByRole('button', { name: '4-3-3' }));

    const menu = await openMenu();
    await userEvent.click(menu.getByRole('button', { name: /Save/ }));
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
    const saveDialog = await screen.findByRole('dialog', { name: 'Save board' });
    await userEvent.type(within(saveDialog).getByLabelText('Name'), 'Mobile save');
    await userEvent.click(within(saveDialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Board saved')).toBeInTheDocument();

    const menuAfterSave = await openMenu();
    expect(menuAfterSave.getByRole('button', { name: /Load/ })).toBeInTheDocument();
  });

  it('selecting Share closes the menu and opens the same Share panel as the desktop button', async () => {
    mockClipboard(() => Promise.resolve());
    renderTopBar();
    await userEvent.click(screen.getByRole('button', { name: 'Formation' }));
    await userEvent.click(screen.getByRole('button', { name: '4-3-3' }));

    const menu = await openMenu();
    await userEvent.click(menu.getByRole('button', { name: /Share/ }));
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
    const dialog = await screen.findByRole('dialog', { name: 'Share board' });
    expect(within(dialog).getByLabelText('Link')).toBeInTheDocument();
  });

  it('clicking outside the open menu closes it without triggering any action', async () => {
    renderTopBar();
    await openMenu();
    await userEvent.click(screen.getByText('Game Plan'));
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('0');
  });

  it('pressing Escape closes the open menu', async () => {
    renderTopBar();
    await openMenu();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggling the hamburger button while open closes the menu', async () => {
    renderTopBar();
    const menuButton = screen.getByRole('button', { name: 'Menu' });
    await userEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('moves focus into the panel on open and returns focus to the hamburger button on close', async () => {
    renderTopBar();
    const menuButton = screen.getByRole('button', { name: 'Menu' });
    await userEvent.click(menuButton);
    const menu = within(screen.getByRole('navigation', { name: 'Menu' }));
    expect(menu.getByRole('button', { name: /Rename pieces/ })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(menuButton).toHaveFocus();
  });
});

describe('Share-link boot error banner', () => {
  it('renders the error banner and boots to the default board for a malformed share hash, instead of crashing', () => {
    window.location.hash = '#s=v1.not-valid-base64!!!';
    expect(() => renderTopBar()).not.toThrow();

    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't be opened/i);
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('0');
  });

  it('the banner is dismissible', async () => {
    window.location.hash = '#s=v1.not-valid-base64!!!';
    renderTopBar();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Regression: shared-link board interoperates with Save/Load', () => {
  it('a board loaded via a shared URL can be Saved to localStorage and then Loaded back', async () => {
    let sharedBoard = createInitialBoard();
    sharedBoard = boardReducer(sharedBoard, {
      type: 'APPLY_FORMATION',
      team: 'mine',
      name: '4-3-3',
    });
    window.location.hash = buildShareHash(sharedBoard);

    renderTopBar();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');

    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    const saveDialog = await screen.findByRole('dialog', { name: 'Save board' });
    await userEvent.type(within(saveDialog).getByLabelText('Name'), 'From a link');
    await userEvent.click(within(saveDialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Board saved')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear pitch' }));
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('0');

    await userEvent.click(screen.getByRole('button', { name: /Load/ }));
    const loadDialog = await screen.findByRole('dialog', { name: 'Load board' });
    await userEvent.click(within(loadDialog).getByRole('button', { name: /From a link/ }));
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');
  });
});
