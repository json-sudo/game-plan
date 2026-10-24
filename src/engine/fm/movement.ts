import type { LineShiftTable, MovementTable, Offset, Point, Side } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import { PITCH_W, clampToPitch } from '../geometry/pitch';
import { lineShift } from './lineShift';
import { ZONE_GRID, laneSignOf, toDisplayFrame, zoneOf, type ZoneGrid } from './zones';

export type BallSide = 'ball' | 'far';

export interface MovementTables {
  movement: MovementTable;
  shapeLineShift: LineShiftTable;
  lineShift: LineShiftTable;
}

export interface TargetInput {
  base: Point;
  start: Point;
  team: Side;
  attacker: Side;
  roleId: string | undefined;
  isKeeper: boolean;
  zone: ZoneId;
  tables: MovementTables;
  grid?: ZoneGrid;
}

export type TargetResult = { status: 'ok'; target: Point } | { status: 'setup-not-finished' };

export const PITCH_TARGET_MARGIN = 3;

const CENTRE_TOLERANCE = 0.5;

export function offsetFor(
  table: MovementTable,
  roleId: string,
  zone: ZoneId,
  side: BallSide,
): Offset | null {
  const cell = table[roleId]?.[zone];
  return cell ? cell[side] : null;
}

export function ballSideOf(playerFrame: Point, zone: ZoneId, grid: ZoneGrid = ZONE_GRID): BallSide {
  const ballSign = laneSignOf(zone);
  if (ballSign === 0) return 'ball';
  const playerSign = laneSignOf(zoneOf(playerFrame, 'mine', grid));
  return playerSign !== 0 && playerSign !== ballSign ? 'far' : 'ball';
}

function centreSign(x: number): -1 | 0 | 1 {
  const delta = x - PITCH_W / 2;
  if (Math.abs(delta) < CENTRE_TOLERANCE) return 0;
  return delta < 0 ? -1 : 1;
}

export function offsetDelta(
  offset: Offset,
  zone: ZoneId,
  frameBase: Point,
  attacking: boolean,
): Point {
  const [side, wide, depth] = offset;
  return {
    x: side * laneSignOf(zone) + wide * centreSign(frameBase.x),
    y: attacking ? -depth : depth,
  };
}

export function targetFor(input: TargetInput): TargetResult {
  const { base, start, team, attacker, roleId, isKeeper, zone, tables, grid = ZONE_GRID } = input;
  if (isKeeper) return { status: 'ok', target: start };
  const attacking = team === attacker;
  const frameBase = toDisplayFrame(base, attacker);
  const frameStart = toDisplayFrame(start, attacker);
  const shift = attacking || isKeeper ? 0 : lineShift(zone, tables.lineShift);
  const offset = roleId
    ? offsetFor(tables.movement, roleId, zone, ballSideOf(frameStart, zone, grid))
    : ([0, 0, 0] as const);
  if (!offset) return { status: 'setup-not-finished' };
  const delta = offsetDelta(offset, zone, frameBase, attacking);
  const target = clampToPitch(
    { x: frameStart.x + delta.x, y: frameStart.y + shift + delta.y },
    PITCH_TARGET_MARGIN,
  );
  return { status: 'ok', target: toDisplayFrame(target, attacker) };
}
