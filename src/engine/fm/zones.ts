import type { Point, Side } from '../../data/types';
import { GRID, type Lane, type Third, type ZoneId } from '../../data/zones';
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

const LANE_NAMES: Record<Lane, string> = { L: 'Left flank', C: 'Centre', R: 'Right flank' };
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
  laneEdges: evenEdges(PITCH_W, GRID.lanes.length),
  thirdEdges: evenEdges(PITCH_H, GRID.thirds.length),
};

export function toAttackerFrame(point: Point, attacker: Side): Point {
  return attacker === 'mine' ? point : { x: PITCH_W - point.x, y: PITCH_H - point.y };
}

export const fromAttackerFrame = toAttackerFrame;

function bandIndex(value: number, edges: readonly number[]): number {
  return edges.filter((edge) => value > edge).length;
}

export function zoneOf(ball: Point, attacker: Side, grid: ZoneGrid = ZONE_GRID): ZoneId {
  const frame = toAttackerFrame(ball, attacker);
  const lane = GRID.lanes[bandIndex(frame.x, grid.laneEdges)];
  const third = FRONT_TO_BACK_THIRDS[bandIndex(frame.y, grid.thirdEdges)];
  return `${lane}-${third}`;
}

function parseZone(zone: ZoneId): { laneIndex: number; thirdIndex: number } {
  const [lane, third] = zone.split('-') as [Lane, Third];
  return {
    laneIndex: GRID.lanes.indexOf(lane),
    thirdIndex: FRONT_TO_BACK_THIRDS.indexOf(third),
  };
}

export function laneSignOf(zone: ZoneId): -1 | 0 | 1 {
  const { laneIndex } = parseZone(zone);
  const last = GRID.lanes.length - 1;
  if (laneIndex === 0) return -1;
  return laneIndex === last ? 1 : 0;
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
  return fromAttackerFrame({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, attacker);
}

export function zoneName(zone: ZoneId): string {
  const [lane, third] = zone.split('-') as [Lane, Third];
  return `${LANE_NAMES[lane]} - ${THIRD_NAMES[third]}`;
}
