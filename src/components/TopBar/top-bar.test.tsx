import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardProvider, useBoard } from '../../board/BoardContext';
import { TopBar } from '.';

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
      <TopBar />
      <PlacedProbe />
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

  it('defaults pickers to each team\'s recorded formation', async () => {
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

describe('Clear and Reset buttons', () => {
  it('render next to Formation with an icon whose strokes inherit currentColor', () => {
    renderTopBar();
    for (const name of ['Clear', 'Reset']) {
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

describe('Clear button', () => {
  it('clears placed pieces on one click with no dialog', async () => {
    renderTopBar();
    await openModal();
    await userEvent.click(screen.getByRole('button', { name: '4-3-3' }));
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('0');
    expect(screen.getByTestId('formation-mine')).toHaveTextContent('4-3-3');
  });

  it('applying a formation after Clear re-places the same starters with their kept labels', async () => {
    renderTopBar();
    await openModal();
    await userEvent.click(screen.getByRole('button', { name: '4-3-3' }));
    const placedLabels = screen.getByTestId('labels-mine').textContent;

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
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
