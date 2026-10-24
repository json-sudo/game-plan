import type { Point, Side } from '../../data/types';
import { toDisplayFrame } from './zones';

export const RECEIVER_PROGRESS_WEIGHT = 1;
export const RECEIVER_DISTANCE_WEIGHT = 0.25;
export const RECEIVER_PRESSURE_WEIGHT = 1;
export const PRESSURE_RANGE = 10;

export interface ReceiverInput {
  attacker: Side;
  carrierId: string;
  passerId: string | null;
  teammateIds: readonly string[];
  opponentIds: readonly string[];
  positions: Readonly<Record<string, Point>>;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pressureOn(point: Point, opponents: readonly Point[]): number {
  const nearest = Math.min(...opponents.map((opponent) => distance(point, opponent)));
  return Math.max(0, PRESSURE_RANGE - nearest);
}

function scoreOf(attacker: Side, carrier: Point, candidate: Point, opponents: readonly Point[]) {
  const progress = toDisplayFrame(carrier, attacker).y - toDisplayFrame(candidate, attacker).y;
  return (
    RECEIVER_PROGRESS_WEIGHT * progress -
    RECEIVER_DISTANCE_WEIGHT * distance(carrier, candidate) -
    RECEIVER_PRESSURE_WEIGHT * pressureOn(candidate, opponents)
  );
}

function candidatesOf(input: ReceiverInput): string[] {
  const teammates = input.teammateIds.filter((id) => id !== input.carrierId);
  const withoutPasser = teammates.filter((id) => id !== input.passerId);
  return withoutPasser.length > 0 ? withoutPasser : teammates;
}

export function chooseReceiver(input: ReceiverInput): string | null {
  const { attacker, carrierId, positions, opponentIds } = input;
  const carrier = positions[carrierId];
  const opponents = opponentIds.map((id) => positions[id]);
  const scored = candidatesOf(input).map((id) => ({
    id,
    score: scoreOf(attacker, carrier, positions[id], opponents),
  }));
  const best = scored.reduce<{ id: string; score: number } | null>(
    (top, candidate) =>
      top === null ||
      candidate.score > top.score ||
      (candidate.score === top.score && candidate.id < top.id)
        ? candidate
        : top,
    null,
  );
  return best?.id ?? null;
}
