import { createContext, useContext, type RefObject } from 'react';
import type { Piece } from './types';

export interface DragApi {
  pitchRef: RefObject<SVGSVGElement | null>;
  startDrag: (piece: Piece, e: React.PointerEvent) => void;
  draggingId: string | null;
}

export const DragContext = createContext<DragApi | null>(null);

export function useDrag(): DragApi {
  const api = useContext(DragContext);
  if (!api) throw new Error('useDrag must be used within DragProvider');
  return api;
}
