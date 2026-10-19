import { describe, expect, it } from 'vitest';
import { PITCH_W } from '../geometry/pitch';
import { PITCH_TARGET_MARGIN } from './movement';
import type { PhasePlayer } from './phases';
import { DRIBBLE_STEP, dribble, pass, setCarrier, tapZone, type ScenarioContext } from './scenario';
import { zoneCentre, zoneOf } from './zones';

const player = (id: string, team: 'mine' | 'opponent', x: number, y: number, isKeeper = false) => ({
  id,
  team,
  base: { x, y },
  isKeeper,
});

const players: PhasePlayer[] = [
  player('gk', 'mine', 38, 90, true),
  player('lb', 'mine', 10, 70),
  player('cb', 'mine', 38, 75),
  player('rb', 'mine', 66, 70),
  player('st', 'mine', 38, 20),
  player('o-gk', 'opponent', 38, 10, true),
  player('o-st', 'opponent', 38, 80),
];

const context: ScenarioContext = {
  attacker: 'mine',
  players,
  ball: { x: 38, y: 50 },
  carrierId: 'cb',
};

describe('tapZone', () => {
  it('puts the ball at the zone centre', () => {
    const result = tapZone(context, 'R-F', ['rb']);
    expect(result.ball).toEqual(zoneCentre('R-F', 'mine'));
    expect(result.zone).toBe('R-F');
  });

  it('keeps the current carrier only when that player is eligible in the new zone', () => {
    expect(tapZone(context, 'C-D', ['cb', 'rb']).carrierId).toBe('cb');
    expect(tapZone(context, 'R-F', ['rb']).carrierId).toBeNull();
  });

  it('never picks a carrier by distance when nobody is carrying', () => {
    const open: ScenarioContext = { ...context, carrierId: null };
    expect(tapZone(open, 'R-D', ['rb']).carrierId).toBeNull();
    expect(tapZone({ ...open, attacker: 'opponent' }, 'C-F', ['o-st']).carrierId).toBeNull();
  });
});

describe('setCarrier', () => {
  it('takes an eligible attacker as carrier and keeps the ball', () => {
    const result = setCarrier(context, 'rb', ['cb', 'rb']);
    expect(result.carrierId).toBe('rb');
    expect(result.ball).toEqual(context.ball);
  });

  it('chooses from nothing when no carrier is set yet', () => {
    const open: ScenarioContext = { ...context, carrierId: null };
    expect(setCarrier(open, 'cb', ['cb']).carrierId).toBe('cb');
  });

  it('ignores a player who is not eligible in the ball zone', () => {
    expect(setCarrier(context, 'st', ['cb', 'rb']).carrierId).toBe('cb');
  });

  it('ignores a defender even when listed as eligible', () => {
    expect(setCarrier(context, 'o-st', ['o-st']).carrierId).toBe('cb');
  });
});

describe('pass', () => {
  it('moves the ball to the receiver, who becomes the carrier, and recomputes the zone', () => {
    const result = pass(context, 'st');
    expect(result.carrierId).toBe('st');
    expect(result.ball).toEqual({ x: 38, y: 20 });
    expect(result.zone).toBe(zoneOf({ x: 38, y: 20 }, 'mine'));
  });

  it('uses the receiver current position when given', () => {
    const result = pass(context, 'st', new Map([['st', { x: 55, y: 30 }]]));
    expect(result.ball).toEqual({ x: 55, y: 30 });
    expect(result.zone).toBe('RH-F');
  });

  it('refuses a pass when nobody is carrying the ball', () => {
    const result = pass({ ...context, carrierId: null }, 'st');
    expect(result.carrierId).toBeNull();
    expect(result.ball).toEqual(context.ball);
  });

  it('refuses a pass to the carrier, a defender or an unknown player', () => {
    for (const receiver of ['cb', 'o-st', 'ghost']) {
      const result = pass(context, receiver);
      expect(result.carrierId).toBe('cb');
      expect(result.ball).toEqual(context.ball);
    }
  });
});

describe('dribble', () => {
  it('moves the ball one step forward, towards the opponent goal, keeping the carrier', () => {
    const result = dribble(context, 'forward');
    expect(result.ball.x).toBeCloseTo(38);
    expect(result.ball.y).toBeCloseTo(50 - DRIBBLE_STEP);
    expect(result.carrierId).toBe('cb');
  });

  it('moves left and right from the attacker view', () => {
    expect(dribble(context, 'left').ball.x).toBeCloseTo(38 - DRIBBLE_STEP);
    expect(dribble(context, 'right').ball.x).toBeCloseTo(38 + DRIBBLE_STEP);
    expect(dribble(context, 'back').ball.y).toBeCloseTo(50 + DRIBBLE_STEP);
  });

  it('flips the axes when the opponent attacks', () => {
    const opponent: ScenarioContext = {
      ...context,
      attacker: 'opponent',
      carrierId: 'o-st',
      ball: { x: 38, y: 50 },
    };
    expect(dribble(opponent, 'forward').ball.y).toBeCloseTo(50 + DRIBBLE_STEP);
    expect(dribble(opponent, 'left').ball.x).toBeCloseTo(38 + DRIBBLE_STEP);
  });

  it('keeps diagonal steps the same length', () => {
    const result = dribble(context, 'forward-right');
    const length = Math.hypot(result.ball.x - 38, result.ball.y - 50);
    expect(length).toBeCloseTo(DRIBBLE_STEP);
    expect(result.ball.x).toBeGreaterThan(38);
    expect(result.ball.y).toBeLessThan(50);
  });

  it('recomputes the zone when the step crosses a boundary', () => {
    const result = dribble({ ...context, ball: { x: 38, y: 36 } }, 'forward');
    expect(result.zone).toBe('C-F');
  });

  it('stays inside the pitch margin', () => {
    const edge = dribble({ ...context, ball: { x: PITCH_W - 4, y: 5 } }, 'forward-right');
    expect(edge.ball.x).toBeLessThanOrEqual(PITCH_W - PITCH_TARGET_MARGIN);
    expect(edge.ball.y).toBeGreaterThanOrEqual(PITCH_TARGET_MARGIN);
  });

  it('does nothing without a carrier', () => {
    const result = dribble({ ...context, carrierId: null }, 'forward');
    expect(result.ball).toEqual(context.ball);
    expect(result.carrierId).toBeNull();
  });

  it('is deterministic and does not mutate the context', () => {
    const copy = structuredClone(context);
    expect(dribble(context, 'forward')).toEqual(dribble(context, 'forward'));
    expect(context).toEqual(copy);
  });
});
