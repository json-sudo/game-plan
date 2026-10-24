import type { FormationDef, Point, Side, SlotId } from '../../data/types';
import { PITCH_H, PITCH_W } from '../geometry/pitch';

export type TeamLayout = Map<SlotId, Point>;

export function mirrorPoint(point: Point): Point {
  return { x: PITCH_W - point.x, y: PITCH_H - point.y };
}

export function layoutFormation(formation: FormationDef, team: Side): TeamLayout {
  return new Map(
    formation.slots.map((slot) => [
      slot.id,
      team === 'mine' ? { ...slot.base } : mirrorPoint(slot.base),
    ]),
  );
}
