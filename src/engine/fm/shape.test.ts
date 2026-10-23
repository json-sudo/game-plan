import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import type {
  FormationDef,
  MovementCell,
  MovementTable,
  Point,
  RoleDef,
  Side,
} from '../../data/types';
import { ZONE_IDS, type ZoneId } from '../../data/zones';
import { PITCH_W } from '../geometry/pitch';
import { layoutFormation, mirrorPoint } from '../layout/formations';
import { MIN_TOKEN_SPACING, minSpacingOf } from '../layout/spacing';
import type { FmPlayer } from './player';
import { SHAPE_MARGIN, computeZoneShape } from './shape';
import { zoneCentre } from './zones';

const FORMATION = FM26_DATA.formations[0];
const CENTRE_X = PITCH_W / 2;
const LOOSE_BALL_SPACING = 6;

function firstRole(family: string, possession: 'in' | 'out'): RoleDef {
  const role = FM26_DATA.roles.find(
    (candidate) =>
      candidate.possession === possession && candidate.families.some((item) => item === family),
  );
  if (!role) throw new Error(`no ${possession} role for ${family}`);
  return role;
}

function squad(formation: FormationDef, team: Side, possession: 'in' | 'out'): FmPlayer[] {
  const layout = layoutFormation(formation, team);
  return formation.slots.map((slot) => ({
    id: `${team}:${slot.id}`,
    team,
    base: layout.get(slot.id)!,
    roleId: firstRole(slot.family, possession).id,
    isKeeper: slot.family === 'GK',
  }));
}

function pitch(attacker: Side, withDefenders = true): FmPlayer[] {
  const defender: Side = attacker === 'mine' ? 'opponent' : 'mine';
  return [
    ...squad(FORMATION, attacker, 'in'),
    ...(withDefenders ? squad(FORMATION, defender, 'out') : []),
  ];
}

function shape(
  attacker: Side,
  zone: ZoneId,
  players: readonly FmPlayer[] = pitch(attacker),
  carrierId: string | null = null,
) {
  const ball = zoneCentre(zone, attacker);
  return computeZoneShape({
    attacker,
    players,
    ball,
    carrierId,
    zone,
    movement: FM26_DATA.movement,
  });
}

