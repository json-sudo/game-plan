import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import type { Family, FormationDef, Point, RoleDef, Side } from '../../data/types';
import { ZONE_IDS, type ZoneId } from '../../data/zones';
import { layoutFormation } from '../layout/formations';
import { formationAnchors } from './formation-anchors';
import { applyOpeningResponse } from './opening-response';
import type { FmPlayer } from './player';
import { shapeWithoutStarter, visualizationsFor, type VisualizationInput } from './visualization';
import { zoneCentre, zoneOf } from './zones';

const MIN_DISTANCE = 7;
const MAX_DISTANCE = 10;
const MIN_OFFSET = 3;
const MAX_OFFSET = 6;
const MIN_COVER = 2;
const MIN_LINE_GAP = 9;
const MAX_LINE_GAP = 16;
const TOLERANCE = 0.25;
const LOOSE_BALL_SPACING = 6;
const STOPPING_CB = 'stopping_centre_back_oop';
const BACK_FAMILIES: readonly Family[] = ['D(C)', 'D(L)', 'D(R)', 'WB(L)', 'WB(R)'];
const SCREEN_FAMILIES: readonly Family[] = ['DM', 'M(C)', 'M(L)', 'M(R)'];
const FORMATIONS = FM26_DATA.formations;

function roleFor(family: Family, possession: 'in' | 'out'): RoleDef {
  const role = FM26_DATA.roles.find(
    (candidate) =>
      candidate.possession === possession && candidate.families.some((item) => item === family),
  );
  if (!role) throw new Error(`no ${possession} role for ${family}`);
  return role;
}

function rolesOf(formation: FormationDef, team: Side, possession: 'in' | 'out') {
  return Object.fromEntries(
    formation.slots
      .filter((slot) => slot.family !== 'GK')
      .map((slot) => [`${team}:${slot.id}`, roleFor(slot.family, possession).id]),
  );
}

function inputFor(
  zone: ZoneId,
  mine: FormationDef,
  opponent: FormationDef | null,
  override: (slotFamily: Family) => string | undefined = () => undefined,
): VisualizationInput {
  const opponentRoles = opponent
    ? Object.fromEntries(
        opponent.slots
          .filter((slot) => slot.family !== 'GK')
          .map((slot) => [
            `opponent:${slot.id}`,
            override(slot.family) ?? roleFor(slot.family, 'out').id,
          ]),
      )
    : {};
  return {
    zone,
    attacker: 'mine',
    formations: { mine, opponent },
    roles: { ...rolesOf(mine, 'mine', 'in'), ...opponentRoles },
  };
}

