import { describe, expect, it } from 'vitest';
import { nearestCarrier, nearestCarrierInLane, resolveCarrier } from './carrier';

const candidate = (id: string, x: number, y: number, isKeeper = false) => ({
  id,
  position: { x, y },
  isKeeper,
});

describe('nearestCarrier', () => {
  it('returns the closest candidate to the ball', () => {
    const candidates = [candidate('a', 10, 10), candidate('b', 30, 30), candidate('c', 60, 60)];
    expect(nearestCarrier({ x: 32, y: 28 }, candidates)).toBe('b');
  });

  it('breaks ties by id', () => {
    const candidates = [candidate('z', 10, 0), candidate('a', 30, 0)];
    expect(nearestCarrier({ x: 20, y: 0 }, candidates)).toBe('a');
    expect(nearestCarrier({ x: 20, y: 0 }, [...candidates].reverse())).toBe('a');
  });

  it('skips keepers while an outfield player exists', () => {
    const candidates = [candidate('gk', 38, 90, true), candidate('cb', 20, 60)];
    expect(nearestCarrier({ x: 38, y: 92 }, candidates)).toBe('cb');
  });

  it('falls back to a keeper when only keepers exist', () => {
    expect(nearestCarrier({ x: 0, y: 0 }, [candidate('gk', 38, 90, true)])).toBe('gk');
  });

  it('returns null with no candidates', () => {
    expect(nearestCarrier({ x: 0, y: 0 }, [])).toBeNull();
  });
});

describe('nearestCarrierInLane', () => {
  const mine = [candidate('l', 10, 60), candidate('c', 38, 60), candidate('r', 66, 60)];

  it('prefers candidates in the ball lane', () => {
    expect(nearestCarrierInLane({ x: 62, y: 20 }, mine, 'mine')).toBe('r');
    expect(nearestCarrierInLane({ x: 12, y: 20 }, mine, 'mine')).toBe('l');
  });

  it('matches lanes by screen side for the opponent too', () => {
    expect(nearestCarrierInLane({ x: 12, y: 20 }, mine, 'opponent')).toBe('l');
    expect(nearestCarrierInLane({ x: 62, y: 80 }, mine, 'opponent')).toBe('r');
  });

  it('falls back to all candidates when the lane is empty', () => {
    const noRight = mine.filter((c) => c.id !== 'r');
    expect(nearestCarrierInLane({ x: 70, y: 20 }, noRight, 'mine')).toBe('c');
  });

  it('returns null with no candidates', () => {
    expect(nearestCarrierInLane({ x: 0, y: 0 }, [], 'mine')).toBeNull();
  });
});

describe('resolveCarrier', () => {
  const candidates = [candidate('a', 10, 10), candidate('b', 50, 50)];

  it('keeps a valid override', () => {
    expect(resolveCarrier({ x: 10, y: 10 }, candidates, 'b')).toBe('b');
  });

  it('ignores an override that is not a candidate', () => {
    expect(resolveCarrier({ x: 10, y: 10 }, candidates, 'ghost')).toBe('a');
  });

  it('uses the nearest candidate with no override', () => {
    expect(resolveCarrier({ x: 48, y: 48 }, candidates)).toBe('b');
    expect(resolveCarrier({ x: 48, y: 48 }, candidates, null)).toBe('b');
  });
});
