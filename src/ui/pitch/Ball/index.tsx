import type { KeyboardEvent, PointerEvent } from 'react';
import { BALL_LABEL } from '../../copy';
import { BallArt } from '../BallGlyph/ball-art';
import { DEFAULT_PIECE_SCALE, pieceUnits, type PieceScale } from '../piece-scale';
import styles from './ball.module.scss';

const DRAG_SCALE = 1.15;
const SHADOW_OFFSET_PX = { x: 1, y: 1.5 };

export interface BallProps {
  x: number;
  y: number;
  scale?: PieceScale;
  selected?: boolean;
  dragging?: boolean;
  label?: string;
  title?: string;
  onPointerDown?: (event: PointerEvent<SVGGElement>) => void;
  onKeyDown?: (event: KeyboardEvent<SVGGElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function Ball({
  x,
  y,
  scale = DEFAULT_PIECE_SCALE,
  selected = false,
  dragging = false,
  label = BALL_LABEL,
  title,
  onPointerDown,
  onKeyDown,
  onFocus,
  onBlur,
}: BallProps) {
  const units = pieceUnits(scale);
  const r = units.ballRadius;
  const px = (value: number) => value / scale.ppu;
  const transform = `translate(${x}px, ${y}px)${dragging ? ` scale(${DRAG_SCALE})` : ''}`;
  return (
    <g
      className={styles.ball}
      style={{ transform }}
      data-dragging={dragging || undefined}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {title ? <title>{title}</title> : null}
      <circle className={styles.hit} r={units.hitRadius} />
      {selected ? (
        <circle
          className={styles.halo}
          r={r + (units.haloRadius - units.radius)}
          style={{ strokeWidth: units.haloWidth }}
        />
      ) : null}
      <circle
        className={styles.shadow}
        cx={px(SHADOW_OFFSET_PX.x)}
        cy={px(SHADOW_OFFSET_PX.y)}
        r={r}
      />
      <g transform={`scale(${r})`}>
        <BallArt />
      </g>
      <circle className={styles.ring} r={r} style={{ strokeWidth: px(1.5) }} />
    </g>
  );
}
