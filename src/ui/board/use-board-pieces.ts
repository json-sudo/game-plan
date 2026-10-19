import { useMemo } from 'react';
import { useStore, type StoreApi } from 'zustand';
import type { Point } from '../../data/types';
import { selectDisplayPositions } from '../../state/selectors';
import type { PitchStore } from '../../state/store';
import { BALL_PIECE_ID, usePitchMotion } from '../hooks/usePitchMotion';
import { boardPieceTargets } from './board-pieces';

export interface BoardPiecesView {
  pieces: ReadonlyMap<string, Point>;
  ball: Point;
}

export function useBoardPieces(store: StoreApi<PitchStore>): BoardPiecesView {
  const doc = useStore(store, (state) => state.doc);
  const { mode, phase, action, drag } = useStore(store, (state) => state.ui);
  const positions = useStore(store, selectDisplayPositions);
  const fm = mode === 'fm';
  const ballDragging = drag?.target.kind === 'ball';
  const dragX = ballDragging ? drag.point.x : null;
  const dragY = ballDragging ? drag.point.y : null;

  const targets = useMemo(
    () =>
      boardPieceTargets({
        doc,
        positions,
        fm,
        action,
        ballDrag: dragX === null || dragY === null ? null : { x: dragX, y: dragY },
      }),
    [doc, positions, fm, action, dragX, dragY],
  );

  const draggingId = drag ? (drag.target.kind === 'ball' ? BALL_PIECE_ID : drag.target.id) : null;
  return usePitchMotion({
    pieces: targets.pieces,
    ball: targets.ball,
    draggingId,
    cause: [doc.scenario, phase],
    retarget: action,
    onSettled: () => store.getState().commitAction(),
  });
}
