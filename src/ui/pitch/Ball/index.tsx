import { BALL_LABEL } from '../../copy';
import { BallArt } from '../BallGlyph/ball-art';
import styles from './ball.module.scss';

export interface BallProps {
  x: number;
  y: number;
  r?: number;
  label?: string;
}

const DEFAULT_RADIUS = 1.2;

export function Ball({ x, y, r = DEFAULT_RADIUS, label = BALL_LABEL }: BallProps) {
  return (
    <g
      className={styles.ball}
      style={{ transform: `translate(${x}px, ${y}px)` }}
      role="img"
      aria-label={label}
    >
      <g transform={`scale(${r})`}>
        <BallArt />
      </g>
    </g>
  );
}
