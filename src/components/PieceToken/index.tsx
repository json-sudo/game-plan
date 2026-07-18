import type { Piece } from '../../board/types';
import { subNumber } from '../../board/boardReducer';
import './piece-token.scss';

function fillColor(piece: Piece): string {
  return piece.fill.kind === 'solid' ? piece.fill.color : piece.fill.primary;
}

interface Props {
  piece: Piece;
  lifted?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export function PieceToken({ piece, lifted, onPointerDown }: Props) {
  const color = fillColor(piece);
  const isBall = piece.type === 'ball';
  const isBenchedSub = subNumber(piece) !== null && piece.position === undefined;

  const classes = [
    'token',
    isBall && 'token--ball',
    isBenchedSub && 'token--sub',
    lifted && 'token--lifted',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classes}
      style={
        isBall ? undefined : isBenchedSub ? { borderColor: color, color } : { background: color }
      }
      data-piece-id={piece.id}
      onPointerDown={onPointerDown}
      aria-label={isBall ? 'ball' : `${piece.team === 'mine' ? 'my team' : 'opponent'} ${piece.label}`}
    >
      {piece.label}
    </span>
  );
}
