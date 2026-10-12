import type { Point } from '../../data/types';

export const PHASE_TRANSITION_MS = 900;

function unitInterval(t: number): number {
  if (!Number.isFinite(t)) return 0;
  return Math.min(1, Math.max(0, t));
}

export function positionAt(from: Point, to: Point, t: number): Point {
  const progress = unitInterval(t);
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}

export function positionsAt(
  from: ReadonlyMap<string, Point>,
  to: ReadonlyMap<string, Point>,
  t: number,
): Map<string, Point> {
  return new Map(
    Array.from(to, ([id, target]) => [id, positionAt(from.get(id) ?? target, target, t)]),
  );
}

export function progressAt(elapsedMs: number, durationMs: number, reducedMotion: boolean): number {
  if (reducedMotion || durationMs <= 0) return 1;
  return unitInterval(elapsedMs / durationMs);
}
