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

// A pointer-down only becomes a drag once it moves past this distance;
// releasing before that is a tap (used by click-to-edit piece names).
export const DRAG_THRESHOLD_PX = 5;

interface DragApi {
  pitchRef: RefObject<SVGSVGElement | null>;
  startDrag: (piece: Piece, e: React.PointerEvent, onTap?: () => void) => void;
  draggingId: string | null;
}

const DragContext = createContext<DragApi | null>(null);

export function useDrag(): DragApi {
  const api = useContext(DragContext);
  if (!api) throw new Error('useDrag must be used within DragProvider');
  return api;
}

interface PendingPointer {
  piece: Piece;
  startX: number;
  startY: number;
  onTap?: () => void;
}

interface DragState {
  piece: Piece;
  x: number;
  y: number;
}

export function DragProvider({ children }: { children: ReactNode }) {
  const dispatch = useBoardDispatch();
  const pitchRef = useRef<SVGSVGElement | null>(null);
  const [tracking, setTracking] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const pendingRef = useRef<PendingPointer | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const startDrag = useCallback((piece: Piece, e: React.PointerEvent, onTap?: () => void) => {
    e.preventDefault();
    pendingRef.current = { piece, startX: e.clientX, startY: e.clientY, onTap };
    setTracking(true);
  }, []);

  useEffect(() => {
    if (!tracking) return;

    const onMove = (e: PointerEvent) => {
      const pending = pendingRef.current;
      if (!pending) return;
      if (dragRef.current) {
        setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
        return;
      }
      if (Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY) >= DRAG_THRESHOLD_PX) {
        setDrag({ piece: pending.piece, x: e.clientX, y: e.clientY });
      }
    };

    const onUp = (e: PointerEvent) => {
      const current = dragRef.current;
      const pending = pendingRef.current;
      pendingRef.current = null;
      setDrag(null);
      setTracking(false);
      if (!current) {
        pending?.onTap?.();
        return;
      }
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

    const onCancel = () => {
      pendingRef.current = null;
      setDrag(null);
      setTracking(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [tracking, dispatch]);

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
