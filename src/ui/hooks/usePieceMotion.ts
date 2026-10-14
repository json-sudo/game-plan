import { useEffect, useRef, useState } from 'react';
import type { Point } from '../../data/types';
import { isTransitionDone, motionDurationMs, positionsAt, progressAt } from '../../engine';
import { easeProgress, type MotionKind } from '../../engine/anim/motion';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

interface PieceMotionOptions {
  targets: ReadonlyMap<string, Point>;
  kind?: MotionKind;
  draggingId?: string | null;
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION_QUERY).matches;
}

function visiblePositions(
  rendered: ReadonlyMap<string, Point>,
  targets: ReadonlyMap<string, Point>,
  draggingId: string | null,
): Map<string, Point> {
  return new Map(
    Array.from(targets, ([id, target]) => [
      id,
      id === draggingId ? target : (rendered.get(id) ?? target),
    ]),
  );
}

export function usePieceMotion({
  targets,
  kind = 'piece',
  draggingId = null,
}: PieceMotionOptions): ReadonlyMap<string, Point> {
  const [rendered, setRendered] = useState<ReadonlyMap<string, Point>>(targets);
  const renderedRef = useRef(rendered);

  useEffect(() => {
    const from = visiblePositions(renderedRef.current, targets, draggingId);
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
      if (!done) handle = requestAnimationFrame(frame);
    };
    handle = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(handle);
  }, [targets, kind, draggingId]);

  return visiblePositions(rendered, targets, draggingId);
}
