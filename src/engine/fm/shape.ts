import type { MovementTable, Point, Side } from '../../data/types';
import type { Third, ZoneId } from '../../data/zones';
import { PITCH_W, clampToPitch } from '../geometry/pitch';
import { MIN_TOKEN_SPACING, enforceSpacing, type SpacingToken } from '../layout/spacing';
import { ballSideOf, offsetDelta, offsetFor } from './movement';
import type { PhasePlayer } from './phases';
import {
  ZONE_GRID,
  fromAttackerFrame,
  thirdOf,
  toAttackerFrame,
  zoneCentre,
  type ZoneGrid,
} from './zones';

export const SHAPE_MARGIN = 4;
export const OPPONENT_HOLD_WEIGHT = 4;

const LOOSE_BALL_SPACING = 6;
const BALL_ID = 'ball';
const CENTRE_X = PITCH_W / 2;
const NO_OFFSET: Point = { x: 0, y: 0 };

const ATTACK_DEPTH: Record<Third, number> = { F: -30, M: -15, D: 3 };
const ATTACK_SLIDE = 0.3;
const ATTACK_KEEPER_FOLLOW = 0.3;
const DEFEND_DEPTH: Record<Third, number> = { F: 2, M: 10, D: 20 };
const DEFEND_SLIDE = 0.35;
const DEFEND_SQUEEZE = 0.85;
const DEFEND_KEEPER_FOLLOW = 0.2;

export interface ShapeInput {
  attacker: Side;
  players: readonly PhasePlayer[];
  ball: Point;
  carrierId: string | null;
  zone: ZoneId;
  movement: MovementTable;
  grid?: ZoneGrid;
}

export interface ZoneShape {
  positions: Map<string, Point>;
  ball: Point;
}

function handoffPoint(
  frameBase: Point,
  isKeeper: boolean,
  attacking: boolean,
  frameZone: Point,
  third: Third,
): Point {
  const slide = (attacking ? ATTACK_SLIDE : DEFEND_SLIDE) * (frameZone.x - CENTRE_X);
  const depth = attacking ? ATTACK_DEPTH[third] : DEFEND_DEPTH[third];
  if (isKeeper) {
    const follow = attacking ? ATTACK_KEEPER_FOLLOW : DEFEND_KEEPER_FOLLOW;
    return clampToPitch(
      { x: CENTRE_X + slide * follow, y: frameBase.y + depth * follow },
      SHAPE_MARGIN,
    );
  }
  const x = attacking
    ? frameBase.x + slide
    : CENTRE_X + (frameBase.x - CENTRE_X) * DEFEND_SQUEEZE + slide;
  return clampToPitch({ x, y: frameBase.y + depth }, SHAPE_MARGIN);
}

export function computeZoneShape(input: ShapeInput): ZoneShape {
  const { attacker, players, ball, carrierId, zone, movement, grid = ZONE_GRID } = input;
  const third = thirdOf(zone);
  const frameZone = toAttackerFrame(zoneCentre(zone, attacker, grid), attacker);
  const frameBall = toAttackerFrame(ball, attacker);
  const hasCarrier = players.some((player) => player.team === attacker && player.id === carrierId);
  const pieces = players.map((player): SpacingToken => {
    const attacking = player.team === attacker;
    const frameBase = toAttackerFrame(player.base, attacker);
    const handoff = handoffPoint(frameBase, player.isKeeper, attacking, frameZone, third);
    if (player.isKeeper) return { id: player.id, point: handoff };
    if (attacking && player.id === carrierId) {
      return { id: player.id, point: frameBall, fixed: true };
    }
    const offset =
      player.roleId === undefined
        ? null
        : offsetFor(movement, player.roleId, zone, ballSideOf(handoff, zone, grid));
    const delta = offset ? offsetDelta(offset, zone, frameBase, attacking) : NO_OFFSET;
    return {
      id: player.id,
      point: clampToPitch({ x: handoff.x + delta.x, y: handoff.y + delta.y }, SHAPE_MARGIN),
      weight: attacking ? 1 : OPPONENT_HOLD_WEIGHT,
    };
  });
  const looseBall: SpacingToken[] = hasCarrier ? [] : [{ id: BALL_ID, point: frameBall }];
  const settled = enforceSpacing([...pieces, ...looseBall], {
    margin: SHAPE_MARGIN,
    minDistance: (a, b) =>
      a === BALL_ID || b === BALL_ID ? LOOSE_BALL_SPACING : MIN_TOKEN_SPACING,
  });
  return {
    positions: new Map<string, Point>(
      players.map((player) => [player.id, fromAttackerFrame(settled.get(player.id)!, attacker)]),
    ),
    ball: hasCarrier ? ball : fromAttackerFrame(settled.get(BALL_ID)!, attacker),
  };
}
