import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BoardProvider, useBoard, useShareLinkError } from './BoardContext';
import { boardReducer, createInitialBoard } from './boardReducer';
import { BOARDS_STORAGE_KEY, type BoardsWrapper } from './persistence';
import { buildShareHash } from './shareCodec';
import type { BoardState } from './types';

function Probe() {
  const board = useBoard();
  const [shareLinkError] = useShareLinkError();
  const placedMine = board.pieces.filter(
    (p) => p.team === 'mine' && p.type === 'player' && p.position !== undefined,
  ).length;
  return (
    <div>
      <span data-testid="placed-mine">{placedMine}</span>
      <span data-testid="share-link-error">{String(shareLinkError)}</span>
    </div>
  );
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
  window.location.hash = '';
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

describe('share-link boot precedence', () => {
  it('a valid share hash wins over the most-recent saved slot, which is left unloaded', () => {
    const slotBoard: BoardState = {
      ...createInitialBoard(),
      pieces: createInitialBoard().pieces.map((p) =>
        p.team === 'mine' && p.type === 'player' ? { ...p, position: { x: 1, y: 1 } } : p,
      ),
    };
    const wrapper: BoardsWrapper = {
      version: 1,
      slots: [{ id: 'a', name: 'Slot', savedAt: 100, board: slotBoard }],
    };
    localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(wrapper));

    let sharedBoard = createInitialBoard();
    sharedBoard = boardReducer(sharedBoard, {
      type: 'PLACE_PIECE',
      id: 'mine-1',
      position: { x: 5, y: 5 },
    });
    sharedBoard = boardReducer(sharedBoard, {
      type: 'PLACE_PIECE',
      id: 'opponent-1',
      position: { x: 6, y: 6 },
    });
    window.location.hash = buildShareHash(sharedBoard);

    renderProbe();
    // The shared board has 1 mine piece placed, not the 10 the saved slot would render.
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('1');
    expect(screen.getByTestId('share-link-error')).toHaveTextContent('false');

    // The saved slot itself is untouched.
    const stillStored = JSON.parse(localStorage.getItem(BOARDS_STORAGE_KEY)!) as BoardsWrapper;
    expect(stillStored.slots).toHaveLength(1);
    expect(stillStored.slots[0].board).toEqual(slotBoard);
  });

  it('a malformed share hash shows the error and falls back to the normal boot behavior', () => {
    const slotBoard: BoardState = {
      ...createInitialBoard(),
      pieces: createInitialBoard().pieces.map((p) =>
        p.team === 'mine' && p.type === 'player' ? { ...p, position: { x: 1, y: 1 } } : p,
      ),
    };
    const wrapper: BoardsWrapper = {
      version: 1,
      slots: [{ id: 'a', name: 'Slot', savedAt: 100, board: slotBoard }],
    };
    localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(wrapper));
    window.location.hash = '#s=v1.not-valid-base64!!!';

    renderProbe();
    expect(screen.getByTestId('share-link-error')).toHaveTextContent('true');
    // Falls back to the normal boot path — the saved slot auto-loads.
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('10');
  });

  it('an unrelated (non-share) hash boots normally with no error', () => {
    window.location.hash = '#/some-other-route';
    renderProbe();
    expect(screen.getByTestId('share-link-error')).toHaveTextContent('false');
    expect(screen.getByTestId('placed-mine')).toHaveTextContent('0');
  });
});
