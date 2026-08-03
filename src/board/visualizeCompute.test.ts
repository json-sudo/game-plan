import { describe, expect, it } from 'vitest';
import { boardReducer, createInitialBoard } from './boardReducer';
import { PITCH_H, PITCH_W } from '../components/Pitch';
import type { BoardState } from './types';
import {
  ATTACKING_DISTANT_REACTION_DISTANCE,
  ATTACKING_NEAR_PLAY_REACTION_DISTANCE,
  DEFENDER_DRIBBLE_DISTANCE,
  DEFENDER_ROLE_ALLOWED_DRIBBLE_DIRECTIONS,
  DISTANT_REACTION_DISTANCE,
  DRIBBLE_DISTANCE,
  NEAR_PLAY_REACTION_DISTANCE,
  ROLE_ALLOWED_DRIBBLE_DIRECTIONS,
  SHOOT_ADVANCE,
  CLEAR_ADVANCE,
  computeVisualizeOutcome,
  type VisualizeSelections,
} from './visualizeCompute';

function place(board: BoardState, id: string, x: number, y: number): BoardState {
  return boardReducer(board, { type: 'PLACE_PIECE', id, position: { x, y } });
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function baseBoard(): BoardState {
  let board = createInitialBoard();
  board = place(board, 'mine-9', 38, 60); // ST, carrier
  board = place(board, 'mine-8', 30, 55); // RW, pass target
  board = place(board, 'mine-3', 10, 90); // LB, distant from the play
  board = place(board, 'opponent-1', 40, 58); // CB, near the carrier (marking)
  board = place(board, 'opponent-3', 70, 8); // LB, distant from the play
  board = boardReducer(board, { type: 'SET_KEEPER', team: 'mine', on: true });
  board = place(board, 'mine-gk', PITCH_W / 2, 96); // GK
  return board;
}

describe('computeVisualizeOutcome', () => {
  it('is deterministic: identical board + selections produce identical output', () => {
    const board = baseBoard();
    const selections: VisualizeSelections = {
      attacker: 'mine',
      carrierId: 'mine-9',
      action: 'pass',
      passTargetId: 'mine-8',
    };
    const first = computeVisualizeOutcome(board, selections);
    const second = computeVisualizeOutcome(board, selections);
    expect(first).toEqual(second);
  });

  describe('pass', () => {
    it("ends the ball piece at the pass target's final position", () => {
      const board = baseBoard();
      const outcome = computeVisualizeOutcome(board, {
        attacker: 'mine',
        carrierId: 'mine-9',
        action: 'pass',
        passTargetId: 'mine-8',
      });
      expect(outcome.get('ball')).toEqual(outcome.get('mine-8'));
    });
  });

  describe('dribble', () => {
    it("moves the carrier forward by its role's DRIBBLE_DISTANCE (mine attacks toward y=0)", () => {
      const board = baseBoard();
      const before = board.pieces.find((p) => p.id === 'mine-9')!.position!;
      const outcome = computeVisualizeOutcome(board, {
        attacker: 'mine',
        carrierId: 'mine-9',
        action: 'dribble',
        dribbleDirection: 'forward',
      });
      const after = outcome.get('mine-9')!;
      expect(after.x).toBeCloseTo(before.x, 6);
      expect(after.y).toBeCloseTo(before.y - DRIBBLE_DISTANCE.striker, 6);
    });

    it('mirrors the forward direction for the opponent (attacks toward y=PITCH_H)', () => {
      let board = createInitialBoard();
      board = place(board, 'opponent-9', 38, 40); // ST
      const before = board.pieces.find((p) => p.id === 'opponent-9')!.position!;
      const outcome = computeVisualizeOutcome(board, {
        attacker: 'opponent',
        carrierId: 'opponent-9',
        action: 'dribble',
        dribbleDirection: 'forward',
      });
      const after = outcome.get('opponent-9')!;
      expect(after.x).toBeCloseTo(before.x, 6);
      expect(after.y).toBeCloseTo(before.y + DRIBBLE_DISTANCE.striker, 6);
    });

    it("stays within the carrier's role-allowed arc: a disallowed direction yields no net displacement", () => {
      const board = baseBoard();
      const before = board.pieces.find((p) => p.id === 'mine-9')!.position!;
      const strikerArc = ROLE_ALLOWED_DRIBBLE_DIRECTIONS.striker;
      const disallowed = (['forward', 'left', 'right', 'back'] as const).find(
        (d) => !strikerArc.includes(d),
      );
      expect(disallowed).toBeDefined();
      const outcome = computeVisualizeOutcome(board, {
        attacker: 'mine',
        carrierId: 'mine-9',
        action: 'dribble',
        dribbleDirection: disallowed,
      });
      expect(outcome.get('mine-9')).toEqual(before);
    });

    it('ends the ball with the dribbler at its own end position', () => {
      const board = baseBoard();
      const outcome = computeVisualizeOutcome(board, {
        attacker: 'mine',
        carrierId: 'mine-9',
        action: 'dribble',
        dribbleDirection: 'forward',
      });
      expect(outcome.get('ball')).toEqual(outcome.get('mine-9'));
    });

    it('uses the compact DEFENDER_DRIBBLE_DISTANCE / DEFENDER_ROLE_ALLOWED_DRIBBLE_DIRECTIONS tables when the carrier is on the non-attacking (defending) team', () => {
      // Attacker is 'mine', so a carrier on 'opponent' is the defending side —
      // this should branch to the DEFENDER_* tables, not the attacking-style ones.
      let board = createInitialBoard();
      board = place(board, 'opponent-4', 40, 50); // CB
      const before = board.pieces.find((p) => p.id === 'opponent-4')!.position!;

      const outcome = computeVisualizeOutcome(board, {
        attacker: 'mine',
        carrierId: 'opponent-4',
        action: 'dribble',
        dribbleDirection: 'forward',
      });
      const after = outcome.get('opponent-4')!;

      // 'opponent' attacks toward y = PITCH_H, so forward increases y.
      expect(after.x).toBeCloseTo(before.x, 6);
      expect(after.y).toBeCloseTo(before.y + DEFENDER_DRIBBLE_DISTANCE.centerBack, 6);
      // The attacking-style distance table would have moved it much further —
      // confirm the compact, defender-style distance was actually used.
      expect(DEFENDER_DRIBBLE_DISTANCE.centerBack).toBeLessThan(DRIBBLE_DISTANCE.centerBack);

      // A direction outside the defender-style allowed arc (only 'forward' is
      // allowed for a defending center back) should yield no net displacement.
      expect(DEFENDER_ROLE_ALLOWED_DRIBBLE_DIRECTIONS.centerBack).toEqual(['forward']);
      const sidewaysOutcome = computeVisualizeOutcome(board, {
        attacker: 'mine',
        carrierId: 'opponent-4',
        action: 'dribble',
        dribbleDirection: 'left',
      });
      expect(sidewaysOutcome.get('opponent-4')).toEqual(before);
    });
  });

  describe('shoot', () => {
    it('moves the carrier toward the attacking goal mouth by SHOOT_ADVANCE, ending closer to it', () => {
      const board = baseBoard();
      const before = board.pieces.find((p) => p.id === 'mine-9')!.position!;
      const goalMouth = { x: PITCH_W / 2, y: 0 };
      const outcome = computeVisualizeOutcome(board, {
        attacker: 'mine',
        carrierId: 'mine-9',
        action: 'shoot',
      });
      const after = outcome.get('mine-9')!;
      expect(dist(after, before)).toBeCloseTo(SHOOT_ADVANCE, 6);
      expect(dist(after, goalMouth)).toBeLessThan(dist(before, goalMouth));
    });
  });

  describe('clear', () => {
    it('moves the carrier away from its own goal by CLEAR_ADVANCE, ending further from it', () => {
      let board = createInitialBoard();
      board = place(board, 'mine-1', 30, 92); // CB, deep near own goal
      const before = board.pieces.find((p) => p.id === 'mine-1')!.position!;
      const ownGoal = { x: PITCH_W / 2, y: PITCH_H };
      const outcome = computeVisualizeOutcome(board, {
        attacker: 'mine',
        carrierId: 'mine-1',
        action: 'clear',
      });
      const after = outcome.get('mine-1')!;
      expect(dist(after, before)).toBeCloseTo(CLEAR_ADVANCE, 6);
      expect(dist(after, ownGoal)).toBeGreaterThan(dist(before, ownGoal));
    });
  });

  describe('off-ball repositioning', () => {
    it('moves a piece near the play a moderate amount, and a distant piece a small amount', () => {
      const board = baseBoard();
      const before = (id: string) => board.pieces.find((p) => p.id === id)!.position!;
      const outcome = computeVisualizeOutcome(board, {
        attacker: 'mine',
        carrierId: 'mine-9',
        action: 'pass',
        passTargetId: 'mine-8',
      });

      const nearMove = dist(before('opponent-1'), outcome.get('opponent-1')!);
      const farMove = dist(before('opponent-3'), outcome.get('opponent-3')!);

      expect(nearMove).toBeGreaterThan(0);
      expect(nearMove).toBeLessThanOrEqual(NEAR_PLAY_REACTION_DISTANCE);
      expect(farMove).toBeLessThanOrEqual(DISTANT_REACTION_DISTANCE);
      expect(nearMove).toBeGreaterThan(farMove);
    });

    it('never moves the goalkeeper', () => {
      const board = baseBoard();
      const gk = board.pieces.find((p) => p.id === 'mine-gk')!;
      const outcome = computeVisualizeOutcome(board, {
        attacker: 'mine',
        carrierId: 'mine-9',
        action: 'pass',
        passTargetId: 'mine-8',
      });
      expect(outcome.get('mine-gk')).toEqual(gk.position);
    });

    it('includes an end position for every placed piece on both teams, plus the ball', () => {
      const board = baseBoard();
      const outcome = computeVisualizeOutcome(board, {
        attacker: 'mine',
        carrierId: 'mine-9',
        action: 'pass',
        passTargetId: 'mine-8',
      });
      const placedIds = board.pieces.filter((p) => p.position !== undefined).map((p) => p.id);
      for (const id of placedIds) {
        expect(outcome.has(id)).toBe(true);
      }
    });

    it('uses the larger ATTACKING_NEAR_PLAY_REACTION_DISTANCE / ATTACKING_DISTANT_REACTION_DISTANCE for off-ball pieces on the attacking side', () => {
      // All of these are on 'mine', which is also the attacker, so their
      // off-ball reactions should use the ATTACKING_* tables, not the
      // defending-style NEAR_PLAY_REACTION_DISTANCE/DISTANT_REACTION_DISTANCE.
      let board = createInitialBoard();
      board = place(board, 'mine-9', 38, 60); // ST, carrier
      board = place(board, 'mine-2', 40, 58); // near the carrier
      board = place(board, 'mine-3', 10, 90); // far from the carrier
      const before = (id: string) => board.pieces.find((p) => p.id === id)!.position!;

      const outcome = computeVisualizeOutcome(board, {
        attacker: 'mine',
        carrierId: 'mine-9',
        action: 'dribble',
        dribbleDirection: 'forward',
      });

      const nearMove = dist(before('mine-2'), outcome.get('mine-2')!);
      const farMove = dist(before('mine-3'), outcome.get('mine-3')!);

      expect(nearMove).toBeGreaterThan(0);
      expect(nearMove).toBeLessThanOrEqual(ATTACKING_NEAR_PLAY_REACTION_DISTANCE);
      expect(farMove).toBeLessThanOrEqual(ATTACKING_DISTANT_REACTION_DISTANCE);
      expect(nearMove).toBeGreaterThan(farMove);

      // Confirm the attacking-style tables (which are larger) were actually
      // used, not the defending-style ones a broken branch would fall back to.
      expect(nearMove).toBeGreaterThan(NEAR_PLAY_REACTION_DISTANCE);
      expect(farMove).toBeGreaterThan(DISTANT_REACTION_DISTANCE);
    });
  });
});
