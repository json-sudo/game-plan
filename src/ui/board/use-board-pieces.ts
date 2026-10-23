import { useStore, type StoreApi } from 'zustand';
import type { Point } from '../../data/types';
import { selectDisplayPositions } from '../../state/selectors';
import type { PitchStore } from '../../state/store';
import { BALL_PIECE_ID, usePitchMotion } from '../hooks/usePitchMotion';

export interface BoardPiecesView {
  pieces: ReadonlyMap<string, Point>;
  ball: Point;
}

export function useBoardPieces(store: StoreApi<PitchStore>): BoardPiecesView {
  const doc = useStore(store, (state) => state.doc);
  const drag = useStore(store, (state) => state.ui.drag);
  const positions = useStore(store, selectDisplayPositions);
  const ballDrag = drag?.target.kind === 'ball' ? drag.point : null;
  const draggingId = drag ? (drag.target.kind === 'ball' ? BALL_PIECE_ID : drag.target.id) : null;
  return usePitchMotion({
    pieces: positions,
    ball: ballDrag ?? doc.ball,
    draggingId,
    cause: [doc.scenario],
  });
}