function gap(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function defenderIds(defence: FormationDef): string[] {
  return defence.slots.filter((slot) => slot.family !== 'GK').map((slot) => `opponent:${slot.id}`);
}

function familyOf(defence: FormationDef, id: string): Family {
  return defence.slots.find((slot) => `opponent:${slot.id}` === id)!.family;
}

function playersOf(mine: FormationDef, opponent: FormationDef | null): FmPlayer[] {
  const squad = (team: Side, formation: FormationDef, possession: 'in' | 'out') => {
    const layout = layoutFormation(formation, team);
    return formation.slots.map((slot) => ({
      id: `${team}:${slot.id}`,
      team,
      family: slot.family,
      base: layout.get(slot.id)!,
      roleId: slot.family === 'GK' ? undefined : roleFor(slot.family, possession).id,
      isKeeper: slot.family === 'GK',
    }));
  };
  return [...squad('mine', mine, 'in'), ...(opponent ? squad('opponent', opponent, 'out') : [])];
}

function lineGapFailures(mine: FormationDef, defence: FormationDef): string[] {
  const players = playersOf(mine, defence);
  return ZONE_IDS.flatMap((zone) => {
    const carrier = zoneCentre(zone, 'mine');
    const base = formationAnchors({ attacker: 'mine', players, zone });
    const { anchors, engagerId } = applyOpeningResponse(base, {
      attacker: 'mine',
      zone,
      players,
      carrierId: 'mine:ST',
      carrier,
      starterSide: undefined,
    });
    const meanY = (families: readonly Family[]) => {
      const ids = defenderIds(defence).filter(
        (id) => id !== engagerId && families.includes(familyOf(defence, id)),
      );
      return ids.length === 0
        ? null
        : ids.reduce((sum, id) => sum + anchors.get(id)!.point.y, 0) / ids.length;
    };
    const back = meanY(BACK_FAMILIES);
    const screen = meanY(SCREEN_FAMILIES);
    if (back === null || screen === null) return [];
    const lineGap = screen - back;
    const ok = lineGap >= MIN_LINE_GAP - TOLERANCE && lineGap <= MAX_LINE_GAP + TOLERANCE;
    return ok ? [] : [`${mine.id} v ${defence.id} ${zone} gap ${lineGap.toFixed(1)}`];
  });
}

function blockFailures(
  mine: FormationDef,
  defence: FormationDef,
  override?: (slotFamily: Family) => string | undefined,
): string[] {
  return ZONE_IDS.flatMap((zone) =>
    visualizationsFor(inputFor(zone, mine, defence, override)).flatMap((visualization) => {
      const { positions, ball } = visualization.opening;
      const label = `${mine.id} v ${defence.id} ${zone} ${visualization.starterId}`;
      const engagerId = visualization.engagerId;
      if (engagerId === null) return [`${label} no engager`];
      const carrier = positions[visualization.starterId];
      const engager = positions[engagerId];
      const distance = gap(engager, carrier);
      const offset = Math.abs(engager.x - carrier.x);
      const behind = defenderIds(defence).filter(
        (id) => id !== engagerId && positions[id].y < engager.y,
      ).length;
      const closeCovers = defenderIds(defence).filter(
        (id) =>
          id !== engagerId &&
          positions[id].y < carrier.y &&
          gap(positions[id], carrier) < MIN_DISTANCE - TOLERANCE,
      ).length;
      const checks: [boolean, string][] = [
        [engager.y < carrier.y, 'goal-side'],
        [distance >= MIN_DISTANCE - TOLERANCE && distance <= MAX_DISTANCE + TOLERANCE, 'distance'],
        [offset >= MIN_OFFSET - TOLERANCE && offset <= MAX_OFFSET + TOLERANCE, 'offset'],
        [gap(engager, ball) > 0, 'off the ball'],
        [behind >= MIN_COVER, 'cover'],
        [closeCovers <= 1, 'single engager'],
      ];
      return checks.filter(([ok]) => !ok).map(([, name]) => `${label} ${name}`);
    }),
  );
}

describe('opponent block engager', () => {
  it('holds distance, offset, cover and line gap for every formation pairing', () => {
    const failures = FORMATIONS.flatMap((mine) =>
      [mine, FORMATIONS[(FORMATIONS.indexOf(mine) + 5) % FORMATIONS.length]].flatMap((defence) =>
        blockFailures(mine, defence),
      ),
    );
    expect(failures).toEqual([]);
  });

  it('holds against every defending formation, including no full-backs and paired forwards', () => {
    const failures = FORMATIONS.flatMap((defence) => blockFailures(FORMATIONS[0], defence));
    expect(failures).toEqual([]);
  });

  it('keeps the midfield-to-back gap within 9-16 units before collision response', () => {
    const failures = FORMATIONS.flatMap((defence) => lineGapFailures(FORMATIONS[0], defence));
    expect(failures).toEqual([]);
  });

  it('never engages with a centre-back unless it is a Stopping CB', () => {
    const failures = FORMATIONS.flatMap((defence) =>
      ZONE_IDS.flatMap((zone) =>
        visualizationsFor(inputFor(zone, FORMATIONS[0], defence)).flatMap((visualization) => {
          const engagerId = visualization.engagerId;
          const isCentreBack = engagerId !== null && familyOf(defence, engagerId) === 'D(C)';
          return isCentreBack ? [`${defence.id} ${zone}`] : [];
        }),
      ),
    );
    expect(failures).toEqual([]);
  });

  it('keeps the bounds when every centre-back is a Stopping CB', () => {
    const stopping = (family: Family) => (family === 'D(C)' ? STOPPING_CB : undefined);
    const failures = FORMATIONS.flatMap((defence) =>
      blockFailures(FORMATIONS[0], defence, stopping),
    );
    expect(failures).toEqual([]);
  });
});

describe('attack without an opponent', () => {
  function anchorsOf(mine: FormationDef, opponent: FormationDef | null, zone: ZoneId) {
    return formationAnchors({ attacker: 'mine', players: playersOf(mine, opponent), zone });
  }

  it('builds the same attacking construction and starter order with or without an opponent', () => {
    for (const formation of FORMATIONS) {
      for (const zone of ZONE_IDS) {
        const alone = anchorsOf(formation, null, zone);
        const versus = anchorsOf(formation, formation, zone);
        for (const [id, anchor] of alone) expect(versus.get(id)).toEqual(anchor);
        const starters = (opponent: FormationDef | null) =>
          visualizationsFor(inputFor(zone, formation, opponent)).map((item) => item.starterId);
        expect(starters(null)).toEqual(starters(formation));
      }
    }
  });

  it('shows only 11 players and the ball with no opponent pieces or engager', () => {
    for (const formation of FORMATIONS) {
      for (const zone of ZONE_IDS) {
        for (const visualization of visualizationsFor(inputFor(zone, formation, null))) {
          expect(visualization.engagerId).toBeNull();
          const frames = [visualization.opening, ...visualization.passes.map((pass) => pass.frame)];
          for (const frame of frames) {
            const ids = Object.keys(frame.positions);
            expect(ids).toHaveLength(11);
            expect(ids.every((id) => id.startsWith('mine:'))).toBe(true);
          }
        }
      }
    }
  });
});

describe('configuration with no eligible starter', () => {
  it('shows the role-conditioned shape with a loose ball and no sequence', () => {
    for (const formation of FORMATIONS) {
      const input: VisualizationInput = {
        zone: 'C-M',
        attacker: 'mine',
        formations: { mine: formation, opponent: formation },
        roles: {},
      };
      expect(visualizationsFor(input)).toEqual([]);
      const shape = shapeWithoutStarter(input);
      expect(Object.keys(shape.positions)).toHaveLength(22);
      expect(zoneOf(shape.ball, 'mine')).toBe('C-M');
      for (const point of Object.values(shape.positions)) {
        expect(gap(point, shape.ball)).toBeGreaterThanOrEqual(LOOSE_BALL_SPACING - TOLERANCE);
      }
    }
  });
});
