import { describe, expect, it } from 'vitest';
import type { LineShiftTable, MovementCell, MovementTable } from '../../data/types';
import { ZONE_IDS } from '../../data/zones';
import { PITCH_W } from '../geometry/pitch';
import { lineShift } from './lineShift';
import {
  PITCH_TARGET_MARGIN,
  ballSideOf,
  offsetFor,
  targetFor,
  type TargetInput,
} from './movement';

const cell = (ball: [number, number, number], far: [number, number, number]): MovementCell => ({
  ball,
  far,
  from: { ball: 'initial', far: 'initial' },
});

const movement: MovementTable = {
  winger: { 'R-F': cell([3, 0, 6], [5, -1, 3]), 'C-M': cell([0, 2, 3], [0, 2, 3]) },
  back: { 'R-F': cell([2, 0, 2], [4, 0, 1]) },
  keeper: { 'R-F': cell([1, 0, 2], [1, 0, 2]) },
  deep: { 'R-F': cell([0, 0, 10], [0, 0, 10]) },
};

const flat = Object.fromEntries(ZONE_IDS.map((zone) => [zone, { dy: 0, from: 'initial' }]));
const lineShiftTable = { ...flat, 'R-F': { dy: -3, from: 'initial' } } as LineShiftTable;
const tables = { movement, lineShift: lineShiftTable };

const baseInput: TargetInput = {
  base: { x: 60, y: 40 },
  team: 'mine',
  attacker: 'mine',
  roleId: 'winger',
  isKeeper: false,
  zone: 'R-F',
  tables,
};

describe('lineShift', () => {
  it('reads the shared dy for the zone', () => {
    expect(lineShift('R-F', lineShiftTable)).toBe(-3);
    expect(lineShift('C-M', lineShiftTable)).toBe(0);
  });
});

describe('offsetFor', () => {
  it('returns the ball-side or far-side offset', () => {
    expect(offsetFor(movement, 'winger', 'R-F', 'ball')).toEqual([3, 0, 6]);
    expect(offsetFor(movement, 'winger', 'R-F', 'far')).toEqual([5, -1, 3]);
  });

  it('returns null for an unknown role or an untuned zone', () => {
    expect(offsetFor(movement, 'ghost', 'R-F', 'ball')).toBeNull();
    expect(offsetFor(movement, 'winger', 'L-D', 'ball')).toBeNull();
  });
});

describe('ballSideOf', () => {
  it('marks players in the ball lane or the centre as ball side', () => {
    expect(ballSideOf({ x: 66, y: 30 }, 'R-F')).toBe('ball');
    expect(ballSideOf({ x: 38, y: 30 }, 'R-F')).toBe('ball');
  });

  it('marks players in the opposite wide lane as far side', () => {
    expect(ballSideOf({ x: 10, y: 30 }, 'R-F')).toBe('far');
    expect(ballSideOf({ x: 66, y: 30 }, 'L-M')).toBe('far');
  });

  it('has no far side when the ball is in the centre lane', () => {
    expect(ballSideOf({ x: 10, y: 30 }, 'C-M')).toBe('ball');
    expect(ballSideOf({ x: 66, y: 30 }, 'C-D')).toBe('ball');
  });
});

describe('targetFor', () => {
  it('moves an attacker by side toward the ball lane and depth up the pitch', () => {
    expect(targetFor(baseInput)).toEqual({ x: 63, y: 34 });
  });

  it('uses the far-side offset and wide away from the own centre line', () => {
    const far = targetFor({ ...baseInput, base: { x: 10, y: 40 } });
    expect(far.x).toBeCloseTo(10 + 5 + 1);
    expect(far.y).toBeCloseTo(40 - 3);
  });

  it('moves wide outward from the centre line on the right and inward with a negative value', () => {
    const outward = targetFor({
      ...baseInput,
      zone: 'C-M',
      base: { x: 66, y: 40 },
    });
    expect(outward).toEqual({ x: 68, y: 37 });
    const left = targetFor({ ...baseInput, zone: 'C-M', base: { x: 10, y: 40 } });
    expect(left).toEqual({ x: 8, y: 37 });
  });

  it('applies the line shift first and then the role offset to a defender', () => {
    const target = targetFor({
      ...baseInput,
      base: { x: 56.19, y: 10 },
      team: 'opponent',
      roleId: 'back',
    });
    expect(target.x).toBeCloseTo(58.19);
    expect(target.y).toBeCloseTo(9);
  });

  it('flips depth for defenders: forward is toward the attackers', () => {
    const defender = targetFor({
      ...baseInput,
      base: { x: 6.19, y: 10 },
      team: 'opponent',
      roleId: 'deep',
    });
    expect(defender.x).toBeCloseTo(6.19);
    expect(defender.y).toBeCloseTo(10 - 3 + 10);
  });

  it('does not line-shift a keeper', () => {
    const target = targetFor({
      ...baseInput,
      base: { x: 38.095, y: 5 },
      team: 'opponent',
      roleId: 'keeper',
      isKeeper: true,
    });
    expect(target.x).toBeCloseTo(39.095);
    expect(target.y).toBeCloseTo(7);
  });

  it('works in the attacker frame when the opponent attacks', () => {
    const target = targetFor({
      ...baseInput,
      attacker: 'opponent',
      team: 'opponent',
      base: { x: 60, y: 60 },
    });
    expect(target.x).toBeCloseTo(54);
    expect(target.y).toBeCloseTo(63);
  });

  it('keeps the base position when the role has no entry for the zone', () => {
    expect(targetFor({ ...baseInput, zone: 'L-D' })).toEqual({ x: 60, y: 40 });
    expect(targetFor({ ...baseInput, roleId: 'ghost' })).toEqual({ x: 60, y: 40 });
    expect(targetFor({ ...baseInput, roleId: undefined })).toEqual({ x: 60, y: 40 });
  });

  it('clamps the target inside the pitch margin', () => {
    const target = targetFor({ ...baseInput, base: { x: 74, y: 5 } });
    expect(target.y).toBe(PITCH_TARGET_MARGIN);
    expect(target.x).toBeCloseTo(PITCH_W - PITCH_TARGET_MARGIN);
  });

  it('is deterministic and does not mutate its input', () => {
    const input = { ...baseInput, base: { x: 20, y: 90 }, team: 'opponent' as const };
    const copy = structuredClone(input);
    expect(targetFor(input)).toEqual(targetFor(input));
    expect(input).toEqual(copy);
  });
});
