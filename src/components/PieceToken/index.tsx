import type { Piece } from '../../board/types';
import { subNumber } from '../../board/pieces';
import './piece-token.scss';

function fillColor(piece: Piece): string {
  return piece.fill.kind === 'solid' ? piece.fill.color : piece.fill.primary;
}

interface Props {
  piece: Piece;
  lifted?: boolean;
  nameable?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export function PieceToken({ piece, lifted, nameable, onPointerDown }: Props) {
  const color = fillColor(piece);
  const isBall = piece.type === 'ball';
  const isBenchedSub = subNumber(piece) !== null && piece.position === undefined;

  const classes = [
    'token',
    isBall && 'token--ball',
    isBenchedSub && 'token--sub',
    lifted && 'token--lifted',
    nameable && 'token--nameable',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classes}
      style={
        isBall
          ? undefined
          : isBenchedSub
            ? ({ '--token-color': color } as React.CSSProperties)
            : { background: color }
      }
      data-piece-id={piece.id}
      onPointerDown={onPointerDown}
      title={piece.name || undefined}
      aria-label={
        isBall ? 'ball' : `${piece.team === 'mine' ? 'my team' : 'opponent'} ${piece.label}`
      }
    >
      {piece.label}
      {piece.name && <span className="token__name">{piece.name}</span>}
    </span>
  );
}
