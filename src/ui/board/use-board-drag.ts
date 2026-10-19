import { useRef } from 'react';
import type { StoreApi } from 'zustand';
import { selectDisplayPositions } from '../../state/selectors';
import type { PitchStore } from '../../state/store';
import { usePitchDrag } from '../hooks/usePitchDrag';
import { BALL_PIECE_ID } from '../hooks/usePitchMotion';

interface Gesture {
  id: string;
  moved: boolean;
}

export function useBoardDrag(store: StoreApi<PitchStore>, onTap?: (playerId: string) => void) {
  const gesture = useRef<Gesture | null>(null);
  const dragged = useRef(false);

  const endGesture = () => {
    const tap = gesture.current && !gesture.current.moved ? gesture.current.id : null;
    gesture.current = null;
    setTimeout(() => {
      dragged.current = false;
    }, 0);
    return tap;
  };

  const reportTap = (tap: string | null) => {
    if (tap && tap !== BALL_PIECE_ID && store.getState().ui.mode === 'fm') onTap?.(tap);
  };

  const drag = usePitchDrag({
    onDragStart: (id) => {
      dragged.current = false;
      gesture.current = { id, moved: false };
      const state = store.getState();
      if (id === BALL_PIECE_ID) {
        state.beginDrag({ kind: 'ball' }, state.doc.ball);
        return;
      }
      const point = selectDisplayPositions(state).get(id);
      if (point) state.beginDrag({ kind: 'player', id }, point);
    },
    onDragMove: (id, point) => {
      dragged.current = true;
      if (gesture.current) gesture.current.moved = true;
      const state = store.getState();
      if (!state.ui.drag && id !== BALL_PIECE_ID) state.beginDrag({ kind: 'player', id }, point);
      state.updateDrag(point);
    },
    onDragEnd: (_id, point) => {
      const tap = endGesture();
      const state = store.getState();
      if (tap) {
        state.cancelDrag();
        reportTap(tap);
        return;
      }
      state.updateDrag(point);
      state.endDrag();
    },
    onDropOnBench: (id) => {
      endGesture();
      const state = store.getState();
      state.cancelDrag();
      if (id !== BALL_PIECE_ID) state.dispatch({ type: 'benchPlayer', playerId: id });
    },
    onCancel: () => {
      const tap = endGesture();
      store.getState().cancelDrag();
      reportTap(tap);
    },
  });

  return { ...drag, wasDragged: () => dragged.current };
}
