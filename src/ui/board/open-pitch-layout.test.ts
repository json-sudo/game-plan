import { describe, expect, it } from 'vitest';
import { FORMATIONS } from '../../data/fm26';
import type { FormationDef, Point, Side } from '../../data/types';
import {
  OPEN_EDGE_MARGIN,
  PITCH_H,
  PITCH_W,
  layoutFormation,
  layoutOpenMatchup,
  layoutOwnHalf,
  matchupAnchors,
  mirrorPoint,
  ownHalfAnchors,
  type TeamLayout,
} from '../../engine';
import { bodyClearance, boardMetrics } from './board-metrics';

const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
const EPSILON = 1e-6;
const SIDES: readonly Side[] = ['mine', 'opponent'];

const clearanceAt = (viewport: { width: number; height: number }) =>
  bodyClearance(boardMetrics(viewport.width, viewport.height));

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function expectValidTeam(
  def: FormationDef,
  team: Side,
  layout: TeamLayout,
  anchors: TeamLayout,
  clearance: number,
) {
  expect([...layout.keys()]).toEqual(def.slots.map((slot) => slot.id));
  expect(new Set(layout.keys()).size).toBe(11);
  const problems: string[] = [];
  for (const [slot, point] of layout) {
    const keeper = def.slots.find((candidate) => candidate.id === slot)!.family === 'GK';
    const margin = keeper ? 0 : Math.max(OPEN_EDGE_MARGIN, clearance / 2);
    expect(point.x).toBeGreaterThanOrEqual(margin - EPSILON);
    expect(point.x).toBeLessThanOrEqual(PITCH_W - margin + EPSILON);
    expect(point.y).toBeGreaterThanOrEqual(margin - EPSILON);
    expect(point.y).toBeLessThanOrEqual(PITCH_H - margin + EPSILON);
    if (distance(point, anchors.get(slot)!) > clearance) {
      problems.push(`${team}:${slot} correction`);
    }
  }
  const base = layoutFormation(def, team);
  for (const a of def.slots) {
    for (const b of def.slots) {
      if (a.id >= b.id || Math.abs(base.get(a.id)!.y - base.get(b.id)!.y) > 1) continue;
      const baseOrder = Math.sign(base.get(a.id)!.x - base.get(b.id)!.x);
      const placedOrder = Math.sign(layout.get(a.id)!.x - layout.get(b.id)!.x);
      if (placedOrder !== baseOrder) problems.push(`${team}:${a.id}/${b.id} rank`);
    }
  }
  expect(problems).toEqual([]);
}

function expectSeparated(points: Point[], clearance: number) {
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      expect(distance(points[i], points[j])).toBeGreaterThanOrEqual(clearance - 1e-3);
    }
  }
}

describe('open pitch layouts across viewports', () => {
  it('lays out every 12x12 matchup within bounds, separated, ranked and bounded', () => {
    for (const viewport of VIEWPORTS) {
      const clearance = clearanceAt(viewport);
      for (const mine of FORMATIONS) {
        for (const opponent of FORMATIONS) {
          const formations = { mine, opponent };
          const layouts = layoutOpenMatchup(formations, clearance);
          const anchors = matchupAnchors(formations);
          for (const team of SIDES) {
            expectValidTeam(formations[team], team, layouts[team], anchors[team], clearance);
          }
          expectSeparated([...layouts.mine.values(), ...layouts.opponent.values()], clearance);
          expect(layoutOpenMatchup(formations, clearance)).toEqual(layouts);
        }
      }
    }
  });

  it('lays out every single-team formation within bounds, separated, ranked and bounded', () => {
    for (const viewport of VIEWPORTS) {
      const clearance = clearanceAt(viewport);
      for (const def of FORMATIONS) {
        for (const team of SIDES) {
          const layout = layoutOwnHalf(def, team, clearance);
          const mineAnchors = ownHalfAnchors(def);
          const anchors: TeamLayout =
            team === 'mine'
              ? mineAnchors
              : new Map([...mineAnchors].map(([slot, point]) => [slot, mirrorPoint(point)]));
          expectValidTeam(def, team, layout, anchors, clearance);
          expectSeparated([...layout.values()], clearance);
          expect(layoutOwnHalf(def, team, clearance)).toEqual(layout);
        }
      }
    }
  });
});
