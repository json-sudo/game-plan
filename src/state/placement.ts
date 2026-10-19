import type { Point, Side } from '../data/types';
import { MIN_TOKEN_SPACING, PITCH_H, PITCH_W } from '../engine';
import { placedPlayers, type PitchDocument } from './document';

const OWN_HALF_DEPTH: Record<Side, number> = { mine: 0.75, opponent: 0.25 };
const MAX_OFFSETS = 8;

function isClear(point: Point, taken: readonly Point[]): boolean {
  return taken.every(
    (other) => Math.hypot(point.x - other.x, point.y - other.y) >= MIN_TOKEN_SPACING,
  );
}

function inside(point: Point): boolean {
  return point.x >= 0 && point.x <= PITCH_W && point.y >= 0 && point.y <= PITCH_H;
}

export function benchPlacementPoint(doc: PitchDocument, team: Side): Point {
  const taken = placedPlayers(doc).map((player) => player.base!);
  const centre = { x: PITCH_W / 2, y: PITCH_H * OWN_HALF_DEPTH[team] };
  const towardMiddle = team === 'mine' ? -1 : 1;
  for (let row = 0; row < MAX_OFFSETS; row += 1) {
    for (let step = 0; step < MAX_OFFSETS; step += 1) {
      const side = step % 2 === 0 ? 1 : -1;
      const offset = Math.ceil(step / 2) * MIN_TOKEN_SPACING * side;
      const candidate = {
        x: centre.x + offset,
        y: centre.y + towardMiddle * row * MIN_TOKEN_SPACING,
      };
      if (inside(candidate) && isClear(candidate, taken)) return candidate;
    }
  }
  return centre;
}
