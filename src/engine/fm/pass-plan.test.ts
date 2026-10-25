import { describe, expect, it } from 'vitest';
import type { Point } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import {
  MAX_COVER_TRAVEL,
  MAX_RECEIVER_TRAVEL,
  MAX_SUPPORT_TRAVEL,
  planPasses,
  type PlanContext,
} from './pass-plan';
import type { Frame } from './pass-validity';

const OPENING: Frame = {
  carrier: { x: 38, y: 72 },
  left: { x: 24, y: 62 },
  right: { x: 52, y: 62 },
  keeper: { x: 38, y: 96 },
};

function contextOf(
  startZone: ZoneId,
  teammateIds: readonly string[],
  defenderIds: readonly string[] = [],
): PlanContext {
  return { startZone, teammateIds, defenderIds, targetFor: () => OPENING };
}

function framesOf(opening: Frame, passes: ReturnType<typeof planPasses>): Frame[] {
  return [opening, ...passes.map((pass) => pass.positions)];
}

describe('planPasses counts', () => {
  const triangle = ['carrier', 'left', 'right'];

  it('plans exactly one pass from the final-third centre', () => {
    expect(planPasses(contextOf('C-F', triangle), OPENING, 'carrier')).toHaveLength(1);
  });

  it('plans exactly two passes from final-third flank and half-space zones', () => {
    for (const zone of ['L-F', 'LH-F', 'RH-F', 'R-F'] as const) {
      expect(planPasses(contextOf(zone, triangle), OPENING, 'carrier')).toHaveLength(2);
    }
  });

  it('plans four to six passes from defensive and middle zones', () => {
    for (const zone of ['L-D', 'C-D', 'LH-M', 'C-M', 'R-M'] as const) {
      const count = planPasses(contextOf(zone, triangle), OPENING, 'carrier').length;
      expect(count).toBeGreaterThanOrEqual(4);
      expect(count).toBeLessThanOrEqual(6);
    }
  });

  it('never makes the goalkeeper a receiver', () => {
    const passes = planPasses(contextOf('C-M', triangle), OPENING, 'carrier');
    expect(passes.every((pass) => pass.receiverId !== 'keeper')).toBe(true);
  });

  it('is reproducible', () => {
    const context = contextOf('C-M', triangle);
    expect(planPasses(context, OPENING, 'carrier')).toEqual(
      planPasses(context, OPENING, 'carrier'),
    );
  });
});

describe('planPasses recycling', () => {
  it('passes backwards when the only teammate is behind the ball', () => {
    const opening: Frame = { carrier: { x: 38, y: 30 }, behind: { x: 38, y: 50 } };
    const passes = planPasses(
      { ...contextOf('C-F', ['carrier', 'behind']), targetFor: () => opening },
      opening,
      'carrier',
    );
    expect(passes).toHaveLength(1);
    expect(passes[0].positions.behind.y).toBeGreaterThan(opening.carrier.y);
  });

  it('returns to the passer only when no other receiver exists', () => {
    const pair: Frame = { carrier: { x: 30, y: 60 }, other: { x: 50, y: 60 } };
    const passes = planPasses(
      { ...contextOf('C-M', ['carrier', 'other']), targetFor: () => pair },
      pair,
      'carrier',
    );
    expect(passes.length).toBeGreaterThanOrEqual(4);
    passes.forEach((pass, index) => {
      expect(pass.receiverId).toBe(index % 2 === 0 ? 'other' : 'carrier');
    });
  });

  it('avoids an immediate return while a third receiver is available', () => {
    const passes = planPasses(contextOf('C-M', ['carrier', 'left', 'right']), OPENING, 'carrier');
    const returns = passes.filter(
      (pass, index) => index > 0 && pass.receiverId === passes[index - 1].carrierId,
    );
    expect(passes.length).toBeGreaterThanOrEqual(4);
    expect(returns).toEqual([]);
  });
});

describe('planPasses dead ends', () => {
  const caged: Frame = {
    carrier: { x: 38, y: 76 },
    trap: { x: 38, y: 44 },
    open: { x: 14, y: 70 },
    wallA: { x: 31, y: 40 },
    wallB: { x: 45, y: 40 },
    wallC: { x: 38, y: 36 },
    wallD: { x: 33, y: 49 },
    wallE: { x: 43, y: 49 },
  };
  const wall = ['wallA', 'wallB', 'wallC', 'wallD', 'wallE'];

  it('recovers and still delivers a complete chain', () => {
    const passes = planPasses(
      { ...contextOf('C-M', ['carrier', 'trap', 'open'], wall), targetFor: () => caged },
      caged,
      'carrier',
    );
    expect(passes.length).toBeGreaterThanOrEqual(4);
    expect(passes.length).toBeLessThanOrEqual(6);
  });
});

describe('planPasses movement bounds', () => {
  const crowd: Frame = {
    ...OPENING,
    defenderA: { x: 20, y: 40 },
    defenderB: { x: 56, y: 40 },
  };
  const far: Frame = {
    ...crowd,
    left: { x: 4, y: 30 },
    right: { x: 70, y: 30 },
    defenderA: { x: 10, y: 10 },
    defenderB: { x: 66, y: 10 },
  };

  it('moves receivers at most 8 and supporters at most 10 per pass', () => {
    const context: PlanContext = {
      ...contextOf('C-M', ['carrier', 'left', 'right'], ['defenderA', 'defenderB']),
      targetFor: () => far,
    };
    const passes = planPasses(context, crowd, 'carrier');
    const frames = framesOf(crowd, passes);
    const travel = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
    passes.forEach((pass, index) => {
      const before = frames[index];
      const after = frames[index + 1];
      for (const id of Object.keys(before)) {
        const moved = travel(before[id], after[id]);
        const limit = id === pass.receiverId ? MAX_RECEIVER_TRAVEL : MAX_SUPPORT_TRAVEL;
        expect(moved).toBeLessThanOrEqual(limit + 1e-9);
      }
    });
  });

  it('lets only the defender nearest the new situation respond fully', () => {
    const context: PlanContext = {
      ...contextOf('C-M', ['carrier', 'left', 'right'], ['defenderA', 'defenderB']),
      targetFor: () => far,
    };
    const [first] = planPasses(context, crowd, 'carrier');
    const moved = (id: string) =>
      Math.hypot(first.positions[id].x - crowd[id].x, first.positions[id].y - crowd[id].y);
    const landing = first.positions[first.receiverId];
    const [nearest, other] = ['defenderA', 'defenderB'].sort(
      (a, b) =>
        Math.hypot(crowd[a].x - landing.x, crowd[a].y - landing.y) -
        Math.hypot(crowd[b].x - landing.x, crowd[b].y - landing.y),
    );
    expect(moved(nearest)).toBeGreaterThan(MAX_COVER_TRAVEL);
    expect(moved(other)).toBeLessThanOrEqual(MAX_COVER_TRAVEL + 1e-9);
  });
});
