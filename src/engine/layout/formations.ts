import type { FormationDef, Point, Side, SlotId } from '../../data/types';
import { PITCH_H, PITCH_W } from '../geometry/pitch';
import { separateFromDefenders } from './separation';

export const MATCHUP_MAX_ADVANCE = 30;
export const MATCHUP_FRONT_MARGIN = 8;

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

function isKeeperSlot(formation: FormationDef, slotId: SlotId): boolean {
  return formation.slots.some((slot) => slot.id === slotId && slot.family === 'GK');
}

function advanceTowardGoal(
  layout: TeamLayout,
  formation: FormationDef,
  attacker: Side,
): TeamLayout {
  const forward = attacker === 'mine' ? -1 : 1;
  const outfield = [...layout].filter(([slotId]) => !isKeeperSlot(formation, slotId));
  const frontDistance = Math.min(
    ...outfield.map(([, point]) => (attacker === 'mine' ? point.y : PITCH_H - point.y)),
  );
  const advance = Math.max(0, Math.min(MATCHUP_MAX_ADVANCE, frontDistance - MATCHUP_FRONT_MARGIN));
  return new Map(
    [...layout].map(([slotId, point]) => [
      slotId,
      isKeeperSlot(formation, slotId) ? point : { x: point.x, y: point.y + forward * advance },
    ]),
  );
}

export function layoutMatchup(
  attacker: Side,
  formations: Record<Side, FormationDef>,
): Record<Side, TeamLayout> {
  const defender: Side = attacker === 'mine' ? 'opponent' : 'mine';
  const defending = layoutFormation(formations[defender], defender);
  const advanced = advanceTowardGoal(
    layoutFormation(formations[attacker], attacker),
    formations[attacker],
    attacker,
  );

  const toPoints = (layout: TeamLayout, keep: (slotId: SlotId) => boolean) =>
    [...layout].filter(([slotId]) => keep(slotId)).map(([id, point]) => ({ id, ...point }));
  const separated = separateFromDefenders(
    toPoints(advanced, (slotId) => !isKeeperSlot(formations[attacker], slotId)),
    toPoints(defending, () => true),
    attacker === 'mine',
  );
  const attacking: TeamLayout = new Map(
    [...advanced].map(([slotId, point]) => [slotId, separated.get(slotId) ?? point]),
  );
  return { [attacker]: attacking, [defender]: defending } as Record<Side, TeamLayout>;
}
