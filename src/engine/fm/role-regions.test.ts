import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import type { FormationDef, FormationSlot, RoleDef } from '../../data/types';
import { ZONE_IDS, type ZoneId } from '../../data/zones';
import { anchorsOf, laneShift } from '../../test-utils/squad';
import { PITCH_H, PITCH_W } from '../geometry/pitch';
import { layoutFormation } from '../layout/formations';
import { isRoleAllowedInSlot } from './carrier-eligibility';
import { ROLE_REGIONS } from './role-regions';
import { thirdOf } from './zones';

type Triple = readonly [d: number, m: number, f: number];

interface Expectation {
  y?: Triple;
  edge?: number;
}

const CENTRE_X = PITCH_W / 2;
const BODY_MARGIN = 2.4;
const THIRD_INDEX = { D: 0, M: 1, F: 2 } as const;

const EXPECTED: Record<string, Expectation> = {
  deep_lying_forward_ip: { y: [48, 37, 27] },
  poacher_ip: { y: [44, 27, 18] },
  false_nine_ip: { y: [63, 40, 28] },
  winger_ip: { y: [54, 36, 23], edge: 9 },
  playmaking_winger_ip: { y: [58, 40, 27], edge: 22 },
  inside_winger_ip: { y: [57, 39, 26], edge: 22 },
  advanced_playmaker_ip: { y: [59, 40, 29] },
  second_striker_ip: { y: [53, 35, 26] },
  midfield_playmaker_ip: { y: [66, 47, 35] },
  wing_back_ip: { y: [70, 49, 27], edge: 9 },
  advanced_wing_back_ip: { y: [31, 27, 23], edge: 9 },
  inside_wing_back_ip: { y: [71, 56, 45], edge: 30 },
  playmaking_wing_back_ip: { y: [70, 52, 39], edge: 22 },
  playmaking_wing_back_ip_d_l_r: { y: [70, 52, 39], edge: 22 },
  box_to_box_midfielder_ip: { y: [60, 41, 30] },
  box_to_box_playmaker_ip: { y: [62, 43, 32] },
  inside_full_back_ip: { y: [84, 66, 49], edge: 22 },
  advanced_centre_back_ip: { y: [71, 59, 45] },
  wide_centre_back_ip: { y: [84, 66, 49], edge: 22 },
  overlapping_centre_back_ip: { y: [82, 49, 27] },
  tracking_centre_forward_oop: { y: [77, 52, 38] },
  central_outlet_centre_forward_oop: { y: [79, 62, 48] },
  splitting_outlet_centre_forward_oop: { y: [79, 62, 48] },
  winger_oop: { y: [60, 43, 32], edge: 16 },
  tracking_winger_oop: { y: [61, 44, 30], edge: 16 },
  inside_outlet_winger_oop: { y: [67, 52, 43], edge: 22 },
  wide_outlet_winger_oop: { y: [67, 52, 43], edge: 12 },
  tracking_attacking_midfielder_oop: { y: [63, 42, 31] },
  central_outlet_attacking_midfielder_oop: { y: [67, 52, 43] },
  splitting_outlet_attacking_midfielder_oop: { y: [67, 52, 43] },
  attacking_midfielder_oop: { y: [63, 44, 34] },
  wide_midfielder_oop: { y: [60, 43, 32], edge: 16 },
  tracking_wide_midfielder_oop: { y: [58, 40, 28], edge: 16 },
  wide_outlet_wide_midfielder_oop: { y: [67, 52, 43], edge: 12 },
  central_midfielder_oop: { y: [60, 43, 32] },
  screening_central_midfielder_oop: { y: [57, 40, 29] },
  wing_back_oop: { y: [46, 28, 18], edge: 12 },
  holding_wing_back_oop: { y: [43, 25, 15], edge: 12 },
  dropping_defensive_midfielder_oop: { y: [54, 36, 12] },
  holding_full_back_oop: { y: [40, 22, 12] },
  stopping_centre_back_oop: { y: [45, 27, 15] },
  covering_centre_back_oop: { y: [39, 21, 9] },
  goalkeeper_ip: { y: [96, 96, 96] },
  no_nonsense_goalkeeper_ip: { y: [96, 96, 96] },
  ball_playing_goalkeeper_ip: { y: [92, 92, 92] },
  goalkeeper_oop: { y: [4, 4, 4] },
  sweeper_keeper_oop: { y: [5, 5, 5] },
  line_holding_keeper_oop: { y: [3, 3, 3] },
};

