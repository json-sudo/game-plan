import type { Point } from '../../data/types';
import { easeProgress, motionDurationMs, type MotionKind } from './motion';

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
  entry: ReadonlyMap<string, Point> = new Map(),
): Map<string, Point> {
  return new Map(
    Array.from(to, ([id, target]) => [
      id,
      positionAt(from.get(id) ?? entry.get(id) ?? target, target, t),
    ]),
  );
}

export function progressAt(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  return unitInterval(elapsedMs / durationMs);
}

export interface TransitionInput {
  from: ReadonlyMap<string, Point>;
  to: ReadonlyMap<string, Point>;
  elapsedMs: number;
  kind: MotionKind;
  reducedMotion: boolean;
  entry?: ReadonlyMap<string, Point>;
}

export function transitionAt(input: TransitionInput): Map<string, Point> {
  const { from, to, elapsedMs, kind, reducedMotion, entry } = input;
  const progress = progressAt(elapsedMs, motionDurationMs(kind, reducedMotion));
  return positionsAt(from, to, easeProgress(progress, reducedMotion), entry);
}

export function isTransitionDone(
  elapsedMs: number,
  kind: MotionKind,
  reducedMotion: boolean,
): boolean {
  return elapsedMs >= motionDurationMs(kind, reducedMotion);
}
