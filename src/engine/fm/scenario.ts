import type { Point, Side } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import { clampToPitch } from '../geometry/pitch';
import {
  nearestCarrier,
  nearestCarrierInLane,
  resolveCarrier,
  type CarrierCandidate,
} from './carrier';
import { PITCH_TARGET_MARGIN } from './movement';
import type { PhasePlayer } from './phases';
import { fromAttackerFrame, toAttackerFrame, zoneCentre, zoneOf } from './zones';

export type DribbleDirection =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'forward-left'
  | 'forward-right'
  | 'back-left'
  | 'back-right';

export interface ScenarioContext {
  attacker: Side;
  players: readonly PhasePlayer[];
  ball: Point;
  carrierId: string | null;
}

export interface BallState {
  ball: Point;
  carrierId: string | null;
  zone: ZoneId;
}

export const DRIBBLE_STEP = 8;

const DIAGONAL = Math.SQRT1_2;

const DRIBBLE_VECTORS: Record<DribbleDirection, Point> = {
  forward: { x: 0, y: -1 },
  back: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  'forward-left': { x: -DIAGONAL, y: -DIAGONAL },
  'forward-right': { x: DIAGONAL, y: -DIAGONAL },
  'back-left': { x: -DIAGONAL, y: DIAGONAL },
  'back-right': { x: DIAGONAL, y: DIAGONAL },
};

function candidatesOf(context: ScenarioContext): CarrierCandidate[] {
  return context.players
    .filter((player) => player.team === context.attacker)
    .map((player) => ({ id: player.id, position: player.base, isKeeper: player.isKeeper }));
}

function stateOf(context: ScenarioContext, ball: Point, carrierId: string | null): BallState {
  return { ball, carrierId, zone: zoneOf(ball, context.attacker) };
}

export function tapZone(context: ScenarioContext, zone: ZoneId): BallState {
  const ball = zoneCentre(zone, context.attacker);
  return stateOf(
    context,
    ball,
    nearestCarrierInLane(ball, candidatesOf(context), context.attacker),
  );
}

export function dragBall(context: ScenarioContext, point: Point): BallState {
  const ball = clampToPitch(point, PITCH_TARGET_MARGIN);
  return stateOf(context, ball, nearestCarrier(ball, candidatesOf(context)));
}

export function setCarrier(context: ScenarioContext, playerId: string): BallState {
  const carrierId = resolveCarrier(context.ball, candidatesOf(context), playerId);
  return stateOf(context, context.ball, carrierId === playerId ? playerId : context.carrierId);
}

export function pass(
  context: ScenarioContext,
  receiverId: string,
  positions?: ReadonlyMap<string, Point>,
): BallState {
  const receiver = context.players.find(
    (player) => player.id === receiverId && player.team === context.attacker,
  );
  if (!receiver || receiver.id === context.carrierId) {
    return stateOf(context, context.ball, context.carrierId);
  }
  const ball = positions?.get(receiver.id) ?? receiver.base;
  return stateOf(context, { ...ball }, receiver.id);
}

export function dribble(context: ScenarioContext, direction: DribbleDirection): BallState {
  if (context.carrierId === null) return stateOf(context, context.ball, null);
  const vector = DRIBBLE_VECTORS[direction];
  const frame = toAttackerFrame(context.ball, context.attacker);
  const stepped = { x: frame.x + vector.x * DRIBBLE_STEP, y: frame.y + vector.y * DRIBBLE_STEP };
  const ball = clampToPitch(fromAttackerFrame(stepped, context.attacker), PITCH_TARGET_MARGIN);
  return stateOf(context, ball, context.carrierId);
}
