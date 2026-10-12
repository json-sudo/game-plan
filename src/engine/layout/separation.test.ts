import { describe, expect, it } from 'vitest';
import { PITCH_H, PITCH_W } from '../geometry/pitch';
import { MIN_SEP, separateFromDefenders, separateMutually } from './separation';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe('separateFromDefenders', () => {
  it('leaves attackers that are far enough away untouched', () => {
    const result = separateFromDefenders(
      [{ id: 'a', x: 30, y: 30 }],
      [{ id: 'd', x: 60, y: 80 }],
      true,
    );
    expect(result.get('a')).toEqual({ x: 30, y: 30 });
  });

  it('pushes an overlapping attacker to at least MIN_SEP from the defender', () => {
    const result = separateFromDefenders(
      [{ id: 'a', x: 30, y: 50 }],
      [{ id: 'd', x: 33, y: 50 }],
      true,
    );
    expect(dist(result.get('a')!, { x: 33, y: 50 })).toBeGreaterThanOrEqual(MIN_SEP - 1e-6);
  });

  it('pushes an exactly coincident attacker toward its own half', () => {
    const own = separateFromDefenders(
      [{ id: 'a', x: 30, y: 50 }],
      [{ id: 'd', x: 30, y: 50 }],
      true,
    );
    const other = separateFromDefenders(
      [{ id: 'a', x: 30, y: 50 }],
      [{ id: 'd', x: 30, y: 50 }],
      false,
    );
    expect(own.get('a')!.y).toBeGreaterThan(50);
    expect(other.get('a')!.y).toBeLessThan(50);
  });

  it('breaks a vertically collinear overlap sideways', () => {
    const result = separateFromDefenders(
      [{ id: 'a', x: 30, y: 52 }],
      [{ id: 'd', x: 30, y: 50 }],
      true,
    );
    expect(result.get('a')!.x).not.toBe(30);
  });

  it('keeps pushed attackers inside the pitch margin', () => {
    const result = separateFromDefenders(
      [{ id: 'a', x: 1, y: 1 }],
      [{ id: 'd', x: 2, y: 2 }],
      false,
    );
    const pos = result.get('a')!;
    expect(pos.x).toBeGreaterThanOrEqual(1);
    expect(pos.y).toBeGreaterThanOrEqual(1);
    expect(pos.x).toBeLessThanOrEqual(PITCH_W - 1);
    expect(pos.y).toBeLessThanOrEqual(PITCH_H - 1);
  });
});

describe('separateMutually', () => {
  it('leaves well separated points untouched', () => {
    const result = separateMutually(
      [
        { id: 'a', x: 10, y: 10, weight: 1 },
        { id: 'b', x: 50, y: 70, weight: 1 },
      ],
      [{ id: 'anchor', x: 30, y: 40 }],
    );
    expect(result.get('a')).toEqual({ x: 10, y: 10 });
    expect(result.get('b')).toEqual({ x: 50, y: 70 });
  });

  it('separates two overlapping movable points', () => {
    const result = separateMutually(
      [
        { id: 'a', x: 30, y: 50, weight: 1 },
        { id: 'b', x: 32, y: 50, weight: 1 },
      ],
      [],
    );
    expect(dist(result.get('a')!, result.get('b')!)).toBeGreaterThanOrEqual(MIN_SEP - 0.5);
  });

  it('moves the lighter point more than the heavier one', () => {
    const result = separateMutually(
      [
        { id: 'light', x: 30, y: 50, weight: 1 },
        { id: 'heavy', x: 32, y: 50, weight: 9 },
      ],
      [],
    );
    const lightMoved = dist(result.get('light')!, { x: 30, y: 50 });
    const heavyMoved = dist(result.get('heavy')!, { x: 32, y: 50 });
    expect(lightMoved).toBeGreaterThan(heavyMoved);
  });

  it('pushes movable points away from anchors', () => {
    const result = separateMutually(
      [{ id: 'a', x: 30, y: 50, weight: 1 }],
      [{ id: 'anchor', x: 33, y: 50 }],
    );
    expect(dist(result.get('a')!, { x: 33, y: 50 })).toBeGreaterThanOrEqual(MIN_SEP - 0.5);
  });

  it('resolves exactly coincident movable points and anchors', () => {
    const pair = separateMutually(
      [
        { id: 'a', x: 30, y: 50, weight: 1 },
        { id: 'b', x: 30, y: 50, weight: 1 },
      ],
      [],
    );
    expect(pair.get('a')).not.toEqual(pair.get('b'));

    const anchored = separateMutually(
      [{ id: 'a', x: 30, y: 50, weight: 1 }],
      [{ id: 'anchor', x: 30, y: 50 }],
    );
    expect(anchored.get('a')).not.toEqual({ x: 30, y: 50 });
  });

  it('breaks vertically collinear overlaps sideways', () => {
    const result = separateMutually(
      [
        { id: 'a', x: 30, y: 50, weight: 1 },
        { id: 'b', x: 30, y: 52, weight: 1 },
      ],
      [{ id: 'anchor', x: 30, y: 51 }],
    );
    expect(result.get('a')!.x).not.toBe(30);
  });
});