function teamAverage(positions: ReadonlyMap<string, Point>, team: Side, axis: 'x' | 'y') {
  const values = [...positions]
    .filter(([id]) => id.startsWith(`${team}:`))
    .map(([, point]) => point[axis]);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const cell = (ball: [number, number, number]): MovementCell => ({
  ball,
  far: ball,
  from: { ball: 'initial', far: 'initial' },
});

describe('computeZoneShape', () => {
  it('keeps every piece 8.5 apart and inside the margin in every zone', () => {
    for (const attacker of ['mine', 'opponent'] as const) {
      for (const withDefenders of [true, false]) {
        for (const zone of ZONE_IDS) {
          const { positions } = shape(attacker, zone, pitch(attacker, withDefenders));
          const points = [...positions.values()];
          expect(positions.size).toBe(pitch(attacker, withDefenders).length);
          expect(minSpacingOf(points)).toBeGreaterThanOrEqual(MIN_TOKEN_SPACING);
          for (const { x, y } of points) {
            expect(x).toBeGreaterThanOrEqual(SHAPE_MARGIN);
            expect(x).toBeLessThanOrEqual(PITCH_W - SHAPE_MARGIN);
            expect(y).toBeGreaterThanOrEqual(SHAPE_MARGIN);
            expect(y).toBeLessThanOrEqual(100 - SHAPE_MARGIN);
          }
        }
      }
    }
  });

  it('keeps a loose ball 6 units from every piece', () => {
    for (const attacker of ['mine', 'opponent'] as const) {
      for (const zone of ZONE_IDS) {
        const { positions, ball } = shape(attacker, zone);
        for (const point of positions.values()) {
          expect(Math.hypot(point.x - ball.x, point.y - ball.y)).toBeGreaterThanOrEqual(
            LOOSE_BALL_SPACING,
          );
        }
      }
    }
  });

  it('applies the handoff keeper follow and lane slide to both keepers', () => {
    const zone: ZoneId = 'R-F';
    const ball = zoneCentre(zone, 'mine');
    const players = pitch('mine').filter((player) => player.isKeeper);
    const { positions } = shape('mine', zone, players);
    const ownKeeper = players.find((player) => player.id === 'mine:GK')!.base;
    const opposingKeeper = players.find((player) => player.id === 'opponent:GK')!.base;
    const attackSlide = 0.3 * (ball.x - CENTRE_X);
    const defendSlide = 0.35 * (ball.x - CENTRE_X);
    expect(positions.get('mine:GK')!.x).toBeCloseTo(CENTRE_X + attackSlide * 0.3, 5);
    expect(positions.get('mine:GK')!.y).toBeCloseTo(ownKeeper.y - 30 * 0.3, 5);
    expect(positions.get('opponent:GK')!.x).toBeCloseTo(CENTRE_X + defendSlide * 0.2, 5);
    expect(positions.get('opponent:GK')!.y).toBeCloseTo(opposingKeeper.y + 2 * 0.2, 5);
  });

  it('puts the attacking back line deeper in a defensive-third zone than in a final-third zone', () => {
    const backLine = FORMATION.slots
      .filter((slot) => slot.family.startsWith('D('))
      .map((slot) => `mine:${slot.id}`);
    const depthOf = (zone: ZoneId) => {
      const { positions } = shape('mine', zone);
      const ys = backLine.map((id) => positions.get(id)!.y);
      return ys.reduce((sum, y) => sum + y, 0) / ys.length;
    };
    expect(depthOf('C-D')).toBeGreaterThan(depthOf('C-F'));
  });

  it('slides both teams towards a right-flank zone compared with the left flank', () => {
    const right = shape('mine', 'R-M').positions;
    const left = shape('mine', 'L-M').positions;
    expect(teamAverage(right, 'mine', 'x')).toBeGreaterThan(teamAverage(left, 'mine', 'x'));
    expect(teamAverage(right, 'opponent', 'x')).toBeGreaterThan(teamAverage(left, 'opponent', 'x'));
  });

  it('moves an attacker by its role offset for the ball zone and leaves the others in place', () => {
    const movement: MovementTable = {
      stay: { 'C-M': cell([0, 0, 0]) },
      push: { 'C-M': cell([0, 0, 6]) },
    };
    const players: FmPlayer[] = [
      { id: 'mine:a', team: 'mine', base: { x: 20, y: 60 }, roleId: 'stay', isKeeper: false },
      { id: 'mine:b', team: 'mine', base: { x: 60, y: 60 }, roleId: 'stay', isKeeper: false },
    ];
    const ball = zoneCentre('C-M', 'mine');
    const before = computeZoneShape({
      attacker: 'mine',
      players,
      ball,
      carrierId: null,
      zone: 'C-M',
      movement,
    });
    const moved = computeZoneShape({
      attacker: 'mine',
      players: players.map((player) =>
        player.id === 'mine:a' ? { ...player, roleId: 'push' } : player,
      ),
      ball,
      carrierId: null,
      zone: 'C-M',
      movement,
    });
    expect(moved.positions.get('mine:a')!.y).toBeCloseTo(before.positions.get('mine:a')!.y - 6, 5);
    expect(moved.positions.get('mine:b')).toEqual(before.positions.get('mine:b'));
  });

  it('stands the carrier on the ball and returns the ball with it', () => {
    const zone: ZoneId = 'R-F';
    const carrier = pitch('mine').find((player) => player.team === 'mine' && !player.isKeeper)!;
    const { positions, ball } = shape('mine', zone, pitch('mine'), carrier.id);
    expect(ball).toEqual(zoneCentre(zone, 'mine'));
    expect(positions.get(carrier.id)!.x).toBeCloseTo(ball.x, 5);
    expect(positions.get(carrier.id)!.y).toBeCloseTo(ball.y, 5);
  });

  it('mirrors the shape when the opponent attacks down the pitch', () => {
    const zone: ZoneId = 'L-D';
    const mine = shape('mine', zone).positions;
    const flipped: FmPlayer[] = pitch('mine').map((player) => ({
      ...player,
      team: player.team === 'mine' ? 'opponent' : 'mine',
      base: mirrorPoint(player.base),
    }));
    const opposite = shape('opponent', zone, flipped).positions;
    for (const [id, point] of mine) {
      expect(opposite.get(id)!.x).toBeCloseTo(mirrorPoint(point).x, 5);
      expect(opposite.get(id)!.y).toBeCloseTo(mirrorPoint(point).y, 5);
    }
  });

  it('places only my team when there is no defending team', () => {
    const { positions } = shape('mine', 'C-M', pitch('mine', false));
    expect([...positions.keys()].every((id) => id.startsWith('mine:'))).toBe(true);
    expect(positions.size).toBe(FORMATION.slots.length);
  });
});
