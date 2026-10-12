import type { FormationDef, Point, Side, SlotId } from '../../data/types';
import { PITCH_H, PITCH_W } from '../geometry/pitch';
import { enforceSpacing, type SpacingToken } from './spacing';

export const MATCHUP_DEFENDER_HOLD_WEIGHT = 4;
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

  const tokens = (
    layout: TeamLayout,
    prefix: string,
    formation: FormationDef,
    weight: number,
  ): SpacingToken[] =>
    [...layout].map(([slotId, point]) => ({
      id: `${prefix}${slotId}`,
      point,
      fixed: isKeeperSlot(formation, slotId),
      weight,
    }));
  const separated = enforceSpacing([
    ...tokens(defending, 'defender:', formations[defender], MATCHUP_DEFENDER_HOLD_WEIGHT),
    ...tokens(advanced, 'attacker:', formations[attacker], 1),
  ]);
  const pick = (prefix: string, layout: TeamLayout) =>
    new Map(
      [...layout].map(([slotId, point]) => [slotId, separated.get(`${prefix}${slotId}`) ?? point]),
    );
  return {
    [attacker]: pick('attacker:', advanced),
    [defender]: pick('defender:', defending),
  } as Record<Side, TeamLayout>;
}
