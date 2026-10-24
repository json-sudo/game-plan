import { describe, expect, it } from 'vitest';
import { FORMATIONS } from '../../data/fm26';
import type { FormationDef, Point, SlotId } from '../../data/types';
import { PITCH_H, PITCH_W } from '../geometry/pitch';
import { layoutFormation, mirrorPoint } from './formations';
import {
  OWN_HALF_BACK_Y,
  OWN_HALF_FRONT_Y,
  OWN_HALF_KEEPER_Y,
  layoutOpenMatchup,
  layoutOwnHalf,
  ownHalfAnchors,
} from './open-pitch';

const DESKTOP_CLEARANCE = 4.3;

const formation = (id: string): FormationDef => FORMATIONS.find((f) => f.id === id)!;

const OPEN_MATCHUP_A: Record<'mine' | 'opponent', Partial<Record<SlotId, Point>>> = {
  mine: {
    GK: { x: 38.095, y: 96 },
    DL: { x: 10, y: 55 },
    DCL: { x: 25, y: 66 },
    DCR: { x: 51.19, y: 66 },
    DR: { x: 66.19, y: 55 },
    DM: { x: 38.095, y: 59 },
    MCL: { x: 24, y: 44 },
    MCR: { x: 52.19, y: 44 },
    AMCL: { x: 10, y: 36 },
    ST: { x: 38.095, y: 30 },
    AMCR: { x: 66.19, y: 36 },
  },
  opponent: {
    GK: { x: 38.095, y: 4 },
    DR: { x: 16, y: 24 },
    DCR: { x: 30, y: 24 },
    DCL: { x: 46.19, y: 24 },
    DL: { x: 60.19, y: 24 },
    DMR: { x: 27, y: 36 },
    DML: { x: 49.19, y: 36 },
    AMR: { x: 16, y: 44 },
    AMC: { x: 40, y: 44 },
    AML: { x: 60.19, y: 44 },
    ST: { x: 44, y: 58 },
  },
};

const ORDINARY_TOLERANCE = 3;
const COLLISION_TOLERANCE = 6;

describe('layoutOpenMatchup', () => {
  const formations = { mine: formation('4_3_3_dm_wide'), opponent: formation('4_2_3_1_dm_wide') };
  const layouts = layoutOpenMatchup(formations, DESKTOP_CLEARANCE);

  it('keeps every player of 4-3-3 vs 4-2-3-1 within tolerance of openMatchupA', () => {
    const misses: string[] = [];
    for (const team of ['mine', 'opponent'] as const) {
      for (const [slot, reference] of Object.entries(OPEN_MATCHUP_A[team]) as Array<
        [SlotId, Point]
      >) {
        const placed = layouts[team].get(slot)!;
        const dx = Math.abs(placed.x - reference.x);
        const dy = Math.abs(placed.y - reference.y);
        const collisionOnly = team === 'opponent' && slot === 'ST';
        const within = collisionOnly
          ? dx <= COLLISION_TOLERANCE && dy <= ORDINARY_TOLERANCE
          : Math.hypot(dx, dy) <= ORDINARY_TOLERANCE;
        if (!within) misses.push(`${team}:${slot}`);
      }
    }
    expect(misses).toEqual([]);
    expect(layouts.mine.get('GK')).toEqual(OPEN_MATCHUP_A.mine.GK);
    expect(layouts.opponent.get('GK')).toEqual(OPEN_MATCHUP_A.opponent.GK);
  });

  it('preserves the reviewed lines and lateral relationships', () => {
    const mine = (slot: SlotId) => layouts.mine.get(slot)!;
    const opp = (slot: SlotId) => layouts.opponent.get(slot)!;
    expect(mine('ST').y).toBeLessThan(mine('MCL').y);
    expect(mine('AMCL').y).toBeLessThan(mine('MCL').y);
    expect(mine('MCL').y).toBeLessThan(mine('DL').y);
    expect(mine('DL').y).toBeLessThan(mine('DM').y);
    expect(mine('DM').y).toBeLessThan(mine('DCL').y);
    expect(mine('DL').x).toBeLessThan(mine('DCL').x);
    expect(mine('DCL').x).toBeLessThan(mine('DCR').x);
    expect(mine('DCR').x).toBeLessThan(mine('DR').x);
    expect(mine('AMCL').x).toBeLessThan(mine('MCL').x);
    expect(mine('MCR').x).toBeLessThan(mine('AMCR').x);
    expect(opp('DR').x).toBeLessThan(opp('DCR').x);
    expect(opp('DCR').x).toBeLessThan(opp('DCL').x);
    expect(opp('DCL').x).toBeLessThan(opp('DL').x);
    expect(opp('DMR').x).toBeLessThan(opp('DML').x);
    expect(opp('GK').y).toBeLessThan(opp('DR').y);
    expect(opp('DR').y).toBeLessThan(opp('DMR').y);
    expect(opp('DMR').y).toBeLessThan(opp('AMR').y);
    expect(opp('AMR').y).toBeLessThan(opp('ST').y);
    expect(mine('ST').y).toBeLessThan(opp('ST').y);
  });

  it('is deterministic and does not depend on any ball, zone, role or attacker input', () => {
    expect(layoutOpenMatchup(formations, DESKTOP_CLEARANCE)).toEqual(layouts);
  });

  it('does not mutate the formations', () => {
    const copy = structuredClone(formations);
    layoutOpenMatchup(formations, DESKTOP_CLEARANCE);
    expect(formations).toEqual(copy);
  });
});

