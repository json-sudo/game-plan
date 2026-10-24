import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import type { Family, FormationDef, FormationSlot, RoleDef, SlotId, Side } from '../../data/types';
import { ZONE_IDS, type ZoneId } from '../../data/zones';
import { minSpacingOf } from '../layout/spacing';
import type { CarrierPlayer } from './carrier-eligibility';
import {
  visualizationStarters,
  visualizationsFor,
  type Visualization,
  type VisualizationInput,
} from './visualization';
import { laneOf, thirdOf, zoneCentre, zoneOf } from './zones';

const FORMATION_433 = formationById('4_3_3_dm_wide');
const FORMATION_4231 = formationById('4_2_3_1_dm_wide');
const FORMATIONS = [FORMATION_433, FORMATION_4231];
const BODY_SEPARATION = 4.65;

function formationById(id: string): FormationDef {
  const found = FM26_DATA.formations.find((formation) => formation.id === id);
  if (!found) throw new Error(`no formation ${id}`);
  return found;
}

function firstRole(family: Family, possession: 'in' | 'out'): RoleDef {
  const role = FM26_DATA.roles.find(
    (candidate) =>
      candidate.possession === possession && candidate.families.some((item) => item === family),
  );
  if (!role) throw new Error(`no ${possession} role for ${family}`);
  return role;
}

function defaultRoles(
  formation: FormationDef,
  team: Side,
  possession: 'in' | 'out',
): Record<string, string> {
  return Object.fromEntries(
    formation.slots
      .filter((slot) => slot.family !== 'GK')
      .map((slot) => [`${team}:${slot.id}`, firstRole(slot.family, possession).id]),
  );
}

function inputFor(
  zone: ZoneId,
  formations: Record<Side, FormationDef | null>,
  attacker: Side = 'mine',
): VisualizationInput {
  const defender: Side = attacker === 'mine' ? 'opponent' : 'mine';
  const roles = {
    ...(formations[attacker] ? defaultRoles(formations[attacker], attacker, 'in') : {}),
    ...(formations[defender] ? defaultRoles(formations[defender], defender, 'out') : {}),
  };
  return { zone, attacker, formations, roles };
}

function landingZonesOf(visualization: Visualization, attacker: Side): ZoneId[] {
  return visualization.passes.map((pass, index) => {
    const previous =
      index === 0
        ? visualization.opening.positions
        : visualization.passes[index - 1].frame.positions;
    return zoneOf(previous[pass.receiverId], attacker);
  });
}

const FOUR_BACK: readonly FormationSlot[] = [
  { id: 'DCL', family: 'D(C)', base: { x: 28, y: 75 } },
  { id: 'DCR', family: 'D(C)', base: { x: 48, y: 75 } },
];

const THREE_BACK: readonly FormationSlot[] = [
  { id: 'DCL', family: 'D(C)', base: { x: 20, y: 75 } },
  { id: 'DC', family: 'D(C)', base: { x: 38, y: 75 } },
  { id: 'DCR', family: 'D(C)', base: { x: 56, y: 75 } },
];

function player(
  id: string,
  roleId: string | undefined,
  family: Family | null,
  slot: SlotId | null,
  side?: 'left' | 'right',
): CarrierPlayer {
  return { id, roleId, family, slot, side };
}

function starters(zone: ZoneId, players: readonly CarrierPlayer[], slots = FOUR_BACK) {
  return visualizationStarters(zone, players, slots);
}

describe('visualizationStarters', () => {
  it('lists the eligible players in formation slot order', () => {
    const slots: readonly FormationSlot[] = [
      { id: 'WBR', family: 'WB(R)', base: { x: 60, y: 60 } },
      { id: 'AMR', family: 'AM(R)', base: { x: 60, y: 40 } },
    ];
    const winger = player('rw', 'winger_ip', 'AM(R)', 'AMR', 'right');
    const wingBack = player('rwb', 'wing_back_ip', 'WB(R)', 'WBR', 'right');
    expect(starters('R-F', [winger, wingBack], slots)).toEqual(['rwb', 'rw']);
  });

  it('returns nothing for a zone no player can carry in', () => {
    expect(starters('C-F', [player('lfb', 'full_back_ip', 'D(L)', 'DL', 'left')])).toEqual([]);
    expect(starters('C-F', [])).toEqual([]);
  });

  it('offers Advanced Wing-Back only from a wing-back slot', () => {
    const fromAttack = player('awb-am', 'advanced_wing_back_ip', 'AM(R)', 'AMR', 'right');
    const fromWingBack = player('awb', 'advanced_wing_back_ip', 'WB(R)', 'WBR', 'right');
    expect(starters('R-F', [fromAttack])).toEqual([]);
    expect(starters('R-F', [fromWingBack])).toEqual(['awb']);
  });

  it('mirrors side-specific roles and keeps central roles in the centre', () => {
    const leftWinger = player('lw', 'winger_ip', 'AM(L)', 'AML', 'left');
    const rightWinger = player('rw', 'winger_ip', 'AM(R)', 'AMR', 'right');
    const centralMidfielder = player('cm', 'central_midfielder_ip', 'M(C)', 'MCL');
    const players = [leftWinger, rightWinger, centralMidfielder];
    expect(starters('L-F', players)).toEqual(['lw']);
    expect(starters('R-F', players)).toEqual(['rw']);
    expect(starters('C-M', players)).toEqual(['cm']);
    expect(starters('LH-M', players)).toEqual([]);
  });

  it('offers an Overlapping Centre-Back only on the outermost slot of a three-back formation', () => {
    const left = player('locb', 'overlapping_centre_back_ip', 'D(C)', 'DCL', 'left');
    const middle = player('mocb', 'overlapping_centre_back_ip', 'D(C)', 'DC');
    const right = player('rocb', 'overlapping_centre_back_ip', 'D(C)', 'DCR', 'right');
    const players = [left, middle, right];
    expect(starters('L-D', players, THREE_BACK)).toEqual(['locb']);
    expect(starters('C-D', players, THREE_BACK)).toEqual(['locb', 'rocb']);
    expect(starters('L-D', [left], FOUR_BACK)).toEqual([]);
  });
});

