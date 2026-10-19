import type { Point, Side } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import { clampToPitch } from '../geometry/pitch';
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

function stateOf(context: ScenarioContext, ball: Point, carrierId: string | null): BallState {
  return { ball, carrierId, zone: zoneOf(ball, context.attacker) };
}

function isAttacker(context: ScenarioContext, playerId: string): boolean {
  return context.players.some(
    (player) => player.id === playerId && player.team === context.attacker,
  );
}

export function tapZone(
  context: ScenarioContext,
  zone: ZoneId,
  eligibleIds: readonly string[],
): BallState {
  const kept =
    context.carrierId !== null && eligibleIds.includes(context.carrierId)
      ? context.carrierId
      : null;
  return stateOf(context, zoneCentre(zone, context.attacker), kept);
}

export function setCarrier(
  context: ScenarioContext,
  playerId: string,
  eligibleIds: readonly string[],
): BallState {
  const chosen = eligibleIds.includes(playerId) && isAttacker(context, playerId);
  return stateOf(context, context.ball, chosen ? playerId : context.carrierId);
}

export function pass(
  context: ScenarioContext,
  receiverId: string,
  positions?: ReadonlyMap<string, Point>,
): BallState {
  const receiver = context.players.find(
    (player) => player.id === receiverId && player.team === context.attacker,
  );
  if (context.carrierId === null || !receiver || receiver.id === context.carrierId) {
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
