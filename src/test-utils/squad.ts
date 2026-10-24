import { FM26_DATA } from '../data/fm26';
import type { FormationDef, Side } from '../data/types';
import { GRID, type Lane, type ZoneId } from '../data/zones';
import { formationAnchors, type Anchor } from '../engine/fm/formation-anchors';
import type { FmPlayer } from '../engine/fm/player';
import { PITCH_W } from '../engine/geometry/pitch';
import { layoutFormation } from '../engine/layout/formations';

export type RoleAssignments = Readonly<Record<string, string>>;

export interface TeamSetup {
  formation: FormationDef;
  roles?: RoleAssignments;
}

const MIRROR_EPSILON = 1e-6;
const LANE_SHIFT = {
  attack: { C: 0, half: 1.5, flank: 3 },
  defend: { C: 0, half: 3, flank: 5 },
};

export function formationById(id: string): FormationDef {
  const found = FM26_DATA.formations.find((formation) => formation.id === id);
  if (!found) throw new Error(`no formation ${id}`);
  return found;
}

function squad(formation: FormationDef, team: Side, roles: RoleAssignments = {}): FmPlayer[] {
  const layout = layoutFormation(formation, team);
  return formation.slots.map((slot) => ({
    id: `${team}:${slot.id}`,
    team,
    family: slot.family,
    base: layout.get(slot.id)!,
    roleId: roles[slot.id],
    isKeeper: slot.family === 'GK',
  }));
}

export function anchorsOf(
  zone: ZoneId,
  mine: TeamSetup,
  opponent?: TeamSetup,
): Map<string, Anchor> {
  const players = [
    ...squad(mine.formation, 'mine', mine.roles),
    ...(opponent ? squad(opponent.formation, 'opponent', opponent.roles) : []),
  ];
  return formationAnchors({ attacker: 'mine', players, zone });
}

export function laneShift(zone: ZoneId, attacking: boolean): number {
  const table = attacking ? LANE_SHIFT.attack : LANE_SHIFT.defend;
  const lane = zone.split('-')[0] as Lane;
  const size = lane === 'C' ? table.C : lane === 'LH' || lane === 'RH' ? table.half : table.flank;
  return lane.startsWith('L') ? -size : size;
}

export function mirrorSlots(formation: FormationDef): Record<string, string> {
  const layout = layoutFormation(formation, 'mine');
  return Object.fromEntries(
    formation.slots.map((slot) => {
      const base = layout.get(slot.id)!;
      const twin = formation.slots.find((other) => {
        const point = layout.get(other.id)!;
        return (
          Math.abs(point.x - (PITCH_W - base.x)) < MIRROR_EPSILON &&
          Math.abs(point.y - base.y) < MIRROR_EPSILON
        );
      });
      if (!twin) throw new Error(`no mirror for ${slot.id}`);
      return [slot.id, twin.id];
    }),
  );
}

export function mirrorZone(zone: ZoneId): ZoneId {
  const [lane, third] = zone.split('-') as [Lane, string];
  const mirrored = GRID.lanes[GRID.lanes.length - 1 - GRID.lanes.indexOf(lane)];
  return `${mirrored}-${third}` as ZoneId;
}

export function mirrorRoles(formation: FormationDef, roles: RoleAssignments): RoleAssignments {
  const twins = mirrorSlots(formation);
  return Object.fromEntries(Object.entries(roles).map(([slot, role]) => [twins[slot], role]));
}
