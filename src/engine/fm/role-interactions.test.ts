import { describe, expect, it } from 'vitest';
import type { Point } from '../../data/types';
import { ZONE_IDS, type ZoneId } from '../../data/zones';
import {
  anchorsOf,
  formationById,
  laneShift,
  mirrorRoles,
  mirrorSlots,
  mirrorZone,
} from '../../test-utils/squad';
import {
  ADVANCED_CB_IFB,
  AWB_TRIO,
  DROPPING_DMS,
  HALF_BACK_IFB,
  HALF_BACK_IWB,
  OCB_ADVANCED_WING_BACK,
  OCB_ALONE,
  OCB_WCB,
  OCB_WING_BACK,
  OCB_WINGER,
  ONE_IFB,
  ONE_IWB,
  R01,
  R02,
  SCENARIOS,
  TWO_HALF_BACKS,
  TWO_IFB,
  TWO_IWB,
  WINGER_ADVANCED_WING_BACK,
  WINGER_WING_BACK,
  type Scenario,
} from '../../test-utils/role-scenarios';
import { PITCH_W } from '../geometry/pitch';

const MIRROR_TOLERANCE = 0.01;
const OTHER_FORMATION = '4_2_3_1_dm_wide';
const BODY_DISTANCE = 4.4;

function anchorsFor(scenario: Scenario, zone: ZoneId, mirrored: boolean) {
  const formation = formationById(scenario.formation);
  const roles = mirrored ? mirrorRoles(formation, scenario.roles) : scenario.roles;
  const setup = { formation, roles };
  const other = { formation: formationById(OTHER_FORMATION) };
  return scenario.defending ? anchorsOf(zone, other, setup) : anchorsOf(zone, setup);
}

function team(scenario: Scenario): 'mine' | 'opponent' {
  return scenario.defending ? 'opponent' : 'mine';
}

function pointOf(scenario: Scenario, zone: ZoneId, slot: string, mirrored = false): Point {
  return anchorsFor(scenario, zone, mirrored).get(`${team(scenario)}:${slot}`)!.point;
}

