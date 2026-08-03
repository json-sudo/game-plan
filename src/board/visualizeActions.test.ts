import { describe, expect, it } from 'vitest';
import { boardReducer, createInitialBoard } from './boardReducer';
import { PITCH_H } from '../components/Pitch';
import { ATTACKING_THIRD_DEPTH, PRESSURE_RADIUS, getAvailableActions } from './visualizeActions';
import type { BoardState } from './types';

function place(board: BoardState, id: string, x: number, y: number): BoardState {
  return boardReducer(board, { type: 'PLACE_PIECE', id, position: { x, y } });
}

describe('getAvailableActions', () => {
  it('always offers dribble for a placed carrier', () => {
    let board = createInitialBoard();
    board = place(board, 'mine-9', 38, 50);
    expect(getAvailableActions(board, 'mine', 'mine-9')).toContain('dribble');
  });

  it('offers pass when the attacking team has at least one other placed piece', () => {
    let board = createInitialBoard();
    board = place(board, 'mine-9', 38, 50);
    board = place(board, 'mine-8', 30, 55);
    expect(getAvailableActions(board, 'mine', 'mine-9')).toContain('pass');
  });

  it('withholds pass when the attacking team has only the carrier placed', () => {
    let board = createInitialBoard();
    board = place(board, 'mine-9', 38, 50);
    const actions = getAvailableActions(board, 'mine', 'mine-9');
    expect(actions).not.toContain('pass');
    expect(actions).toContain('dribble');
  });

  it('offers shoot when the carrier is inside the attacking third for its attacking direction', () => {
    let board = createInitialBoard();
    // "mine" attacks toward y=0 (see formations.ts matchupAttackerPlacement / TopBar's
    // inferredAttacker convention: mine attacking => smaller y).
    board = place(board, 'mine-9', 38, ATTACKING_THIRD_DEPTH - 1);
    expect(getAvailableActions(board, 'mine', 'mine-9')).toContain('shoot');
  });

  it('withholds shoot outside the attacking third (mid pitch)', () => {
    let board = createInitialBoard();
    board = place(board, 'mine-9', 38, PITCH_H / 2);
    expect(getAvailableActions(board, 'mine', 'mine-9')).not.toContain('shoot');
  });

  it('offers clear near its own goal when an opponent is within the pressure radius', () => {
    let board = createInitialBoard();
    const ownGoalY = PITCH_H - ATTACKING_THIRD_DEPTH + 1;
    board = place(board, 'mine-9', 38, ownGoalY);
    board = place(board, 'opponent-9', 38, ownGoalY - (PRESSURE_RADIUS - 1));
    expect(getAvailableActions(board, 'mine', 'mine-9')).toContain('clear');
  });

  it('withholds clear near its own goal without a nearby opponent (no pressure)', () => {
    let board = createInitialBoard();
    const ownGoalY = PITCH_H - ATTACKING_THIRD_DEPTH + 1;
    board = place(board, 'mine-9', 38, ownGoalY);
    board = place(board, 'opponent-9', 38, ownGoalY - (PRESSURE_RADIUS + 20));
    expect(getAvailableActions(board, 'mine', 'mine-9')).not.toContain('clear');
  });

  it('withholds clear when the carrier is upfield, even with a nearby opponent', () => {
    let board = createInitialBoard();
    board = place(board, 'mine-9', 38, PITCH_H / 2);
    board = place(board, 'opponent-9', 38, PITCH_H / 2 + 2);
    expect(getAvailableActions(board, 'mine', 'mine-9')).not.toContain('clear');
  });

  it('mirrors the attacking-third and own-goal zones when Opponent is the attacker', () => {
    let board = createInitialBoard();
    board = place(board, 'opponent-9', 38, PITCH_H - ATTACKING_THIRD_DEPTH + 1);
    expect(getAvailableActions(board, 'opponent', 'opponent-9')).toContain('shoot');

    board = createInitialBoard();
    board = place(board, 'opponent-9', 38, ATTACKING_THIRD_DEPTH - 1);
    board = place(board, 'mine-9', 38, ATTACKING_THIRD_DEPTH - 3);
    expect(getAvailableActions(board, 'opponent', 'opponent-9')).toContain('clear');
  });

  it('never offers shoot and clear at the same time (mutually exclusive zones)', () => {
    let board = createInitialBoard();
    board = place(board, 'mine-9', 38, ATTACKING_THIRD_DEPTH - 1);
    board = place(board, 'opponent-9', 38, ATTACKING_THIRD_DEPTH - 2);
    const actions = getAvailableActions(board, 'mine', 'mine-9');
    expect(actions).toContain('shoot');
    expect(actions).not.toContain('clear');
  });
});
