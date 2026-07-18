import type { Piece } from '../../board/types';
import { useBoard } from '../../board/BoardContext';
import { useDrag } from '../../board/DragContext';
import './pitch.scss';

function PitchPiece({ piece }: { piece: Piece }) {
  const { startDrag, draggingId } = useDrag();
  if (!piece.position) return null;
  const { x, y } = piece.position;
  const color = piece.fill.kind === 'solid' ? piece.fill.color : piece.fill.primary;
  const isBall = piece.type === 'ball';

  return (
    <g
      className="pitch__piece"
      opacity={draggingId === piece.id ? 0.3 : 1}
      onPointerDown={(e) => startDrag(piece, e)}
      aria-label={isBall ? 'ball' : `${piece.team === 'mine' ? 'my team' : 'opponent'} ${piece.label}`}
    >
      {isBall ? (
        <circle cx={x} cy={y} r={0.9} fill={color} stroke="var(--pitch-line)" strokeWidth={0.12} />
      ) : (
        <>
          <circle cx={x} cy={y} r={1.6} fill={color} />
          <text x={x} y={y} className="pitch__label">
            {piece.label}
          </text>
        </>
      )}
    </g>
  );
}

export function Pitch() {
  const board = useBoard();
  const { pitchRef } = useDrag();
  const placed = board.pieces.filter((p) => p.position !== undefined);

  return (
    <svg ref={pitchRef} className="pitch" viewBox="0 0 50 100" role="img" aria-label="pitch">
      <rect width={50} height={100} fill="var(--pitch)" />
      {[0, 2, 4, 6].map((i) => (
        <rect key={i} y={i * 12.5} width={50} height={12.5} fill="var(--pitch-stripe)" />
      ))}
      <g fill="none" stroke="var(--pitch-line)" strokeWidth={0.2}>
        <rect x={1} y={1} width={48} height={98} />
        <line x1={1} y1={50} x2={49} y2={50} />
        <circle cx={25} cy={50} r={7} />
        <rect x={14.8} y={1} width={20.4} height={12.6} />
        <rect x={14.8} y={86.4} width={20.4} height={12.6} />
        <rect x={20.9} y={1} width={8.2} height={4.2} />
        <rect x={20.9} y={94.8} width={8.2} height={4.2} />
      </g>
      {placed.map((p) => (
        <PitchPiece key={p.id} piece={p} />
      ))}
    </svg>
  );
}