describe('role interactions mirror across the pitch', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name} produces mirrored geometry within ${MIRROR_TOLERANCE} units`, () => {
      const twinsOf = {
        [team(scenario)]: mirrorSlots(formationById(scenario.formation)),
        [scenario.defending ? 'mine' : 'opponent']: mirrorSlots(formationById(OTHER_FORMATION)),
      };
      for (const zone of ZONE_IDS) {
        const original = anchorsFor(scenario, zone, false);
        const mirrored = anchorsFor(scenario, mirrorZone(zone), true);
        for (const [id, anchor] of original) {
          const [owner, slot] = id.split(':');
          const twin = mirrored.get(`${owner}:${twinsOf[owner][slot]}`)!;
          expect(Math.abs(PITCH_W - twin.point.x - anchor.point.x)).toBeLessThan(MIRROR_TOLERANCE);
          expect(Math.abs(twin.point.y - anchor.point.y)).toBeLessThan(MIRROR_TOLERANCE);
        }
      }
    });
  }
});

describe('role interaction precedence in the final third', () => {
  const zone: ZoneId = 'C-F';
  const sides = [false, true];

  function placed(scenario: Scenario, slot: string, mirrored: boolean) {
    const twins = mirrorSlots(formationById(scenario.formation));
    const point = pointOf(scenario, zone, mirrored ? twins[slot] : slot, mirrored);
    const unmirrored = mirrored ? { x: PITCH_W - point.x, y: point.y } : point;
    return { x: Math.round(unmirrored.x * 1e6) / 1e6, y: Math.round(unmirrored.y * 1e6) / 1e6 };
  }

  it('R01 puts the wing back on the flank, winger high inside and the overlapping centre-back deeper inside', () => {
    for (const mirrored of sides) {
      expect(placed(R01, 'WBL', mirrored)).toEqual({ x: 9, y: 25 });
      expect(placed(R01, 'AMCL', mirrored)).toEqual({ x: 22, y: 18 });
      expect(placed(R01, 'DCL', mirrored)).toEqual({ x: 22, y: 37 });
    }
  });

  it('puts the advanced wing-back on the flank in the winger and overlapping centre-back trio', () => {
    for (const mirrored of sides) {
      expect(placed(AWB_TRIO, 'WBL', mirrored)).toEqual({ x: 9, y: 23 });
      expect(placed(AWB_TRIO, 'AMCL', mirrored)).toEqual({ x: 22, y: 18 });
      expect(placed(AWB_TRIO, 'DCL', mirrored)).toEqual({ x: 22, y: 37 });
    }
  });

  it('R02 shares the flank between winger and wing back at different depths', () => {
    for (const mirrored of sides) {
      expect(placed(R02, 'AMCL', mirrored)).toEqual({ x: 9, y: 18 });
      expect(placed(R02, 'DL', mirrored)).toEqual({ x: 9, y: 25 });
      expect(placed(R02, 'MCL', mirrored)).toEqual({ x: 22, y: 27 });
      const winger = placed(R02, 'AMCL', mirrored);
      const wingBack = placed(R02, 'DL', mirrored);
      expect(wingBack.y).toBeGreaterThan(winger.y);
    }
  });

  it('keeps the winger and wing back pair in their lanes', () => {
    for (const mirrored of sides) {
      expect(placed(WINGER_WING_BACK, 'WBL', mirrored)).toEqual({ x: 9, y: 25 });
      expect(placed(WINGER_WING_BACK, 'AMCL', mirrored)).toEqual({ x: 22, y: 18 });
    }
  });

  it('underlaps the overlapping centre-back inside whichever wide role holds the flank', () => {
    for (const scenario of [OCB_WING_BACK, OCB_ADVANCED_WING_BACK, OCB_WINGER]) {
      for (const mirrored of sides) {
        const overlapping = placed(scenario, 'DCL', mirrored);
        expect(overlapping.x).toBe(22);
        expect([32, 37]).toContain(overlapping.y);
      }
    }
    expect(placed(OCB_ADVANCED_WING_BACK, 'WBL', false)).toEqual({ x: 9, y: 23 });
    expect(placed(OCB_WINGER, 'AMCL', false)).toEqual({ x: 9, y: 23 });
  });

  it('lets an overlapping centre-back alone overlap on the flank', () => {
    for (const mirrored of sides) {
      expect(placed(OCB_ALONE, 'DCL', mirrored)).toEqual({ x: 9, y: 27 });
    }
  });

  it('falls back to width rank for a winger beside an advanced wing-back', () => {
    for (const mirrored of sides) {
      expect(placed(WINGER_ADVANCED_WING_BACK, 'WBL', mirrored).x).toBe(9);
      expect(placed(WINGER_ADVANCED_WING_BACK, 'AMCL', mirrored).x).toBe(22);
    }
  });

  it('keeps the overlapping centre-back in the defensive third until the ball leaves it', () => {
    for (const mirrored of sides) {
      const deep = pointOf(R01, 'C-D', mirrored ? 'DCR' : 'DCL', mirrored);
      expect(deep.y).toBe(82);
    }
  });
});

describe('splitting outlets', () => {
  const PAIR: Scenario = {
    name: 'two central splitting outlet attacking midfielders',
    formation: '4_2_2_2_am_narrow',
    roles: {
      AMCL: 'splitting_outlet_attacking_midfielder_oop',
      AMCR: 'splitting_outlet_attacking_midfielder_oop',
    },
    defending: true,
  };

  it('sends a pair to opposite half-spaces', () => {
    const xs = ['AMCL', 'AMCR'].map((slot) => pointOf(PAIR, 'C-M', slot).x);
    expect(xs.map((x) => Math.round(x * 1e6) / 1e6).sort((a, b) => a - b)).toEqual([22, 54.19]);
  });
});

describe('back line and pivot interactions', () => {
  it('moves the adjacent centre-back inside for one inside full-back and keeps the far one', () => {
    const point = (slot: string) => pointOf(ONE_IFB, 'C-M', slot);
    expect(point('DL').x).toBeCloseTo(22, 9);
    expect(point('DCL').x).toBeGreaterThanOrEqual(27.831 + 1);
    expect(point('DCR').x).toBeCloseTo(51.19, 9);
    expect(point('DL').y).toBe(point('DCL').y);
  });

  it('keeps a flat back four with two inside full-backs', () => {
    const line = ['DL', 'DCL', 'DCR', 'DR'].map((slot) => pointOf(TWO_IFB, 'C-M', slot));
    const xs = line.map((point) => point.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(new Set(line.map((point) => point.y)).size).toBe(1);
    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(BODY_DISTANCE);
    expect(line[1].x).toBeCloseTo(PITCH_W - line[2].x, 9);
  });

  it('gives a half back first claim to the centre and widens the centre-backs', () => {
    const back = ['DCL', 'DCR'].map((slot) => pointOf(HALF_BACK_IFB, 'C-M', slot));
    const halfBack = pointOf(HALF_BACK_IFB, 'C-M', 'DM');
    expect(halfBack.x).toBeCloseTo(PITCH_W / 2, 9);
    expect(halfBack.y).toBe(back[0].y);
    expect(back[0].x).toBeLessThan(halfBack.x - BODY_DISTANCE);
    expect(back[1].x).toBeGreaterThan(halfBack.x + BODY_DISTANCE);
  });

  it('spreads two half backs and the centre-backs monotonically with body clearance', () => {
    const line = ['DCL', 'DML', 'DMR', 'DCR'].map((slot) => pointOf(TWO_HALF_BACKS, 'C-M', slot));
    line.slice(1).forEach((point, index) => {
      expect(point.x - line[index].x).toBeGreaterThanOrEqual(BODY_DISTANCE);
      expect(point.y).toBe(line[index].y);
    });
  });

  it('staggers inside wing-backs in depth when a double pivot occupies their pockets', () => {
    const wingBack = pointOf(TWO_IWB, 'C-M', 'WBL');
    const pivot = pointOf(TWO_IWB, 'C-M', 'DMCL');
    expect(Math.hypot(wingBack.x - pivot.x, wingBack.y - pivot.y)).toBeGreaterThanOrEqual(
      BODY_DISTANCE,
    );
    expect(wingBack.x).toBeCloseTo(30, 9);
  });

  it('places a lone inside wing-back beside the single pivot without a stagger', () => {
    const wingBack = pointOf(ONE_IWB, 'C-M', 'WBL');
    expect(wingBack.x).toBeCloseTo(30, 9);
    expect(wingBack.y).toBe(56);
  });

  it('puts the inside wing-back beside the surviving pivot when the half back drops', () => {
    const wingBack = pointOf(HALF_BACK_IWB, 'C-M', 'WBL');
    const survivor = pointOf(HALF_BACK_IWB, 'C-M', 'DMCR');
    expect(survivor.x).toBeCloseTo(PITCH_W / 2, 9);
    expect(survivor.x - wingBack.x).toBeGreaterThanOrEqual(BODY_DISTANCE);
  });

  it('keeps an advanced centre-back out of the inside full-back pocket', () => {
    const advanced = pointOf(ADVANCED_CB_IFB, 'C-M', 'DCL');
    const insideBack = pointOf(ADVANCED_CB_IFB, 'C-M', 'DL');
    expect(advanced.y).toBe(59);
    expect(insideBack.y).toBe(66);
    expect(pointOf(ADVANCED_CB_IFB, 'C-M', 'DCR').y).toBe(66);
    expect(Math.hypot(advanced.x - insideBack.x, advanced.y - insideBack.y)).toBeGreaterThan(
      BODY_DISTANCE,
    );
  });

  it('keeps the overlapping and wide centre-backs distinct', () => {
    const overlapping = pointOf(OCB_WCB, 'C-M', 'DCL');
    const wide = pointOf(OCB_WCB, 'C-M', 'DCR');
    expect(overlapping.y).toBe(49);
    expect(wide.y).toBe(66);
    expect(PITCH_W - wide.x).toBeCloseTo(22, 9);
  });

  it('drops multiple dropping defensive midfielders into the back line in the final third', () => {
    const line = ['DCL', 'DMCL', 'DC', 'DMCR', 'DCR']
      .map((slot) => pointOf(DROPPING_DMS, 'C-F', slot))
      .sort((a, b) => a.x - b.x);
    line.slice(1).forEach((point, index) => {
      expect(point.x - line[index].x).toBeGreaterThanOrEqual(BODY_DISTANCE);
      expect(point.y).toBe(line[index].y);
    });
    expect(line[0].y).toBe(12);
    const middle = ['DMCL', 'DMCR'].map((slot) => pointOf(DROPPING_DMS, 'C-M', slot));
    expect(middle.every((point) => point.y === 36)).toBe(true);
  });

  it('applies the lane shift once on top of the interaction geometry', () => {
    const centre = pointOf(R01, 'C-F', 'WBL');
    const flank = pointOf(R01, 'R-F', 'WBL');
    expect(flank.x - centre.x).toBeCloseTo(laneShift('R-F', true), 9);
  });
});
