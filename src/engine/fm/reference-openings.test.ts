import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import type { FormationDef, Point } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import { visualizationsFor, type VisualizationInput } from './visualization';
import referenceJson from './fixtures/reference-openings.json';

const ORDINARY_TOLERANCE = 3;
const CARRIER_TOLERANCE = 1;
const KEEPER_TOLERANCE = 1;

interface ReferenceOpening {
  positions: Record<string, Point>;
  starter: string;
  ball: Point;
  zone: ZoneId;
}

interface ReferenceFile {
  formations: { mine: string; opponent: string };
  roles: Record<string, string>;
  openings: Record<string, ReferenceOpening>;
}

const reference = referenceJson as ReferenceFile;

function formationById(id: string): FormationDef {
  const found = FM26_DATA.formations.find((formation) => formation.id === id);
  if (!found) throw new Error(`no formation ${id}`);
  return found;
}

function inputFor(zone: ZoneId): VisualizationInput {
  return {
    zone,
    attacker: 'mine',
    formations: {
      mine: formationById(reference.formations.mine),
      opponent: formationById(reference.formations.opponent),
    },
    roles: reference.roles,
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('reference openings', () => {
  it('documents all 15 zones', () => {
    expect(Object.keys(reference.openings)).toHaveLength(15);
  });

  describe.each(Object.entries(reference.openings))('%s', (name, expected) => {
    const visualizations = visualizationsFor(inputFor(expected.zone));
    const actual = visualizations.find((item) => item.starterId === expected.starter);

    it('includes the documented starter', () => {
      expect(visualizations.map((item) => item.starterId)).toContain(expected.starter);
    });

    it('places the possession anchor on the carrier within tolerance', () => {
      expect(actual).toBeDefined();
      const carrier = actual!.opening.positions[expected.starter];
      expect(distance(carrier, expected.positions[expected.starter])).toBeLessThanOrEqual(
        CARRIER_TOLERANCE,
      );
      expect(distance(actual!.opening.ball, expected.ball)).toBeLessThanOrEqual(CARRIER_TOLERANCE);
    });

    it('reproduces every player within tolerance', () => {
      expect(actual).toBeDefined();
      const misses = Object.entries(expected.positions).flatMap(([id, target]) => {
        if (id === actual!.engagerId) return [];
        const point = actual!.opening.positions[id];
        const limit = id.endsWith(':GK')
          ? KEEPER_TOLERANCE
          : id === expected.starter
            ? CARRIER_TOLERANCE
            : ORDINARY_TOLERANCE;
        const gap = distance(point, target);
        return gap <= limit ? [] : [`${name} ${id} off by ${gap.toFixed(2)} (limit ${limit})`];
      });
      expect(misses).toEqual([]);
    });
  });
});
