import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BoardProvider, useBoard } from './BoardContext';
import { createInitialBoard } from './boardReducer';
import { BOARDS_STORAGE_KEY, type BoardsWrapper } from './persistence';
import type { BoardState } from './types';

function Probe() {
  const board = useBoard();
  const placedMine = board.pieces.filter(
    (p) => p.team === 'mine' && p.type === 'player' && p.position !== undefined,
  ).length;
  return <span data-testid="placed-mine">{placedMine}</span>;
}

function renderProbe() {
  return render(
    <BoardProvider>
      <Probe />
    </BoardProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
});

describe('boot-time auto-load', () => {
  it('boots to the normal empty board when no slots are saved', () => {
    renderProbe();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('0');
  });

  it('auto-loads the slot with the latest savedAt when multiple slots exist', () => {
    const olderBoard: BoardState = {
      ...createInitialBoard(),
      pieces: createInitialBoard().pieces.map((p, i) =>
        p.team === 'mine' && p.type === 'player' && i < 3 ? { ...p, position: { x: 1, y: 1 } } : p,
      ),
    };
    const newerBoard: BoardState = {
      ...createInitialBoard(),
      pieces: createInitialBoard().pieces.map((p) =>
        p.team === 'mine' && p.type === 'player' ? { ...p, position: { x: 2, y: 2 } } : p,
      ),
    };
    const wrapper: BoardsWrapper = {
      version: 1,
      slots: [
        { id: 'a', name: 'Older', savedAt: 100, board: olderBoard },
        { id: 'b', name: 'Newer', savedAt: 200, board: newerBoard },
      ],
    };
    localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(wrapper));

    renderProbe();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');
  });

  it('silently falls back to the empty board when saved data is corrupt', () => {
    localStorage.setItem(BOARDS_STORAGE_KEY, '{not valid json');
    renderProbe();
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('0');
  });
});
