import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import type { Family, FormationDef, Point, RoleDef, Side } from '../../data/types';
import { ZONE_IDS, type ZoneId } from '../../data/zones';
import { minSpacingOf } from '../layout/spacing';
import { visualizationsFor, type Visualization, type VisualizationInput } from './visualization';
import { laneOf, thirdOf, zoneOf } from './zones';

const MAX_OPTION_DISTANCE = 30;
const MIN_NON_COLLINEAR_SINE = Math.sin((15 * Math.PI) / 180);
const BODY_SEPARATION = 4.65;

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

function inputFor(zone: ZoneId, formation: FormationDef): VisualizationInput {
  return {
    zone,
    attacker: 'mine',
    formations: { mine: formation, opponent: formation },
    roles: { ...rolesOf(formation, 'mine', 'in'), ...rolesOf(formation, 'opponent', 'out') },
  };
}

function gap(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function sineBetween(a: Point, b: Point): number {
  return Math.abs(a.x * b.y - a.y * b.x) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y));
}

function optionsOf(visualization: Visualization, formation: FormationDef) {
  const { positions } = visualization.opening;
  const carrier = positions[visualization.starterId];
  const teammates = formation.slots
    .filter((slot) => slot.family !== 'GK' && `mine:${slot.id}` !== visualization.starterId)
    .map((slot) => positions[`mine:${slot.id}`])
    .map((point) => ({ point, offset: { x: point.x - carrier.x, y: point.y - carrier.y } }))
    .filter(({ point }) => gap(carrier, point) <= MAX_OPTION_DISTANCE);
  const recycles = teammates.filter(({ offset }) => offset.y > 0);
  return { teammates, recycles };
}

function hasNonCollinearPair(options: ReturnType<typeof optionsOf>): boolean {
  return options.recycles.some((recycle) =>
    options.teammates.some(
      (other) =>
        other !== recycle && sineBetween(recycle.offset, other.offset) >= MIN_NON_COLLINEAR_SINE,
    ),
  );
}

describe('opening pass options', () => {
  for (const formation of FM26_DATA.formations) {
    it(`${formation.id} offers a recycle and a non-collinear pass from every starter`, () => {
      const total = ZONE_IDS.flatMap((zone) => visualizationsFor(inputFor(zone, formation)));
      expect(total.length).toBeGreaterThan(0);
      const failures = ZONE_IDS.flatMap((zone) =>
        visualizationsFor(inputFor(zone, formation)).flatMap((visualization) => {
          const options = optionsOf(visualization, formation);
          const finishingCentre = thirdOf(zone) === 'F' && laneOf(zone) === 'C';
          const ok = finishingCentre ? options.teammates.length > 0 : hasNonCollinearPair(options);
          return ok ? [] : [`${zone} ${visualization.starterId}`];
        }),
      );
      expect(failures).toEqual([]);
    });

    it(`${formation.id} builds each opening in its zone with separated bodies`, () => {
      const failures = ZONE_IDS.flatMap((zone) =>
        visualizationsFor(inputFor(zone, formation)).flatMap((visualization) => {
          const { positions, ball } = visualization.opening;
          const separated = minSpacingOf(Object.values(positions)) >= BODY_SEPARATION;
          const inZone = zoneOf(ball, 'mine') === zone;
          return separated && inZone ? [] : [`${zone} ${visualization.starterId}`];
        }),
      );
      expect(failures).toEqual([]);
    });
  }

  it('gives each eligible starter exactly one sequence', () => {
    for (const formation of FM26_DATA.formations) {
      for (const zone of ZONE_IDS) {
        const starterIds = visualizationsFor(inputFor(zone, formation)).map(
          (visualization) => visualization.starterId,
        );
        expect(new Set(starterIds).size).toBe(starterIds.length);
      }
    }
  });
});
