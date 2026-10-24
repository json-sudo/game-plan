import type { Point, Side } from '../../data/types';
import { GRID, LANE_EDGE_FRACTIONS, type Lane, type Third, type ZoneId } from '../../data/zones';
import { PITCH_H, PITCH_W } from '../geometry/pitch';

export interface ZoneGrid {
  laneEdges: readonly number[];
  thirdEdges: readonly number[];
}

export interface ZoneBounds {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const LANE_NAMES: Record<Lane, string> = {
  L: 'Left flank',
  LH: 'Left half-space',
  C: 'Centre',
  RH: 'Right half-space',
  R: 'Right flank',
};
const THIRD_NAMES: Record<Third, string> = {
  D: 'defensive third',
  M: 'middle third',
  F: 'final third',
};

const FRONT_TO_BACK_THIRDS: readonly Third[] = [...GRID.thirds].reverse();

function evenEdges(length: number, count: number): number[] {
  return Array.from({ length: count - 1 }, (_, index) => (length * (index + 1)) / count);
}

export const ZONE_GRID: ZoneGrid = {
  laneEdges: LANE_EDGE_FRACTIONS.map((fraction) => fraction * PITCH_W),
  thirdEdges: evenEdges(PITCH_H, GRID.thirds.length),
};

export interface BoxEdges {
  x0: number;
  x1: number;
}

const [PENALTY_LEFT, SIX_YARD_LEFT, SIX_YARD_RIGHT, PENALTY_RIGHT] = ZONE_GRID.laneEdges;

export const MARKING_BOX_EDGES: { penalty: BoxEdges; sixYard: BoxEdges } = {
  penalty: { x0: PENALTY_LEFT, x1: PENALTY_RIGHT },
  sixYard: { x0: SIX_YARD_LEFT, x1: SIX_YARD_RIGHT },
};

export function toDisplayFrame(point: Point, attacker: Side): Point {
  return attacker === 'mine' ? point : { x: PITCH_W - point.x, y: PITCH_H - point.y };
}

function bandIndex(value: number, edges: readonly number[]): number {
  return edges.filter((edge) => value >= edge).length;
}

export function zoneOf(ball: Point, attacker: Side, grid: ZoneGrid = ZONE_GRID): ZoneId {
  const frame = toDisplayFrame(ball, attacker);
  const lane = GRID.lanes[bandIndex(frame.x, grid.laneEdges)];
  const third = FRONT_TO_BACK_THIRDS[bandIndex(frame.y, grid.thirdEdges)];
  return `${lane}-${third}`;
}

function parseZone(zone: ZoneId): {
  lane: Lane;
  third: Third;
  laneIndex: number;
  thirdIndex: number;
} {
  const [lane, third] = zone.split('-') as [Lane, Third];
  return {
    lane,
    third,
    laneIndex: GRID.lanes.indexOf(lane),
    thirdIndex: FRONT_TO_BACK_THIRDS.indexOf(third),
  };
}

export function laneOf(zone: ZoneId): Lane {
  return parseZone(zone).lane;
}

export function thirdOf(zone: ZoneId): Third {
  return parseZone(zone).third;
}

export function laneSignOf(zone: ZoneId): -1 | 0 | 1 {
  const { laneIndex } = parseZone(zone);
  const middle = (GRID.lanes.length - 1) / 2;
  if (laneIndex === middle) return 0;
  return laneIndex < middle ? -1 : 1;
}

function bandBounds(
  index: number,
  edges: readonly number[],
  length: number,
): readonly [number, number] {
  return [index === 0 ? 0 : edges[index - 1], index === edges.length ? length : edges[index]];
}

export function zoneBounds(zone: ZoneId, grid: ZoneGrid = ZONE_GRID): ZoneBounds {
  const { laneIndex, thirdIndex } = parseZone(zone);
  const [x0, x1] = bandBounds(laneIndex, grid.laneEdges, PITCH_W);
  const [y0, y1] = bandBounds(thirdIndex, grid.thirdEdges, PITCH_H);
  return { x0, x1, y0, y1 };
}

export function zoneCentre(zone: ZoneId, attacker: Side, grid: ZoneGrid = ZONE_GRID): Point {
  const { x0, x1, y0, y1 } = zoneBounds(zone, grid);
  return toDisplayFrame({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, attacker);
}

export function zoneName(zone: ZoneId): string {
  const { lane, third } = parseZone(zone);
  return `${LANE_NAMES[lane]} - ${THIRD_NAMES[third]}`;
}
