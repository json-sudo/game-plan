import { useEffect, useRef, useState } from 'react';
import type { Point } from '../../data/types';
import { isTransitionDone, motionDurationMs, positionsAt, progressAt } from '../../engine';
import { easeProgress, type MotionKind } from '../../engine/anim/motion';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

interface PieceMotionOptions {
  targets: ReadonlyMap<string, Point>;
  kind?: MotionKind;
  draggingId?: string | null;
  restartKey?: unknown;
  enterFrom?: ReadonlyMap<string, Point>;
  onSettled?: () => void;
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION_QUERY).matches;
}

function visiblePositions(
  rendered: ReadonlyMap<string, Point>,
  targets: ReadonlyMap<string, Point>,
  draggingId: string | null,
  enterFrom: ReadonlyMap<string, Point> | undefined,
): Map<string, Point> {
  return new Map(
    Array.from(targets, ([id, target]) => [
      id,
      id === draggingId ? target : (rendered.get(id) ?? enterFrom?.get(id) ?? target),
    ]),
  );
}

export function usePieceMotion({
  targets,
  kind = 'piece',
  draggingId = null,
  restartKey,
  enterFrom,
  onSettled,
}: PieceMotionOptions): ReadonlyMap<string, Point> {
  const [rendered, setRendered] = useState<ReadonlyMap<string, Point>>(() =>
    visiblePositions(new Map(), targets, null, enterFrom),
  );
  const renderedRef = useRef(rendered);
  const settledRef = useRef(onSettled);
  useEffect(() => {
    settledRef.current = onSettled;
  });

  useEffect(() => {
    const from = visiblePositions(renderedRef.current, targets, draggingId, enterFrom);
    const settle = (positions: ReadonlyMap<string, Point>) => {
      renderedRef.current = positions;
      setRendered(positions);
    };
    const moving = Array.from(targets).some(([id, target]) => {
      const start = from.get(id)!;
      return start.x !== target.x || start.y !== target.y;
    });
    if (!moving) {
      settle(from);
      settledRef.current?.();
      return;
    }

    const reduced = prefersReducedMotion();
    const duration = motionDurationMs(kind, reduced);
    let handle = 0;
    let startedAt: number | null = null;
    const frame = (timestamp: number) => {
      startedAt ??= timestamp;
      const elapsed = timestamp - startedAt;
      const done = isTransitionDone(elapsed, kind, reduced);
      const progress = easeProgress(progressAt(elapsed, duration), reduced);
      settle(done ? new Map(targets) : positionsAt(from, targets, progress));
      if (done) settledRef.current?.();
      else handle = requestAnimationFrame(frame);
    };
    handle = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(handle);
  }, [targets, kind, draggingId, restartKey, enterFrom]);

  return visiblePositions(rendered, targets, draggingId, enterFrom);
}
