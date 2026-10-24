import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import type { FormationDef, Point, RoleDef, Side } from '../../data/types';
import { ZONE_IDS, type ZoneId } from '../../data/zones';
import { PITCH_H, PITCH_W } from '../geometry/pitch';
import { layoutFormation } from '../layout/formations';
import { formationAnchors, slotLineOf } from './formation-anchors';
import type { FmPlayer } from './player';
import { computeZoneShape } from './shape';
import { MARKING_BOX_EDGES, thirdOf, toDisplayFrame, zoneCentre } from './zones';

const CENTRE_X = PITCH_W / 2;
const PLAYER_RADIUS = 2.2;
const BODY_GAP = 0.25;
const EDGE_MARGIN = 2.4;
const MAX_CORRECTION = 6;
const EPSILON = 1e-9;
const FORMATIONS = FM26_DATA.formations;

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
    roleId: slot.family === 'GK' ? undefined : firstRole(slot.family, possession).id,
    isKeeper: slot.family === 'GK',
  }));
}

function pairing(attack: FormationDef, defence: FormationDef | null): FmPlayer[] {
  return [...squad(attack, 'mine', 'in'), ...(defence ? squad(defence, 'opponent', 'out') : [])];
}

function shapeOf(players: readonly FmPlayer[], zone: ZoneId, carrierId: string | null = null) {
  return computeZoneShape({
    attacker: 'mine',
    players,
    ball: zoneCentre(zone, 'mine'),
    carrierId,
    zone,
  });
}

function pairings(): { attack: FormationDef; defence: FormationDef | null }[] {
  return FORMATIONS.flatMap((attack, index) => [
    { attack, defence: null },
    { attack, defence: attack },
    { attack, defence: FORMATIONS[(index + 5) % FORMATIONS.length] },
  ]);
}

function pairDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('computeZoneShape invariants over every formation, third and lane', () => {
  it('yields 11 unique in-bounds players per team with body separation', () => {
    for (const { attack, defence } of pairings()) {
      const players = pairing(attack, defence);
      for (const zone of ZONE_IDS) {
        const { positions } = shapeOf(players, zone);
        const label = `${attack.id} vs ${defence?.id ?? 'none'} in ${zone}`;
        expect(positions.size).toBe(players.length);
        const entries = [...positions];
        for (const [id, point] of entries) {
          const keeper = id.endsWith(':GK');
          if (keeper) continue;
          expect(point.x, `${label} ${id}`).toBeGreaterThanOrEqual(EDGE_MARGIN - EPSILON);
          expect(point.x, `${label} ${id}`).toBeLessThanOrEqual(PITCH_W - EDGE_MARGIN + EPSILON);
          expect(point.y, `${label} ${id}`).toBeGreaterThanOrEqual(EDGE_MARGIN - EPSILON);
          expect(point.y, `${label} ${id}`).toBeLessThanOrEqual(PITCH_H - EDGE_MARGIN + EPSILON);
        }
        for (let i = 0; i < entries.length; i += 1) {
          for (let j = i + 1; j < entries.length; j += 1) {
            expect(
              pairDistance(entries[i][1], entries[j][1]),
              `${label} ${entries[i][0]} / ${entries[j][0]}`,
            ).toBeGreaterThanOrEqual(2 * PLAYER_RADIUS + BODY_GAP - EPSILON);
          }
        }
      }
    }
  });

  it('keeps separation and bounds when a carrier stands on the ball', () => {
    for (const { attack, defence } of pairings()) {
      const players = pairing(attack, defence);
      const carrier = players.find((player) => player.team === 'mine' && !player.isKeeper)!;
      for (const zone of ZONE_IDS) {
        const { positions } = shapeOf(players, zone, carrier.id);
        const entries = [...positions];
        const label = `${attack.id} vs ${defence?.id ?? 'none'} in ${zone}`;
        for (let i = 0; i < entries.length; i += 1) {
          for (let j = i + 1; j < entries.length; j += 1) {
            expect(
              pairDistance(entries[i][1], entries[j][1]),
              `${label} ${entries[i][0]} / ${entries[j][0]}`,
            ).toBeGreaterThanOrEqual(2 * PLAYER_RADIUS + BODY_GAP - EPSILON);
          }
        }
      }
    }
  });

  it('preserves lateral rank inside every slot line', () => {
    for (const { attack, defence } of pairings()) {
      const players = pairing(attack, defence);
      for (const zone of ZONE_IDS) {
        const { positions } = shapeOf(players, zone);
        for (const team of ['mine', 'opponent'] as const) {
          const lines = new Map<string, { baseX: number; x: number; id: string }[]>();
          for (const player of players.filter((item) => item.team === team && !item.isKeeper)) {
            const baseX = toDisplayFrame(player.base, 'mine').x;
            const line = slotLineOf(player.family, baseX);
            lines.set(line, [
              ...(lines.get(line) ?? []),
              { baseX, x: positions.get(player.id)!.x, id: player.id },
            ]);
          }
          for (const [line, members] of lines) {
            const byBase = [...members].sort((a, b) => a.baseX - b.baseX);
            for (let index = 1; index < byBase.length; index += 1) {
              expect(
                byBase[index].x,
                `${attack.id} vs ${defence?.id ?? 'none'} ${zone} ${team} ${line}`,
              ).toBeGreaterThan(byBase[index - 1].x);
            }
          }
        }
      }
    }
  });

  it('keeps every wide player on its own side of the pitch', () => {
    for (const { attack, defence } of pairings()) {
      const players = pairing(attack, defence);
      for (const zone of ZONE_IDS) {
        const { positions } = shapeOf(players, zone);
        for (const player of players.filter((item) => !item.isKeeper)) {
          const baseX = toDisplayFrame(player.base, 'mine').x;
          if (!['FB', 'WB', 'WA'].includes(slotLineOf(player.family, baseX))) continue;
          const side = Math.sign(baseX - CENTRE_X);
          expect(Math.sign(positions.get(player.id)!.x - CENTRE_X)).toBe(side);
        }
      }
    }
  });

  it('is identical on repeat runs', () => {
    for (const { attack, defence } of pairings()) {
      const players = pairing(attack, defence);
      for (const zone of ZONE_IDS) {
        expect(shapeOf(players, zone)).toEqual(shapeOf(players, zone));
      }
    }
  });
});

