import type { PointerEvent } from 'react';
import { BALL_LABEL } from '../../copy';
import { BallArt } from '../BallGlyph/ball-art';
import styles from './ball.module.scss';

export interface BallProps {
  x: number;
  y: number;
  r?: number;
  label?: string;
  onPointerDown?: (event: PointerEvent<SVGElement>) => void;
}

const DEFAULT_RADIUS = 1.2;
const HIT_PADDING = 0.6;

export function Ball({ x, y, r = DEFAULT_RADIUS, label = BALL_LABEL, onPointerDown }: BallProps) {
  return (
    <g
      className={styles.ball}
      style={{ transform: `translate(${x}px, ${y}px)` }}
      role="img"
      aria-label={label}
    >
      {onPointerDown ? (
        <circle className={styles.hit} r={r + HIT_PADDING} onPointerDown={onPointerDown} />
      ) : null}
      <g transform={`scale(${r})`}>
        <BallArt />
      </g>
    </g>
  );
}
