import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import type { Piece } from './types';
import { useBoardDispatch } from './BoardContext';
import { PieceToken } from '../components/PieceToken';
import { PITCH_W, PITCH_H } from '../components/Pitch';

interface DragApi {
  pitchRef: RefObject<SVGSVGElement | null>;
  startDrag: (piece: Piece, e: React.PointerEvent) => void;
  draggingId: string | null;
}

const DragContext = createContext<DragApi | null>(null);

export function useDrag(): DragApi {
  const api = useContext(DragContext);
  if (!api) throw new Error('useDrag must be used within DragProvider');
  return api;
}

interface DragState {
  piece: Piece;
  x: number;
  y: number;
}

export function DragProvider({ children }: { children: ReactNode }) {
  const dispatch = useBoardDispatch();
  const pitchRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const startDrag = useCallback((piece: Piece, e: React.PointerEvent) => {
    e.preventDefault();
    setDrag({ piece, x: e.clientX, y: e.clientY });
  }, []);

  const dragging = drag !== null;

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    };

    const onUp = (e: PointerEvent) => {
      const current = dragRef.current;
      setDrag(null);
      if (!current) return;
      const rect = pitchRef.current?.getBoundingClientRect();
      const inside =
        rect &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (inside) {
        dispatch({
          type: 'PLACE_PIECE',
          id: current.piece.id,
          position: {
            x: ((e.clientX - rect.left) / rect.width) * PITCH_W,
            y: ((e.clientY - rect.top) / rect.height) * PITCH_H,
          },
        });
      } else if (current.piece.position) {
        dispatch({ type: 'BENCH_PIECE', id: current.piece.id });
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, dispatch]);

  return (
    <DragContext.Provider value={{ pitchRef, startDrag, draggingId: drag?.piece.id ?? null }}>
      {children}
      {drag && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }}>
          <PieceToken piece={drag.piece} lifted />
        </div>
      )}
    </DragContext.Provider>
  );
}
