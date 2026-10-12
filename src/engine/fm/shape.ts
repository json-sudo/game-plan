import type { LineShiftTable, Point } from '../../data/types';
import type { Third, ZoneId } from '../../data/zones';
import { PITCH_W, clampToPitch } from '../geometry/pitch';
import { enforceSpacing, type SpacingToken } from '../layout/spacing';
import { PITCH_TARGET_MARGIN } from './movement';
import type { PhasePlayer } from './phases';
import {
  ZONE_GRID,
  fromAttackerFrame,
  thirdOf,
  toAttackerFrame,
  zoneBounds,
  type ZoneGrid,
} from './zones';

export const SHAPE_DEPTH_STEP: Record<Third, number> = { D: 6, M: 0, F: -6 };
export const SHAPE_SLIDE_RATIO = 0.3;
export const OPPONENT_HOLD_WEIGHT = 4;

export interface ShapeInput {
  attacker: PhasePlayer['team'];
  players: readonly PhasePlayer[];
  ball: Point;
  carrierId: string | null;
  zone: ZoneId;
  grid?: ZoneGrid;
  shapeLineShift: LineShiftTable;
}

export function zoneShapeShift(zone: ZoneId, grid: ZoneGrid = ZONE_GRID): Point {
  const { x0, x1 } = zoneBounds(zone, grid);
  return {
    x: SHAPE_SLIDE_RATIO * ((x0 + x1) / 2 - PITCH_W / 2),
    y: SHAPE_DEPTH_STEP[thirdOf(zone)],
  };
}

export function computeZoneShape(input: ShapeInput): Map<string, Point> {
  const { attacker, players, ball, carrierId, zone, grid = ZONE_GRID, shapeLineShift } = input;
  const shift = zoneShapeShift(zone, grid);
  const defenderShift = shapeLineShift[zone]?.dy ?? 0;
  const shaped = (player: PhasePlayer): Point => {
    if (player.isKeeper) return player.base;
    const frame = toAttackerFrame(player.base, attacker);
    if (player.team !== attacker) {
      return fromAttackerFrame(
        clampToPitch({ x: frame.x, y: frame.y + defenderShift }, PITCH_TARGET_MARGIN),
        attacker,
      );
    }
    return fromAttackerFrame(
      clampToPitch({ x: frame.x + shift.x, y: frame.y + shift.y }, PITCH_TARGET_MARGIN),
      attacker,
    );
  };
  const tokens = players.map(
    (player): SpacingToken => ({
      id: player.id,
      point: player.id === carrierId ? ball : shaped(player),
      fixed: player.id === carrierId || player.isKeeper,
      weight: player.team === attacker ? 1 : OPPONENT_HOLD_WEIGHT,
    }),
  );
  return enforceSpacing(tokens, { margin: PITCH_TARGET_MARGIN });
}
