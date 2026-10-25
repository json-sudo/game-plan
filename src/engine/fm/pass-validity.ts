import type { Point } from '../../data/types';
import { PITCH_H } from '../geometry/pitch';
import { distance, lerp } from './point';
import { BODY_DISTANCE, PLAYER_RADIUS } from './shape';

export type Frame = Readonly<Record<string, Point>>;

export const MIN_PASS_LENGTH = 6;
export const PREFERRED_MAX_PASS_LENGTH = 30;
export const FALLBACK_MAX_PASS_LENGTH = 40;

const BALL_RADIUS = 1.2;
const PATH_MARGIN = 0.3;
const PATH_CLEARANCE = PLAYER_RADIUS + BALL_RADIUS + PATH_MARGIN;
const PATH_SAMPLES = 20;
const EPSILON = 1e-6;

export type PassRejection = 'self' | 'noop' | 'occupied' | 'length' | 'offside' | 'blocked';

export interface PassCheck {
  carrierId: string;
  receiverId: string;
  before: Frame;
  after: Frame;
  defenderIds: readonly string[];
  maxLength: number;
}

function isOffside(check: PassCheck): boolean {
  const { before, carrierId, receiverId, defenderIds } = check;
  if (defenderIds.length === 0) return false;
  const receiver = before[receiverId];
  if (receiver.y >= PITCH_H / 2) return false;
  const depths = defenderIds.map((id) => before[id].y).sort((a, b) => a - b);
  const secondLast = depths[Math.min(1, depths.length - 1)];
  return receiver.y < Math.min(before[carrierId].y, secondLast) - EPSILON;
}

function isBlocked(check: PassCheck): boolean {
  const { before, after, carrierId, receiverId } = check;
  const start = before[carrierId];
  const end = after[receiverId];
  const others = Object.keys(before).filter((id) => id !== carrierId && id !== receiverId);
  return Array.from({ length: PATH_SAMPLES + 1 }, (_, step) => step / PATH_SAMPLES).some((t) => {
    const ball = lerp(start, end, t);
    return others.some((id) => distance(ball, lerp(before[id], after[id], t)) < PATH_CLEARANCE);
  });
}

export function rejectPass(check: PassCheck): PassRejection | null {
  const { before, after, carrierId, receiverId, maxLength } = check;
  if (carrierId === receiverId) return 'self';
  const length = distance(before[carrierId], after[receiverId]);
  if (length < EPSILON) return 'noop';
  if (length < MIN_PASS_LENGTH - EPSILON || length > maxLength + EPSILON) return 'length';
  const occupied = Object.keys(after).some(
    (id) => id !== receiverId && distance(after[id], after[receiverId]) < BODY_DISTANCE,
  );
  if (occupied) return 'occupied';
  if (isOffside(check)) return 'offside';
  return isBlocked(check) ? 'blocked' : null;
}
