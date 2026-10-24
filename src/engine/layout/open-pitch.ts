import type { FormationDef, Point, Side, SlotId } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import { formationAnchors } from '../fm/formation-anchors';
import type { FmPlayer } from '../fm/player';
import { layoutFormation, mirrorPoint, type TeamLayout } from './formations';
import { MIN_TOKEN_SPACING, enforceSpacing, type SpacingToken } from './spacing';

export const DEFAULT_BODY_CLEARANCE = MIN_TOKEN_SPACING;
export const OWN_HALF_FRONT_Y = 54;
export const OWN_HALF_BACK_Y = 84;
export const OWN_HALF_KEEPER_Y = 96;
export const OPEN_EDGE_MARGIN = 2.4;

const MATCHUP_ZONE: ZoneId = 'C-M';
const SIDES: readonly Side[] = ['mine', 'opponent'];

interface TeamTokens {
  formation: FormationDef;
  prefix: string;
  layout: TeamLayout;
}

function isKeeper(formation: FormationDef, slotId: SlotId): boolean {
  return formation.slots.some((slot) => slot.id === slotId && slot.family === 'GK');
}

function separate(teams: readonly TeamTokens[], clearance: number): Map<string, Point> {
  const tokens = teams.flatMap(({ formation, prefix, layout }): SpacingToken[] =>
    [...layout].map(([slotId, point]) => ({
      id: `${prefix}${slotId}`,
      point,
      fixed: isKeeper(formation, slotId),
    })),
  );
  return enforceSpacing(tokens, {
    margin: Math.max(OPEN_EDGE_MARGIN, clearance / 2),
    minDistance: () => clearance,
  });
}

function pick(prefix: string, layout: TeamLayout, separated: Map<string, Point>): TeamLayout {
  return new Map(
    [...layout].map(([slotId, point]) => [slotId, separated.get(`${prefix}${slotId}`) ?? point]),
  );
}

export function ownHalfAnchors(formation: FormationDef): TeamLayout {
  const base = layoutFormation(formation, 'mine');
  const outfieldYs = [...base]
    .filter(([slotId]) => !isKeeper(formation, slotId))
    .map(([, point]) => point.y);
  const front = Math.min(...outfieldYs);
  const span = Math.max(...outfieldYs) - front;
  return new Map(
    [...base].map(([slotId, point]) => {
      if (isKeeper(formation, slotId)) return [slotId, { x: point.x, y: OWN_HALF_KEEPER_Y }];
      const depth = span === 0 ? 1 : (point.y - front) / span;
      return [
        slotId,
        { x: point.x, y: OWN_HALF_FRONT_Y + depth * (OWN_HALF_BACK_Y - OWN_HALF_FRONT_Y) },
      ];
    }),
  );
}

export function layoutOwnHalf(formation: FormationDef, team: Side, clearance: number): TeamLayout {
  const anchors = ownHalfAnchors(formation);
  const separated = pick(
    '',
    anchors,
    separate([{ formation, prefix: '', layout: anchors }], clearance),
  );
  if (team === 'mine') return separated;
  return new Map([...separated].map(([slotId, point]) => [slotId, mirrorPoint(point)]));
}

export function matchupAnchors(formations: Record<Side, FormationDef>): Record<Side, TeamLayout> {
  const players = SIDES.flatMap((team): FmPlayer[] => {
    const layout = layoutFormation(formations[team], team);
    return formations[team].slots.map((slot) => ({
      id: `${team}:${slot.id}`,
      team,
      family: slot.family,
      base: layout.get(slot.id)!,
      isKeeper: slot.family === 'GK',
    }));
  });
  const anchors = formationAnchors({ attacker: 'mine', players, zone: MATCHUP_ZONE });
  const layoutOf = (team: Side): TeamLayout =>
    new Map(
      formations[team].slots.map((slot) => [slot.id, anchors.get(`${team}:${slot.id}`)!.point]),
    );
  return { mine: layoutOf('mine'), opponent: layoutOf('opponent') };
}

export function layoutOpenMatchup(
  formations: Record<Side, FormationDef>,
  clearance: number,
): Record<Side, TeamLayout> {
  const anchors = matchupAnchors(formations);
  const separated = separate(
    SIDES.map((team) => ({
      formation: formations[team],
      prefix: `${team}:`,
      layout: anchors[team],
    })),
    clearance,
  );
  return {
    mine: pick('mine:', anchors.mine, separated),
    opponent: pick('opponent:', anchors.opponent, separated),
  };
}
