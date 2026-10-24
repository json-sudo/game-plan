import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import type { FormationDef, Point, Side } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import { PITCH_H, PITCH_W } from '../geometry/pitch';
import { visualizationsFor } from './visualization';
import { toDisplayFrame, zoneOf } from './zones';

const FORMATION = FM26_DATA.formations.find((formation) => formation.id === '4_3_3_dm_wide')!;
const RIGHT_BACK = FORMATION.slots.find((slot) => slot.family === 'D(R)')!;

function rolesFor(formation: FormationDef, team: Side, possession: 'in' | 'out') {
  return Object.fromEntries(
    formation.slots
      .filter((slot) => slot.family !== 'GK')
      .map((slot) => [
        `${team}:${slot.id}`,
        FM26_DATA.roles.find(
          (role) => role.possession === possession && role.families.includes(slot.family),
        )!.id,
      ]),
  );
}

function visualizationsFrom(zone: ZoneId, attacker: Side) {
  const defender: Side = attacker === 'mine' ? 'opponent' : 'mine';
  return visualizationsFor({
    zone,
    attacker,
    formations: { mine: FORMATION, opponent: FORMATION },
    roles: { ...rolesFor(FORMATION, attacker, 'in'), ...rolesFor(FORMATION, defender, 'out') },
    movement: FM26_DATA.movement,
  });
}

describe('storage and display transform', () => {
  const point: Point = { x: 12.3, y: 77.7 };

  it('is the identity when my team attacks', () => {
    expect(toDisplayFrame(point, 'mine')).toEqual(point);
  });

  it('is (W-x, H-y) when the opponent attacks', () => {
    expect(toDisplayFrame(point, 'opponent')).toEqual({
      x: PITCH_W - point.x,
      y: PITCH_H - point.y,
    });
  });

  it('round-trips for both attackers', () => {
    for (const attacker of ['mine', 'opponent'] as const) {
      const back = toDisplayFrame(toDisplayFrame(point, attacker), attacker);
      expect(back.x).toBeCloseTo(point.x);
      expect(back.y).toBeCloseTo(point.y);
    }
  });
});

describe('visualization display frame', () => {
  const openingFor = (attacker: Side) => visualizationsFrom('C-M', attacker)[0].opening;

  it('puts the opening carrier and ball in the chosen zone of the upward display for both attackers', () => {
    for (const attacker of ['mine', 'opponent'] as const) {
      const [first] = visualizationsFrom('RH-M', attacker);
      expect(first.starterId.startsWith(`${attacker}:`)).toBe(true);
      expect(zoneOf(first.opening.positions[first.starterId], 'mine')).toBe('RH-M');
      expect(zoneOf(first.opening.ball, 'mine')).toBe('RH-M');
    }
  });

  it('puts a defending right-back on the attacker-view left', () => {
    const mineAttacks = openingFor('mine').positions;
    expect(mineAttacks[`opponent:${RIGHT_BACK.id}`].x).toBeLessThan(PITCH_W / 2);
    expect(mineAttacks[`mine:${RIGHT_BACK.id}`].x).toBeGreaterThan(PITCH_W / 2);
    const opponentAttacks = openingFor('opponent').positions;
    expect(opponentAttacks[`mine:${RIGHT_BACK.id}`].x).toBeLessThan(PITCH_W / 2);
    expect(opponentAttacks[`opponent:${RIGHT_BACK.id}`].x).toBeGreaterThan(PITCH_W / 2);
  });

  it('keeps the attacking goalkeeper at the bottom and the defending one at the top', () => {
    for (const attacker of ['mine', 'opponent'] as const) {
      const defender: Side = attacker === 'mine' ? 'opponent' : 'mine';
      const { positions } = openingFor(attacker);
      expect(positions[`${attacker}:GK`].y).toBeGreaterThan(PITCH_H / 2);
      expect(positions[`${defender}:GK`].y).toBeLessThan(PITCH_H / 2);
    }
  });
});
