import { useEffect, useMemo, useState } from 'react';
import { useStore, type StoreApi } from 'zustand';
import type { Point } from '../../data/types';
import type { PitchDocument } from '../../state/document';
import { selectDisplayPositions, selectFmVisualization } from '../../state/selectors';
import type { PitchStore } from '../../state/store';
import { BALL_PIECE_ID, usePitchMotion } from '../hooks/usePitchMotion';
import { fmWantedPieces, goalLinePieces } from './fm-pieces';

export interface BoardPiecesView {
  pieces: ReadonlyMap<string, Point>;
  ball: Point;
  doc: PitchDocument;
  ballVisible: boolean;
}

interface Presented {
  wanted: ReadonlyMap<string, Point>;
  doc: PitchDocument;
}

const NO_PIECES: ReadonlyMap<string, Point> = new Map();

export function useBoardPieces(store: StoreApi<PitchStore>): BoardPiecesView {
  const doc = useStore(store, (state) => state.doc);
  const fm = useStore(store, (state) => state.ui.mode === 'fm');
  const drag = useStore(store, (state) => state.ui.drag);
  const viz = useStore(store, selectFmVisualization);
  const positions = useStore(store, selectDisplayPositions);
  const [presented, setPresented] = useState<Presented | null>(null);

  const wanted = useMemo(() => (fm ? fmWantedPieces(doc, viz) : null), [fm, doc, viz]);
  const present = wanted !== null && wanted.size > 0;
  const leaving = wanted !== null && !present ? presented : null;

  useEffect(() => {
    if (present) setPresented({ wanted, doc });
    else if (wanted === null) setPresented(null);
  }, [present, wanted, doc]);

  const enterFrom = useMemo(
    () => (present ? goalLinePieces(wanted, doc) : undefined),
    [present, wanted, doc],
  );
  const pieces = useMemo(() => {
    if (wanted === null) return positions;
    if (present) return wanted;
    return leaving ? goalLinePieces(leaving.wanted, leaving.doc) : NO_PIECES;
  }, [wanted, present, positions, leaving]);

  const ballDrag = drag?.target.kind === 'ball' ? drag.point : null;
  const draggingId = drag ? (drag.target.kind === 'ball' ? BALL_PIECE_ID : drag.target.id) : null;
  const ball = viz && present ? viz.frames[0].ball : doc.ball;
  const motion = usePitchMotion({
    pieces,
    ball: ballDrag ?? ball,
    draggingId,
    cause: [doc.scenario, viz, leaving],
    enterFrom,
    onSettled: leaving ? () => setPresented(null) : undefined,
  });
  return {
    pieces: motion.pieces,
    ball: motion.ball,
    doc: leaving ? leaving.doc : doc,
    ballVisible: wanted === null || present,
  };
}
