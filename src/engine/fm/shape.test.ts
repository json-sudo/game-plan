import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import type { FormationDef, Point, RoleDef, Side } from '../../data/types';
import { ZONE_IDS, type ZoneId } from '../../data/zones';
import { layoutFormation, mirrorPoint } from '../layout/formations';
import type { FmPlayer } from './player';
import { computeZoneShape } from './shape';
import { zoneCentre } from './zones';

const FORMATION = FM26_DATA.formations[0];
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
    family: slot.family,
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
  return computeZoneShape({
    attacker,
    players,
    ball: zoneCentre(zone, attacker),
    carrierId,
    zone,
  });
}

function teamAverage(positions: ReadonlyMap<string, Point>, team: Side, axis: 'x' | 'y') {
  const values = [...positions]
    .filter(([id]) => id.startsWith(`${team}:`))
    .map(([, point]) => point[axis]);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

describe('computeZoneShape', () => {
  it('places every player with and without a defending team in every zone', () => {
    for (const attacker of ['mine', 'opponent'] as const) {
      for (const withDefenders of [true, false]) {
        for (const zone of ZONE_IDS) {
          const { positions } = shape(attacker, zone, pitch(attacker, withDefenders));
          expect(positions.size).toBe(pitch(attacker, withDefenders).length);
        }
      }
    }
  });

  it('keeps a loose ball 6 units from every piece and leaves the ball where it was', () => {
    for (const attacker of ['mine', 'opponent'] as const) {
      for (const zone of ZONE_IDS) {
        const { positions, ball } = shape(attacker, zone);
        expect(ball).toEqual(zoneCentre(zone, attacker));
        for (const point of positions.values()) {
          expect(Math.hypot(point.x - ball.x, point.y - ball.y)).toBeGreaterThanOrEqual(
            LOOSE_BALL_SPACING,
          );
        }
      }
    }
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
