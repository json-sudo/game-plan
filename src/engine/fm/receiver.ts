import type { Point } from '../../data/types';
import { distance } from './point';

export const RECEIVER_PROGRESS_WEIGHT = 1;
export const RECEIVER_DISTANCE_WEIGHT = 0.25;
export const RECEIVER_PRESSURE_WEIGHT = 1;
export const PRESSURE_RANGE = 10;

function pressureOn(point: Point, opponents: readonly Point[]): number {
  const nearest = Math.min(...opponents.map((opponent) => distance(point, opponent)));
  return Math.max(0, PRESSURE_RANGE - nearest);
}

export function receiverScore(
  carrier: Point,
  candidate: Point,
  opponents: readonly Point[],
): number {
  return (
    RECEIVER_PROGRESS_WEIGHT * (carrier.y - candidate.y) -
    RECEIVER_DISTANCE_WEIGHT * distance(carrier, candidate) -
    RECEIVER_PRESSURE_WEIGHT * pressureOn(candidate, opponents)
  );
}