describe('computeZoneShape bounded corrections', () => {
  it('never moves a player more than 6 units from its anchor', () => {
    for (const { attack, defence } of pairings()) {
      const players = pairing(attack, defence);
      for (const zone of ZONE_IDS) {
        const { positions } = shapeOf(players, zone);
        const anchors = formationAnchors({ attacker: 'mine', players, zone });
        for (const [id, anchor] of anchors) {
          expect(
            pairDistance(positions.get(id)!, anchor.point),
            `${attack.id} vs ${defence?.id ?? 'none'} ${zone} ${id}`,
          ).toBeLessThanOrEqual(MAX_CORRECTION + EPSILON);
        }
      }
    }
  });

  it('never puts a striker behind the opposing keeper', () => {
    for (const { attack, defence } of pairings()) {
      const players = pairing(attack, defence);
      for (const zone of ZONE_IDS) {
        const { positions } = shapeOf(players, zone);
        const keeperY = positions.get('opponent:GK')?.y ?? -Infinity;
        for (const player of players.filter((item) => item.family === 'ST')) {
          const striker = positions.get(player.id)!;
          const limit = player.team === 'mine' ? keeperY : EDGE_MARGIN;
          expect(striker.y, `${attack.id} ${zone} ${player.id}`).toBeGreaterThan(limit);
        }
      }
    }
  });

  it('keeps ordinary strikers at y>=40 in a defensive-third opening', () => {
    for (const { attack, defence } of pairings()) {
      const players = pairing(attack, defence);
      for (const zone of ZONE_IDS.filter((item) => thirdOf(item) === 'D')) {
        const { positions } = shapeOf(players, zone);
        for (const player of players.filter(
          (item) => item.family === 'ST' && item.team === 'mine',
        )) {
          expect(positions.get(player.id)!.y).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });

  it('keeps both keepers inside their contract boxes', () => {
    const { penalty, sixYard } = MARKING_BOX_EDGES;
    expect(penalty.x0).toBeLessThan(sixYard.x0);
    for (const { attack, defence } of pairings()) {
      const players = pairing(attack, defence);
      for (const zone of ZONE_IDS) {
        const { positions } = shapeOf(players, zone);
        const own = positions.get('mine:GK')!;
        expect(own.y).toBeGreaterThanOrEqual(94);
        expect(own.y).toBeLessThanOrEqual(97);
        expect(Math.abs(own.x - CENTRE_X)).toBeLessThanOrEqual(2);
        const opposing = positions.get('opponent:GK');
        if (!opposing) continue;
        expect(opposing.y).toBeGreaterThanOrEqual(3);
        expect(opposing.y).toBeLessThanOrEqual(6);
        expect(opposing.x).toBeGreaterThanOrEqual(sixYard.x0 + PLAYER_RADIUS);
        expect(opposing.x).toBeLessThanOrEqual(sixYard.x1 - PLAYER_RADIUS);
        expect(Math.abs(opposing.x - CENTRE_X)).toBeLessThanOrEqual(2);
      }
    }
  });
});