interface Placement {
  formation: FormationDef;
  slot: FormationSlot;
  x: number;
}

const WIDE_MIDFIELDER_ROLE_IDS = [
  'tracking_wide_midfielder_oop',
  'wide_midfielder_ip',
  'wide_midfielder_oop',
  'wide_outlet_wide_midfielder_oop',
];

function validPlacement(role: RoleDef): Placement | undefined {
  const team = role.possession === 'in' ? 'mine' : 'opponent';
  const candidates = FM26_DATA.formations.flatMap((formation) => {
    const layout = layoutFormation(formation, team);
    return formation.slots
      .filter(
        (slot) =>
          role.families.includes(slot.family) &&
          isRoleAllowedInSlot(role.id, slot.id, formation.slots),
      )
      .map((slot) => ({ formation, slot, x: layout.get(slot.id)!.x }));
  });
  const left = candidates.find((candidate) => candidate.x < CENTRE_X - 0.5);
  return left ?? candidates[0];
}

const PLACEABLE_ROLES = FM26_DATA.roles.flatMap((role) => {
  const placement = validPlacement(role);
  return placement ? [{ role, placement }] : [];
});

function anchorForRole(role: RoleDef, placement: Placement) {
  const attacking = role.possession === 'in';
  const roles = { [placement.slot.id]: role.id };
  const attack = { formation: placement.formation, roles: attacking ? roles : {} };
  const defence = { formation: placement.formation, roles: attacking ? {} : roles };
  return (zone: ZoneId) => {
    const anchors = attacking ? anchorsOf(zone, attack) : anchorsOf(zone, attack, defence);
    const team = attacking ? 'mine' : 'opponent';
    return anchors.get(`${team}:${placement.slot.id}`)!;
  };
}

describe('role region profiles', () => {
  it('covers every role in the generated inventory and nothing else', () => {
    const inventory = FM26_DATA.roles.map((role) => role.id).sort();
    expect(Object.keys(ROLE_REGIONS).sort()).toEqual(inventory);
    expect(inventory).toContain('overlapping_centre_back_ip');
  });

  it('leaves only the wide midfielder roles without a valid slot', () => {
    const unplaceable = FM26_DATA.roles
      .filter((role) => !validPlacement(role))
      .map((role) => role.id)
      .sort();
    expect(unplaceable).toEqual(WIDE_MIDFIELDER_ROLE_IDS);
  });

  it('places each role in a valid slot of every zone according to its region', () => {
    for (const { role, placement } of PLACEABLE_ROLES) {
      const anchorAt = anchorForRole(role, placement);
      const expectation = EXPECTED[role.id] ?? {};
      const attacking = role.possession === 'in';
      for (const zone of ZONE_IDS) {
        const anchor = anchorAt(zone);
        const label = `${role.id} in ${placement.formation.id}/${placement.slot.id} at ${zone}`;
        const { x, y } = anchor.point;
        expect(x, label).toBeGreaterThanOrEqual(BODY_MARGIN);
        expect(x, label).toBeLessThanOrEqual(PITCH_W - BODY_MARGIN);
        expect(y, label).toBeGreaterThanOrEqual(role.families.includes('GK') ? 3 : BODY_MARGIN);
        expect(y, label).toBeLessThanOrEqual(
          PITCH_H - BODY_MARGIN + (role.families.includes('GK') ? 1 : 0),
        );
        if (expectation.y) {
          expect(y, label).toBeCloseTo(expectation.y[THIRD_INDEX[thirdOf(zone)]], 9);
        }
        if (expectation.edge !== undefined) {
          const edgeX = placement.x < CENTRE_X ? expectation.edge : PITCH_W - expectation.edge;
          expect(x, label).toBeCloseTo(edgeX + laneShift(zone, attacking), 9);
        }
        if (role.families.includes('GK')) {
          expect(Math.abs(x - CENTRE_X), label).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('keeps the family anchor for an assignment that resolves to no profile', () => {
    const placement = validPlacement(FM26_DATA.roles.find((role) => role.id === 'winger_ip')!)!;
    for (const zone of ZONE_IDS) {
      const bare = anchorsOf(zone, { formation: placement.formation });
      const unknown = anchorsOf(zone, {
        formation: placement.formation,
        roles: { [placement.slot.id]: 'not_a_role' },
      });
      expect(unknown.get(`mine:${placement.slot.id}`)).toEqual(
        bare.get(`mine:${placement.slot.id}`),
      );
    }
  });
});