function carrierPlayersOf(
  formation: FormationDef,
  roles: Readonly<Record<string, string | undefined>>,
): CarrierPlayer[] {
  return formation.slots.map((slot) => {
    const id = `mine:${slot.id}`;
    const side = slot.id.endsWith('L') ? 'left' : slot.id.endsWith('R') ? 'right' : undefined;
    return { id, roleId: roles[id], family: slot.family, slot: slot.id, side };
  });
}

function passRangeOf(zone: ZoneId): [number, number] {
  if (thirdOf(zone) !== 'F') return [4, 6];
  const exact = laneOf(zone) === 'C' ? 1 : 2;
  return [exact, exact];
}

function allVisualizations(): { zone: ZoneId; visualization: Visualization }[] {
  return FORMATIONS.flatMap((formation) =>
    [true, false].flatMap((withOpponent) =>
      ZONE_IDS.flatMap((zone) =>
        visualizationsFor(
          inputFor(zone, { mine: formation, opponent: withOpponent ? formation : null }),
        ).map((visualization) => ({ zone, visualization })),
      ),
    ),
  );
}

describe('buildVisualization and visualizationsFor', () => {
  it('gives 4 to 6 passes from defensive and middle zones and 2 or 1 from the final third', () => {
    for (const { zone, visualization } of allVisualizations()) {
      const [min, max] = passRangeOf(zone);
      expect(visualization.passes.length).toBeGreaterThanOrEqual(min);
      expect(visualization.passes.length).toBeLessThanOrEqual(max);
    }
  });

  it('stops open chains on the first final-third landing after the fourth pass, or at six', () => {
    const openZones = allVisualizations().filter(({ zone }) => thirdOf(zone) !== 'F');
    for (const { visualization } of openZones) {
      const count = visualization.passes.length;
      const landings = landingZonesOf(visualization, 'mine');
      expect(landings.slice(3, -1).some((landing) => thirdOf(landing) === 'F')).toBe(false);
      expect(count === 6 || thirdOf(landings[count - 1]) === 'F').toBe(true);
    }
  });

  it('chains each pass from the previous receiver to a different player', () => {
    for (const { visualization } of allVisualizations()) {
      let carrierId = visualization.starterId;
      for (const pass of visualization.passes) {
        expect(pass.carrierId).toBe(carrierId);
        expect(pass.receiverId).not.toBe(pass.carrierId);
        carrierId = pass.receiverId;
      }
    }
  });

  it('starts with the starter on the ball and puts the receiver on the ball in each later frame', () => {
    const zone: ZoneId = 'C-M';
    const input = inputFor(zone, { mine: FORMATION_433, opponent: FORMATION_433 });
    const [first] = visualizationsFor(input);
    expect(first.opening.ball).toEqual(zoneCentre(zone, 'mine'));
    expect(first.opening.positions[first.starterId]).toEqual(first.opening.ball);
    expect(Object.keys(first.opening.positions)).toHaveLength(FORMATION_433.slots.length * 2);
    for (const pass of first.passes) {
      expect(pass.frame.positions[pass.receiverId]).toEqual(pass.frame.ball);
    }
  });

  it('places the ball in the zone the receiver was standing in before the pass', () => {
    const input = inputFor('L-D', { mine: FORMATION_433, opponent: FORMATION_433 });
    for (const visualization of visualizationsFor(input)) {
      const landings = landingZonesOf(visualization, 'mine');
      visualization.passes.forEach((pass, index) => {
        expect(pass.frame.ball).toEqual(zoneCentre(landings[index], 'mine'));
      });
    }
  });

  it('keeps every piece body-separated in every frame', () => {
    for (const { visualization } of allVisualizations()) {
      const frames = [visualization.opening, ...visualization.passes.map((pass) => pass.frame)];
      for (const frame of frames) {
        expect(minSpacingOf(Object.values(frame.positions))).toBeGreaterThanOrEqual(
          BODY_SEPARATION,
        );
      }
    }
  });

  it('returns the same visualizations for the same input', () => {
    const zone: ZoneId = 'R-M';
    const formations = { mine: FORMATION_4231, opponent: FORMATION_4231 };
    expect(visualizationsFor(inputFor(zone, formations))).toEqual(
      visualizationsFor(inputFor(zone, formations)),
    );
  });

  it('returns one visualization per starter, in starter order', () => {
    for (const zone of ZONE_IDS) {
      const input = inputFor(zone, { mine: FORMATION_433, opponent: FORMATION_433 });
      const carriers = carrierPlayersOf(FORMATION_433, input.roles);
      const starters = visualizationStarters(zone, carriers, FORMATION_433.slots);
      expect(visualizationsFor(input).map((visualization) => visualization.starterId)).toEqual(
        starters,
      );
    }
  });

  it('returns no visualizations when no attacking player has a role', () => {
    const base = inputFor('C-M', { mine: FORMATION_433, opponent: FORMATION_433 });
    expect(visualizationsFor({ ...base, roles: {} })).toEqual([]);
  });
});