describe('layoutOwnHalf', () => {
  it('maps outfield depth monotonically into y 54..84 with the keeper at 96', () => {
    for (const def of FORMATIONS) {
      const anchors = ownHalfAnchors(def);
      const base = layoutFormation(def, 'mine');
      const outfield = def.slots.filter((slot) => slot.family !== 'GK');
      const ys = outfield.map((slot) => anchors.get(slot.id)!.y);
      expect(Math.min(...ys)).toBeCloseTo(OWN_HALF_FRONT_Y);
      expect(Math.max(...ys)).toBeCloseTo(OWN_HALF_BACK_Y);
      const inversions = outfield.flatMap((a) =>
        outfield.filter(
          (b) =>
            base.get(a.id)!.y < base.get(b.id)!.y && anchors.get(a.id)!.y > anchors.get(b.id)!.y,
        ),
      );
      expect(inversions).toEqual([]);
      for (const slot of outfield) {
        expect(anchors.get(slot.id)!.x).toBe(base.get(slot.id)!.x);
      }
      const keeper = def.slots.find((slot) => slot.family === 'GK')!;
      expect(anchors.get(keeper.id)).toEqual({ x: base.get(keeper.id)!.x, y: OWN_HALF_KEEPER_Y });
    }
  });

  it('places the opponent as the 180 degree mirror of mine', () => {
    for (const def of FORMATIONS) {
      const mine = layoutOwnHalf(def, 'mine', DESKTOP_CLEARANCE);
      const opponent = layoutOwnHalf(def, 'opponent', DESKTOP_CLEARANCE);
      for (const [slot, point] of mine) {
        const mirrored = mirrorPoint(point);
        expect(opponent.get(slot)!.x).toBeCloseTo(mirrored.x);
        expect(opponent.get(slot)!.y).toBeCloseTo(mirrored.y);
      }
    }
  });

  it('keeps the team in its own half on the pitch', () => {
    for (const def of FORMATIONS) {
      for (const point of layoutOwnHalf(def, 'mine', DESKTOP_CLEARANCE).values()) {
        expect(point.y).toBeGreaterThanOrEqual(OWN_HALF_FRONT_Y - DESKTOP_CLEARANCE);
        expect(point.y).toBeLessThanOrEqual(PITCH_H);
        expect(point.x).toBeGreaterThan(0);
        expect(point.x).toBeLessThan(PITCH_W);
      }
    }
  });
});
