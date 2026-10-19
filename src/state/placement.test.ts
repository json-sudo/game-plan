import { describe, expect, it } from 'vitest';
import { MIN_TOKEN_SPACING, PITCH_H, PITCH_W } from '../engine';
import { applyAction } from './actions';
import { createInitialDocument, placedPlayers, type PitchDocument } from './document';
import { benchPlacementPoint } from './placement';

function place(doc: PitchDocument, playerId: string): PitchDocument {
  return applyAction(doc, {
    type: 'movePlayer',
    playerId,
    point: benchPlacementPoint(doc, doc.players.find((p) => p.id === playerId)!.team),
  });
}

describe('benchPlacementPoint', () => {
  it('starts in the middle of the team own half', () => {
    const doc = createInitialDocument();
    expect(benchPlacementPoint(doc, 'mine')).toEqual({ x: PITCH_W / 2, y: PITCH_H * 0.75 });
    expect(benchPlacementPoint(doc, 'opponent')).toEqual({ x: PITCH_W / 2, y: PITCH_H * 0.25 });
  });

  it('keeps clear of pieces already there', () => {
    const first = place(createInitialDocument(), 'mine-1');
    const next = benchPlacementPoint(first, 'mine');
    const [placed] = placedPlayers(first);
    expect(Math.hypot(next.x - placed.base!.x, next.y - placed.base!.y)).toBeGreaterThanOrEqual(
      MIN_TOKEN_SPACING,
    );
  });

  it('keeps every placement apart and on the pitch for a whole squad', () => {
    let doc = createInitialDocument();
    for (let index = 1; index <= 11; index += 1) doc = place(doc, `mine-${index}`);
    const points = placedPlayers(doc).map((player) => player.base!);
    expect(points).toHaveLength(11);
    for (const [index, point] of points.entries()) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(PITCH_W);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(PITCH_H);
      for (const other of points.slice(index + 1)) {
        expect(Math.hypot(point.x - other.x, point.y - other.y)).toBeGreaterThanOrEqual(
          MIN_TOKEN_SPACING - 1e-6,
        );
      }
    }
  });
});
