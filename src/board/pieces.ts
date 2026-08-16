import type { Piece } from './types';

export function subNumber(piece: Piece): number | null {
  const m = /^S(\d+)$/.exec(piece.label);
  return m ? Number(m[1]) : null;
}
