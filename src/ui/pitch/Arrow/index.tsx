import type { Point, Side } from '../../../data/types';
import { pieceUnits, type PieceScale } from '../piece-scale';
import styles from './arrow.module.scss';

export interface ArrowProps {
  from: Point;
  to: Point;
  team?: Side;
  dim?: boolean;
  ring?: boolean;
  scale?: PieceScale;
}

export const ARROW_RING_RADIUS = 2.9;
const START_GAP = 3.2;
const RING_CLEARANCE = 0.2;
const HEAD_LENGTH = 1.5;
const HEAD_HALF_WIDTH = 0.85;

export function Arrow({ from, to, team = 'mine', dim = false, ring = true, scale }: ArrowProps) {
  const ringRadius = scale ? pieceUnits(scale).arrowRing : ARROW_RING_RADIUS;
  const startGap = scale ? pieceUnits(scale).arrowStart : START_GAP;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const startX = from.x + ux * startGap;
  const startY = from.y + uy * startGap;
  const tipX = to.x - ux * (ringRadius + RING_CLEARANCE);
  const tipY = to.y - uy * (ringRadius + RING_CLEARANCE);
  const baseX = tipX - ux * HEAD_LENGTH;
  const baseY = tipY - uy * HEAD_LENGTH;
  const head = `M${tipX} ${tipY} L${baseX - uy * HEAD_HALF_WIDTH} ${baseY + ux * HEAD_HALF_WIDTH} L${baseX + uy * HEAD_HALF_WIDTH} ${baseY - ux * HEAD_HALF_WIDTH} Z`;
  const drawsShaft = length > startGap + ringRadius + HEAD_LENGTH;

  return (
    <g className={styles.arrow} data-team={team} data-dim={dim || undefined} aria-hidden="true">
      {drawsShaft ? (
        <>
          <line className={styles.shaft} x1={startX} y1={startY} x2={baseX} y2={baseY} />
          <path className={styles.head} d={head} />
        </>
      ) : null}
      {ring ? (
        <circle className={styles.ring} data-part="arrow-ring" cx={to.x} cy={to.y} r={ringRadius} />
      ) : null}
    </g>
  );
}
