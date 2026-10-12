import { describe, expect, it } from 'vitest';
import type { LineShiftTable, MovementCell, MovementTable } from '../../data/types';
import { ZONE_IDS } from '../../data/zones';
import { PITCH_W } from '../geometry/pitch';
import { lineShift } from './lineShift';
import { ballSideOf, offsetFor, targetFor, type TargetInput } from './movement';

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
const tables = { movement, shapeLineShift: lineShiftTable, lineShift: lineShiftTable };
const baseInput: TargetInput = {
  base: { x: 60, y: 40 },
  start: { x: 60, y: 40 },
  team: 'mine',
  attacker: 'mine',
  roleId: 'winger',
  isKeeper: false,
  zone: 'R-F',
  tables,
};

describe('movement lookup and targeting', () => {
  it('selects the ball-side or far-side movement offset', () => {
    expect(offsetFor(movement, 'winger', 'R-F', 'ball')).toEqual([3, 0, 6]);
    expect(offsetFor(movement, 'winger', 'R-F', 'far')).toEqual([5, -1, 3]);
    expect(offsetFor(movement, 'ghost', 'R-F', 'ball')).toBeNull();
  });

  it('uses attacker-frame lanes to determine which side of the ball a player occupies', () => {
    expect(ballSideOf({ x: 66, y: 30 }, 'R-F')).toBe('ball');
    expect(ballSideOf({ x: 10, y: 30 }, 'R-F')).toBe('far');
    expect(ballSideOf({ x: 10, y: 30 }, 'C-M')).toBe('ball');
  });

  it('applies role offsets from the shape position', () => {
    expect(targetFor(baseInput)).toEqual({ status: 'ok', target: { x: 63, y: 34 } });
    expect(targetFor({ ...baseInput, start: { x: 55, y: 45 } })).toEqual({
      status: 'ok',
      target: { x: 58, y: 39 },
    });
  });

  it('applies the second defender line shift before the role offset', () => {
    const result = targetFor({
      ...baseInput,
      base: { x: 56.19, y: 10 },
      start: { x: 56.19, y: 13 },
      team: 'opponent',
      roleId: 'back',
    });
    expect(result).toEqual({ status: 'ok', target: { x: 58.19, y: 12 } });
  });

  it('does not silently fall back when a role has no movement data', () => {
    expect(targetFor({ ...baseInput, zone: 'L-D' })).toEqual({ status: 'setup-not-finished' });
    expect(targetFor({ ...baseInput, roleId: 'ghost' })).toEqual({ status: 'setup-not-finished' });
  });

  it('keeps a roleless player at the shape position', () => {
    expect(targetFor({ ...baseInput, roleId: undefined })).toEqual({
      status: 'ok',
      target: baseInput.start,
    });
  });

  it('clamps targets inside the pitch margin and works with the opponent attacking', () => {
    const clamped = targetFor({ ...baseInput, base: { x: 74, y: 5 }, start: { x: 74, y: 5 } });
    expect(clamped).toEqual({ status: 'ok', target: { x: PITCH_W - 3, y: 3 } });
    const mirrored = targetFor({
      ...baseInput,
      attacker: 'opponent',
      team: 'opponent',
      base: { x: 60, y: 60 },
      start: { x: 60, y: 60 },
    });
    expect(mirrored).toMatchObject({ status: 'ok' });
  });

  it('reads the line shift table for a zone', () => {
    expect(lineShift('R-F', lineShiftTable)).toBe(-3);
    expect(lineShift('C-M', lineShiftTable)).toBe(0);
  });
});
