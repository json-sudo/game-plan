import { useMemo, useRef } from 'react';
import type { Point } from '../../data/types';
import type { MotionKind } from '../../engine/anim/motion';
import { usePieceMotion } from './usePieceMotion';

export const BALL_PIECE_ID = 'ball';

export interface PitchMotionOptions {
  pieces: ReadonlyMap<string, Point>;
  ball: Point;
  draggingId: string | null;
  cause: readonly unknown[];
  retarget?: unknown;
  onSettled?: () => void;
}

export interface PitchMotion {
  pieces: ReadonlyMap<string, Point>;
  ball: Point;
}

function useMotionKind(cause: readonly unknown[], trigger: unknown): MotionKind {
  const last = useRef<{ cause: readonly unknown[]; trigger: unknown; kind: MotionKind }>({
    cause,
    trigger,
    kind: 'piece',
  });
  if (last.current.trigger !== trigger) {
    const changed = cause.some((value, index) => value !== last.current.cause[index]);
    last.current = { cause, trigger, kind: changed ? 'phase' : 'piece' };
  }
  return last.current.kind;
}

export function usePitchMotion({
  pieces,
  ball,
  draggingId,
  cause,
  retarget,
  onSettled,
}: PitchMotionOptions): PitchMotion {
  const { x, y } = ball;
  const targets = useMemo(() => new Map(pieces).set(BALL_PIECE_ID, { x, y }), [pieces, x, y]);
  const kind = useMotionKind(cause, targets);
  const rendered = usePieceMotion({ targets, kind, draggingId, restartKey: retarget, onSettled });
  return useMemo(() => {
    const renderedPieces = new Map(rendered);
    const renderedBall = renderedPieces.get(BALL_PIECE_ID) ?? { x, y };
    renderedPieces.delete(BALL_PIECE_ID);
    return { pieces: renderedPieces, ball: renderedBall };
  }, [rendered, x, y]);
}
