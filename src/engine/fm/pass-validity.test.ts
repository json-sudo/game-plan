import { describe, expect, it } from 'vitest';
import type { Point } from '../../data/types';
import { rejectPass, type Frame, type PassCheck } from './pass-validity';

function check(before: Frame, after: Frame, overrides: Partial<PassCheck> = {}): PassCheck {
  return {
    carrierId: 'carrier',
    receiverId: 'receiver',
    before,
    after,
    defenderIds: [],
    maxLength: 30,
    ...overrides,
  };
}

const CARRIER: Point = { x: 38, y: 80 };
const RECEIVER: Point = { x: 38, y: 60 };

describe('rejectPass', () => {
  it('accepts a clean forward pass', () => {
    const frame = { carrier: CARRIER, receiver: RECEIVER };
    expect(rejectPass(check(frame, frame))).toBeNull();
  });

  it('rejects a pass to the carrier', () => {
    const frame = { carrier: CARRIER, receiver: RECEIVER };
    expect(rejectPass(check(frame, frame, { receiverId: 'carrier' }))).toBe('self');
  });

  it('rejects a pass that goes nowhere', () => {
    const frame = { carrier: CARRIER, receiver: CARRIER };
    expect(rejectPass(check(frame, frame))).toBe('noop');
  });

  it('rejects a destination occupied by another player', () => {
    const frame = { carrier: CARRIER, receiver: RECEIVER, other: { x: 41, y: 61 } };
    expect(rejectPass(check(frame, frame))).toBe('occupied');
  });

  it('rejects passes shorter than 6 and longer than the maximum', () => {
    const short = { carrier: CARRIER, receiver: { x: 38, y: 76 } };
    expect(rejectPass(check(short, short))).toBe('length');
    const far = { carrier: CARRIER, receiver: { x: 38, y: 45 } };
    expect(rejectPass(check(far, far))).toBe('length');
    expect(rejectPass(check(far, far, { maxLength: 40 }))).toBeNull();
  });

  it('rejects a pass with a static defender between the endpoints', () => {
    const frame = { carrier: CARRIER, receiver: RECEIVER, defender: { x: 39, y: 70 } };
    expect(rejectPass(check(frame, frame, { defenderIds: ['defender'] }))).toBe('blocked');
  });

  it('accepts a pass that clears a static defender', () => {
    const frame = { carrier: CARRIER, receiver: RECEIVER, defender: { x: 48, y: 70 } };
    expect(rejectPass(check(frame, frame, { defenderIds: ['defender'] }))).toBeNull();
  });

  it('rejects a pass with a moving defender crossing the path mid-flight', () => {
    const before = { carrier: CARRIER, receiver: RECEIVER, defender: { x: 28, y: 70 } };
    const after = { ...before, defender: { x: 48, y: 70 } };
    expect(rejectPass(check(before, after, { defenderIds: ['defender'] }))).toBe('blocked');
  });

  it('accepts a moving defender that stays clear of the path', () => {
    const before = { carrier: CARRIER, receiver: RECEIVER, defender: { x: 28, y: 90 } };
    const after = { ...before, defender: { x: 48, y: 90 } };
    expect(rejectPass(check(before, after, { defenderIds: ['defender'] }))).toBeNull();
  });
});

describe('rejectPass offside', () => {
  const carrier: Point = { x: 38, y: 60 };
  const line = {
    keeper: { x: 38, y: 4 },
    last: { x: 20, y: 20 },
  };

  function offsideCheck(receiverBefore: Point, receiverAfter: Point): PassCheck {
    const base = { carrier, ...line };
    return check(
      { ...base, receiver: receiverBefore },
      { ...base, receiver: receiverAfter },
      { defenderIds: ['keeper', 'last'], maxLength: 60 },
    );
  }

  it('rejects a receiver beyond the second-last defender at release', () => {
    expect(rejectPass(offsideCheck({ x: 50, y: 15 }, { x: 50, y: 15 }))).toBe('offside');
  });

  it('accepts a receiver level with the second-last defender', () => {
    expect(rejectPass(offsideCheck({ x: 50, y: 20 }, { x: 50, y: 20 }))).toBeNull();
  });

  it('accepts a legal run beyond the line after release', () => {
    expect(rejectPass(offsideCheck({ x: 50, y: 22 }, { x: 50, y: 14 }))).toBeNull();
  });

  it('does not apply offside in the own half', () => {
    const base = { carrier: { x: 38, y: 95 }, keeper: { x: 60, y: 99 }, last: { x: 20, y: 99 } };
    const frame = { ...base, receiver: { x: 50, y: 70 } };
    expect(rejectPass(check(frame, frame, { defenderIds: ['keeper', 'last'] }))).toBeNull();
  });

  it('skips offside when there is no opposition', () => {
    const frame = { carrier, receiver: { x: 50, y: 15 } };
    expect(rejectPass(check(frame, frame, { maxLength: 60 }))).toBeNull();
  });
});
