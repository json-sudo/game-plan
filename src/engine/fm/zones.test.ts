import { describe, expect, it } from 'vitest';
import { GRID, LANE_EDGE_FRACTIONS, ZONE_IDS } from '../../data/zones';
import { PITCH_H, PITCH_W } from '../geometry/pitch';
import {
  ZONE_GRID,
  fromAttackerFrame,
  laneSignOf,
  toAttackerFrame,
  zoneBounds,
  zoneCentre,
  zoneName,
  zoneOf,
} from './zones';

const LANE_BOUNDS = [0, ...LANE_EDGE_FRACTIONS, 1].map((fraction) => fraction * PITCH_W);
const laneCentreX = (lane: (typeof GRID.lanes)[number]) => {
  const index = GRID.lanes.indexOf(lane);
  return (LANE_BOUNDS[index] + LANE_BOUNDS[index + 1]) / 2;
};
const THIRD_CENTRE_Y = { F: PITCH_H / 6, M: PITCH_H / 2, D: (PITCH_H * 5) / 6 };

describe('toAttackerFrame', () => {
  it('is the identity for my team', () => {
    expect(toAttackerFrame({ x: 10, y: 20 }, 'mine')).toEqual({ x: 10, y: 20 });
  });

  it('rotates 180 degrees about the pitch centre for the opponent', () => {
    const rotated = toAttackerFrame({ x: 10, y: 20 }, 'opponent');
    expect(rotated.x).toBeCloseTo(PITCH_W - 10);
    expect(rotated.y).toBeCloseTo(PITCH_H - 20);
  });

  it('is its own inverse', () => {
    const point = { x: 12.3, y: 77.7 };
    const there = toAttackerFrame(point, 'opponent');
    const back = fromAttackerFrame(there, 'opponent');
    expect(back.x).toBeCloseTo(point.x);
    expect(back.y).toBeCloseTo(point.y);
  });

  it('does not mutate its input', () => {
    const point = { x: 1, y: 2 };
    toAttackerFrame(point, 'opponent');
    expect(point).toEqual({ x: 1, y: 2 });
  });
});

describe('ZONE_GRID', () => {
  it('splits the pitch into five lanes at the data layer fractions and three equal thirds', () => {
    expect(ZONE_GRID.laneEdges).toEqual(LANE_EDGE_FRACTIONS.map((fraction) => fraction * PITCH_W));
    expect(ZONE_GRID.laneEdges).toHaveLength(GRID.lanes.length - 1);
    expect(ZONE_GRID.thirdEdges).toEqual([PITCH_H / 3, (PITCH_H * 2) / 3]);
  });
});

describe('zoneOf', () => {
  it('reads zones from my attacking view, final third at small y', () => {
    expect(zoneOf({ x: laneCentreX('R'), y: THIRD_CENTRE_Y.F }, 'mine')).toBe('R-F');
    expect(zoneOf({ x: laneCentreX('RH'), y: THIRD_CENTRE_Y.F }, 'mine')).toBe('RH-F');
    expect(zoneOf({ x: laneCentreX('C'), y: THIRD_CENTRE_Y.M }, 'mine')).toBe('C-M');
    expect(zoneOf({ x: laneCentreX('LH'), y: THIRD_CENTRE_Y.M }, 'mine')).toBe('LH-M');
    expect(zoneOf({ x: laneCentreX('L'), y: THIRD_CENTRE_Y.D }, 'mine')).toBe('L-D');
  });

  it('reads the same screen point from the opponent view for the opponent', () => {
    expect(zoneOf({ x: laneCentreX('R'), y: THIRD_CENTRE_Y.F }, 'opponent')).toBe('L-D');
    expect(zoneOf({ x: laneCentreX('RH'), y: THIRD_CENTRE_Y.F }, 'opponent')).toBe('LH-D');
    expect(zoneOf({ x: laneCentreX('L'), y: THIRD_CENTRE_Y.D }, 'opponent')).toBe('R-F');
    expect(zoneOf({ x: 38.095, y: 50 }, 'opponent')).toBe('C-M');
  });

  it('puts an edge value in the lower lane and the lower y band', () => {
    expect(zoneOf({ x: ZONE_GRID.laneEdges[0], y: ZONE_GRID.thirdEdges[0] }, 'mine')).toBe('L-F');
    expect(zoneOf({ x: ZONE_GRID.laneEdges[1], y: ZONE_GRID.thirdEdges[1] }, 'mine')).toBe('LH-M');
  });

  it('accepts a custom grid', () => {
    const grid = { laneEdges: [10, 20, 30, 40], thirdEdges: [10, 20] };
    expect(zoneOf({ x: 15, y: 5 }, 'mine', grid)).toBe('LH-F');
  });

  it('covers all fifteen zones across the pitch', () => {
    const seen = new Set(
      GRID.lanes.flatMap((lane) =>
        GRID.thirds.map((third) =>
          zoneOf({ x: laneCentreX(lane), y: THIRD_CENTRE_Y[third] }, 'mine'),
        ),
      ),
    );
    expect([...seen].sort()).toEqual([...ZONE_IDS].sort());
  });
});

describe('laneSignOf', () => {
  it('is -1 left, 0 centre, 1 right', () => {
    expect(laneSignOf('L-F')).toBe(-1);
    expect(laneSignOf('LH-F')).toBe(-1);
    expect(laneSignOf('C-M')).toBe(0);
    expect(laneSignOf('RH-M')).toBe(1);
    expect(laneSignOf('R-D')).toBe(1);
  });
});

describe('zoneBounds and zoneCentre', () => {
  it('returns bounds that tile the pitch', () => {
    const area = ZONE_IDS.reduce((sum, zone) => {
      const b = zoneBounds(zone);
      return sum + (b.x1 - b.x0) * (b.y1 - b.y0);
    }, 0);
    expect(area).toBeCloseTo(PITCH_W * PITCH_H);
  });

  it('puts the final third at the top of the attacker frame', () => {
    expect(zoneBounds('C-F').y0).toBe(0);
    expect(zoneBounds('C-D').y1).toBe(PITCH_H);
  });

  it('centres a zone and maps back into the same zone for both attackers', () => {
    for (const zone of ZONE_IDS) {
      expect(zoneOf(zoneCentre(zone, 'mine'), 'mine')).toBe(zone);
      expect(zoneOf(zoneCentre(zone, 'opponent'), 'opponent')).toBe(zone);
    }
  });
});

describe('zoneName', () => {
  it('names zones from the attacking view', () => {
    expect(zoneName('R-F')).toBe('Right flank - final third');
    expect(zoneName('C-M')).toBe('Centre - middle third');
    expect(zoneName('L-D')).toBe('Left flank - defensive third');
    expect(zoneName('RH-F')).toBe('Right half-space - final third');
    expect(zoneName('LH-M')).toBe('Left half-space - middle third');
  });
});
