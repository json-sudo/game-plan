import type { LineShiftTable, MovementTable, Offset, Point, Side } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import { PITCH_W, clampToPitch } from '../geometry/pitch';
import { lineShift } from './lineShift';
import {
  ZONE_GRID,
  fromAttackerFrame,
  laneSignOf,
  toAttackerFrame,
  zoneOf,
  type ZoneGrid,
} from './zones';

export type BallSide = 'ball' | 'far';

export interface MovementTables {
  movement: MovementTable;
  lineShift: LineShiftTable;
}

export interface TargetInput {
  base: Point;
  team: Side;
  attacker: Side;
  roleId: string | undefined;
  isKeeper: boolean;
  zone: ZoneId;
  tables: MovementTables;
  grid?: ZoneGrid;
}

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

export function targetFor(input: TargetInput): Point {
  const { base, team, attacker, roleId, isKeeper, zone, tables, grid = ZONE_GRID } = input;
  if (!roleId) return base;
  const frameBase = toAttackerFrame(base, attacker);
  const offset = offsetFor(tables.movement, roleId, zone, ballSideOf(frameBase, zone, grid));
  if (!offset) return base;

  const [side, wide, depth] = offset;
  const attacking = team === attacker;
  const shift = attacking || isKeeper ? 0 : lineShift(zone, tables.lineShift);
  const dx = side * laneSignOf(zone) + wide * centreSign(frameBase.x);
  const dy = attacking ? -depth : depth;
  const target = clampToPitch(
    { x: frameBase.x + dx, y: frameBase.y + shift + dy },
    PITCH_TARGET_MARGIN,
  );
  return fromAttackerFrame(target, attacker);
}
